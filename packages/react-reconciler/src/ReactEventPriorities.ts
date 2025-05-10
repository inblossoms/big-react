import {
   Lane,
   NoLane,
   SyncLane,
   InputContinuousLane,
   DefaultLane,
   IdleLane,
} from "./ReactFiberLane";

export type EventPriority = Lane;

export const DiscreteEventPriority: EventPriority = SyncLane; //> 同步事件优先级
export const ContinuousEventPriority: EventPriority = InputContinuousLane; //> 连续事件优先级
export const DefaultEventPriority: EventPriority = DefaultLane; //> 默认事件优先级，页面初次渲染
export const IdleEventPriority: EventPriority = IdleLane; //> 空闲事件优先级

let currentUpdatePriority: EventPriority = NoLane;

export function getCurrentUpdatePriority(): EventPriority {
   return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority: EventPriority) {
   currentUpdatePriority = newPriority;
}
