import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import * as ChangeEventPlugin from "./plugins/ChangeEventPlugin";
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
import { ReactSyntheticEvent } from "./ReactSyntheticEventType";

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
   event: ReactSyntheticEvent;
   /** 事件监听器数组 */
   listeners: Array<DispatchListener>;
};

/** 事件分发队列类型 */
export type DispatchQueue = Array<DispatchEntry>;

// TODO: remove top-level side effect.
SimpleEventPlugin.registerEvents();
// EnterLeaveEventPlugin.registerEvents();
ChangeEventPlugin.registerEvents();
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

   ChangeEventPlugin.extractEvents(
      dispatchQueue,
      domEventName,
      targetInst,
      nativeEvent,
      nativeEventTarget,
      eventSystemFlags,
      targetContariner
   );
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

   // 默认情况下，事件监听器不是被动的
   let isPassiveListener: boolean = false;

   // 对于某些特定的事件类型，我们需要将其设置为被动事件监听器
   // 这些事件通常与滚动、触摸等性能敏感的操作相关
   if (
      domEventName === "touchstart" || // 触摸开始事件
      domEventName === "touchmove" || // 触摸移动事件
      domEventName === "wheel" // 滚轮事件
   ) {
      isPassiveListener = true;
   }

   // 被动事件监听器（passive: true）的作用：
   // 1. 提高滚动性能：浏览器可以立即开始滚动，而不需要等待 JavaScript 执行
   // 2. 减少延迟：特别是在移动设备上，可以显著改善用户体验
   // 3. 优化触摸事件：对于触摸事件，被动监听器可以立即响应，提供更流畅的交互
   //
   // 注意：被动事件监听器不能调用 preventDefault()，这意味着：
   // - 不能阻止默认的滚动行为
   // - 不能阻止默认的触摸行为
   // - 不能阻止默认的滚轮行为
   //
   // 这种权衡是值得的，因为这些事件通常需要立即响应，而阻止默认行为的情况相对较少

   //! 2. 绑定事件
   if (isCapturePhaseListener) {
      addEventCaptureListener(
         targetContainer,
         domEventName,
         listener,
         isPassiveListener
      );
   } else {
      addEventBubbleListener(
         targetContainer,
         domEventName,
         listener,
         isPassiveListener
      );
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
      if (tag === HostComponent && stateNode !== null) {
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

/**
 * 收集支持捕获和冒泡两个阶段的事件监听器
 * 从目标 Fiber 节点开始，向上遍历 Fiber 树，收集所有匹配的事件监听器
 *
 * @param targetFiber - 目标 Fiber 节点，事件发生的起始位置
 * @param reactName - React 事件名称，如 'onClick'
 * @returns 返回按顺序排列的事件监听器数组，包含捕获和冒泡阶段的监听器
 *
 * @example
 * // 对于 onClick 事件，会收集：
 * // 1. 捕获阶段的监听器（onClickCapture）
 * // 2. 冒泡阶段的监听器（onClick）
 * // 监听器按照从外到内的顺序排列
 */
export function accumulateTwoPhaseListeners(
   targetFiber: Fiber | null,
   reactName: string | null
): Array<DispatchListener> {
   // 构建捕获阶段的事件名称（添加 Capture 后缀）
   const captureName = reactName !== null ? reactName + "Capture" : null;

   let listeners: Array<DispatchListener> = [];
   let instance = targetFiber;

   // 从目标节点开始，向上遍历 Fiber 树
   while (instance !== null) {
      const { stateNode, tag } = instance;
      // 只处理原生 DOM 元素节点（HostComponent）
      if (tag === HostComponent && stateNode !== null) {
         // 1. 收集捕获阶段的监听器
         const captureListener = getListener(instance, captureName as string);
         if (captureListener != null) {
            // 捕获阶段的监听器添加到数组开头，确保从外到内执行
            listeners.unshift({
               instance,
               listener: captureListener,
               currentTarget: stateNode,
            });
         }

         // 2. 收集冒泡阶段的监听器
         const bubbleListener = getListener(instance, reactName as string);
         if (bubbleListener != null) {
            // 冒泡阶段的监听器也添加到数组开头，确保正确的执行顺序
            listeners.unshift({
               instance,
               listener: bubbleListener,
               currentTarget: stateNode,
            });
         }
      }

      // 继续向上遍历父节点
      instance = instance.return;
   }

   return listeners;
}
