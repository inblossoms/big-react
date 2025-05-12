import type { Container, Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostRoot } from "./ReactWorkTags";
import { createFiber } from "./ReactFiber";
import { NoLanes } from "./ReactFiberLane";

export function createFiberRoot(containerInfo: Container): FiberRoot {
   const root: FiberRoot = new FiberRootNode(containerInfo) as FiberRoot;

   const uninitializedFiber: Fiber = createFiber(HostRoot, null, null);
   root.current = uninitializedFiber;
   uninitializedFiber.stateNode = root;

   return root;
}

export class FiberRootNode {
   containerInfo: Container;
   current: Fiber | null;
   finishedWork: Fiber | null;
   pendingLanes: number;

   constructor(containerInfo: Container) {
      this.containerInfo = containerInfo;
      this.current = null;
      this.finishedWork = null;
      this.pendingLanes = NoLanes;
   }
}
