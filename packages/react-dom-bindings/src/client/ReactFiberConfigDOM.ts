import {
   DefaultEventPriority,
   EventPriority,
} from "react-reconciler/src/ReactEventPriorities";
import { getEventPriority } from "../events/ReactDOMEventListener";

export function getCurrentEventPriority(): EventPriority {
   const currentEvent = window.event;
   if (currentEvent === undefined) {
      // ? sy ⻚⾯初次渲染
      return DefaultEventPriority;
   }
   return getEventPriority(currentEvent.type as any);
}
