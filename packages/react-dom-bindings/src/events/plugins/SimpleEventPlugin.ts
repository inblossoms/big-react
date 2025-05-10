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

function extractEvents(
   dispatchQueue: DispatchQueue,
   domEventName: DOMEventName,
   targetInst: null | Fiber,
   nativeEvent: AnyNativeEvent,
   nativeEventTarget: null | EventTarget,
   eventSystemFlags: EventSystemFlags,
   targetContainer: EventTarget
): void {
   // click->onClick
   const reactName = topLevelEventsToReactNames.get(domEventName);
   if (reactName === undefined) {
      return;
   }

   const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0; // 如果是 scroll 事件，或者是 scrollend 事件，那么只会在冒泡阶段触发

   //> 如果是 scroll 事件，或者是 scrollend 事件，那么只会在冒泡阶段触发
   const accumulateTargetOnly =
      !inCapturePhase &&
      (domEventName === "scroll" || domEventName === "scrollend");

   const listeners = accumulateSinglePhaseListeners(
      targetInst,
      reactName,
      nativeEvent.type,
      inCapturePhase,
      accumulateTargetOnly,
      nativeEvent
   );

   if (listeners.length > 0) {
      dispatchQueue.push({ event: nativeEvent, listeners });
   }
}

export { registerSimpleEvents as registerEvents, extractEvents };
