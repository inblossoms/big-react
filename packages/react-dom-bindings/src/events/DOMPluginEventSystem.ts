import { DOMEventName } from "./DOMEventNames";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";

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

export const nonDelegatedEvents: Set<DOMEventName> = new Set([
   "cancel",
   "close",
   "invalid",
   "load",
   "scroll",
   "toggle",
   ...mediaEventTypes,
]);

// 事件绑定
export function listenToAllSupportedEvents() {}
