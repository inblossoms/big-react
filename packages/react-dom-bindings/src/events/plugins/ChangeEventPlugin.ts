/**
 * Change事件插件
 * 用于处理表单元素的change事件，包括input、select、textarea等
 *
 * 主要功能：
 * 1. 注册change相关的事件
 * 2. 从原生事件中提取合成事件
 * 3. 处理不同表单元素的change事件差异
 */

import type { Fiber } from "react-reconciler/src/ReactInternalTypes";
import type { DOMEventName } from "../DOMEventNames";
import inTextInputElement from "../isTextInputElement";
import { type EventSystemFlags } from "../EventSystemFlags";
import { registerTwoPhaseEvent } from "../EventRegistry";
import {
   type AnyNativeEvent,
   accumulateTwoPhaseListeners,
} from "../DOMPluginEventSystem";
import { SyntheticEvent } from "../SyntheticEvent";
import { type DispatchQueue } from "../DOMPluginEventSystem";

/**
 * 从原生事件中提取合成事件
 * 根据事件类型创建对应的合成事件对象，并收集相关的事件监听器
 *
 * @param dispatchQueue - 事件分发队列，用于存储待分发的事件和监听器
 * @param domEventName - DOM事件名称，如'input'、'change'等
 * @param targetInst - 目标Fiber节点实例，用于事件冒泡
 * @param nativeEvent - 原生DOM事件对象
 * @param nativeEventTarget - 原生事件的目标元素
 * @param eventSystemFlags - 事件系统标志，用于标识事件阶段（捕获/冒泡）
 * @param targetContainer - 事件目标容器
 */
function extractEvents(
   dispatchQueue: DispatchQueue,
   domEventName: DOMEventName,
   targetInst: null | Fiber,
   nativeEvent: AnyNativeEvent,
   nativeEventTarget: null | EventTarget,
   eventSystemFlags: EventSystemFlags,
   targetContainer: EventTarget
): void {
   // 获取目标DOM节点
   const targetNode = targetInst ? targetInst.stateNode : null;

   // 处理文本输入元素的change事件
   if (inTextInputElement(targetNode)) {
      // 监听input和change事件
      if (domEventName === "input" || domEventName === "change") {
         // 收集onChange事件监听器
         const listeners = accumulateTwoPhaseListeners(targetInst, "onChange");

         // 如果有监听器，创建合成事件并加入分发队列
         if (listeners.length > 0) {
            const event = new SyntheticEvent(
               "onChange",
               "change",
               null,
               nativeEvent,
               nativeEventTarget
            );

            dispatchQueue.push({ event, listeners });
         }
      }
   }

   // TODO: 实现其他类型表单元素的change事件处理
   // 1. select元素的change事件
   // 2. checkbox和radio的change事件
   // 3. file input的change事件
}

/**
 * 注册change相关的事件
 * 将React事件名与原生DOM事件名建立映射关系
 *
 * 注册的事件包括：
 * 1. change - 值改变时触发
 * 2. click - 用于checkbox和radio
 * 3. focusin/focusout - 用于处理焦点相关的变化
 * 4. input - 用于文本输入
 * 5. keydown/keyup - 用于键盘输入
 * 6. selectionchange - 用于文本选择
 */
function registerEvents() {
   registerTwoPhaseEvent("onChange", [
      "change",
      "click",
      "focusin",
      "focusout",
      "input",
      "keydown",
      "keyup",
      "selectionchange",
   ]);
}

export { registerEvents, extractEvents };
