import { describe, it, expect } from "vitest";
import { peek, pop, push, Node, Heap } from "../src/SchedulerMinHeap";

let idCounter = 0;
function createNode(value: number): Node {
   return {
      id: idCounter++,
      sortIndex: value,
   };
}

describe("test min heap", () => {
   it("empty heap should be return null.", () => {
      const tasks: Heap<Node> = [];
      expect(peek(tasks)).toBeNull();
   });

   it("heap length should be 1 when only root node.", () => {
      const tasks: Heap<Node> = [createNode(1)];

      expect(peek(tasks)?.sortIndex).toEqual(1);
   });

   it("heap length > 1", () => {
      const tasks: Heap<Node> = [createNode(1), createNode(2)];
      push(tasks, createNode(3));

      expect(tasks.length).toEqual(3);
      expect(peek(tasks)?.sortIndex).toEqual(1);

      push(tasks, createNode(0));
      expect(peek(tasks)?.sortIndex).toEqual(0);

      pop(tasks);
      expect(peek(tasks)?.sortIndex).toEqual(1);
   });
});
