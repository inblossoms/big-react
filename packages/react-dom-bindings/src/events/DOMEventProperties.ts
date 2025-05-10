import { DOMEventName } from "./DOMEventNames";
import { registerTwoPhaseEvent } from "./EventRegistry";

export const topLevelEventsToReactNames: Map<DOMEventName, string> = new Map();

const simpleEventPluginEvents = [
   "abort",
   "auxClick",
   "cancel",
   "canPlay",
   "canPlayThrough",
   "click",
   "close",
   "contextMenu",
   "copy",
   "cut",
   "drag",
   "dragEnd",
   "dragEnter",
   "dragExit",
   "dragLeave",
   "dragOver",
   "dragStart",
   "drop",
   "durationChange",
   "emptied",
   "encrypted",
   "ended",
   "error",
   "gotPointerCapture",
   "input",
   "invalid",
   "keyDown",
   "keyPress",
   "keyUp",
   "load",
   "loadedData",
   "loadedMetadata",
   "loadStart",
   "lostPointerCapture",
   "mouseDown",
   "mouseMove",
   "mouseOut",
   "mouseOver",
   "mouseUp",
   "paste",
   "pause",
   "play",
   "playing",
   "pointerCancel",
   "pointerDown",
   "pointerMove",
   "pointerOut",
   "pointerOver",
   "pointerUp",
   "progress",
   "rateChange",
   "reset",
   "resize",
   "seeked",
   "seeking",
   "stalled",
   "submit",
   "suspend",
   "timeUpdate",
   "touchCancel",
   "touchEnd",
   "touchStart",
   "volumeChange",
   "scroll",
   "toggle",
   "touchMove",
   "waiting",
   "wheel",
];

/**
 * 注册简单事件
 * @param domEventName 原生事件名称
 * @param reactName 事件名称
 */
function registerSimpleEvent(domEventName: DOMEventName, reactName: string) {
   topLevelEventsToReactNames.set(domEventName, reactName);
   registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents() {
   simpleEventPluginEvents.forEach((eventName) => {
      const domEventName = eventName.toLowerCase() as DOMEventName;
      const capitalizedEventName =
         eventName.charAt(0).toUpperCase() + eventName.slice(1);
      registerSimpleEvent(domEventName, "on" + capitalizedEventName);
   });

   registerSimpleEvent("dblclick", "onDoubleClick");
   registerSimpleEvent("focusin", "onFocus");
   registerSimpleEvent("focusout", "onBlur");
}
