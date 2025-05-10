import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { EventSystemFlags, IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { DOMEventName } from "./DOMEventNames";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import { allNativeEvents } from "./EventRegistry";
import { Fiber } from "react-reconciler/src/ReactInternalTypes";
import {
   addEventBubbleListener,
   addEventCaptureListener,
} from "./EventListener";
import { HostComponent } from "react-reconciler/src/ReactWorkTags";
import getListener from "./getListener";

/** 原生事件类型 */
export type AnyNativeEvent = Event | KeyboardEvent | MouseEvent | TouchEvent;

/** 事件分发监听器类型 */
export type DispatchListener = {
   /** 对应的 Fiber 节点 */
   instance: null | Fiber;
   /** 事件监听函数 */
   listener: Function;
   /** 当前事件目标 */
   currentTarget: EventTarget;
};

/** 事件分发条目类型 */
type DispatchEntry = {
   /** 原生事件对象 */
   event: AnyNativeEvent;
   /** 事件监听器数组 */
   listeners: Array<DispatchListener>;
};

/** 事件分发队列类型 */
export type DispatchQueue = Array<DispatchEntry>;

// TODO: remove top-level side effect.
SimpleEventPlugin.registerEvents();
// EnterLeaveEventPlugin.registerEvents();
// ChangeEventPlugin.registerEvents();
// SelectEventPlugin.registerEvents();
// BeforeInputEventPlugin.registerEvents();

/**
 * 提取事件并添加到分发队列中
 * @param dispatchQueue 事件分发队列
 * @param domEventName DOM 事件名称
 * @param targetInst 目标 Fiber 节点
 * @param nativeEvent 原生事件对象
 * @param nativeEventTarget 原生事件目标
 * @param eventSystemFlags 事件系统标志
 * @param targetContariner 目标容器
 */
export function extractEvents(
   dispatchQueue: DispatchQueue,
   domEventName: DOMEventName,
   targetInst: null | Fiber,
   nativeEvent: AnyNativeEvent,
   nativeEventTarget: null | EventTarget,
   eventSystemFlags: EventSystemFlags,
   targetContariner: EventTarget
) {
   //> 由于并不是所有事件都存在冒泡行为，所以需要做出区分
   SimpleEventPlugin.extractEvents(
      dispatchQueue,
      domEventName,
      targetInst,
      nativeEvent,
      nativeEventTarget,
      eventSystemFlags,
      targetContariner
   );

   //todo 事件区分
}

/** 媒体相关事件类型列表 */
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

/** 非委托事件集合（这些事件不会冒泡，需要直接绑定在目标元素上） */
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

/**
 * 为根容器元素注册所有支持的事件监听器
 * @param rootContainerElement 根容器元素
 */
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
 * 注册原生事件监听器
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

/**
 * 添加事件监听器
 * @param targetContainer 目标容器
 * @param domEventName DOM 事件名称
 * @param eventSystemFlags 事件系统标志
 * @param isCapturePhaseListener 是否在捕获阶段
 */
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

/**
 * 收集单个阶段的事件监听器
 * @param targetFiber 目标 Fiber 节点
 * @param reactName React 事件名称
 * @param nativeEventType 原生事件类型
 * @param inCapturePhase 是否在捕获阶段
 * @param accumulateTargetOnly 是否只收集目标节点的事件
 * @param nativeEvent 原生事件对象
 * @returns 返回收集到的事件监听器数组
 */
export function accumulateSinglePhaseListeners(
   targetFiber: Fiber | null,
   reactName: string | null,
   nativeEventType: string,
   inCapturePhase: boolean,
   accumulateTargetOnly: boolean,
   nativeEvent: AnyNativeEvent
): Array<DispatchListener> {
   const captureName = reactName !== null ? reactName + "Capture" : null;
   const reactEventName = inCapturePhase ? captureName : reactName;

   let listeners: Array<DispatchListener> = [];
   let instance = targetFiber;

   //! 通过 target -> root （从内向外） 累积所有 fiber 和 listeners。
   while (instance !== null) {
      const { stateNode, tag } = instance;
      // 处理位于 HostComponents（即 <div> 元素）上的 listeners
      if (tag === HostComponent) {
         // 标准 React on* listeners, i.e. onClick or onClickCapture
         //> 通过 fiber: instance 和 name: reactEventName 提取事件
         const listener = getListener(instance, reactEventName as string);
         if (listener != null) {
            listeners.push({
               instance,
               listener,
               currentTarget: stateNode,
            });
         }
      }
      // 如果只是为 target累积事件 （eg: scroll、scrollend 事件，只需对 target 本身做事件记录，不需要向上传递）
      // 那么我们就不会继续通过 React Fiber 树传播以查找其他 listener
      if (accumulateTargetOnly) {
         break;
      }
      instance = instance.return;
   }
   return listeners;
}
