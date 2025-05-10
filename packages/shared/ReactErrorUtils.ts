/** 是否发生错误 */
let hasError: boolean = false;

/** 捕获的错误 */
let caughtError: Error | null = null;

/** 是否重新抛出错误 */
let hasRethrowError: boolean = false;

/** 重新抛出的错误 */
let rethrowError: Error | null = null;

/** 错误报告器 */
const reporter = {
   onError(error: Error) {
      hasError = true;
      caughtError = error;
   },
};

/**
 * 清除捕获的错误
 * @returns 返回捕获的错误，如果没有错误则抛出异常
 * @throws 如果没有捕获到错误则抛出异常
 */
function clearCaughtError(): Error {
   if (!caughtError) {
      throw new Error("No error was caught");
   }
   const error = caughtError;
   caughtError = null;
   hasError = false;
   return error;
}

/**
 * 调用受保护的回调函数并捕获第一个错误
 * @param this 函数执行上下文
 * @param name 回调函数名称
 * @param func 要执行的回调函数
 * @param context 回调函数的上下文
 * @param a 参数A
 * @param b 参数B
 * @param c 参数C
 * @param d 参数D
 * @param e 参数E
 * @param f 参数F
 */
export function invokeGuardedCallbackAndCatchFirstError<
   A,
   B,
   C,
   D,
   E,
   F,
   Context
>(
   this: unknown,
   name: string | null,
   func: (a: A, b: B, c: C, d: D, e: E, f: F) => void,
   context: Context,
   a?: A,
   b?: B,
   c?: C,
   d?: D,
   e?: E,
   f?: F
): void {
   invokeGuardedCallback(name, func, context, a, b, c, d, e, f);
   if (hasError) {
      const error = clearCaughtError();
      if (!hasRethrowError) {
         hasRethrowError = true;
         rethrowError = error;
      }
   }
}

/**
 * 调用受保护的回调函数
 * @param name 回调函数名称
 * @param func 要执行的回调函数
 * @param context 回调函数的上下文
 * @param a 参数A
 * @param b 参数B
 * @param c 参数C
 * @param d 参数D
 * @param e 参数E
 * @param f 参数F
 */
export function invokeGuardedCallback<A, B, C, D, E, F, Context>(
   name: string | null,
   func: (a: A, b: B, c: C, d: D, e: E, f: F) => unknown,
   context: Context,
   a?: A,
   b?: B,
   c?: C,
   d?: D,
   e?: E,
   f?: F
): void {
   hasError = false;
   caughtError = null;
   try {
      func.call(context, a!, b!, c!, d!, e!, f!);
   } catch (error) {
      reporter.onError(error as Error);
   }
}
