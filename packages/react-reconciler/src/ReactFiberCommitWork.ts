import { isHost } from "./ReactFiberCompleteWork";
import { ChildDeletion, Passive, Placement, Update } from "./ReactFiberFlags";
import { HookFlags, HookLayout, HookPassive } from "./ReactHookEffectTags";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { FunctionComponent, HostComponent, HostRoot } from "./ReactWorkTags";

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
 * @param root 根节点
 * @param parentFiber 父级 fiber 节点
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

   //* layout effect 处理
   if (flags & Update) {
      if (finishedWork.tag === FunctionComponent) {
         commitHookEffectListMount(HookLayout, finishedWork);
         finishedWork.flags &= ~Update;
      }
   }
}

/**
 * 执行 hook effect 的挂载操作
 * @param hookFlags hook 的类型标记
 * @param finishedWork 当前 fiber 节点
 */
function commitHookEffectListMount(hookFlags: HookFlags, finishedWork: Fiber) {
   const updateQueue = finishedWork.updateQueue;
   const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

   if (lastEffect !== null) {
      const firstEffet = lastEffect.next; // 获取头节点
      let effect = firstEffet;

      do {
         if ((effect.tag & hookFlags) === hookFlags) {
            const create = effect.create;

            create();
         }
         effect = effect.next;
      } while (effect !== firstEffet); // 当头节点和尾节点相遇，即已经遍历过一遍了
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
 * 依据 fiber 删除 DOM 节点
 * @param deletions 需要删除的 fiber 节点数组
 * @param parentDOM 父级 DOM 元素
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
 * @param fiber 当前 fiber 节点
 * @returns 返回对应的 DOM 节点
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
 * DFS 获取父级 DOM 元素
 * @param fiber 当前 fiber 节点
 * @returns 返回最近的父级 DOM fiber 节点
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
 * @param fiber 当前 fiber 节点
 * @returns 返回是否为 DOM 父节点
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
 * @param finishedWork 当前 fiber 节点
 * @returns 返回下一个可用的兄弟 DOM 节点
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
 * @param node 需要插入或追加的 fiber 节点
 * @param before 插入位置的参考节点
 * @param parent 父级 DOM 元素
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

/**
 * 处理 passive effects（useEffect）
 * @param finishedWork 根 fiber 节点
 */
export function flushPassiveEffects(finishedWork: Fiber) {
   //> 1. 从 finishedWork 开始遍历所有子节点，寻找函数组件 因为 effect 行为只存在于函数组件中
   recursivelyTraversePassiveMountEffects(finishedWork);
   //> 2. 执行 effect 行为
   commitPassiveEffects(finishedWork);
}

/**
 * 递归遍历处理 passive effects
 * @param finishedWork 当前 fiber 节点
 */
function recursivelyTraversePassiveMountEffects(finishedWork: Fiber) {
   let node = finishedWork.child;
   while (node !== null) {
      //> 1. 从 finishedWork 开始遍历所有子节点，寻找函数组件 因为 effect 行为只存在于函数组件中
      recursivelyTraversePassiveMountEffects(node);
      //> 2. 执行 effect 行为
      commitPassiveEffects(finishedWork);

      node = node.sibling;
   }
}

/**
 * 执行 passive effects
 * @param finishedWork 当前 fiber 节点
 */
function commitPassiveEffects(finishedWork: Fiber) {
   switch (finishedWork.tag) {
      case FunctionComponent:
         if (finishedWork.flags & Passive) {
            commitHookEffectListMount(HookPassive, finishedWork);
            finishedWork.flags &= ~Passive;
         }
         break;
   }
}
