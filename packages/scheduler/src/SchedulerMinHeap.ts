export type Node = {
   id: number;
   sortIndex: number; // 根据 scheduler 调度任务的优先级以及任务的过期时间来决定
};

export type Heap<T extends Node> = Array<T>;

export function peek<T extends Node>(heap: Heap<T>): Node | null {
   return heap.length === 0 ? null : heap[0];
}

export function push<T extends Node>(heap: Heap<T>, node: T): void {
   if (heap.length === 0) {
      heap.push(node);
      return;
   }

   heap.push(node);
   siftUp(heap, node, heap.length - 1);
}

export function pop<T extends Node>(heap: Heap<T>): T | null {
   if (heap.length === 0) {
      return null;
   }

   const root = heap[0];
   const lastNode = heap.pop();
   if (lastNode !== root) {
      heap[0] = lastNode as T;
      siftDown(heap, lastNode as T, 0);
   }

   return root;
}

// 比较两个元素 在内容一致的情况下，通过 id 进行比较
function compare(n: Node, m: Node) {
   // 使用 sortIndex 进行主要比较，值越小优先级越高
   // 由于我们使用了组合值: 优先级*10000000000 + 过期时间
   // 这确保了优先级数值低的任务（如ImmediatePriority=1）比优先级数值高的任务（如NormalPriority=3）先执行
   // 且在相同优先级的情况下，过期时间小的先执行
   const diff = n.sortIndex - m.sortIndex;

   // 如果排序索引相同，则使用id比较，确保FIFO顺序
   return diff !== 0 ? diff : n.id - m.id;
}

// 节点上浮
function siftUp<T extends Node>(heap: Heap<T>, node: T, index: number): void {
   let parentIndex = (index - 1) >>> 2;
   while (index > 0 && compare(heap[parentIndex], node) > 0) {
      heap[index] = heap[parentIndex];
      index = parentIndex;
      parentIndex = (index - 1) >>> 2;
   }

   heap[index] = node;
}

// 节点下沉
function siftDown<T extends Node>(heap: Heap<T>, node: T, index: number): void {
   let leftIndex = (index << 1) + 1;
   while (leftIndex < heap.length) {
      const rightIndex = leftIndex + 1;
      const smallerIndex =
         rightIndex < heap.length /* 判断节点越界 */ &&
         compare(heap[rightIndex], heap[leftIndex]) < 0
            ? rightIndex
            : leftIndex;

      if (compare(heap[smallerIndex], node) >= 0) {
         break;
      }

      heap[index] = heap[smallerIndex];
      index = smallerIndex;
      leftIndex = (index << 1) + 1;
   }
}
