import { FiberRoot } from "./ReactInternalTypes";

export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;

export const TotalLanes = 31;

// lane: number，表示优先级，值越小 优先级越高
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncHydrationLane: Lane = /*               */ 0b0000000000000000000000000000001;
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000010;
export const SyncLaneIndex: number = 1;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000100;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000001000;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000010000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000100000;

export const SyncUpdateLanes: Lane =
   SyncLane | InputContinuousLane | DefaultLane;

export const GestureLane: Lane = /*                     */ 0b0000000000000000000000001000000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000010000000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111100000000;
const TransitionLane1: Lane = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane2: Lane = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane3: Lane = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane4: Lane = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane5: Lane = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane6: Lane = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane7: Lane = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane8: Lane = /*                        */ 0b0000000000000001000000000000000;
const TransitionLane9: Lane = /*                        */ 0b0000000000000010000000000000000;
const TransitionLane10: Lane = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane11: Lane = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane12: Lane = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane13: Lane = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane14: Lane = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000011110000000000000000000000;
const RetryLane1: Lane = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2: Lane = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3: Lane = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4: Lane = /*                             */ 0b0000010000000000000000000000000;

export const SomeRetryLane: Lane = RetryLane1;

export const SelectiveHydrationLane: Lane = /*          */ 0b0000100000000000000000000000000;

const NonIdleLanes: Lanes = /*                          */ 0b0000111111111111111111111111111;

export const IdleHydrationLane: Lane = /*               */ 0b0001000000000000000000000000000;
export const IdleLane: Lane = /*                        */ 0b0010000000000000000000000000000;

export const OffscreenLane: Lane = /*                   */ 0b0100000000000000000000000000000;
export const DeferredLane: Lane = /*                    */ 0b1000000000000000000000000000000;

// Any lane that might schedule an update. This is used to detect infinite
// update loops, so it doesn't include hydration lanes or retries.
export const UpdateLanes: Lanes =
   SyncLane | InputContinuousLane | DefaultLane | TransitionLanes;

export const HydrationLanes =
   SyncHydrationLane |
   InputContinuousHydrationLane |
   DefaultHydrationLane |
   TransitionHydrationLane |
   SelectiveHydrationLane |
   IdleHydrationLane;

// 下一个可用的过渡 lane 的初始值
// TransitionLane1 是过渡优先级的最低级别
let nextTransitionLane: Lane = TransitionLane1;

/**
 * 判断给定的 lane 是否为过渡优先级
 *
 * @param {Lane} lane - 要检查的优先级
 * @returns {boolean} 如果是过渡优先级返回 true，否则返回 false
 *
 * 过渡优先级用于处理非紧急的更新，如：
 * - UI 过渡动画
 * - 非关键的界面更新
 * - 可以被打断的更新
 */
export function isTransitionLane(lane: Lane): boolean {
   return (lane & TransitionLanes) !== NoLanes;
}

/**
 * 判断给定的 lanes 是否包含非空闲工作
 * 用于确定是否有需要立即处理的任务
 *
 * @param {Lanes} lanes - 要检查的优先级集合
 * @returns {boolean} 如果包含非空闲工作返回 true，否则返回 false
 *
 * 非空闲工作包括：
 * - 同步更新
 * - 输入事件
 * - 过渡更新
 * - 其他非空闲优先级
 */
export function includesNonIdleWork(lanes: Lanes): boolean {
   return (lanes & NonIdleLanes) !== NoLanes;
}

/**
 * 获取优先级集合中最高优先级的 lane
 * 使用位运算技巧快速找到最低位的 1
 *
 * @param {Lanes} lanes - 要检查的优先级集合
 * @returns {Lane} 返回最高优先级的 lane
 *
 * 工作原理：
 * 1. 使用 -lanes 获取 lanes 的补码
 * 2. 与原始 lanes 进行按位与操作
 * 3. 结果就是最低位的 1，即最高优先级的 lane
 *
 * 例如：
 * lanes = 0b1010
 * -lanes = 0b0110
 * 结果 = 0b0010
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
   return lanes & -lanes;
}

/**
 * 获取优先级集合中最高优先级的 lanes
 * 根据不同的优先级类型返回对应的 lanes 集合
 *
 * @param {Lanes | Lane} lanes - 要检查的优先级集合
 * @returns {Lanes} 返回最高优先级的 lanes 集合
 *
 * 优先级处理顺序：
 * 1. 首先检查同步更新优先级
 * 2. 然后按照优先级从高到低依次处理其他类型
 * 3. 对于过渡优先级，返回所有过渡相关的 lanes
 * 4. 对于重试优先级，返回所有重试相关的 lanes
 */
function getHighestPriorityLanes(lanes: Lanes | Lane): Lanes {
   // 优先处理同步更新优先级
   const pendingSyncLanes = lanes & SyncUpdateLanes;
   if (pendingSyncLanes !== 0) {
      // 将 DefaultLane、SyncLane 和 ContinuousLane 统一为 SyncLane
      // 并在根上使用一个单独的字段来跟踪它们应该使用 queueMicrotask
      return pendingSyncLanes;
   }

   // 根据最高优先级的 lane 返回对应的 lanes 集合
   switch (getHighestPriorityLane(lanes)) {
      case SyncHydrationLane:
         return SyncHydrationLane;
      case SyncLane:
         return SyncLane;
      case InputContinuousHydrationLane:
         return InputContinuousHydrationLane;
      case InputContinuousLane:
         return InputContinuousLane;
      case DefaultHydrationLane:
         return DefaultHydrationLane;
      case DefaultLane:
         return DefaultLane;
      case GestureLane:
         return GestureLane;
      case TransitionHydrationLane:
         return TransitionHydrationLane;
      case TransitionLane1:
      case TransitionLane2:
      case TransitionLane3:
      case TransitionLane4:
      case TransitionLane5:
      case TransitionLane6:
      case TransitionLane7:
      case TransitionLane8:
      case TransitionLane9:
      case TransitionLane10:
      case TransitionLane11:
      case TransitionLane12:
      case TransitionLane13:
      case TransitionLane14:
         return lanes & TransitionLanes;
      case RetryLane1:
      case RetryLane2:
      case RetryLane3:
      case RetryLane4:
         return lanes & RetryLanes;
      case SelectiveHydrationLane:
         return SelectiveHydrationLane;
      case IdleHydrationLane:
         return IdleHydrationLane;
      case IdleLane:
         return IdleLane;
      case OffscreenLane:
         return OffscreenLane;
      case DeferredLane:
         // 这种情况不应该发生，因为延迟工作总是与其他工作相关联
         return NoLanes;
      default:
         // 这种情况不应该发生，但作为后备方案，返回整个位掩码
         return lanes;
   }
}

/**
 * 判断两个优先级集合是否有交集
 * 用于检查两个更新任务是否有相同的优先级
 *
 * @param {Lanes | Lane} a - 第一个优先级集合
 * @param {Lanes | Lane} b - 第二个优先级集合
 * @returns {boolean} 如果有交集返回 true，否则返回 false
 *
 * 使用场景：
 * - 检查更新任务是否需要合并
 * - 判断是否需要打断当前更新
 */
export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane): boolean {
   return (a & b) !== NoLanes;
}

/**
 * 合并两个优先级集合
 * 用于将多个更新任务的优先级合并
 *
 * @param {Lanes | Lane} a - 第一个优先级集合
 * @param {Lanes | Lane} b - 第二个优先级集合
 * @returns {Lanes} 返回合并后的优先级集合
 *
 * 使用场景：
 * - 合并多个更新任务的优先级
 * - 创建包含多个优先级的任务
 */
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
   return a | b;
}

/**
 * 从优先级集合中移除指定的优先级
 * 用于清除已完成的更新任务
 *
 * @param {Lanes} set - 要修改的优先级集合
 * @param {Lanes | Lane} subset - 要移除的优先级
 * @returns {Lanes} 返回移除后的优先级集合
 *
 * 使用场景：
 * - 清除已完成的更新任务
 * - 重置特定优先级的更新
 */
export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
   return set & ~subset;
}

/**
 * 获取两个优先级集合的交集
 * 用于找出两个更新任务共有的优先级
 *
 * @param {Lanes | Lane} a - 第一个优先级集合
 * @param {Lanes | Lane} b - 第二个优先级集合
 * @returns {Lanes} 返回两个集合的交集
 *
 * 使用场景：
 * - 找出需要同时处理的更新任务
 * - 确定更新任务的共同优先级
 */
export function intersectLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
   return a & b;
}

/**
 * 比较两个优先级，返回优先级更高的那个
 *
 * @param {Lane} a - 第一个优先级
 * @param {Lane} b - 第二个优先级
 * @returns {Lane} 返回优先级更高的 lane
 *
 * 工作原理：
 * 1. 如果 a 不是 NoLane 且 a 的优先级高于 b，返回 a
 * 2. 否则返回 b
 *
 * 注意：优先级值越小，优先级越高
 */
export function higherPriorityLane(a: Lane, b: Lane): Lane {
   return a !== NoLane && a < b ? a : b;
}

/**
 * 获取下一个要处理的优先级集合
 * 根据当前渲染状态和待处理的优先级确定下一步要处理的优先级
 *
 * @param {FiberRoot} root - Fiber 树的根节点
 * @param {Lanes} wipLanes - 当前正在处理的优先级集合
 * @returns {Lanes} 返回下一个要处理的优先级集合
 *
 * 处理逻辑：
 * 1. 如果没有待处理的优先级，返回 NoLanes
 * 2. 获取最高优先级的 lanes
 * 3. 如果已经在渲染阶段：
 *    - 只有当新优先级更高时才切换
 *    - 默认优先级更新不应该中断过渡更新
 * 4. 否则继续处理当前优先级
 */
export function getNextLanes(root: FiberRoot, wipLanes: Lanes): Lanes {
   const pendingLanes = root.pendingLanes; // 未处理的更新
   if (pendingLanes === NoLanes) {
      return NoLanes;
   }

   let nextLanes: Lanes = getHighestPriorityLanes(pendingLanes);

   if (nextLanes === NoLanes) {
      return NoLanes;
   }

   //> 如果我们已经在 render 阶段中，切换 lanes 会中断当前渲染进程导致进度丢失
   //> 只有当新 lanes 的优先级更高时，才应该这样工作
   // 如果已经在渲染阶段，需要判断是否需要中断当前渲染
   if (wipLanes !== NoLanes && wipLanes !== nextLanes) {
      const nextLane = getHighestPriorityLane(nextLanes);
      const wipLane = getHighestPriorityLane(wipLanes);

      // 判断是否需要中断当前渲染：
      // 1. 新优先级不高于当前优先级
      // 2. 新优先级是默认优先级，而当前是过渡优先级
      if (
         nextLane >= wipLane ||
         (nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes)
      ) {
         return wipLanes;
      }
   }

   // 继续处理新的优先级
   return nextLanes;
}

/**
 * 判断给定的 lanes 是否只包含非紧急优先级
 * 用于确定是否可以延迟处理这些更新
 *
 * @param {Lanes} lanes - 要检查的优先级集合
 * @returns {boolean} 如果只包含非紧急优先级返回 true，否则返回 false
 *
 * 紧急优先级包括：
 * - SyncLane: 同步优先级，需要立即处理
 * - InputContinuousLane: 输入连续优先级，如输入事件
 * - DefaultLane: 默认优先级，普通更新
 */
export function includesOnlyNonUrgentLanes(lanes: Lanes): boolean {
   // TODO: Should hydration lanes be included here? This function is only
   // used in `updateDeferredValueImpl`.
   const UrgentLanes = SyncLane | InputContinuousLane | DefaultLane;
   return (lanes & UrgentLanes) === NoLanes;
}

/**
 * 判断给定的 lanes 是否只包含过渡优先级
 * 用于确定当前更新是否都是过渡更新
 *
 * @param {Lanes} lanes - 要检查的优先级集合
 * @returns {boolean} 如果只包含过渡优先级返回 true，否则返回 false
 *
 * 过渡优先级用于处理非紧急的更新，如：
 * - 用户界面过渡动画
 * - 非关键的 UI 更新
 * - 可以被打断的更新
 */
export function includesOnlyTransitions(lanes: Lanes): boolean {
   return (lanes & TransitionLanes) === lanes;
}

/**
 * 获取下一个可用的过渡 lane
 * 实现了一个循环分配机制，确保过渡更新能够获得唯一的优先级
 *
 * @returns {Lane} 返回下一个可用的过渡 lane
 *
 * 工作原理：
 * 1. 从 TransitionLane1 开始
 * 2. 每次调用时，将 nextTransitionLane 左移一位
 * 3. 当超出 TransitionLanes 范围时，重置回 TransitionLane1
 *
 * 这种机制确保了：
 * - 每个过渡更新都能获得唯一的优先级
 * - 优先级不会无限增长
 * - 当所有优先级都被使用后，会循环重新使用
 */
export function claimNextTransitionLane(): Lane {
   // 获取当前可用的过渡 lane
   const lane = nextTransitionLane;

   // 将下一个可用的过渡 lane 左移一位
   // 这相当于将优先级提高一级
   nextTransitionLane <<= 1;

   // 检查是否超出了 TransitionLanes 的范围
   // 如果超出了范围，重置回初始值 TransitionLane1
   if ((nextTransitionLane & TransitionLanes) === NoLanes) {
      nextTransitionLane = TransitionLane1;
   }

   return lane;
}
