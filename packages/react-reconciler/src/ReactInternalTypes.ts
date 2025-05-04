import { Flags, NoFlags } from "./ReactFiberFlags";
import { WorkTag } from "./ReactWorkTags";

export type Container = Element | Document | DocumentFragment;
export type FiberRoot = {
   containerInfo: Container;
   current: Fiber;
   finishedWork: Fiber | null;
};

export type Fiber = {
   // 标记 fiber 类型，例如 FunctionComponent、ClassComponent、HostComponent 等
   //> 参考 ReactWorkTags.ts
   tag: WorkTag;

   // 标记组件在当前层级下的唯一性
   key: string | null;

   // 组件类型
   elementType: any;

   // 组件类型：
   //> 如果组件是函数组件，则 type 为函数本身；如果组件是类组件，则 type 为类本身；原生组件则为字符串
   type: any;

   // 如果组件是原生组件，则 stateNode 为 DOM 元素；如果组件是类组件，则 stateNode 为组件实例；如果组件是函数组件，则 stateNode 为 null
   //> 如果组件是原生根节点，则 stateNode 为 FiberRootNode    HostRoot=3
   stateNode: any;

   // 指向父级 fiber
   return: Fiber | null;

   //* 单列表结构
   // 第一个子 fiber
   child: Fiber | null;

   // 下一个兄弟级 fiber
   sibling: Fiber | null;

   // 当前 fiber 在父级 fiber 中的索引
   //> 用于 diff 判断节点是否需要发生移动
   index: number;

   // 当前 fiber 的 pendingProps
   //> 即将应用于组件的新 props
   pendingProps: any;
   // 上一次渲染时使用的 props
   //> 通过与 pendingProps 对比，判断是否需要更新
   memoizedProps: any;

   // 单链表结构，不同组件的 memoizedState 存储不同
   //> 函数组件：memoizedState 为 hook[0] 的值，单链表的每一个 hook 节点没有 key 值，除了顺序 无法记录其唯一性。因此不能破坏链表的稳定性
   //> 类组件：memoizedState 为组件的 state
   //> 原生组件 HostComponent：memoizedState 为 RootState
   memoizedState: any;

   // 标记当前组件的 Effect 相关副作用
   flags: Flags;

   // 上一次渲染时使用的 fiber
   //> 缓存 fiber，做新老 vdom diff
   alternate: Fiber | null;
};

export class FiberNode {
   tag: WorkTag; // 标记 fiber 类型，例如 FunctionComponent、ClassComponent、HostComponent 等
   key: null | string; // 标记组件在当前层级下的唯一性
   elementType: any; // 组件类型
   type: any; // 组件类型：> 如果组件是函数组件，则 type 为函数本身；如果组件是类组件，则 type 为类本身；原生组件则为字符串
   stateNode: any; // 如果组件是原生组件，则 stateNode 为 DOM 元素；如果组件是类组件，则 stateNode 为组件实例；如果组件是函数组件，则 stateNode 为 null
   return: FiberNode | null; // 指向父级 fiber
   child: FiberNode | null; // 第一个子 fiber
   sibling: FiberNode | null; // 下一个兄弟级 fiber
   index: number; // 当前 fiber 在父级 fiber 中的索引
   pendingProps: unknown; // 当前 fiber 的 pendingProps
   memoizedProps: any; // 上一次渲染时使用的 props
   memoizedState: any; // 不同组件的 memoizedState 存储不同，函数组件 hook[0] 的值 类组件 state 原生组件 RootState
   flags: number; // 标记当前组件的 Effect 相关副作用
   alternate: FiberNode | null; // 上一次渲染时使用的 fiber

   constructor(tag: WorkTag, pendingProps: unknown, key: null | string) {
      this.tag = tag;
      this.key = key;
      this.elementType = null;
      this.type = null;
      this.stateNode = null;
      this.return = null;
      this.child = null;
      this.sibling = null;
      this.index = 0;
      this.pendingProps = pendingProps;
      this.memoizedProps = null;
      this.memoizedState = null;
      this.flags = NoFlags;
      this.alternate = null;
   }
}
