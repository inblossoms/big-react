import { isHost } from "./ReactFiberCompleteWork";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

/**
 * 处理 fiber 节点在 commit 阶段的 mutation 操作。
 * @param root 根节点
 * @param finishedWork 当前 fiber 节点
 */
export function commitMutationEffects(root: FiberRoot, finishedWork: Fiber) {
   recursivelyTraverseMutationEffects(root, finishedWork);
   commitReconciliationEffects(finishedWork);
}

/**
 * 递归遍历 fiber 树，执行 mutation 操作。
 * @param root
 * @param parentFiber
 */
function recursivelyTraverseMutationEffects(
   root: FiberRoot,
   parentFiber: Fiber
) {
   //* Tip: 根 fiber 是不需要执行 mutation 操作的，因为根 fiber 的 mutation 操作在 commitRoot 中已经执行了
   //*      所以这里从根 fiber 的 child 开始遍历
   let child = parentFiber.child;
   while (child !== null) {
      commitMutationEffects(root, child);
      const siblingFiber = child.sibling;

      if (siblingFiber !== null) {
         child = siblingFiber;
         continue;
      }

      // 如果没有子节点，处理兄弟节点
      while (child !== null) {
         commitReconciliationEffects(child);

         if (child.sibling !== null) {
            child = child.sibling;
            break;
         }

         child = child.return;
         if (child === parentFiber) {
            return;
         }
      }
   }
}

/**
 * 递归遍历 fiber 树，处理在 render 阶段产生的协调操作（flags 包括 ：删除 ChildDeletion、插入 Placement、更新 Update）。
 * @param finishedWork 当前 fiber 节点
 */
function commitReconciliationEffects(finishedWork: Fiber) {
   //! 在 Fiber 架构中，flags 是一个使用位运算来存储多个标记的整数。
   const flags = finishedWork.flags;
   //? 检查 Placement 是否被标记
   if (flags & Placement) {
      // 页面的初次渲染，新增插入：appendChild
      commitPlacement(finishedWork);
      //! 移除 Placement 标记
      finishedWork.flags &= ~Placement;
   }

   if (flags & ChildDeletion) {
      // 通过父 dom 元素来删除子 dom 节点
      const parentFiber = isHostParent(finishedWork)
         ? finishedWork
         : getHostParentFiber(finishedWork);

      const parentDOM = parentFiber.stateNode;
      commitDeletions(finishedWork.deletions as Fiber[], parentDOM);

      finishedWork.flags &= ~ChildDeletion;
      finishedWork.deletions = null;
   }
}

/**
 * 执行插入操作
 * @param finishedWork 当前 fiber 节点
 */
function commitPlacement(finishedWork: Fiber) {
   if (finishedWork.stateNode && isHostParent(finishedWork)) {
      const parentFiber = getHostParentFiber(finishedWork);
      const currentFiberNode = finishedWork.stateNode;
      let parent = parentFiber.stateNode;

      if (parent.containerInfo) {
         parent = parent.containerInfo;
      }

      //* 由于之前更新节点的做法都是采用 appendChild，导致会永远将节点放置在末尾，所以当更新的节点需要处于 fiber 树种的某个位置时，这种做法是错误的
      //* 所以需要根据 finishedWork 的 index 来决定插入的位置
      //* 通过寻找 finishedWork.sibling 且该兄弟节点是一个已更新完成，页面上存在的 dom 节点。由于该 dom 节点不会在此轮发生移动，所以将会确保插入的位置是正确的
      const before = getHostSibling(finishedWork);
      console.log(
         `🧠 [getHostSibling] \x1b[91mFile: ReactFiberCommitWork.ts\x1b[0m, \x1b[32mLine: 101\x1b[0m, Message: `,
         before
      );
      insertOrAppendPlacementNode(finishedWork, before, parent);
   } else {
      let kid = finishedWork.child;
      while (kid !== null) {
         commitPlacement(kid);
         kid = kid.sibling;
      }
   }
}

/**
 * 依据 fiber 删除 dom 节
 * @param deletions 需要删除的 fiber 节点
 * @param parentDOM 父级 dom 元素
 */
function commitDeletions(
   deletions: Array<Fiber>,
   parentDOM: HTMLElement | Document | DocumentFragment
) {
   deletions.forEach((deletion) => {
      parentDOM.removeChild(getStateNode(deletion));
   });
}

/**
 * 获取 fiber 节点的真实 DOM 元素
 * @param fiber
 * @returns 返回子 dom 节点
 */
function getStateNode(fiber: Fiber) {
   let node = fiber;
   //> 目标 deletion fiber 并不一定存在 dom 元素
   while (true) {
      if (isHost(node) && node.stateNode) {
         return node.stateNode;
      }
      node = node.child as Fiber; // 链表结构
   }
}

/**
 * DFS 获取父级 DOM 元素：fiber 节点的上一级可能是一个函数组件，所以需要向上遍历找到一个真实的 DOM 元素，才可以进行插入操作
 * @param fiber
 */
function getHostParentFiber(fiber: Fiber) {
   let parent = fiber.return;
   //? 寻找距离其最近的父级 dom 节点
   while (parent !== null) {
      if (isHostParent(parent)) {
         return parent;
      }
      parent = parent.return;
   }

   throw new Error(
      `Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue.`
   );
}

/**
 * 判断父级是否为真实 DOM 元素
 * @param fiber
 */
function isHostParent(fiber: Fiber): boolean {
   /**
    * Host 节点有三种：
    * - HostComponent：DOM 元素
    * - HostRoot：React 根节点
    * - HostText：文本节点，不存在子节点
    */
   return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

/**
 * 获取兄弟 DOM 节点
 * @param finishedWork
 */
function getHostSibling(finishedWork: Fiber) {
   let node = finishedWork;
   silbling: while (true) {
      // 通过 label 语法跳出到此位置，则表示之前的节点不满足要求
      while (node.sibling === null) {
         //! 无有效子节点且不存在兄弟节点，则尝试寻找父级 dom 节点
         if (node.return === null || isHostParent(node.return)) {
            return null;
         }
         node = node.return;
      }

      node = node.sibling as Fiber;
      while (!isHost(node)) {
         //? Flag Placement: 表示新增插入 | 移动位置
         // 需要确保找到的节点是一个稳定的节点，所以不使用 Placement 类型节点
         if (node.flags & Placement) {
            continue silbling;
         }

         //! 查找有效子节点
         if (node.child === null) {
            continue silbling;
         } else {
            node = node.child;
         }
      }

      // 可以执行到此位置，则表示内存循环并未判定此时也未跳出到 sibling 外层循环
      // 那么此时的目标节点存在 stateNode 属性，则表示该节点是一个真实的 DOM: HostComponent | HostText 节点
      // 所以可以返回该节点
      if (!(node.flags & Placement)) {
         return node.stateNode;
      }
   }
}

/**
 * 插入或追加 DOM 节点
 * @param node 需要插入或追加的节点
 * @param before 插入位置
 * @param parent 父级 dom 元素
 */
function insertOrAppendPlacementNode(
   node: Fiber,
   before: Element | null,
   parent: Element
) {
   if (before) {
      parent.insertBefore(getStateNode(node), before);
   } else {
      parent.appendChild(getStateNode(node));
   }
}
