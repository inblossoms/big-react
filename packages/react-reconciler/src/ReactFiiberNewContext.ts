import { ReactContext } from "../../shared/ReactTypes";
import { createCursor, pop, push, StackCursor } from "./ReactFiberStack";

const valueCursor: StackCursor<any> = createCursor(null);

/**
 * 压入上下文
 * @param context
 */
export function pushProvider<T>(context: ReactContext<T>, nextValue: T): void {
   push(valueCursor, context._currentValue);
   context._currentValue = nextValue;
}

/**
 * 读取上下文
 * @param context
 * @returns
 */
export function readContext<T>(context: ReactContext<T>): T {
   return context._currentValue;
}

/**
 * 弹出上下文
 */
export function popProvider<T>(context: ReactContext<T>): void {
   const oldValue = valueCursor.current;
   pop(valueCursor);
   context._currentValue = oldValue;
}
