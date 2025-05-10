import { DOMEventName } from "./DOMEventNames";

export const allNativeEvents: Set<DOMEventName> = new Set();
export const registrationNameDependencies: {
   [registrationName: string]: Array<DOMEventName>;
} = {};

/**
 * 注册事件分发
 * @param registrationName 事件名称
 * @param dependencies 事件依赖
 */
export function registerTwoPhaseEvent(
   registrationName: string,
   dependencies: Array<DOMEventName>
): void {
   //? 1. 注册冒泡事件
   registerDirectEvent(registrationName, dependencies);
   //? 2. 注册捕获事件
   registerDirectEvent(registrationName + "Capture", dependencies);
}

/**
 * 注册事件
 * @param registrationName 事件名称
 * @param dependencies 事件依赖
 */
export function registerDirectEvent(
   registrationName: string,
   dependencies: Array<DOMEventName>
) {
   //? 1. 注册事件依赖
   registrationNameDependencies[registrationName] = dependencies;
   //? 2. 添加事件到所有事件集合中
   dependencies.forEach((dependency) => {
      allNativeEvents.add(dependency);
   });
}
