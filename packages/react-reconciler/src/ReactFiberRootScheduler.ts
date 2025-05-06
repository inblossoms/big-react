import { performConcurrentWorkOnRoot } from "./ReactFiberWorkLoop";
import { FiberRoot } from "./ReactInternalTypes";
import { NormalPriority, Scheduler } from "scheduler";

/**
 * 确保根 fiber 被调度
 * @param root
 */
export function ensureRootIsScheduled(root: FiberRoot) {
   //> 通过 queueMicrotask 将 scheduleTaskForRootDuringScheduled 任务调度器，做为微任务进行调用
   queueMicrotask(() => {
      scheduleTaskForRootDuringScheduled(root);
   });
}

//! 在新版本的 React 中，状态值的修改没有继续使用调度器来更新。只保留了页面初次渲染时使用调度器
//> 做为微任务的 callback 函数进行调用的
export function scheduleTaskForRootDuringScheduled(root: FiberRoot) {
   const schedulerPriorityLevel = NormalPriority;

   Scheduler.scheduleCallback(schedulerPriorityLevel, (didTimeout: boolean) => {
      performConcurrentWorkOnRoot(root);
      return null;
   });
}
