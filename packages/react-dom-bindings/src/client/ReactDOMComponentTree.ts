import { Fiber } from "react-reconciler/src/ReactInternalTypes";

const randomKey = Math.random().toString(36).slice(2);
const internalInstanceKey = "__reactFiber$" + randomKey;
const internalPropsKey = "__reactProps$" + randomKey;

/**
 * 将 fiber 节点缓存到 DOM 节点上
 * @param hostInst fiber 节点
 * @param node DOM 节点
 */
export function precacheFiberNode(hostInst: Fiber, node: Element | Text): void {
   (node as any)[internalInstanceKey] = hostInst;
}

/**
 * 从 DOM 节点获取最近的 fiber 实例
 * @param targetNode 目标 DOM 节点
 * @returns 返回对应的 fiber 实例，如果不存在则返回 null
 */
export function getClosestInstanceFromNode(targetNode: Node): null | Fiber {
   let targetInst = (targetNode as any)[internalInstanceKey];
   if (targetInst) {
      //Don't return HostRoot or SuspeseComponent here.
      return targetInst;
   }
   return null;
}

/**
 * 从 DOM 节点获取当前的 props
 * @param node DOM 节点
 * @returns 返回节点上缓存的 props，如果不存在则返回 null
 */
export function getFiberCurrentPropsFromNode(node: Element | Text) {
   return (node as any)[internalPropsKey] || null;
}

/**
 * 更新 DOM 节点上缓存的 props
 * @param node DOM 节点
 * @param props 新的 props
 */
export function updateFiberProps(node: Element | Text, props: any): void {
   (node as any)[internalPropsKey] = props;
}
