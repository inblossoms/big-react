import { isFunction } from "shared/utils";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostRoot } from "./ReactWorkTags";
import { Flags, Passive, Update } from "./ReactFiberFlags";
import { HookFlags, HookLayout, HookPassive } from "./ReactHookEffectTags";

// 当前正在工作的函数组件 Fiber
let currentlyRenderingFiber: Fiber | null = null;
// 当前正在工作的新 hook
let workInProgressHook: Hook | null = null;
// 老 hook
let currentHook: Hook | null = null;

/**
 * 更新工作中的 hook：返回当前 hook <useState> 并构建 hook 链表
 * @returns 返回当前工作的 hook
 */
function updateWorkInProgressHook(): Hook {
   let hook: Hook;
   const current = currentlyRenderingFiber!.alternate;

   if (current) {
      //* update 阶段
      //> 复用老 hook

      currentlyRenderingFiber!.memoizedState = current.memoizedState;

      if (workInProgressHook) {
         workInProgressHook = hook = workInProgressHook.next!;
         currentHook = currentHook!.next;
      } else {
         // 说明此时 workInProgressHook 为空，复用老节点
         hook = workInProgressHook = currentlyRenderingFiber!.memoizedState;
         currentHook = current.memoizedState;
      }
   } else {
      //* mount 阶段
      currentHook = null;
      hook = {
         memoizedState: null,
         next: null,
      };

      if (workInProgressHook) {
         workInProgressHook = workInProgressHook.next = hook;
      } else {
         // 说明此时 workInProgressHook 为空，说明此时是第一个 hook 即头节点
         //> 更新当前工作的 hook > hook 链表的头节点
         workInProgressHook = currentlyRenderingFiber!.memoizedState = hook;
      }
   }

   return hook;
}

/**
 * 使用 hooks 渲染函数组件
 * @param current 当前 fiber 节点
 * @param workInProgress 工作中的 fiber 节点
 * @returns 返回函数组件的子元素
 */
export function renderWithHooks(
   current: Fiber | null,
   workInProgress: Fiber
): any {
   const { type, pendingProps } = workInProgress;
   currentlyRenderingFiber = workInProgress;

   workInProgress.memoizedState = null; // 更新每一个函数组件的 memoizedState hooks 链表
   workInProgress.updateQueue = null;

   //> 函数组件：type 为组件本身，pendingProps 为即将用于更新的 props
   let children = type(pendingProps);

   //* 不需要在当前宿主函数中开始时执行，函数组件的每一次重新调用到会重置上下文
   finishRenderingHooks();

   return children;
}

/**
 * 使用 reducer 管理状态
 * @param reducer reducer 函数，用于计算新的状态
 * @param initialArgs 初始状态或初始状态的计算函数
 * @param init 可选的初始化函数，用于计算初始状态
 * @returns 返回当前状态和 dispatch 函数
 */
export function useReducer<S, I, A>(
   reducer: ((state: S, action: A) => S) | null,
   initialArgs: I,
   init?: (initialArgs: I) => S
) {
   //!1.  构建 hook 链表：包括 mount 和 update 阶段
   const hook: Hook = updateWorkInProgressHook();

   let initialState: S;

   if (init !== undefined) {
      initialState = init(initialArgs);
   } else {
      initialState = initialArgs as any;
   }

   //!2. 区分组件是初次 mount 还是 update 阶段
   if (!currentlyRenderingFiber!.alternate) {
      //> mount
      hook.memoizedState = initialState;
   }

   //!3. 返回当前 hook 的 state 和 dispatch 函数
   const dispatch: Dispatch<A> = dispatchReducerAction.bind(
      //> 通过闭包保存了函数创建时的参数值，确保了 dispatch 函数在后续调用时能够访问到正确的上下文。
      //> 所以在后续调用时，各参数值不会发生变化
      null,
      currentlyRenderingFiber! as Fiber, //? 当 dipatch 被调用时，currentlyRenderingFiber 可能已经改变或为 null，但闭包确保了在创建 dispatch 时所捕获的值不会改变
      hook as Hook,
      reducer as (state: unknown, action: unknown) => unknown
   );

   return [hook.memoizedState, dispatch];
}

/**
 * 使用状态管理
 * @param initialState 初始状态或初始状态的计算函数
 * @returns 返回当前状态和更新函数
 */
export function useState<S>(initialState: (() => S) | S) {
   const init = isFunction(initialState)
      ? (initialState as () => S)()
      : initialState;
   return useReducer(null, init);
}

/**
 * 缓存计算结果
 * @param nextCreate 创建值的函数
 * @param deps 依赖项数组
 * @returns 返回缓存的值
 */
export function useMemo<T>(nextCreate: () => T, deps: any[] | void | null): T {
   const hook: Hook = updateWorkInProgressHook();
   const nextDeps = deps === undefined ? null : deps;

   const prevState = hook.memoizedState;

   if (prevState !== null) {
      if (nextDeps !== null) {
         // 存在上一次的缓存值且依赖项存在
         const prevDeps = prevState[1];
         if (areHookInputsEqual(nextDeps, prevDeps)) {
            // 依赖项未发生变化，直接返回上一次的缓存值
            return prevState[0];
         }
      }
   }

   const nextValue = nextCreate();

   hook.memoizedState = [nextValue, nextDeps];

   return nextValue;
}

/**
 * 缓存回调函数
 * @param callback 需要缓存的回调函数
 * @param deps 依赖项数组
 * @returns 返回缓存的回调函数
 */
export function useCallback<T>(callback: T, deps: any[] | void | null): T {
   const hook: Hook = updateWorkInProgressHook();
   const nextDeps = deps === undefined ? null : deps;

   const prevState = hook.memoizedState;

   if (prevState !== null) {
      if (nextDeps !== null) {
         // 存在上一次的缓存值且依赖项存在
         const prevDeps = prevState[1];
         if (areHookInputsEqual(nextDeps, prevDeps)) {
            // 依赖项未发生变化，直接返回上一次的缓存值
            return prevState[0];
         }
      }
   }

   hook.memoizedState = [callback, nextDeps];

   return callback;
}

/**
 * 创建一个可变的引用对象
 * @param initialValue 初始值
 * @returns 返回一个包含 current 属性的对象
 */
export function useRef<T>(initialValue: T): { current: T } {
   const hook = updateWorkInProgressHook();

   // === null 说明是初次渲染
   if (currentHook === null) {
      hook.memoizedState = { current: initialValue };
   }

   return hook.memoizedState;
}

/**
 * 用于优化组件渲染的 HOC
 */
export function memo() {}

/**
 * 在 DOM 更新后同步执行副作用
 * @param create 副作用函数
 * @param deps 依赖项数组
 */
export function useLayoutEffect(
   create: () => (() => void) | void, // alias: setup、effect
   deps: any[] | void | null
) {
   return updateEffectImpl(Update, HookLayout, create, deps);
}

/**
 * 在 DOM 更新后异步执行副作用
 * @param create 副作用函数
 * @param deps 依赖项数组
 */
export function useEffect(
   create: () => (() => void) | void, // alias: setup、effect
   deps: any[] | void | null
) {
   return updateEffectImpl(Passive, HookPassive, create, deps);
}

/**
 * 更新 effect 的实现，存储 effect 的创建函数和依赖项
 * @param fiberFlags 执行 effect 的时机
 * @param hookFlag hook 的标记
 * @param create 执行 effect 的函数
 * @param deps 依赖项
 */
function updateEffectImpl(
   fiberFlags: Flags,
   hookFlag: HookFlags,
   create: () => (() => void) | void,
   deps: any[] | void | null
) {
   const hook = updateWorkInProgressHook();
   const nextDeps = deps === undefined ? null : deps;

   //? 检查依赖项是否发生变化
   if (currentHook !== null /*老 hook 存在即组件更新阶段*/) {
      if (nextDeps !== null) {
         const prevDeps = hook.memoizedState.deps;
         if (prevDeps !== null) {
            if (areHookInputsEqual(nextDeps, prevDeps)) {
               return;
            }
         }
      }
   }
   currentlyRenderingFiber!.flags |= fiberFlags; // 将对应的类型添加到 fiber

   hook.memoizedState = pushEffect(hookFlag, create, nextDeps);
}

/**
 * 存储 effect 并添加 effect 到链表中
 * @param tag effect 的类型
 * @param create effect 的创建函数
 * @param deps effect 的依赖项
 * @returns
 */
function pushEffect(
   tag: HookFlags,
   create: () => (() => void) | void,
   deps: any[] | void | null
) {
   const effect: Effect = {
      tag,
      create,
      deps,
      next: null,
   };

   //* 构建 effect 链表
   let componentUpdateQueue = currentlyRenderingFiber!.updateQueue;

   if (componentUpdateQueue === null) {
      // 此时的 effect 是第一个，做为 effect 链表的头节点
      componentUpdateQueue = {
         lastEffect: null,
      };

      currentlyRenderingFiber!.updateQueue = componentUpdateQueue;

      componentUpdateQueue.lastEffect = effect.next = effect;
   } else {
      const lastEffect = componentUpdateQueue.lastEffect;
      const firstEffect = lastEffect.next;

      // 添加新 effect 到链表
      if (firstEffect !== null) {
         lastEffect.next = effect;
         componentUpdateQueue.lastEffect = effect;
         effect.next = firstEffect;
      } else {
         lastEffect.next = effect;
         componentUpdateQueue.lastEffect = effect;
      }
   }

   return effect;
}

/**
 * 检查 hook 依赖是否发生了变化
 * @param nextProps 更新后的依赖数据
 * @param prevProps 上一次更新前的依赖数据
 */
function areHookInputsEqual(
   nextProps: Array<any>,
   prevProps: Array<any> | null
): boolean {
   if (prevProps === null) {
      return false;
   }

   for (let i = 0; i < prevProps.length; i++) {
      const prev = prevProps[i];
      const next = nextProps[i];

      if (Object.is(prev, next)) {
         continue;
      }

      return false;
   }

   // 执行这个位置意味着依赖项前后完全一致
   return true;
}

/**
 * 清理操作：结束渲染 hooks
 */
function finishRenderingHooks() {
   currentlyRenderingFiber = null;
   workInProgressHook = null;
   currentHook = null;
}

/**
 * 处理 reducer 类型的 action 分发
 * @param fiber 当前工作的 fiber 节点
 * @param hook 当前工作的 hook
 * @param reducer reducer 函数
 * @param action 要分发的 action
 * @returns 返回新的状态
 */
function dispatchReducerAction<S, I, A>(
   fiber: Fiber,
   hook: Hook,
   reducer: ((state: S, action: A) => S) | null,
   action: any // setState 的初始值可能为任意类型值
) {
   //? setState 时，reducer 为 null  > setState 和 setRuducer 都会触发该函数
   //> setState 不存在 reducer

   hook.memoizedState = reducer ? reducer(hook.memoizedState, action) : action;
   const root = getRootForUpdateFiber(fiber);

   //? update 阶段：更新 fiber 树
   fiber.alternate = {
      ...fiber,
   };

   if (fiber.sibling) {
      fiber.sibling.alternate = fiber.sibling;
   }

   scheduleUpdateOnFiber(root, fiber, true);
}

/**
 * 获取 fiber 的根节点
 * @param sourceFiber 源 fiber 节点
 * @returns 返回 fiber 树的根节点
 */
function getRootForUpdateFiber(sourceFiber: Fiber): FiberRoot {
   let node: Fiber | null = sourceFiber;
   let parent = node.return;
   //? 向上遍历，直到找到根节点
   while (parent !== null) {
      node = parent;
      parent = node.return;
   }
   return node.tag === HostRoot ? node.stateNode : null;
}

type Hook = {
   memoizedState: any;
   next: null | Hook;
};

type Effect = {
   tag: HookFlags;
   create: () => (() => void) | void;
   deps: any[] | void | null;
   next: null | Effect;
};

type Dispatch<A> = (action: A) => void;
