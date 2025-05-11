import {
   registerSimpleEvents,
   topLevelEventsToReactNames,
} from "../DOMEventProperties";
import { DOMEventName } from "../DOMEventNames";
import { Fiber } from "react-reconciler/src/ReactInternalTypes";
import {
   AnyNativeEvent,
   DispatchQueue,
   accumulateSinglePhaseListeners,
} from "../DOMPluginEventSystem";
import { IS_CAPTURE_PHASE, type EventSystemFlags } from "../EventSystemFlags";
import { SyntheticEvent, SyntheticMouseEvent } from "../SyntheticEvent";

/**
 * DOM 事件注册：
 * 从原生事件中提取合成事件
 * 根据事件类型创建对应的合成事件对象，并收集相关的事件监听器
 *
 * @param dispatchQueue - 事件分发队列，用于存储待分发的事件和监听器
 * @param domEventName - DOM事件名称，如'click'、'scroll'等
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
   // 将DOM事件名转换为React事件名（如：click -> onClick）
   const reactName = topLevelEventsToReactNames.get(domEventName);
   if (reactName === undefined) {
      return;
   }

   // 默认使用基础合成事件构造函数
   let SyntheticEventCtor: any = SyntheticEvent;

   // 根据事件类型选择对应的合成事件构造函数
   switch (domEventName) {
      case "click": {
         // Firefox在右键点击时会触发click事件，这里过滤掉这些不需要的事件
         // TODO: 已在Firefox中修复，可能可以移除这个检查
         if ((nativeEvent as MouseEvent).button === 2) {
            return;
         }
         SyntheticEventCtor = SyntheticMouseEvent;
         break;
      }
      case "auxclick":
      case "dblclick":
      case "mousedown":
      case "mousemove":
      case "mouseup":
      // TODO: 禁用的元素不应该响应鼠标事件
      case "mouseout":
      case "mouseover":
      case "contextmenu": {
         SyntheticEventCtor = SyntheticMouseEvent;
         break;
      }
   }

   // 判断是否处于捕获阶段
   const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;

   // 对于scroll和scrollend事件，只在冒泡阶段触发
   const accumulateTargetOnly =
      !inCapturePhase &&
      (domEventName === "scroll" || domEventName === "scrollend");

   // 收集事件监听器
   const listeners = accumulateSinglePhaseListeners(
      targetInst,
      reactName,
      nativeEvent.type,
      inCapturePhase,
      accumulateTargetOnly,
      nativeEvent
   );

   // 如果有监听器，创建合成事件并加入分发队列
   if (listeners.length > 0) {
      const event = new SyntheticEventCtor(
         reactName,
         domEventName,
         null,
         nativeEvent,
         nativeEventTarget
      );
      dispatchQueue.push({ event, listeners });
   }
}

// 导出事件注册和提取函数
export { registerSimpleEvents as registerEvents, extractEvents };
