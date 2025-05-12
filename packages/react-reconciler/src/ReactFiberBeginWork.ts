import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import {
   HostRoot,
   HostComponent,
   HostText,
   Fragment,
   ClassComponent,
   FunctionComponent,
   ContextProvider,
   ContextConsumer,
   MemoComponent,
   SimpleMemoComponent,
} from "./ReactWorkTags";
import { Fiber } from "./ReactInternalTypes";
import { isString, isNumber } from "shared/utils";
import { renderWithHooks } from "./ReactFiberHooks";
import { pushProvider, readContext } from "./ReactFiiberNewContext";
import {
   createFiberFromTypeAndProps,
   createWorkInProgress,
   isSimpleFunctionComponent,
} from "./ReactFiber";
import shallowEqual from "shared/shallowEqual";

// 协调
// 1. 根据 fiber 的类型，执行不同的逻辑
// 2. 返回子 child fiber
export function beginWork(
   current: Fiber | null,
   workInProgress: Fiber
): Fiber | null {
   switch (workInProgress.tag) {
      case HostRoot: //> div.root 根节点
         return updateHostRoot(current, workInProgress);
      case HostComponent: //> 原生组件
         return updateHostComponent(current, workInProgress);
      case HostText:
         return updateHostText(current, workInProgress);
      case Fragment:
         return updateHostFragment(current, workInProgress);
      case ClassComponent:
         return updateClassComponent(current, workInProgress);
      case FunctionComponent:
         return updateFunctionComponent(current, workInProgress);
      case ContextProvider:
         return updateContextProvider(current, workInProgress);
      case ContextConsumer:
         return updateContextConsumer(current, workInProgress);
      case MemoComponent:
         return updateMemoComponent(current, workInProgress);
      case SimpleMemoComponent:
         return updateSimpleMemoComponent(current, workInProgress);
   }

   throw new Error(
      `Unknown unit of work tag: ${workInProgress.tag}, this error is likely caused by a bug in React. Please file an issue.`
   );
}
function updateMemoComponent(current: Fiber | null, workInProgress: Fiber) {
   // memo 缓存组件
   const Component = workInProgress.type;
   // 子组件 type
   const type = Component.type;

   //> 如果是组件的初次渲染，组件直接渲染即可
   if (current === null) {
      //! 1. 初次渲染，未定义 compare
      if (
         isSimpleFunctionComponent(type) &&
         Component.compare === null &&
         Component.defaultProps === undefined
      ) {
         workInProgress.type = type;
         workInProgress.tag = SimpleMemoComponent;
         return updateSimpleMemoComponent(current, workInProgress);
      }

      //! 2. 初次渲染，定义 compare
      const child = createFiberFromTypeAndProps(
         type,
         null,
         workInProgress.pendingProps
      );

      child.return = workInProgress;
      workInProgress.child = child;
      return child;
   }

   //> 如果是更新渲染阶段，那么需要根据用户 compare 自定义 props 来决定是否需要重新渲染
   let compare = Component.compare;
   compare = compare === null ? shallowEqual : compare;

   if (compare(current.memoizedProps, workInProgress.pendingProps)) {
      return bailoutOnAlreadyFinishedWork();
   }

   // 更新
   const newChild = createWorkInProgress(
      current.child as Fiber,
      workInProgress.pendingProps
   );

   newChild.return = workInProgress;
   workInProgress.child = newChild;
   return newChild;
}

function updateSimpleMemoComponent(
   current: Fiber | null,
   workInProgress: Fiber
) {
   if (current !== null) {
      // 组件更新，由于到达这里的上层中并没有 compare 所以进行 props 的浅比较
      if (shallowEqual(current.memoizedProps, workInProgress.pendingProps)) {
         return bailoutOnAlreadyFinishedWork();
      }
   }
   return updateFunctionComponent(current, workInProgress);
}

function bailoutOnAlreadyFinishedWork() {
   return null;
}

function updateContextConsumer(current: Fiber | null, workInProgress: Fiber) {
   const context = workInProgress.type;
   const value = readContext(context);
   //> workInProgress.pendingProps.children -> pendingProps 存储了用于组件的最新值
   //> consumer 组件内会接收一个函数，而这个函数就是这里的 pendingProps.children
   const render = workInProgress.pendingProps.children;
   //> 将 craeteContext 提供的的值传递给这个回调
   const newChildren = render(value);

   reconcileChildren(current, workInProgress, newChildren);
   return workInProgress.child;
}

function updateContextProvider(current: Fiber | null, workInProgress: Fiber) {
   const context = workInProgress.type._context;
   const value = workInProgress.pendingProps.value;

   //    context._currentValue = value;

   //? context provider 可以多层嵌套，那么如何访问到距离子组件最近的那个 provider ？
   //> 通过一个栈结构来记录：context value，从而让后代组件消费
   pushProvider(context, value);

   reconcileChildren(
      current,
      workInProgress,
      workInProgress.pendingProps.children
   );

   return workInProgress.child;
}

function updateHostFragment(current: Fiber | null, workInProgress: Fiber) {
   const nextChildren = workInProgress.pendingProps.children;

   reconcileChildren(current, workInProgress, nextChildren);
   return workInProgress.child;
}

/**
 * 处理更新文本节点，文本节点没有子节点，所以不需要协调
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @returns 返回子节点
 */
function updateHostText() {
   return null;
}

/**
 * 处理更新根 fiber，此时意味着根节点已经创建好了
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @returns 返回子节点
 */
function updateHostRoot(current: Fiber | null, workInProgress: Fiber) {
   const nextChildren = workInProgress.memoizedState.element;
   reconcileChildren(current, workInProgress, nextChildren);

   //> 更新阶段
   if (current) {
      current.child = workInProgress.child; // 此时 老节点 的 child 指向 新节点的 child
   }

   return workInProgress.child;
}

/**
 * 处理更新原生组件，1. 如若是初次渲染，那么涉及到的行为只有协调（此时没有 fiber 树生成）；
 * 2. 如若是更新行为，这涉及到协调或者是 bailout
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @returns 返回子节点
 */
function updateHostComponent(current: Fiber | null, workInProgress: Fiber) {
   const { type, pendingProps } = workInProgress;
   const nextProps = workInProgress.pendingProps;
   let nextChildren = nextProps.children;

   const isDirectTextChild = shouldSetTextContent(type, pendingProps);
   //> 如果原生标签只有一个文本，此时文本不再生成 fiber 节点，而是做为这个原生标签的属性
   if (isDirectTextChild /* 文本属性 */) {
      nextChildren = null;

      return null;
   }

   reconcileChildren(current, workInProgress, nextChildren);

   return workInProgress.child;
}

function updateClassComponent(current: Fiber | null, workInProgress: Fiber) {
   const { type, pendingProps } = workInProgress;

   // contextType 是一个静态属性值，需要通过实例来访问：type.contextType
   const context = readContext(type.contextType);
   let instance = workInProgress.stateNode;

   if (current === null) {
      instance = new type(pendingProps);
      workInProgress.stateNode = instance;
   }

   instance.context = context;
   // 调用render方法获取子元素
   const nextChildren = instance.render();
   // 将子元素转换为fiber节点
   reconcileChildren(current, workInProgress, nextChildren);

   return workInProgress.child;
}

function updateFunctionComponent(current: Fiber | null, workInProgress: Fiber) {
   // 调用函数组件获取子元素

   const nextChildren = renderWithHooks(current, workInProgress);

   // 将子元素转换为fiber节点
   reconcileChildren(current, workInProgress, nextChildren);
   return workInProgress.child;
}

/**
 * 协调子 fiber，构建新的 fiber tree
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @param nextChildren 新子 fiber，无法确认需要协调的 fiber 类型： any
 */
function reconcileChildren(
   current: Fiber | null,
   workInProgress: Fiber,
   nextChildren: any
) {
   if (current === null) {
      //? 初次渲染 执行挂载行为
      workInProgress.child = mountChildFibers(
         workInProgress,
         null,
         nextChildren
      );
   } else {
      //* 对于 root 根节点在浏览器默认行为的渲染中便已经挂载了，所以对于 root 根节点来说，此时它要执行的是更新行为
      //? 更新
      workInProgress.child = reconcileChildFibers(
         workInProgress,
         current.child, // 老的第一个子 fiber
         nextChildren
      );
   }
}

function shouldSetTextContent(type: string, props: any): any {
   return (
      type === "textarea" ||
      type === "noscript" ||
      isString(props.children) ||
      isNumber(props.children) ||
      (typeof props.dangerouslySetInnerHTML === "object" &&
         props.dangerouslySetInnerHTML !== null &&
         props.dangerouslySetInnerHTML.__html != null)
   );
}
