import { getCurrentTime, isFunction } from "../../shared/utils";
import {
   userBlockingPriorityTimeout,
   normalPriorityTimeout,
   lowPriorityTimeout,
   maxSigned31BitInt,
} from "./SchedulerFeatureFlags";
import { peek, pop, push } from "./SchedulerMinHeap";

import {
   PriorityLevel,
   ImmediatePriority,
   UserBlockingPriority,
   NormalPriority,
   LowPriority,
   IdlePriority,
   NoPriority,
} from "./SchedulerPriorities";

// callback 任务初始值
export type Callback = (arg: boolean) => Callback | null | undefined;

// task scheduler 封装后的 tasck，work：一个时间切片内的工作单元
type Task = {
   id: number;
   callback: Callback | null;
   priority: PriorityLevel;
   startTime: number;
   expirationTime: number; // 任务的过期时间
   sortIndex: number;
};

/**
 * 单线程调度器 调度器需要做的事情
 * 1. 调度任务
 * 2. 调度任务的优先级
 * 3. 调度任务的过期时间
 * 4. 调度任务的执行时间
 */

// 当前正在执行的任务
let currentTask: Task | null = null;
// 当前任务的优先级
let currentPriorityLevel: PriorityLevel = NoPriority;

// 确保 task 的唯一性
let taskIdCounter = 0;

// 使用小顶堆存储所有任务
const taskQueue: Task[] = [];
// 存储延迟任务的队列
const timerQueue: Task[] = [];

// 时间切片初始值/当前时间
let startTime = -1;
// 最大执行时间，超过此时间应让出控制权
let yieldInterval = 5;

// 锁，防止重复执行
// 是否有 work 正在执行
let isPerformingWork = false;
// 主线程是否正在执行任务
let isHostCallbackScheduled = false;
// 是否存在倒计时任务
let isHostTimeoutScheduled = false;
// 延时任务的定时器ID
let taskTimeoutID = -1;
// 消息循环是否运行中
let isMessageLoopRuning = false;

/**
 * 入口函数，调度任务：当某个任务进入调度器后，等待调度
 * @param priority 任务优先级
 * @param callback 任务回调
 * @param options 可选参数，包含延迟时间
 */
function scheduleCallback(
   priority: PriorityLevel,
   callback: Callback,
   options?: {
      delay?: number;
   }
) {
   const currentTime = getCurrentTime();
   let startTime: number;
   let timeout: number;

   // 处理延迟任务
   if (
      options?.delay &&
      typeof options.delay === "number" &&
      options.delay > 0
   ) {
      startTime = currentTime + options.delay;
   } else {
      startTime = currentTime;
   }

   // 根据优先级设置超时时间
   switch (priority) {
      case ImmediatePriority: // 立即执行
         timeout = -1;
         break;
      case UserBlockingPriority: // 用户阻塞优先级
         timeout = userBlockingPriorityTimeout;
         break;
      case LowPriority: // 低优先级
         timeout = lowPriorityTimeout;
         break;
      case IdlePriority: // 空闲优先级
         timeout = maxSigned31BitInt;
         break;
      case NormalPriority: // 正常优先级
      default:
         timeout = normalPriorityTimeout;
         break;
   }

   // 计算任务过期时间
   const expirationTime = startTime + timeout;

   // 创建任务对象
   const task: Task = {
      id: taskIdCounter++,
      callback,
      priority,
      startTime,
      expirationTime,
      // 优先级数值越小，优先级越高
      // 小顶堆按sortIndex从小到大排序，所以优先级数值作为sortIndex可以保证正确排序
      sortIndex: priority,
   };

   if (startTime > currentTime) {
      // 延迟任务处理
      task.sortIndex = startTime;
      // 将延迟任务添加到 timerQueue 中
      push(timerQueue, task);

      // 单线程：每次只处理一个倒计时任务
      // 当前没有在执行中的任务，且 task 是当前堆顶正在排期的任务
      if (peek(taskQueue) === null && task === peek(timerQueue)) {
         if (isHostTimeoutScheduled) {
            // 如果已经存在倒计时任务，说明当前正在执行的任务已经过期或者次序在倒计时任务之后，则取消
            cancelHostTimeout();
         } else {
            // 解锁，处理当前应正确执行的 task
            isHostTimeoutScheduled = true;
         }
         // 处理倒计时任务，推送到事件队列（堆中）
         requestHostTimeout(handleTimeout, startTime - currentTime);
      }
   } else {
      // 普通任务处理
      task.sortIndex = expirationTime + priority;
      // 将任务添加到小顶堆
      push(taskQueue, task);

      // 如果当前主线程空闲且没有正在执行的任务，则执行任务
      if (!isHostCallbackScheduled && !isPerformingWork) {
         isHostCallbackScheduled = true;
         requestHostCallback();
      }
   }
}

/**
 * 从小顶堆中获取下一个待执行的任务
 * @param queue 任务队列
 * @returns 下一个待执行的任务
 */
function getNextTask(queue: Task[]): Task | null {
   if (queue.length === 0) {
      return null;
   }

   // 从小顶堆中获取优先级最高的任务
   const nextTask = peek(queue) as Task | null;
   return nextTask;
}

/**
 * 从任务队列中移除指定任务
 * @param task 要移除的任务
 */
function removeTask(task: Task): void {
   // 创建临时数组存储弹出的任务
   const tempTasks: Task[] = [];
   let currentTask = pop(taskQueue) as Task | undefined;

   // 从堆中弹出所有任务
   while (currentTask !== undefined) {
      if (currentTask.id !== task.id) {
         tempTasks.push(currentTask);
      }
      currentTask = pop(taskQueue) as Task | undefined;
   }

   // 将不需要移除的任务重新放回堆中
   tempTasks.forEach((t) => push(taskQueue, t));
}

/**
 * 取消当前任务
 */
function cancelCallback() {
   if (currentTask) {
      currentTask.callback = null;
      removeTask(currentTask);
   }
}

/**
 * 获取当前任务的优先级
 * @returns 当前任务优先级
 */
function getCurrentPriorityLevel(): PriorityLevel {
   return currentPriorityLevel;
}

// 对于每一个 task 都存在一个 callback ， 当 callback 执行完后，就执行下一个
// 一个 work 单元就是一个时间切片内执行的 task
// 如果返回值为 true 则表示当前还有位置执行完的任务，需要继续执行

/**
 * 执行任务循环
 * @param initialTime 初始时间
 * @returns 是否需要继续执行
 */
function workLoop(initialTime: number): boolean {
   let currentTime = initialTime;
   currentTask = getNextTask(taskQueue);

   // 每一个新的切片处理的开始，检查是否存在有需要处理的倒计时任务
   advanceTimers(currentTime);

   while (currentTask !== null) {
      // 只有当已经执行了至少一个任务，且当前任务的过期时间超过当前时间，且应该让出主线程控制权时才中断
      if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
         break;
      }

      const callback = currentTask.callback;
      currentTime = getCurrentTime();

      if (
         callback !== null &&
         isFunction(callback) /* 是一个函数则是一个有效任务 */
      ) {
         currentTask.callback = null; // 这个动作 将会在如果当前任务没有完全执行结束 即在下一轮依旧存在，也会迫使其进入下一轮的调度 执行 else pop
         currentPriorityLevel = currentTask.priority;

         const didUserCallbackTimeout = // 过期时间
            currentTask.expirationTime <= currentTime;

         // 执行的任务可能并没完全执行结束，会返回一个 callback
         const continueationCallback = callback(didUserCallbackTimeout);

         currentTime = getCurrentTime();
         if (typeof continueationCallback === "function") {
            currentTask.callback = continueationCallback;
            // 如果任务没有完全执行完，需要重新放回堆中
            currentTask.sortIndex = currentTask.priority;
            push(taskQueue, currentTask);

            // push 新的任务，检查是否存在需要处理的新的倒计时任务
            advanceTimers(currentTime);
            return true;
         } else {
            // 已执行完毕，从堆中移除任务
            if (currentTask === peek(taskQueue)) {
               pop(taskQueue); // 当前任务一定在堆顶
            }

            // 每一次任务的变动 都需要检查是否存在需要处理的新的倒计时任务
            advanceTimers(currentTime);
         }
      } else {
         // 如果回调为null，从堆中移除任务
         pop(taskQueue); // 当前任务一定在堆顶
      }

      currentTask = getNextTask(taskQueue);
   }

   // 检查是否还有剩余任务
   if (currentTask !== null) {
      return true;
   } else {
      // while 结束，主线程空闲 尝试处理延时任务
      const timerAction = peek(timerQueue) as Task | null;

      if (timerAction !== null) {
         requestHostTimeout(handleTimeout, timerAction.sortIndex - currentTime);
      }
      return false;
   }
}

/**
 * 判断是否需要让出控制权到主线程
 * @returns 是否需要让出控制权
 */
function shouldYieldToHost() {
   const timeElapsed = getCurrentTime() - startTime;

   if (timeElapsed < yieldInterval) {
      return false;
   }

   return true;
}

/**
 * 请求主线程执行回调
 */
function requestHostCallback() {
   if (!isMessageLoopRuning) {
      isMessageLoopRuning = true;
      // 调度一个切片内的 stack，直到切片优先级允许的最大时间结束
      schedulePerformWorkUntilDeadline();
   }
}

/**
 * 执行工作直到截止时间
 */
const performWorkUntilDeadline = () => {
   if (isMessageLoopRuning) {
      const initialTime = getCurrentTime();
      // 记录当前 work 切片的起始时间
      startTime = initialTime;
      let hasMoreWork = true;
      try {
         hasMoreWork = flushWork(initialTime);
      } finally {
         if (hasMoreWork) {
            // 如果还有任务，则继续调度
            schedulePerformWorkUntilDeadline();
         } else isMessageLoopRuning = false;
      }
   }
};

// 使用 MessageChannel 创建宏任务
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

/**
 * 调度执行工作直到截止
 */
function schedulePerformWorkUntilDeadline() {
   // 生成一个宏任务，将消息发送到 port1
   port.postMessage(null);
}

/**
 * 刷新并执行任务
 * @param initialTime 初始时间
 * @returns 是否有更多任务
 */
function flushWork(initialTime: number) {
   // 执行任务，结束调度
   isHostCallbackScheduled = false;
   // 处理切片
   isPerformingWork = true;
   // 保存当前的优先级
   const previousPriorityLevel = currentPriorityLevel;

   try {
      // 核心逻辑
      return workLoop(initialTime);
   } finally {
      // 当前切片处理结束
      currentTask = null;
      // 恢复原先优先级 不同的切片可能存在不同的优先级，当切片处理结束时，恢复原先的初始优先级
      currentPriorityLevel = previousPriorityLevel;
      // 恢复调度
      isPerformingWork = false;
   }
}

/**
 * 请求主线程设置超时任务
 * @param callback 超时后执行的回调
 * @param ms 超时时间
 */
function requestHostTimeout(
   callback: (currentTime: number) => void,
   ms: number
) {
   taskTimeoutID = setTimeout(() => {
      callback(getCurrentTime());
   }, ms);
}

/**
 * 取消主线程超时任务
 */
function cancelHostTimeout() {
   clearTimeout(taskTimeoutID);
   taskTimeoutID = -1;
}

/**
 * 处理超时任务
 * @param currentTime 当前时间
 */
function handleTimeout(currentTime: number): void {
   isHostTimeoutScheduled = false;
   advanceTimers(currentTime);

   // 如果当前没有正在执行的任务，则处理倒计时任务
   if (!isHostCallbackScheduled) {
      if (peek(taskQueue) !== null) {
         // 存在正在执行的任务 置为 true， 表示存在正在执行的任务
         isHostCallbackScheduled = true;
         requestHostCallback();
      } else {
         // 不存在正在执行的任务，则开始处理倒计时任务
         const firstTimer = getNextTask(timerQueue);
         if (firstTimer !== null) {
            requestHostTimeout(
               handleTimeout,
               firstTimer.sortIndex - currentTime
            );
         }
      }
   }
}

/**
 * 处理定时器任务，将到期的任务从timerQueue移动到taskQueue
 * @param currentTime 当前时间
 */
function advanceTimers(currentTime: number) {
   let timer = peek(timerQueue) as Task | null;
   while (timer !== null) {
      if (timer.callback === null) {
         // 任务无效，取消
         pop(timerQueue);
      } else if (timer.startTime <= currentTime) {
         // 任务满足开始执行的时间条件
         pop(timerQueue);
         timer.sortIndex = timer.expirationTime;
         push(taskQueue, timer);
      } else {
         // 遇到未到开始时间的任务，退出循环
         return;
      }
      timer = peek(timerQueue) as Task | null;
   }
}

export {
   ImmediatePriority,
   UserBlockingPriority,
   NormalPriority,
   IdlePriority,
   LowPriority,
   scheduleCallback,
   cancelCallback,
   getCurrentPriorityLevel,
   shouldYieldToHost as shouldYield,
   flushWork,
};
