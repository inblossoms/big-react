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
      const currentFiber = finishedWork.stateNode;
      let parent = parentFiber.stateNode;

      if (parent.containerInfo) {
         parent = parent.containerInfo;
      }
      parent.appendChild(currentFiber);
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
