export type StackCursor<T> = {
   current: T;
};

const valueStack: Array<any> = [];

let index = -1; // 栈顶索引，-1 表示栈为空

/**
 * 创建一个栈游标
 * @param defaultValue
 * @returns
 */
function createCursor<T>(defaultValue: T): StackCursor<T> {
   return {
      current: defaultValue,
   };
}

/**
 * 检查栈是否为空
 * @returns
 */
function isEmpty(): boolean {
   return index === -1;
}

/**
 * 从栈中弹出一个值
 * @param cursor
 */
function pop<T>(cursor: StackCursor<T>): void {
   if (index < 0) {
      return;
   }
   cursor.current = valueStack[index]; // 获取上一个栈顶元素

   valueStack[index] = null; // 清空栈顶元素
   index--; // 栈顶索引减一
}

/**
 * 将一个值压入栈中
 * @param cursor
 * @param value
 */
function push<T>(cursor: StackCursor<T>, value: T): void {
   index++; // 栈顶索引加一

   valueStack[index] = cursor.current; // 记录上一个栈顶元素
   cursor.current = value; // 更新栈顶元素
}

/**
 * 检查栈是否为空
 */
function checkThatStackIsEmpty() {
   if (index !== -1) {
      console.error(
         "Expected an empty stack. Something was not reset properly."
      );
   }
}

/**
 * 在开发环境下重置栈
 */
function resetStackAfterFatalErrorInDev() {
   index = -1;
   valueStack.length = 0;
}

export {
   createCursor,
   isEmpty,
   pop,
   push,
   checkThatStackIsEmpty,
   resetStackAfterFatalErrorInDev,
};
