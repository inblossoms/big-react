import { REACT_MEMO_TYPE } from "shared/ReactSymbols";

/**
 * 用于优化组件渲染的 HOC
 */
export function memo<Props>(
   type: any,
   compare?: (oldProps: Props, newProps: Props) => boolean
) {
   const elementType = {
      $$typeof: REACT_MEMO_TYPE,
      type, // 组件
      compare: compare === undefined ? null : compare,
   };

   return elementType;
}
