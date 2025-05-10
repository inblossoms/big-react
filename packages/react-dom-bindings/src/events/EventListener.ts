export function addEventBubbleListener(
   target: EventTarget,
   eventType: string,
   listener: Function
): Function {
   target.addEventListener(eventType, listener as any, false);
   return listener;
}

export function addEventCaptureListener(
   target: EventTarget,
   eventType: string,
   listener: Function
): Function {
   target.addEventListener(eventType, listener as any, true);
   return listener;
}

export function removeEventListener(
   target: EventTarget,
   eventType: string,
   listener: Function,
   capture: boolean
): void {
   target.removeEventListener(eventType, listener as any, capture);
}
