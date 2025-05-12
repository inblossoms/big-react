import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import {
   HostRoot,
   HostComponent,
   HostText,
   Fragment,
   ClassComponent,
   FunctionComponent,
   ContextProvider,
   ContextConsumer,
   MemoComponent,
   SimpleMemoComponent,
} from "./ReactWorkTags";
import { Fiber } from "./ReactInternalTypes";
import { isString, isNumber } from "shared/utils";
import { renderWithHooks } from "./ReactFiberHooks";
import { pushProvider, readContext } from "./ReactFiiberNewContext";
import {
   createFiberFromTypeAndProps,
   createWorkInProgress,
   isSimpleFunctionComponent,
} from "./ReactFiber";
import shallowEqual from "shared/shallowEqual";

/**
 * 开始处理工作单元
 * 根据 fiber 的类型执行不同的更新逻辑，并返回子 fiber
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
export function beginWork(
   current: Fiber | null,
   workInProgress: Fiber
): Fiber | null {
   switch (workInProgress.tag) {
      case HostRoot: //> div.root 根节点
         return updateHostRoot(current, workInProgress);
      case HostComponent: //> 原生组件
         return updateHostComponent(current, workInProgress);
      case HostText:
         return updateHostText(current, workInProgress);
      case Fragment:
         return updateHostFragment(current, workInProgress);
      case ClassComponent:
         return updateClassComponent(current, workInProgress);
      case FunctionComponent:
         return updateFunctionComponent(current, workInProgress);
      case ContextProvider:
         return updateContextProvider(current, workInProgress);
      case ContextConsumer:
         return updateContextConsumer(current, workInProgress);
      case MemoComponent:
         return updateMemoComponent(current, workInProgress);
      case SimpleMemoComponent:
         return updateSimpleMemoComponent(current, workInProgress);
   }

   throw new Error(
      `Unknown unit of work tag: ${workInProgress.tag}, this error is likely caused by a bug in React. Please file an issue.`
   );
}

/**
 * 更新 Memo 组件
 * 处理带有比较函数的 memo 组件的更新逻辑
 *
 * Memo 组件的主要目的是通过比较 props 来避免不必要的重渲染。它有两种工作模式：
 * 1. 简单模式：当组件是函数组件且没有自定义比较函数时，会被优化为 SimpleMemoComponent
 * 2. 标准模式：使用自定义比较函数或默认的浅比较来决定是否需要更新
 *
 * 更新流程：
 * 1. 初次渲染时：
 *    - 如果是简单函数组件且没有自定义比较函数，转换为 SimpleMemoComponent
 *    - 否则创建新的子 fiber 节点
 * 2. 更新渲染时：
 *    - 使用比较函数（自定义或默认的浅比较）比较新旧 props
 *    - 如果 props 相同，跳过更新
 *    - 如果 props 不同，创建新的子 fiber 节点
 *
 * @param {Fiber | null} current - 当前 fiber 节点，用于比较和复用
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点，如果跳过更新则返回 null
 */
function updateMemoComponent(current: Fiber | null, workInProgress: Fiber) {
   // 获取 memo 组件的类型，这个类型包含了实际的组件和比较函数
   const Component = workInProgress.type;
   // 获取实际的组件类型（被 memo 包装的组件）
   const type = Component.type;

   // 初次渲染的处理逻辑
   if (current === null) {
      // 优化：如果是简单函数组件且没有自定义比较函数和默认属性
      // 将其转换为 SimpleMemoComponent 以提高性能
      if (
         isSimpleFunctionComponent(type) &&
         Component.compare === null &&
         Component.defaultProps === undefined
      ) {
         // 将类型设置为实际的函数组件
         workInProgress.type = type;
         // 将标签改为 SimpleMemoComponent
         workInProgress.tag = SimpleMemoComponent;
         // 使用 SimpleMemoComponent 的更新逻辑
         return updateSimpleMemoComponent(current, workInProgress);
      }

      // 创建新的子 fiber 节点
      // 这个函数在初次渲染时被调用，原因是：
      // 1. 当组件第一次渲染时，还没有对应的 fiber 节点
      // 2. 需要根据组件的类型（type）和属性（props）创建一个全新的 fiber 节点
      // 3. 这个新创建的 fiber 节点将作为 memo 组件的子节点
      const child = createFiberFromTypeAndProps(
         type,
         null,
         workInProgress.pendingProps
      );

      // 建立父子关系
      child.return = workInProgress;
      workInProgress.child = child;
      return child;
   }

   // 更新渲染的处理逻辑
   // 获取比较函数，如果没有自定义比较函数则使用默认的浅比较
   let compare = Component.compare;
   compare = compare === null ? shallowEqual : compare;

   // 比较新旧 props，决定是否需要更新
   if (compare(current.memoizedProps, workInProgress.pendingProps)) {
      // 如果 props 相同，跳过更新
      return bailoutOnAlreadyFinishedWork();
   }

   // 如果 props 不同，创建新的子 fiber 节点
   // 复用当前的子 fiber 节点，但使用新的 props
   // 1. 当组件需要更新时，已经存在一个 fiber 节点（current.child）
   // 2. 不需要创建全新的 fiber 节点，而是复用现有的节点
   // 3. 通过 createWorkInProgress 创建一个新的工作副本，但保留原有节点的引用
   const newChild = createWorkInProgress(
      current.child as Fiber,
      workInProgress.pendingProps
   );

   // 建立父子关系
   newChild.return = workInProgress;
   workInProgress.child = newChild;
   return newChild;
}

/**
 * 更新 SimpleMemo 组件
 * 处理没有比较函数的简单 memo 组件的更新逻辑
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateSimpleMemoComponent(
   current: Fiber | null,
   workInProgress: Fiber
) {
   if (current !== null) {
      // 组件更新，由于到达这里的上层中并没有 compare 所以进行 props 的浅比较
      if (shallowEqual(current.memoizedProps, workInProgress.pendingProps)) {
         return bailoutOnAlreadyFinishedWork();
      }
   }
   return updateFunctionComponent(current, workInProgress);
}

/**
 * 跳过已完成的工作
 * 当组件不需要更新时，直接返回 null
 * @returns {null} 返回 null 表示跳过更新
 */
function bailoutOnAlreadyFinishedWork() {
   return null;
}

/**
 * 更新 Context Consumer 组件
 * 处理 Context Consumer 组件的更新逻辑，读取 context 值并渲染子组件
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateContextConsumer(current: Fiber | null, workInProgress: Fiber) {
   const context = workInProgress.type;
   const value = readContext(context);
   //> workInProgress.pendingProps.children -> pendingProps 存储了用于组件的最新值
   //> consumer 组件内会接收一个函数，而这个函数就是这里的 pendingProps.children
   const render = workInProgress.pendingProps.children;
   //> 将 craeteContext 提供的的值传递给这个回调
   const newChildren = render(value);

   reconcileChildren(current, workInProgress, newChildren);
   return workInProgress.child;
}

/**
 * 更新 Context Provider 组件
 * 处理 Context Provider 组件的更新逻辑，更新 context 值并渲染子组件
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateContextProvider(current: Fiber | null, workInProgress: Fiber) {
   const context = workInProgress.type._context;
   const value = workInProgress.pendingProps.value;

   //? context provider 可以多层嵌套，那么如何访问到距离子组件最近的那个 provider ？
   //> 通过一个栈结构来记录：context value，从而让后代组件消费
   pushProvider(context, value);

   reconcileChildren(
      current,
      workInProgress,
      workInProgress.pendingProps.children
   );

   return workInProgress.child;
}

/**
 * 更新 Fragment 组件
 * 处理 Fragment 组件的更新逻辑，直接协调其子节点
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateHostFragment(current: Fiber | null, workInProgress: Fiber) {
   const nextChildren = workInProgress.pendingProps.children;

   reconcileChildren(current, workInProgress, nextChildren);
   return workInProgress.child;
}

/**
 * 更新文本节点
 * 文本节点没有子节点，所以不需要协调
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {null} 返回 null，因为文本节点没有子节点
 */
function updateHostText(current: Fiber | null, workInProgress: Fiber) {
   return null;
}

/**
 * 更新根节点
 * 处理根节点的更新逻辑，协调其子节点
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateHostRoot(current: Fiber | null, workInProgress: Fiber) {
   const nextChildren = workInProgress.memoizedState.element;
   reconcileChildren(current, workInProgress, nextChildren);

   //> 更新阶段
   if (current) {
      current.child = workInProgress.child; // 此时 老节点 的 child 指向 新节点的 child
   }

   return workInProgress.child;
}

/**
 * 处理更新原生组件，1. 如若是初次渲染，那么涉及到的行为只有协调（此时没有 fiber 树生成）；
 * 2. 如若是更新行为，这涉及到协调或者是 bailout
 * @param current 老 fiber
 * @param workInProgress 新 fiber
 * @returns 返回子节点
 */
function updateHostComponent(current: Fiber | null, workInProgress: Fiber) {
   const { type, pendingProps } = workInProgress;
   const nextProps = workInProgress.pendingProps;
   let nextChildren = nextProps.children;

   const isDirectTextChild = shouldSetTextContent(type, pendingProps);
   //> 如果原生标签只有一个文本，此时文本不再生成 fiber 节点，而是做为这个原生标签的属性
   if (isDirectTextChild /* 文本属性 */) {
      nextChildren = null;
      return null;
   }

   reconcileChildren(current, workInProgress, nextChildren);
   return workInProgress.child;
}

/**
 * 更新类组件
 * 处理类组件的更新逻辑，包括实例化和调用 render 方法
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateClassComponent(current: Fiber | null, workInProgress: Fiber) {
   const { type, pendingProps } = workInProgress;

   // contextType 是一个静态属性值，需要通过实例来访问：type.contextType
   const context = readContext(type.contextType);
   let instance = workInProgress.stateNode;

   if (current === null) {
      instance = new type(pendingProps);
      workInProgress.stateNode = instance;
   }

   instance.context = context;
   // 调用render方法获取子元素
   const nextChildren = instance.render();
   // 将子元素转换为fiber节点
   reconcileChildren(current, workInProgress, nextChildren);

   return workInProgress.child;
}

/**
 * 更新函数组件
 * 处理函数组件的更新逻辑，调用函数并协调其返回值
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @returns {Fiber | null} 返回子 fiber 节点
 */
function updateFunctionComponent(current: Fiber | null, workInProgress: Fiber) {
   // 调用函数组件获取子元素
   const nextChildren = renderWithHooks(current, workInProgress);

   // 将子元素转换为fiber节点
   reconcileChildren(current, workInProgress, nextChildren);
   return workInProgress.child;
}

/**
 * 协调子节点
 * 根据当前状态决定是挂载还是更新子节点
 * @param {Fiber | null} current - 当前 fiber 节点
 * @param {Fiber} workInProgress - 正在处理的工作 fiber 节点
 * @param {any} nextChildren - 新的子节点
 */
function reconcileChildren(
   current: Fiber | null,
   workInProgress: Fiber,
   nextChildren: any
) {
   if (current === null) {
      //? 初次渲染 执行挂载行为
      workInProgress.child = mountChildFibers(
         workInProgress,
         null,
         nextChildren
      );
   } else {
      //* 对于 root 根节点在浏览器默认行为的渲染中便已经挂载了，所以对于 root 根节点来说，此时它要执行的是更新行为
      //? 更新
      workInProgress.child = reconcileChildFibers(
         workInProgress,
         current.child, // 老的第一个子 fiber
         nextChildren
      );
   }
}

/**
 * 判断是否应该将内容设置为文本内容
 * 用于优化文本节点的处理
 * @param {string} type - 元素类型
 * @param {any} props - 元素属性
 * @returns {boolean} 如果应该设置为文本内容则返回 true
 */
function shouldSetTextContent(type: string, props: any): any {
   return (
      type === "textarea" ||
      type === "noscript" ||
      isString(props.children) ||
      isNumber(props.children) ||
      (typeof props.dangerouslySetInnerHTML === "object" &&
         props.dangerouslySetInnerHTML !== null &&
         props.dangerouslySetInnerHTML.__html != null)
   );
}
