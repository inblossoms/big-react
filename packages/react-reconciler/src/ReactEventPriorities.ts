import {
   Lane,
   NoLane,
   SyncLane,
   InputContinuousLane,
   DefaultLane,
   IdleLane,
   Lanes,
   includesNonIdleWork,
   getHighestPriorityLane,
} from "./ReactFiberLane";

/**
 * 事件优先级类型定义
 * 使用 Lane 类型来表示事件的优先级
 */
export type EventPriority = Lane;

/**
 * 离散事件优先级
 * 用于处理需要立即响应的离散事件，如点击、提交等
 * 使用最高优先级 SyncLane，确保事件能够立即被处理
 */
export const DiscreteEventPriority: EventPriority = SyncLane;

/**
 * 连续事件优先级
 * 用于处理需要连续响应的事件，如滚动、拖拽等
 * 使用 InputContinuousLane，允许在事件处理过程中被打断
 */
export const ContinuousEventPriority: EventPriority = InputContinuousLane;

/**
 * 默认事件优先级
 * 用于处理普通的更新事件，如页面初次渲染
 * 使用 DefaultLane，表示标准的更新优先级
 */
export const DefaultEventPriority: EventPriority = DefaultLane;

/**
 * 空闲事件优先级
 * 用于处理可以在空闲时间执行的更新
 * 使用 IdleLane，表示最低的优先级
 */
export const IdleEventPriority: EventPriority = IdleLane;

/**
 * 当前更新优先级
 * 用于跟踪当前正在处理的更新优先级
 * 初始值为 NoLane，表示没有正在处理的更新
 */
let currentUpdatePriority: EventPriority = NoLane;

/**
 * 获取当前更新优先级
 *
 * @returns {EventPriority} 返回当前正在处理的更新优先级
 */
export function getCurrentUpdatePriority(): EventPriority {
   return currentUpdatePriority;
}

/**
 * 设置当前更新优先级
 *
 * @param {EventPriority} newPriority - 要设置的新优先级
 */
export function setCurrentUpdatePriority(newPriority: EventPriority) {
   currentUpdatePriority = newPriority;
}

/**
 * 比较两个事件优先级
 * 判断优先级 a 是否高于优先级 b
 *
 * @param {EventPriority} a - 第一个优先级
 * @param {EventPriority} b - 第二个优先级
 * @returns {boolean} 如果 a 的优先级高于 b 返回 true，否则返回 false
 *
 * 优先级比较规则：
 * 1. 优先级值越小，优先级越高
 * 2. 0 表示无优先级
 */
export function isHigherEventPriority(
   a: EventPriority,
   b: EventPriority
): boolean {
   return a !== 0 && a < b;
}

/**
 * 将 lanes 转换为事件优先级
 * 根据优先级最高的 lane 确定对应的事件优先级
 *
 * @param {Lanes} lanes - 要转换的优先级集合
 * @returns {EventPriority} 返回对应的事件优先级
 *
 * 转换规则：
 * 1. 如果包含离散事件优先级，返回 DiscreteEventPriority
 * 2. 如果包含连续事件优先级，返回 ContinuousEventPriority
 * 3. 如果包含非空闲工作，返回 DefaultEventPriority
 * 4. 其他情况返回 IdleEventPriority
 *
 * 注意：这里的优先级对应了 Scheduler 中的优先级系统
 */
export function lanesToEventPriority(lanes: Lanes): EventPriority {
   // 获取优先级最高的 lane
   const lane = getHighestPriorityLane(lanes);

   // 按优先级从高到低依次判断
   if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
      return DiscreteEventPriority;
   }
   if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
      return ContinuousEventPriority;
   }
   if (includesNonIdleWork(lane)) {
      return DefaultEventPriority;
   }
   return IdleEventPriority;
}
