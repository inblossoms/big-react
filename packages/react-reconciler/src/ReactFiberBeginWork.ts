import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import {
   HostRoot,
   HostComponent,
   HostText,
   Fragment,
   ClassComponent,
   FunctionComponent,
} from "./ReactWorkTags";
import { Fiber } from "./ReactInternalTypes";
import { isString, isNumber } from "shared/utils";
import { renderWithHooks } from "./ReactFiberHooks";

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
   }

   throw new Error(
      `Unknown unit of work tag: ${workInProgress.tag}, this error is likely caused by a bug in React. Please file an issue.`
   );
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
function updateHostText(current: Fiber | null, workInProgress: Fiber) {
   return null;
}

/**
 * 处理更新根 fiber
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @returns 返回子节点
 */
function updateHostRoot(current: Fiber | null, workInProgress: Fiber) {
   const nextChildren = workInProgress.memoizedState.element;
   reconcileChildren(current, workInProgress, nextChildren);
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

   const instance = new type(pendingProps);
   workInProgress.stateNode = instance;

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
