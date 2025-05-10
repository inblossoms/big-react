import {
   DiscreteEventPriority,
   EventPriority,
   getCurrentUpdatePriority,
   IdleEventPriority,
   setCurrentUpdatePriority,
} from "react-reconciler/src/ReactEventPriorities";

import { ContinuousEventPriority } from "react-reconciler/src/ReactEventPriorities";

import { DefaultEventPriority } from "react-reconciler/src/ReactEventPriorities";
import { EventSystemFlags } from "./EventSystemFlags";
import { DOMEventName } from "./DOMEventNames";
import {
   IdleSchedulerPriority,
   getCurrentSchedulerPriorityLevel,
   LowSchedulerPriority,
   NormalSchedulerPriority,
   UserBlockingSchedulerPriority,
   ImmediateSchedulerPriority,
} from "scheduler/index";

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

function dispatchDiscreteEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   container: EventTarget,
   nativeEvent: AnyNativeEvent
) {
   console.log(
      `🧠 [] \x1b[91mFile: ReactDOMEventListener.ts\x1b[0m, \x1b[32mLine: 57\x1b[0m, Message: `,
      arguments
   );
}

function dispatchContinuousEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   container: EventTarget,
   nativeEvent: AnyNativeEvent
) {}

export function dispatchEvent(
   domEventName: DOMEventName,
   eventSystemFlags: EventSystemFlags,
   targetContainer: EventTarget,
   nativeEvent: AnyNativeEvent
): void {}

export function getEventPriority(domEventName: DOMEventName): EventPriority {
   switch (domEventName) {
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
         // We might be in the Scheduler callback.
         // Eventually this mechanism will be replaced by a check
         // of the current priority on the native scheduler.
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
