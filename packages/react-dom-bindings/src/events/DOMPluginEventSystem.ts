import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { EventSystemFlags, IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { DOMEventName } from "./DOMEventNames";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import { allNativeEvents } from "./EventRegistry";
import {
   addEventBubbleListener,
   addEventCaptureListener,
} from "./EventListener";

// TODO: remove top-level side effect.
SimpleEventPlugin.registerEvents();
// EnterLeaveEventPlugin.registerEvents();
// ChangeEventPlugin.registerEvents();
// SelectEventPlugin.registerEvents();
// BeforeInputEventPlugin.registerEvents();

export const mediaEventTypes: Array<DOMEventName> = [
   "abort",
   "canplay",
   "canplaythrough",
   "durationchange",
   "emptied",
   "encrypted",
   "ended",
   "error",
   "loadeddata",
   "loadedmetadata",
   "loadstart",
   "pause",
   "play",
   "playing",
   "progress",
   "ratechange",
   "resize",
   "seeked",
   "seeking",
   "stalled",
   "suspend",
   "timeupdate",
   "volumechange",
   "waiting",
];

//> 该类事件在 DOM 中的冒泡行为并不一致，应该直接在实际的目标元素上设置 并不将其委托给容器
export const nonDelegatedEvents: Set<DOMEventName> = new Set([
   "cancel",
   "close",
   "invalid",
   "load",
   "scroll",
   "toggle",
   ...mediaEventTypes,
]);

const listeningMarker =
   "__react_dom_event_plugin_listening" + Math.random().toString(36).slice(2);

// 事件绑定
export function listenToAllSupportedEvents(rootContainerElement: EventTarget) {
   // 防止重复注册
   if ((rootContainerElement as any)[listeningMarker]) {
      return;
   }

   (rootContainerElement as any)[listeningMarker] = true;
   // 遍历所有事件类型，注册事件
   allNativeEvents.forEach((domEventName) => {
      //todo 特殊事件：selectionchange 绑定在 document 上
      if (domEventName !== "selectionchange") {
         // 捕获阶段
         listenToNativeEvent(domEventName, true, rootContainerElement);
         //? 冒泡阶段，针对特殊事件不做冒泡处理
         if (!nonDelegatedEvents.has(domEventName)) {
            listenToNativeEvent(domEventName, false, rootContainerElement);
         }
      }
   });
}

/**
 * 注册事件
 * @param domEventName 事件名称
 * @param isCapturePhaseListener 是否在捕获阶段
 * @param target 根容器元素
 */
export function listenToNativeEvent(
   domEventName: DOMEventName,
   isCapturePhaseListener: boolean,
   target: EventTarget
): void {
   let eventSystemFlags = 0;
   if (isCapturePhaseListener) {
      eventSystemFlags |= IS_CAPTURE_PHASE;
   }
   addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener
   );
}

function addTrappedEventListener(
   targetContainer: EventTarget,
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   isCapturePhaseListener: boolean
) {
   //! 1. 获取对应事件（事件定义在 ReactDOMEventListener.js）
   let listener = createEventListenerWrapperWithPriority(
      targetContainer,
      domEventName,
      eventSystemFlags
   );

   //! 2. 绑定事件
   if (isCapturePhaseListener) {
      addEventCaptureListener(targetContainer, domEventName, listener);
   } else {
      addEventBubbleListener(targetContainer, domEventName, listener);
   }
}
