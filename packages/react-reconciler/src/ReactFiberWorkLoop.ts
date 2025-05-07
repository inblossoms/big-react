import { FiberRoot, Fiber } from "./ReactInternalTypes";
import { ensureRootIsScheduled } from "./ReactFiberRootScheduler";
import { createWorkInProgress } from "./ReactFiber";
import { completeWork } from "./ReactFiberCompleteWork";
import { beginWork } from "./ReactFiberBeginWork";
import {
   commitMutationEffects,
   flushPassiveEffects,
} from "./ReactFiberCommitWork";
import { NormalPriority, Scheduler } from "scheduler/index";

type ExecutionContext = number;

export const NoContext: ExecutionContext = 0b000;
export const BatchedContext: ExecutionContext = 0b001;
export const RenderContext: ExecutionContext = 0b010;
export const CommitContext: ExecutionContext = 0b100;

let executionContext: ExecutionContext = NoContext;

let workInProgress: Fiber | null = null;
let workInProgressRoot: FiberRoot | null = null;

/**
 * 调度更新：页面的初次渲染、类组件的 setState|forceUpdate、函数组件 setState 都会走到更新，调用该函数
 * @param root 根 fiberRoot
 * @param fiber 当前的 fiber
 * @param isRenderPhaseUpdate 是否是渲染阶段更新
 */
export function scheduleUpdateOnFiber(
   root: FiberRoot,
   fiber: Fiber,
   isRenderPhaseUpdate: boolean
) {
   workInProgressRoot = root;
   workInProgress = fiber;

   console.log(
      `🧠 [] \x1b[91mFile: ReactFiberWorkLoop.ts\x1b[0m, \x1b[32mLine: 34\x1b[0m, Message: `,
      root
   );
   if (isRenderPhaseUpdate) {
      //? 渲染阶段更新
      queueMicrotask(() => {
         performConcurrentWorkOnRoot(root);
      });
   } else {
      // 挂载阶段
      ensureRootIsScheduled(root);
   }
}

/**
 * 并发工作：页面初次渲染，类组件、函数组件的状态更新
 * @param root
 */
export function performConcurrentWorkOnRoot(root: FiberRoot) {
   //? 1. render，构建 fiber 树 > VDOM
   //> 包括了两个阶段：beginWork | completedWork
   renderRootSync(root);

   //? 2. commit，将 fiber 树渲染到真实 DOM
   const finishedWork: Fiber = root.current.alternate as Fiber;
   root.finishedWork = finishedWork; // 根 fiber

   commitRoot(root);
}

/**
 * 提交根 fiber
 * @param root
 */
function commitRoot(root: FiberRoot) {
   //? 1. begin
   const previousExecutionContext = executionContext;
   executionContext |= CommitContext;

   //? 2. mutataion：渲染 DOM 元素， < 页面初次渲染 >
   commitMutationEffects(root, root.finishedWork as Fiber); // Fiber: HostRoot 3
   //? 2.1 passive effect 阶段，执行 passive effect，不参与页面的同步渲染阶段
   Scheduler.scheduleCallback(NormalPriority, () => {
      flushPassiveEffects(root.finishedWork as Fiber);
      return null;
   });

   //? 3. finished
   executionContext = previousExecutionContext;
   workInProgressRoot = null;
}

/**
 * 同步渲染：页面初次渲染、类组件的 setState|forceUpdate、函数组件 setState
 * @param root
 */
function renderRootSync(root: FiberRoot) {
   //? 1. render begining
   const previousExecutionContext = executionContext;
   executionContext |= RenderContext; //> 可能会存在多个类型的 context 进行合并

   //? 2. initialize from root
   prepareFreshStask(root);
   //? 3. iterate fiber tree, perform unit of work
   //> dfs 深度优先遍历
   workLoopSync();

   //? 4. return the root
   executionContext = previousExecutionContext;
   workInProgressRoot = null;
}

/**
 * 准备新的任务，准备阶段
 * @param root
 * @returns
 */
function prepareFreshStask(root: FiberRoot): Fiber {
   root.finishedWork = null; //> 表示之后要提交的 work

   workInProgressRoot = root; // FiberRoot
   const rootWorkInProgress = createWorkInProgress(root.current, null); // Fiber

   if (workInProgress === null) {
      // 页面初次渲染时，从根节点开始
      workInProgress = rootWorkInProgress; // Fiber
   }

   return rootWorkInProgress; // 返回 rootWorkInProgress 作为 workInProgress
}

function workLoopSync() {
   while (workInProgress !== null) {
      performUnitOfWork(workInProgress);
   }
}

/**
 * 处理当前次调用分发的工作单元，工作开始阶段
 * @param fiber 子 Fiber
 */
function performUnitOfWork(unitOfWork: Fiber) {
   const current = unitOfWork.alternate;
   //? 1. beginWork
   let next = beginWork(current, unitOfWork);

   //> 把 pendingProps 更新到 memoizedProps
   // pendingProps 值处于一个待处理状态，beginWork 阶段，会根据 pendingProps 生成新的 memoizedProps
   // 这里已经处理完了，所以需要把 pendingProps 更新到 memoizedProps
   unitOfWork.memoizedProps = unitOfWork.pendingProps;

   if (next === null) {
      //// 没有产生新的 work
      completeUnitOfWork(unitOfWork);
   } else {
      workInProgress = next;
   }

   //> 1.1 执行自己
   //> 1.2 （协调、bailout）return 新的 fiber

   //? 2. completeWork
}

/**
 * dfs: child、sibling、parent ... build fiber tree
 * @param unitOfWork
 */
function completeUnitOfWork(unitOfWork: Fiber) {
   let completedWork: Fiber | null = unitOfWork;

   do {
      const current = completedWork.alternate;
      const returnFiber = completedWork.return; //> Fiber.return -> 指向父级 fiber

      let next = completeWork(current, completedWork);
      if (next !== null) {
         workInProgress = next;
         return;
      }

      const siblingFiber = completedWork.sibling;
      if (siblingFiber !== null) {
         workInProgress = siblingFiber;
         return;
      }

      completedWork = returnFiber as Fiber;
      workInProgress = completedWork;
   } while (completedWork !== null);
}
