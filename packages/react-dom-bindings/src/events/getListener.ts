import type { Fiber } from "react-reconciler/src/ReactInternalTypes";

import { getFiberCurrentPropsFromNode } from "../client/ReactDOMComponentTree";

/**
 * 检查元素是否为可交互元素
 * @param tag 元素的标签名
 * @returns 如果是可交互元素（button、input、select、textarea）则返回 true，否则返回 false
 */
function isInteractive(tag: string): boolean {
   return (
      tag === "button" ||
      tag === "input" ||
      tag === "select" ||
      tag === "textarea"
   );
}

/**
 * 检查事件是否应该被禁止
 * @param name 事件名称（如 onClick、onMouseDown 等）
 * @param type 元素类型
 * @param props 元素的属性
 * @returns 如果事件应该被禁止则返回 true，否则返回 false
 */
function shouldPreventMouseEvent(
   name: string,
   type: string,
   props: any
): boolean {
   switch (name) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
         return !!(props.disabled && isInteractive(type));
      default:
         return false;
   }
}

/**
 * 获取元素上注册的事件监听器
 * @param inst 事件源实例（Fiber 节点）
 * @param registrationName 事件监听器名称（如 onClick）
 * @returns 返回存储的回调函数，如果不存在或事件被禁止则返回 null
 * @throws 如果找到的监听器不是函数类型，则抛出错误
 */
export default function getListener(
   inst: Fiber,
   registrationName: string
): Function | null {
   const stateNode = inst.stateNode;
   if (stateNode === null) {
      // Work in progress (ex: onload events in incremental mode).
      return null;
   }

   //> 可以通过 props 获取到节点对应的 listener (props)，前提是：
   //! 节点 fiber 上需要存储了数据 -> ReactFiberCompleteWork.ts
   const props = getFiberCurrentPropsFromNode(stateNode);
   if (props === null) {
      // Work in progress.
      return null;
   }
   // $FlowFixMe[invalid-computed-prop]
   const listener = props[registrationName];
   if (shouldPreventMouseEvent(registrationName, inst.type, props)) {
      return null;
   }

   if (listener && typeof listener !== "function") {
      throw new Error(
         `Expected \`${registrationName}\` listener to be a function, instead got a value of \`${typeof listener}\` type.`
      );
   }

   return listener;
}
