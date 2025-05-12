import { ReactElement } from "shared/ReactTypes";
import { NoFlags } from "./ReactFiberFlags";
import { Fiber, FiberNode } from "./ReactInternalTypes";
import {
   HostText,
   HostComponent,
   WorkTag,
   IndeterminateComponent,
   Fragment,
   ClassComponent,
   FunctionComponent,
   ContextProvider,
   ContextConsumer,
   MemoComponent,
} from "./ReactWorkTags";
import { isFunction, isString } from "shared/utils";
import {
   REACT_CONTEXT_TYPE,
   REACT_FRAGMENT_TYPE,
   REACT_MEMO_TYPE,
   REACT_PROVIDER_TYPE,
} from "shared/ReactSymbols";

/**
 * 创建当前正在工作的 workInProgress 节点，用于复用现有的 fiber 节点，适用于更新渲染
 * @param current 当前的 fiber 节点
 * @param pendingProps 新的 props
 */
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
   let workInProgress = current.alternate;

   if (workInProgress === null) {
      workInProgress = createFiber(current.tag, pendingProps, current.key);
      workInProgress!.elementType = current.elementType;
      workInProgress!.type = current.type;
      workInProgress!.stateNode = current.stateNode;

      //> 双缓存
      workInProgress!.alternate = current;
      current.alternate = workInProgress;
   } else {
      workInProgress!.pendingProps = pendingProps; // 更新 pendingProps
      workInProgress!.type = current.type;

      workInProgress!.flags = NoFlags;
   }
   //* 数据复用
   workInProgress!.flags = current.flags;

   workInProgress!.child = current.child;
   workInProgress!.memoizedProps = current.memoizedProps;
   workInProgress!.memoizedState = current.memoizedState;
   workInProgress!.updateQueue = current.updateQueue;

   workInProgress!.sibling = current.sibling;
   workInProgress!.index = current.index;

   return workInProgress as Fiber;
}

//! 创建⼀个fiber
export function createFiber(
   tag: WorkTag,
   pendingProps: any,
   key: null | string
): Fiber {
   return new FiberNode(tag, pendingProps, key);
}

/**
 * 从 ReactElement 创建 fiber
 * @param element ReactElement
 * @returns
 */
export function createFiberFromElement(element: ReactElement) {
   const { type, key, props } = element;

   const pendingProps = props;

   const fiber = createFiberFromTypeAndProps(type, key, pendingProps);

   return fiber;
}

/**
 * 从文本内容创建 fiber
 * @param content 文本内容
 * @returns
 */
export function createFiberFromText(content: string): Fiber {
   const fiber = createFiber(HostText, content, null);
   return fiber;
}

/**
 * 从类型和 props 创建 fiber，用于创建全新的 fiber 节点，适用于初次渲染
 * @param type 类型
 * @param key 唯一标识
 * @param pendingProps 新的 props
 * @returns
 */
export function createFiberFromTypeAndProps(
   type: any,
   key: any,
   pendingProps: any
) {
   let fiberTag: WorkTag = IndeterminateComponent;
   if (isFunction(type)) {
      if (type.prototype && type.prototype.isReactComponent) {
         fiberTag = ClassComponent;
      } else {
         fiberTag = FunctionComponent;
      }
   } else if (isString(type)) {
      fiberTag = HostComponent;
   } else if (type === REACT_FRAGMENT_TYPE) {
      fiberTag = Fragment;
   } else if (type.$$typeof === REACT_PROVIDER_TYPE) {
      fiberTag = ContextProvider;
   } else if (type.$$typeof === REACT_CONTEXT_TYPE) {
      fiberTag = ContextConsumer;
   } else if (type.$$typeof === REACT_MEMO_TYPE) {
      fiberTag = MemoComponent;
   }

   const fiber = createFiber(fiberTag, pendingProps, key);
   fiber.elementType = type;
   fiber.type = type;

   return fiber;
}

/**
 * 当前的组件是否是一个纯函数组件
 * @param {Fiber} type 组件
 * @returns 如果是一个纯函数组件则返回 true，否则返回 fasle
 */
export function isSimpleFunctionComponent(type: any): boolean {
   return (
      typeof type === "function" &&
      !shouldConstruct(type) &&
      type.defaultProps === undefined
   );
}

/**
 * 检查组件是否是一个类组件
 * @param Component 组件
 * @returns 如果是类组件返回 true，否则返回 fasle
 */
function shouldConstruct(Component: Function) {
   const prototype = Component.prototype;
   return !!(prototype && prototype.isReactComponent);
}
