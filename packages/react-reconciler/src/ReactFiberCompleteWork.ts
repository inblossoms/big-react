import { isNumber, isString } from "shared/utils";
import {
   ClassComponent,
   ContextConsumer,
   ContextProvider,
   Fragment,
   FunctionComponent,
   HostComponent,
   HostRoot,
   HostText,
   MemoComponent,
   SimpleMemoComponent,
} from "./ReactWorkTags";
import type { Fiber } from "./ReactInternalTypes";
import { popProvider } from "./ReactFiiberNewContext";
import { registrationNameDependencies } from "../../react-dom-bindings/src/events/EventRegistry";
import {
   precacheFiberNode,
   updateFiberProps,
} from "react-dom-bindings/src/client/ReactDOMComponentTree";

export function completeWork(
   current: Fiber | null,
   workInProgress: Fiber
): Fiber | null {
   const newProps = workInProgress.pendingProps;

   // 1. 根据 fiber 的类型，执行不同的逻辑
   // 2. 返回子 fiber

   switch (workInProgress.tag) {
      case ClassComponent:
      case FunctionComponent:
      case ContextConsumer:
      case MemoComponent:
      case SimpleMemoComponent:
      case Fragment:
      case HostRoot:
         return null;
      case ContextProvider: {
         popProvider(workInProgress.type._context);
         return null;
      }
      case HostComponent: {
         const { type } = workInProgress;

         // 更新阶段要复用老节点，
         //> 挂载阶段每一次都是在创建新节点，节点的作用域信息同时也会更新。
         //> 由于更新行为要复用老节点 所以需要做出判断避免数据混乱

         if (current !== null && workInProgress.stateNode !== null) {
            updateHostComponent(current, workInProgress, type, newProps);
         } else {
            // 挂载阶段
            //? 1. 获取 DOM 元素
            const instance = document.createElement(type);
            //? 2. 初始化 DOM 元素
            finalizeInitialChildren(instance, null, newProps);
            //? 3. 将子 DOM 元素添加到父级 DOM 元素中
            appendAllChildren(instance, workInProgress);
            //? 4. 返回子 fiber
            workInProgress.stateNode = instance;
         }

         precacheFiberNode(workInProgress, workInProgress.stateNode);
         updateFiberProps(workInProgress.stateNode, newProps);
         return null;
      }

      case HostText:
         workInProgress.stateNode = document.createTextNode(newProps);

         precacheFiberNode(workInProgress, workInProgress.stateNode);
         updateFiberProps(workInProgress.stateNode, newProps);

         return null;
   }

   throw new Error(
      `Unknown unit of work tag: ${workInProgress.tag}. This is error likely caused by a bug in React. Please file an issue.`
   );
}

function updateHostComponent(
   current: Fiber,
   workInProgress: Fiber,
   type: string,
   newProps: any
) {
   if (current.memoizedProps === newProps) {
      return;
   }

   finalizeInitialChildren(
      workInProgress.stateNode as Element,
      current.memoizedProps,
      newProps
   );
}

/**
 * 初始化或更新 DOM 元素
 * @param el DOM 元素
 * @param nextProps 属性
 */
function finalizeInitialChildren(el: Element, prevProps: any, nextProps: any) {
   // 1. 遍历老的属性
   for (const propKey in prevProps) {
      if (Object.prototype.hasOwnProperty.call(prevProps, propKey)) {
         const prevProp = prevProps[propKey];

         if (propKey === "children") {
            if (isString(prevProp) || isNumber(prevProp)) {
               // 如果老的属性是文本节点，则清空文本节点 由新的属性来决定
               el.textContent = "";
            }
         } else {
            // attribute: eg> class name
            //! 在这里事件不做任何处理
            //todo 行内 style 样式处理
            if (registrationNameDependencies[propKey]) {
               //    el.removeEventListener("click", prevProp);
            } else {
               if (!(prevProp in nextProps)) {
                  (el as any)[propKey] = "";
               }
            }
         }
      }
   }

   // 2. 遍历新的属性
   for (const propKey in nextProps) {
      if (Object.prototype.hasOwnProperty.call(nextProps, propKey)) {
         const nextProp = nextProps[propKey];

         if (propKey === "children") {
            if (isString(nextProp) || isNumber(nextProp)) {
               el.textContent = String(nextProp);
            }
         } else {
            // attribute: eg > class name
            if (registrationNameDependencies[propKey]) {
               //    el.addEventListener("click", nextProp);
            } else {
               (el as any)[propKey] = nextProp;
            }
         }
      }
   }
}

/**
 * 将子节点挂载到父级 DOM 元素上
 * @param parent 父级 DOM 元素
 * @param workInProgress
 */
function appendAllChildren(parent: Element, workInProgress: Fiber) {
   let nodeFiber = workInProgress.child; //> 获取第一个子 fiber

   while (nodeFiber !== null) {
      if (isHost(nodeFiber)) {
         //> 处理原生节点，append 的前提是：node.stateNode 为 DOM 元素

         appendInitialChild(parent, nodeFiber.stateNode);
      } else if (nodeFiber.child !== null) {
         // 对于组件节点，继续遍历其子节点
         nodeFiber = nodeFiber.child;
         continue;
      }

      if (nodeFiber === workInProgress) {
         return;
      }

      while (nodeFiber.sibling === null) {
         //> 如果没有兄弟节点，向上查找 寻找其父级的兄弟节点（为什么寻找父级，为了避免一直向上查找）
         if (nodeFiber.return === null || nodeFiber.return === workInProgress) {
            //> 如果没有父节点，或者父节点是当前 fiber，说明已经到达根节点
            return;
         }

         nodeFiber = nodeFiber.return;
      }

      //> 获取下一个兄弟 fiber
      nodeFiber = nodeFiber.sibling;
   }
}

function appendInitialChild(parent: Element, child: Element) {
   parent.appendChild(child);
}

/**
 * 判断 fiber 是否是原生节点
 * @param node fiber
 * @returns 是否是原生节点
 */
export function isHost(node: Fiber): boolean {
   return node.tag === HostComponent || node.tag === HostText;
}
