import { ReactNodeList } from "shared/ReactTypes";
import { FiberRoot } from "./ReactInternalTypes";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

export function updateContainer(element: ReactNodeList, container: FiberRoot) {
   //? 1. 获取 current fiber
   const current = container.current;
   current.memoizedState = { element };

   const root = container;

   //? 2. 调度更新
   scheduleUpdateOnFiber(container, current);
}
