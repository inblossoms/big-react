import { ReactElement } from "shared/ReactTypes";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { Placement } from "./ReactFiberFlags";
import { Fiber } from "./ReactInternalTypes";
import { createFiberFromElement, createFiberFromText } from "./ReactFiber";
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
 * @param shouldTrackSideEffects
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
      if (isTextFiber(newChildEl)) {
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
    * 协调单个子节点
    * @param returnFiber 父 fiber
    * @param currentFirstChild
    * @param newChildEl
    * @returns
    */
   function reconcileSingleElement(
      returnFiber: Fiber,
      currentFirstChild: Fiber | null,
      newChildEl: ReactElement
   ): Fiber {
      // 根据新的虚拟 DOM 创建新的 fiber
      const createdFiber = createFiberFromElement(newChildEl);

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

   if (isTextFiber(newChild)) {
      //> 节点可能是一个 number 类型
      const textFiber = createFiberFromText(String(newChild));
      textFiber.return = returnFiber;
      return textFiber;
   }

   return null;
}

function isTextFiber(newChild: any) {
   return (isString(newChild) && newChild !== "") || isNumber(newChild);
}
