import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostRoot } from "./ReactWorkTags";

// 当前正在工作的函数组件 Fiber
let currentlyRenderingFiber: Fiber | null = null;
// 当前正在工作的新 hook
let workInProgressHook: Hook | null = null;
// 老 hook
let currentHook: Hook | null = null;

/**
 * 更新工作中的 hook：返回当前 hook <useState> 并构建 hook 链表
 * @returns
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

export function renderWithHooks(
   current: Fiber | null,
   workInProgress: Fiber
): any {
   const { type, pendingProps } = workInProgress;
   currentlyRenderingFiber = workInProgress;

   workInProgress.memoizedState = null; // 更新每一个函数组件的 memoizedState hooks 链表

   //> 函数组件：type 为组件本身，pendingProps 为即将用于更新的 props
   let children = type(pendingProps);

   //* 不需要在当前宿主函数中开始时执行，函数组件的每一次重新调用到会重置上下文
   finishRenderingHooks();

   return children;
}

export function useReducer<S, I, A>(
   reducer: (state: S, action: A) => S,
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

function finishRenderingHooks() {
   currentlyRenderingFiber = null;
   workInProgressHook = null;
   currentHook = null;
}

function dispatchReducerAction<S, I, A>(
   fiber: Fiber,
   hook: Hook,
   reducer: (state: S, action: A) => S,
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

   scheduleUpdateOnFiber(root, fiber);
}

/**
 * 获取 fiber 的根节点
 * @param sourceFiber
 * @returns
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

type Dispatch<A> = (action: A) => void;
