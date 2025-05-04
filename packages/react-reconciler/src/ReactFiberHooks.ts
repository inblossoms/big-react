import { Fiber } from "./ReactInternalTypes";

// 当前正在工作的函数组件 Fiber
let currentlyRenderingFiber: Fiber | null = null;
// 当前正在工作的新 hook
let workInProgressHook: Hook | null = null;
// 老 hook
let currentHook: Hook | null = null;

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
   const hook: Hook = {
      memoizedState: null,
      next: null,
   };

   let initialState: S;

   if (init) {
      initialState = init(initialArgs);
   } else {
      initialState = initialArgs as any;
   }

   hook.memoizedState = initialState;
   const dispatch = (action: A) => {
      const next = reducer(initialState, action);
      console.log(
         `🧠 [] \x1b[91mFile: ReactFiberHooks.ts\x1b[0m, \x1b[32mLine: 15\x1b[0m, Message: `,
         next
      );
   };

   hook.memoizedState = initialState;
   return [hook.memoizedState, dispatch];
}

function finishRenderingHooks() {
   currentlyRenderingFiber = null;
   workInProgressHook = null;
   currentHook = null;
}

type Hook = {
   memoizedState: any;
   next: null | Hook;
};
