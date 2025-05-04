import { describe, it, expect } from "vitest";
import {
   scheduleCallback,
   NormalPriority,
   UserBlockingPriority,
   ImmediatePriority,
} from "../src/Scheduler.ts";

import type { Callback } from "../src/Scheduler.ts";

describe("任务", () => {
   it("2个相同优先级的任务", () => {
      let eventTasks: Array<string> = [];

      scheduleCallback(NormalPriority, (): Callback | null | undefined => {
         eventTasks.push("Task1");

         expect(eventTasks).toEqual(["Task1"]);

         return null;
      });

      scheduleCallback(NormalPriority, (): Callback | null | undefined => {
         eventTasks.push("Task2");
         expect(eventTasks).toEqual(["Task1", "Task2"]);

         return null;
      });
   });

   it("3个不同优先级的任务", () => {
      let eventTasks: Array<string> = [];

      scheduleCallback(NormalPriority, (): Callback | null | undefined => {
         eventTasks.push("Task1");
         expect(eventTasks).toEqual(["Task3", "Task2", "Task1"]);

         return null;
      });

      scheduleCallback(
         UserBlockingPriority,
         (): Callback | null | undefined => {
            eventTasks.push("Task2");
            expect(eventTasks).toEqual(["Task3", "Task2"]);

            return null;
         }
      );

      scheduleCallback(ImmediatePriority, (): Callback | null | undefined => {
         eventTasks.push("Task3");
         expect(eventTasks).toEqual(["Task3"]);

         return null;
      });
   });

   it("4个不同优先级的任务", () => {
      let eventTasks: Array<string> = [];

      scheduleCallback(NormalPriority, (): Callback | null | undefined => {
         eventTasks.push("Task1");
         expect(eventTasks).toEqual(["Task3", "Task2", "Task1"]);
         return null;
      });

      scheduleCallback(
         UserBlockingPriority,
         (): Callback | null | undefined => {
            eventTasks.push("Task2");
            expect(eventTasks).toEqual(["Task3", "Task2"]);
            return null;
         }
      );

      scheduleCallback(ImmediatePriority, (): Callback | null | undefined => {
         eventTasks.push("Task3");
         expect(eventTasks).toEqual(["Task3"]);
         return null;
      });

      scheduleCallback(NormalPriority, (): Callback | null | undefined => {
         eventTasks.push("Task4");

         expect(eventTasks).toEqual(["Task3", "Task2", "Task1", "Task4"]);
         return null;
      });
   });
});
