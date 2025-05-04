export function getCurrentTime(): number {
   return performance.now();
}

export function isArray(sth: any) {
   return Array.isArray(sth);
}

export function isNumber(sth: any) {
   return typeof sth === "number";
}
export function isString(sth: any) {
   return typeof sth === "string";
}
export function isFunction(sth: any) {
   return typeof sth === "function";
}
export function isObject(sth: any) {
   return typeof sth === "object";
}
