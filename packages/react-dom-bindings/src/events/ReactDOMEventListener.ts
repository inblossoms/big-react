import {
   setCurrentUpdatePriority,
   IdleEventPriority,
   getCurrentUpdatePriority,
   EventPriority,
   DiscreteEventPriority,
} from "react-reconciler/src/ReactEventPriorities";

import { ContinuousEventPriority } from "react-reconciler/src/ReactEventPriorities";

import { DefaultEventPriority } from "react-reconciler/src/ReactEventPriorities";
import { EventSystemFlags, IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { DOMEventName } from "./DOMEventNames";
import {
   UserBlockingSchedulerPriority,
   NormalSchedulerPriority,
   LowSchedulerPriority,
   ImmediateSchedulerPriority,
   IdleSchedulerPriority,
   getCurrentSchedulerPriorityLevel,
} from "scheduler/index";
import {
   AnyNativeEvent,
   DispatchListener,
   DispatchQueue,
   extractEvents,
} from "./DOMPluginEventSystem";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree";
import { invokeGuardedCallbackAndCatchFirstError } from "shared/ReactErrorUtils";

/**
 * 创建带有优先级的事件监听器包装器
 * @param targetContainer 目标容器
 * @param domEventName DOM 事件名称
 * @param eventSystemFlags 事件系统标志
 * @returns 返回对应优先级的事件监听器函数
 */
export function createEventListenerWrapperWithPriority(
   targetContainer: EventTarget,
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags
): Function {
   //> 根据事件名称划分对应的优先级，再根据优先级添加不同的派发方法
   const eventPriority = getEventPriority(domEventName);
   let listenerWrapper;
   switch (eventPriority) {
      case DiscreteEventPriority:
         listenerWrapper = dispatchDiscreteEvent;
         break;
      case ContinuousEventPriority:
         listenerWrapper = dispatchContinuousEvent;
         break;
      case DefaultEventPriority:
      default:
         listenerWrapper = dispatchEvent;
         break;
   }
   return listenerWrapper.bind(
      null,
      domEventName,
      eventSystemFlags,
      targetContainer
   );
}

/**
 * 分发离散事件（高优先级）
 * @param domEventName DOM 事件名称
 * @param eventSystemFlags 事件系统标志
 * @param container 容器
 * @param nativeEvent 原生事件
 */
function dispatchDiscreteEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   container: EventTarget,
   nativeEvent: AnyNativeEvent
) {
   //> 1. 记录上一次事件优先级
   const previousPriority = getCurrentUpdatePriority();

   try {
      //> 4. 设置当前事件优先级为 DiscreteEventPriority
      setCurrentUpdatePriority(DiscreteEventPriority);
      //> 5. 调用 dispatchEvent 执行事件
      dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
   } finally {
      //> 6. 恢复
      setCurrentUpdatePriority(previousPriority);
   }
}

/**
 * 分发连续事件（中优先级）
 * @param domEventName DOM 事件名称
 * @param eventSystemFlags 事件系统标志
 * @param container 容器
 * @param nativeEvent 原生事件
 */
function dispatchContinuousEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   container: EventTarget,
   nativeEvent: AnyNativeEvent
) {
   //> 1. 记录上一次事件优先级
   const previousPriority = getCurrentUpdatePriority();

   try {
      //> 4. 设置当前事件优先级为 ContinuousEventPriority
      setCurrentUpdatePriority(ContinuousEventPriority);
      //> 5. 调用 dispatchEvent 执行事件
      dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
   } finally {
      //> 6. 恢复
      setCurrentUpdatePriority(previousPriority);
   }
}

/**
 * 分发事件
 * @param domEventName DOM 事件名称
 * @param eventSystemFlags 事件系统标志
 * @param targetContainer 目标容器
 * @param nativeEvent 原生事件
 */
export function dispatchEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags, // 当前处于捕获还是冒泡阶段
   targetContainer: EventTarget,
   nativeEvent: any //  AnyNativeEvent
): void {
   if (domEventName === "click") {
      const nativeEventTarget = nativeEvent.target;
      // 通过 nativeEventTarget 获取到的 dom 节点，来获取其对应的 fiber 中存储的事件回调
      const return_targetInst = getClosestInstanceFromNode(nativeEventTarget);

      const dispatchQueue: DispatchQueue = [];

      extractEvents(
         dispatchQueue,
         domEventName,
         return_targetInst,
         nativeEvent,
         nativeEventTarget,
         eventSystemFlags,
         targetContainer
      );

      processDispatchQueue(dispatchQueue, eventSystemFlags);
   }
}

/**
 * 获取事件优先级
 * @param domEventName DOM 事件名称
 * @returns 返回事件优先级
 */
export function getEventPriority(domEventName: DOMEventName): EventPriority {
   switch (domEventName) {
      // Used by SimpleEventPlugin
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      // Used by polyfills: (fall through)
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      // Only enableCreateEventHandleAPI: (fall through)
      case "beforeblur":
      case "afterblur":
      // Not used by React but could be by user code: (fall through)
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
         return DiscreteEventPriority;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      // Not used by React but could be by user code: (fall through)
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
         return ContinuousEventPriority;
      case "message": {
         // 我们可能在Scheduler回调中。最终，这种机制将被检查本机调度器上的当前优先级所取代。
         const schedulerPriority = getCurrentSchedulerPriorityLevel();
         switch (schedulerPriority) {
            case ImmediateSchedulerPriority:
               return DiscreteEventPriority;
            case UserBlockingSchedulerPriority:
               return ContinuousEventPriority;
            case NormalSchedulerPriority:
            case LowSchedulerPriority:
               // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
               return DefaultEventPriority;
            case IdleSchedulerPriority:
               return IdleEventPriority;
            default:
               return DefaultEventPriority;
         }
      }
      default:
         return DefaultEventPriority;
   }
}

/**
 * 处理事件分发队列
 * @param dispatchQueue 事件分发队列
 * @param eventSystemFlags 事件系统标志
 */
export function processDispatchQueue(
   dispatchQueue: DispatchQueue,
   eventSystemFlags: EventSystemFlags
): void {
   const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
   for (let i = 0; i < dispatchQueue.length; i++) {
      const { event, listeners } = dispatchQueue[i];
      processpispatchQueueItemsInOrder(event, listeners, inCapturePhase);
   }
}

/**
 * 执行事件分发
 * @param event 事件对象
 * @param listener 事件监听器
 * @param currentTarget 当前目标
 */
function executeDispatch(
   event: Event,
   listener: Function,
   currentTarget: EventTarget
): void {
   //    const type = event.type || "unknown-event";
   listener.call(currentTarget, event);
   //    event.currentTarget = currentTarget;
   //    invokeGuardedCallbackAndCatchFirstError(
   //       type,
   //       listener.bind(currentTarget),
   //       undefined,
   //       event
   //    );
   //    event.currentTarget = null;
}

/**
 * 按顺序处理事件分发队列中的项目
 * @param event 事件对象
 * @param dispatchListeners 事件监听器数组
 * @param inCapturePhase 是否在捕获阶段
 */
function processpispatchQueueItemsInOrder(
   event: Event,
   dispatchListeners: Array<DispatchListener>,
   inCapturePhase: boolean
): void {
   let previousInstance;

   if (inCapturePhase) {
      //? 捕获阶段，从外层向内层执行（监听器是在冒泡阶段从内向外收集的）
      for (let i = dispatchListeners.length - 1; i >= 0; i--) {
         const { instance, currentTarget, listener } = dispatchListeners[i];
         executeDispatch(event, listener, currentTarget);
         previousInstance = instance;
      }
   } else {
      //? 冒泡阶段则从内向外执行
      for (let i = 0; i < dispatchListeners.length; i++) {
         const { instance, currentTarget, listener } = dispatchListeners[i];
         executeDispatch(event, listener, currentTarget);
         previousInstance = instance;
      }
   }
}
