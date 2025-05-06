import { ReactElement } from "shared/ReactTypes";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import { Fiber } from "./ReactInternalTypes";
import {
   createFiberFromElement,
   createFiberFromText,
   createWorkInProgress,
} from "./ReactFiber";
import { isArray, isNumber, isString } from "shared/utils";
import { HostText } from "./ReactWorkTags";

type ChildReconciler = (
   returnFiber: Fiber,
   currentFirstChild: Fiber | null,
   newChild: any
) => Fiber | null;

export const reconcileChildFibers: ChildReconciler =
   createChildReconciler(true);

export const mountChildFibers: ChildReconciler = createChildReconciler(false);

/**
 * 协调子节点 （协调：根据新的虚拟 DOM 创建新的 fiber）
 * @param shouldTrackSideEffects 是否初次渲染
 * @returns
 */
function createChildReconciler(
   shouldTrackSideEffects: boolean
): ChildReconciler {
   // wrapper function
   function reconcileChildFibers(
      returnFiber: Fiber,
      currentFirstChild: Fiber | null,
      newChildEl: any
   ): Fiber | null {
      // 检查 newChildEl 类型：single fiber、text、array
      if (typeof newChildEl === "object" && newChildEl !== null) {
         switch (newChildEl.$$typeof) {
            case REACT_ELEMENT_TYPE:
               return placeSingleChild(
                  reconcileSingleElement(
                     returnFiber,
                     currentFirstChild,
                     newChildEl
                  )
               );
         }
      }

      // 处理字符串或数字类型的子节点
      if (isText(newChildEl)) {
         //> 处理文本节点
         return placeSingleChild(
            reconcileSingleTextNode(
               returnFiber,
               currentFirstChild,
               String(newChildEl)
            )
         );
      }

      // 处理数组类型的子节点
      if (isArray(newChildEl)) {
         return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChildEl
         );
      }
      return null;
   }

   /**
    * 为新 fiber 添加 Placement <flags>标志
    * @param newFiber
    * @returns
    */
   function placeSingleChild(newFiber: Fiber): Fiber {
      if (shouldTrackSideEffects && newFiber.alternate === null) {
         newFiber.flags |= Placement;
      }

      return newFiber;
   }

   /**
    * 协调单个子节点，对于页面的初次渲染、创建 fiber，不涉及对比复用老节点
    * @param returnFiber 父 fiber
    * @param currentFirstChild
    * @param element
    * @returns
    */
   function reconcileSingleElement(
      returnFiber: Fiber,
      currentFirstChild: Fiber | null,
      element: ReactElement
   ): Fiber {
      //! 复用节点的条件
      //> 1. 新老节点类型相同  2. key 相同  3. 同一层级
      const key = element.key;
      let child = currentFirstChild; // 当前 fiber tree 的第一个子 fiber

      while (child !== null) {
         if (child.key === key) {
            const elType = element.type;
            if (elType === child.elementType) {
               // 复用节点
               // eslint-disable-next-line react-hooks/rules-of-hooks
               const existing = useFiber(child, element.props);
               // 在同一层级下进行查找 设置父级引用
               existing.return = returnFiber;
               return existing;
            }
            //! 前提：React 认为在同一层级下不会存在相同的 key 的节点
            //! 所以当节点类型不同时则无法复用
            else {
               //> 进入当前分支则意味着是节点类型的不同，无法复用；同时从链表当前节点位置及其之后的所有节点也都需要舍弃
               deleteRemainingChildren(returnFiber, child);
               break;
            }
         } else {
            // 删除多余或不存在的节点
            //> deleteChild 删除行为依旧在循环中，如果还存在需要删除的节点 则依旧会执行删除行为
            deleteChild(returnFiber, child);
         }
         // 在同一层级下继续查找
         child = child.sibling;
      }

      // 根据新的虚拟 DOM 创建新的 fiber
      const createdFiber = createFiberFromElement(element);
      // 设置父级引用
      createdFiber.return = returnFiber;

      return createdFiber;
   }

   /**
    * 协调单个文本节点
    * @param returnFiber 父 fiber
    * @param currentFirstChild 当前的第一个子 fiber
    * @param textContent 文本内容
    * @returns
    */
   function reconcileSingleTextNode(
      returnFiber: Fiber,
      currentFirstChild: Fiber | null, //> 在 update 阶段使用
      textContent: string | number
   ): Fiber {
      // 创建文本节点的 fiber
      const createdFiber = createFiberFromText(String(textContent));
      createdFiber.return = returnFiber;
      return createdFiber;
   }

   /**
    * 协调子节点数组
    * @param returnFiber 父 fiber
    * @param currentFirstChild 当前的第一个子 fiber
    * @param newChildren 新的子节点数组
    * @returns
    */
   function reconcileChildrenArray(
      returnFiber: Fiber,
      currentFirstChild: Fiber | null,
      newChildren: Array<any>
   ): Fiber | null {
      let resultingFirstChild: Fiber | null = null;
      let previousNewFiber: Fiber | null = null; // 保留引用，用于寻找当前节点的 sibling
      let oldFiber = currentFirstChild; // 旧 fiber 头部节点用于遍历旧列表
      let nextOldFiber = null; // oldFiber.next 留待后续处理
      let newIdx = 0;
      let lastPlacedIndex = 0; // 记录新 fiber 在老 fiber 上的位置

      //? 1. 从左向右遍历按位置比较（单链表），如果可以复用便复用，否则退出本轮协调
      for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
         /**
          * 旧列表：[A, B, C, D]
          * 新列表：[A, C, B, D]
          *
          * 当我们在比较时：
          * 1. 首先比较 A，可以复用
          * 2. 然后比较 C，发现 oldFiber 是 B，而 B.index > C.index
          * 3. 此时我们会：
          *   nextOldFiber = oldFiber;  // 保存 B 到 nextOldFiber
          *   oldFiber = null;          // 将 oldFiber 设为 null
          * 4. 这样做的目的是标记 B 需要移动
          * 5. 当处理完 C 后，我们需要继续处理 B，所以需要恢复 oldFiber：
          *   if (oldFiber === null) {
          *      oldFiber = nextOldFiber;  // 恢复 B 到 oldFiber
          *   }
          * 这样做的原因是：
          * - 当发现节点需要移动时，我们暂时将 oldFiber 设为 null，这样会触发创建新的 fiber
          * - 但我们需要记住这个节点（通过 nextOldFiber），因为后续还需要处理它
          * - 所以当 newChildFiber 为 null 时，我们需要恢复 oldFiber，以便继续处理这个需要移动的节点
          */
         if (oldFiber.index > newIdx) {
            nextOldFiber = oldFiber;
            // 当置为 null 时，会促使创建新 fiber
            oldFiber = null;
         } else {
            nextOldFiber = oldFiber.sibling;
         }

         //> 当前存在新旧 fiber，新 fiber 是否要复用旧 fiber 或者需要创建一个新 fiber
         const newChildFiber = updateSlot(
            returnFiber,
            oldFiber,
            newChildren[newIdx]
         );

         if (newChildFiber === null) {
            /**
             * 当 newChildFiber 为 null 时，说明当前节点无法复用
             * 如果 oldFiber 也为 null，说明需要从之前保存的 nextOldFiber 恢复 oldFiber
             * 然后跳出循环，因为已经找到了需要移动的节点
             */
            if (oldFiber === null) {
               oldFiber = nextOldFiber;
            }
            break;
         }

         if (shouldTrackSideEffects) {
            if (oldFiber && newChildFiber?.alternate === null) {
               // 旧节点存在而新节点不存在，则删除旧节点
               deleteChild(returnFiber, oldFiber);
            }
         }

         // 组件更新阶段，判断在更新前后的位置是否一致：如果不一致则需要移动
         lastPlacedIndex = placeChild(newChildFiber, lastPlacedIndex, newIdx);

         if (previousNewFiber === null) {
            // 第一子节点不通过 newIndex 来判断，因为有可能是一个 null，而 null 不是一个有效的 fiber
            resultingFirstChild = newChildFiber;
         } else {
            previousNewFiber.sibling = newChildFiber;
         }
         previousNewFiber = newChildFiber;

         oldFiber = nextOldFiber;
      }

      //? 2.1 老节点在更新后的 fiber 链表节点中不存在，删除老节点
      if (newIdx === newChildren.length) {
         // 如果 newIdx 等于 newChildren 的长度，说明新列表已经遍历完了
         // 此时需要删除剩余的老节点
         deleteRemainingChildren(returnFiber, oldFiber);
         return resultingFirstChild; // 返回第一个子 fiber
      }

      //? 2.2 相对于老 fiber 链表节点而言，存在新的节点则添加
      //> 包含了页面的初次渲染
      if (oldFiber === null) {
         //? 渲染逻辑：遍历新的子节点数组
         for (; newIdx < newChildren.length; newIdx++) {
            const newChild = newChildren[newIdx];
            const newFiber = createChildFiber(returnFiber, newChild);

            if (newFiber === null) {
               continue;
            }

            // 记录在数组中的位置 //// 由于组件更新阶段，判断更新前后位置是否一致 如果不一致则需要移动
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

            if (previousNewFiber === null) {
               resultingFirstChild = newFiber; // 设置第一个子 fiber
            } else {
               previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
         }

         return resultingFirstChild;
      }

      //? 2.3 新老节点都存在
      /**
       * 旧列表：[A, B, C, D, E]
       * 新列表：[A, B, D, E]
       *
       * old: C、D、E
       * new: D、E
       */
      //> 在 A、B 节点复用后，在遍历 new fiber 的过程中，期望能够快速的找到 D 节点，在 react 中构建了一个 map 处理
      const existingChildren = mapRemainingChildren(oldFiber);
      for (; newIdx < newChildren.length; newIdx++) {
         const newFiber = updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            newChildren[newIdx]
         );

         //* tip: 节点的复用发生在更新阶段
         if (newFiber !== null) {
            if (shouldTrackSideEffects) {
               // 在更新阶段，如果新节点存在则需要删除旧节点，此时则需要删除 Map 中的记录，表示节点已处理完成
               existingChildren.delete(
                  newFiber.key === null ? newIdx : newFiber.key
               );
            }

            // returnFiber
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

            if (previousNewFiber === null) {
               // 表示此时生成的节点为头节点
               resultingFirstChild = newFiber;
            } else {
               previousNewFiber.sibling = newFiber;
            }

            previousNewFiber = newFiber;
         }
      }

      //? 3. 处理剩余的旧节点
      if (shouldTrackSideEffects) {
         existingChildren.forEach((existingChild) => {
            deleteChild(returnFiber, existingChild);
         });
      }

      return resultingFirstChild;
   }

   function updateFromMap(
      existingChildren: Map<string | number, Fiber>,
      returnFiber: Fiber,
      newIdx: number,
      newChild: any
   ) {
      if (isText(newChild)) {
         const matchedFiber = existingChildren.get(newIdx) || null;
         return updateTextNode(returnFiber, matchedFiber, String(newChild));
      } else {
         const matchedFiber =
            existingChildren.get(
               newChild.key === null ? newIdx : newChild.key
            ) || null;

         return updateElement(returnFiber, matchedFiber, newChild);
      }
   }

   /**
    *
    * 在遍历 new fiber 的过程中，期望能够在旧 fiber 中快速的找到目标节点
    * @param currentFirstChild
    * @returns
    */
   function mapRemainingChildren(
      currentFirstChild: Fiber | null
   ): Map<string | number, Fiber> {
      // 并不是所有节点都存在 key 值（eg: text element)，此时取节点下标做为 key 值
      const existingChildren: Map<string | number, Fiber> = new Map();

      let existingChild: Fiber | null = currentFirstChild;

      while (existingChild !== null) {
         if (existingChild.key !== null) {
            existingChildren.set(existingChild.key, existingChild);
         } else {
            existingChildren.set(existingChild.index, existingChild);
         }

         existingChild = existingChild.sibling;
      }

      return existingChildren;
   }

   /**
    * 判断节点在 DOM 中的相对位置是否发生了变化
    * @param fiber 新 fiber
    * @param lastPlaceIndex 新 fiber 在老 fiber 上的位置
    * @param newIndex 新 fiber 在数组中的位置
    * @returns
    */
   function placeChild(fiber: Fiber, lastPlaceIndex: number, newIndex: number) {
      fiber.index = newIndex; // 设置新 fiber 在数组中的位置

      /**
       * 旧列表：[A, B, C, D]
       * 新列表：[A, C, B, D]
       *
       * 处理过程：
       * 1. 处理 A：lastPlaceIndex = 0，A 不需要移动
       * 2. 处理 C：lastPlaceIndex = 0，C 在旧列表中的位置是 2，大于 lastPlaceIndex，不需要移动
       * 3. 处理 B：lastPlaceIndex = 2，B 在旧列表中的位置是 1，小于 lastPlaceIndex，需要移动
       * 4. 处理 D：lastPlaceIndex = 2，D 不需要移动
       * 通过比较节点在旧列表中的位置和 lastPlaceIndex 来决定是否需要移动
       */

      // 如果是初次渲染，不需要处理移动
      if (!shouldTrackSideEffects) {
         return lastPlaceIndex;
      }

      const current = fiber.alternate; // 获取对应的旧 fiber
      if (current !== null) {
         // 说明是更新节点，不是新增
         if (current.index < lastPlaceIndex) {
            // 如果旧节点在旧列表中的位置小于 lastPlaceIndex
            // 说明新节点需要移动到 lastPlaceIndex 之后
            fiber.flags |= Placement; // 标记需要移动
         } else {
            // 如果旧节点在旧列表中的位置大于等于 lastPlaceIndex
            // 说明新节点不需要移动
            return current.index; // 返回旧节点的位置作为新的 lastPlaceIndex
         }
      } else {
         // 如果是新增节点，需要标记为 Placement
         fiber.flags |= Placement;
      }
      return lastPlaceIndex;
   }

   /**
    * 判断当前存在的新旧 fiber，新 fiber 是否要复用旧 fiber 或者需要创建一个新 fiber
    * @param returnFiber 父 fiber
    * @param oldFiber 旧 fiber
    * @param newChild 新节点
    * @returns
    */
   function updateSlot(
      returnFiber: Fiber,
      oldFiber: Fiber | null,
      newChild: any
   ): Fiber | null {
      //* 判断节点是否可以复用：同一层级下、相同的 key 值、同一类型
      const key = oldFiber !== null ? oldFiber.key : null;

      if (isText(newChild)) {
         if (key !== null) {
            // 此时旧节点存在 key 值而新节点是一个文本节点，并不存在 ley 无法复用
            return null;
         }

         // 可能可以复用
         return updateTextNode(returnFiber, oldFiber, String(newChild));
      }

      // 处理非文本节点
      if (typeof newChild === "object" && newChild !== null) {
         if (newChild.key === key) {
            // 可能可以复用
            return updateElement(returnFiber, oldFiber, newChild);
         } else {
            // 无法复用
            return null;
         }
      }

      return null;
   }

   /**
    * 更新或创建 DOM 元素节点
    * @param returnFiber 父级 fiber
    * @param current 当前 fiber（可能为 null）
    * @param element 新的 React 元素
    * @returns 返回复用或新创建的 fiber
    */
   function updateElement(
      returnFiber: Fiber,
      current: Fiber | null,
      element: ReactElement
   ) {
      // 如果旧节点存在，则复用
      if (current !== null) {
         // 新旧节点类型相同
         if (current.elementType /* elementType: 组件类型 */ === element.type) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const existing = useFiber(current, element.props);
            existing.return = returnFiber;
            return existing;
         }
      }

      // 如果旧节点不存在，则创建新节点
      const created = createFiberFromElement(element);
      created.return = returnFiber;
      return created;
   }

   /**
    * 更新或创建文本节点
    * @param returnFiber 父级 fiber
    * @param current 当前 fiber（可能为 null）
    * @param textContent 新的文本内容
    * @returns 返回复用或新创建的文本 fiber
    */
   function updateTextNode(
      returnFiber: Fiber,
      current: Fiber | null,
      textContent: string
   ) {
      if (current === null || current.tag !== HostText) {
         // 说明旧 fiber 不是一个文本节点，则新建节点
         const created = createFiberFromText(textContent);
         created.return = returnFiber;
         return created;
      } else {
         // 说明旧 fiber 是一个文本节点，则复用
         // eslint-disable-next-line react-hooks/rules-of-hooks
         const existing = useFiber(current, textContent);
         existing.return = returnFiber;
         return existing;
      }
   }

   /**
    * 删除单个子节点
    * @param returnFiber 父级 fiber
    * @param child 删除的目标子节点
    * @returns
    */
   function deleteChild(returnFiber: Fiber, child: Fiber) {
      if (!shouldTrackSideEffects) {
         // 初次渲染跳过
         return;
      }

      const deletions = returnFiber.deletions;

      if (deletions === null) {
         returnFiber.deletions = [child];
         returnFiber.flags |= ChildDeletion;
      } else {
         deletions.push(child);
      }
   }

   /**
    * 删除从当前 child 节点开始及其之后的所有节点
    * @param returnFiber 父级节点 fiber
    * @param child 链表要删除的节点中的首个节点位置
    */
   function deleteRemainingChildren(returnFiber: Fiber, child: Fiber | null) {
      if (!shouldTrackSideEffects) {
         return;
      }

      let current = child;

      while (current !== null) {
         deleteChild(returnFiber, current);
         current = current.sibling as Fiber;
      }

      return null;
   }
   return reconcileChildFibers;
}

function createChildFiber(returnFiber: Fiber, newChild: any): Fiber | null {
   if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
         case REACT_ELEMENT_TYPE:
            const fiber = createFiberFromElement(newChild);
            fiber.return = returnFiber;
            return fiber;
      }
   }

   if (isText(newChild)) {
      //> 节点可能是一个 number 类型
      const textFiber = createFiberFromText(String(newChild));
      textFiber.return = returnFiber;
      return textFiber;
   }

   return null;
}

/**
 * 复用目标节点
 * @param fiber 要复用的目标节点
 * @param pendingProps 当前节点的 props
 */
function useFiber(fiber: Fiber, pendingProps: any): Fiber {
   const clone = createWorkInProgress(fiber, pendingProps);
   clone.index = 0;
   clone.sibling = null;
   return clone;
}

function isText(newChild: any) {
   return (isString(newChild) && newChild !== "") || isNumber(newChild);
}
