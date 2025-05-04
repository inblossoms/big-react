import { isNumber, isString } from "shared/utils";
import {
   ClassComponent,
   Fragment,
   FunctionComponent,
   HostComponent,
   HostRoot,
   HostText,
} from "./ReactWorkTags";
import type { Fiber } from "./ReactInternalTypes";

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
      case Fragment:
      case HostRoot:
         return null;

      case HostComponent: {
         const { type } = workInProgress;
         //? 1. 获取 DOM 元素
         const instance = document.createElement(type);
         //? 2. 初始化 DOM 元素
         finalizeInitialChildren(instance, newProps);
         //? 3. 将子 DOM 元素添加到父级 DOM 元素中
         appendAllChildren(instance, workInProgress);
         //? 4. 返回子 fiber
         workInProgress.stateNode = instance;

         return null;
      }

      case HostText:
         workInProgress.stateNode = document.createTextNode(newProps);
         return null;
   }

   throw new Error(
      `Unknown unit of work tag: ${workInProgress.tag}. This is error likely caused by a bug in React. Please file an issue.`
   );
}

/**
 * 初始化 DOM 元素
 * @param el DOM 元素
 * @param props 属性
 */
function finalizeInitialChildren(el: Element, props: any) {
   for (const propKey in props) {
      if (Object.prototype.hasOwnProperty.call(props, propKey)) {
         const nextProp = props[propKey];

         if (propKey === "children") {
            if (isString(nextProp) || isNumber(nextProp)) {
               el.textContent = String(nextProp);
            }
         } else {
            // attribute: eg > class name
            if (propKey === "onClick") {
               el.addEventListener("click", nextProp);
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
function isHost(node: Fiber): boolean {
   return node.tag === HostComponent || node.tag === HostText;
}
