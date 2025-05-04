import { performConcurrentWorkOnRoot } from "./ReactFiberWorkLoop";
import { FiberRoot } from "./ReactInternalTypes";
import { NormalPriority, Scheduler } from "scheduler";

export function ensureRootIsScheduled(root: FiberRoot) {
   //> 通过 queueMicrotask 将 scheduleTaskForRootDuringScheduled 任务调度器，做为微任务进行调用
   queueMicrotask(() => {
      scheduleTaskForRootDuringScheduled(root);
   });
}

//> 做为微任务的 callback 函数进行调用的
export function scheduleTaskForRootDuringScheduled(root: FiberRoot) {
   const schedulerPriorityLevel = NormalPriority;

   Scheduler.scheduleCallback(schedulerPriorityLevel, (didTimeout: boolean) => {
      performConcurrentWorkOnRoot(root);
      return null;
   });
}
