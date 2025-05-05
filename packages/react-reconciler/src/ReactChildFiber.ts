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

      let newIdx = 0;

      if (oldFiber === null) {
         //? 渲染逻辑：遍历新的子节点数组
         for (; newIdx < newChildren.length; newIdx++) {
            const newChild = newChildren[newIdx];
            const newFiber = createChildFiber(returnFiber, newChild);

            if (newFiber === null) {
               continue;
            }

            newFiber.index = newIdx; // 记录在数组中的位置 //// 由于组件更新阶段，判断更新前后位置是否一致 如果不一致则需要移动
            if (previousNewFiber === null) {
               resultingFirstChild = newFiber; // 设置第一个子 fiber
            } else {
               previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
         }

         return resultingFirstChild;
      }

      return resultingFirstChild;
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
   function deleteRemainingChildren(returnFiber: Fiber, child: Fiber) {
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

function useFiber(fiber: Fiber, pendingProps: any): Fiber {
   const clone = createWorkInProgress(fiber, pendingProps);
   clone.index = 0;
   clone.sibling = null;
   return clone;
}

function isText(newChild: any) {
   return (isString(newChild) && newChild !== "") || isNumber(newChild);
}
