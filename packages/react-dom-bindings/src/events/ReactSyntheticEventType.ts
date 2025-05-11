/**
 * React合成事件类型定义
 * 本文件定义了React事件系统中的核心类型，用于实现跨浏览器的事件处理
 *
 * React的事件系统通过合成事件（SyntheticEvent）来统一处理不同浏览器的事件差异
 * 合成事件是对原生DOM事件的封装，提供了统一的接口和更好的跨浏览器兼容性
 *
 * 主要特点：
 * 1. 事件委托：所有事件都委托到根节点处理
 * 2. 事件池：早期版本使用事件池复用事件对象，现代版本已废弃
 * 3. 事件冒泡：模拟了DOM事件冒泡机制
 * 4. 事件优先级：支持不同优先级的事件处理
 */

import type { Fiber } from "react-reconciler/src/ReactInternalTypes";

/**
 * 基础合成事件类型
 * 定义了所有合成事件共有的基本属性和方法
 * 这是React事件系统的基础类型，所有具体的合成事件类型都继承自这个类型
 * 它封装了原生DOM事件，提供了统一的接口和跨浏览器兼容性
 *
 * 实现细节：
 * 1. 事件对象在创建时会被注入原生事件信息
 * 2. 事件处理方法（如preventDefault）会被标准化
 * 3. 事件传播状态（如isPropagationStopped）会被追踪
 */
type BaseSyntheticEvent = {
   /**
    * 检查事件是否持久化
    * 在现代React事件系统中，事件对象不再被重用，此方法始终返回true
    * 保留此方法是为了向后兼容
    *
    * 历史说明：
    * - React 16之前使用事件池机制复用事件对象
    * - React 17开始废弃事件池，事件对象不再被重用
    * - 此方法保留是为了兼容旧版本代码
    */
   isPersistent: () => boolean;

   /**
    * 检查事件传播是否被阻止
    * 当调用stopPropagation()后返回true
    * 用于在事件冒泡过程中判断是否需要继续向上传播
    *
    * 使用场景：
    * 1. 在事件冒泡过程中检查是否需要继续传播
    * 2. 在事件处理函数中判断事件是否已被阻止
    * 3. 用于实现事件委托的传播控制
    */
   isPropagationStopped: () => boolean;

   /**
    * 目标Fiber节点实例
    * 指向触发事件的React组件对应的Fiber节点
    * 用于事件冒泡和事件委托的实现
    *
    * 重要说明：
    * 1. 在事件冒泡过程中，此值保持不变
    * 2. 用于在Fiber树中定位事件源组件
    * 3. 为null时表示事件来自非React管理的DOM节点
    */
   _targetInst: Fiber | null;

   /**
    * 原生DOM事件对象
    * 包装了浏览器原生的事件对象
    * 类型为{ [propName: string]: any }以支持不同浏览器的事件属性
    *
    * 实现细节：
    * 1. 保留原生事件的所有属性和方法
    * 2. 通过类型定义支持不同浏览器的事件属性
    * 3. 在事件处理完成后会被清理
    */
   nativeEvent: { [propName: string]: any };

   /**
    * 事件目标元素
    * 指向触发事件的DOM元素
    * 在事件冒泡过程中保持不变
    *
    * 使用注意：
    * 1. 与currentTarget不同，此值在事件传播过程中不会改变
    * 2. 指向实际触发事件的DOM节点
    * 3. 可能指向非React管理的DOM节点
    */
   target?: any;

   /**
    * 相关目标元素
    * 主要用于鼠标事件，如mouseover/mouseout
    * mouseover时指向鼠标离开的元素，mouseout时指向鼠标进入的元素
    *
    * 使用场景：
    * 1. 鼠标进入/离开事件
    * 2. 拖拽事件
    * 3. 焦点相关事件
    */
   relatedTarget?: any;

   /**
    * 事件类型
    * 对应原生事件的type属性
    * 例如：'click'、'mouseover'等
    *
    * 说明：
    * 1. 与原生事件的type属性保持一致
    * 2. 用于事件分发和类型判断
    * 3. 不包含'on'前缀
    */
   type: string;

   /**
    * 当前事件目标元素
    * 在事件冒泡过程中会随着事件传播而改变
    * 指向当前正在处理事件的DOM元素
    *
    * 重要说明：
    * 1. 在事件冒泡过程中会动态更新
    * 2. 指向当前正在处理事件的DOM节点
    * 3. 用于确定事件处理函数的this上下文
    */
   currentTarget: null | EventTarget;
};

/**
 * 已知的React合成事件类型
 * 包含React事件名称的合成事件
 * 用于处理标准的React事件，如onClick、onChange等
 * 这些事件都有明确的React事件名称
 *
 * 使用场景：
 * 1. 标准DOM事件的处理
 * 2. 自定义React事件的处理
 * 3. 需要明确事件名称的场景
 */
export type KnownReactSyntheticEvent = BaseSyntheticEvent & {
   /**
    * React事件名称
    * 以'on'开头的驼峰式事件名
    * 例如：'onClick'、'onChange'等
    *
    * 命名规则：
    * 1. 以'on'开头
    * 2. 使用驼峰命名法
    * 3. 对应DOM事件名的大写首字母版本
    */
   _reactName: string;
};

/**
 * 未知的React合成事件类型
 * 不包含React事件名称的合成事件
 * 用于处理一些特殊的或自定义的事件
 * 这些事件可能没有标准的React事件名称
 *
 * 使用场景：
 * 1. 非标准DOM事件的处理
 * 2. 自定义事件系统
 * 3. 第三方库的事件集成
 */
export type UnknownReactSyntheticEvent = BaseSyntheticEvent & {
   /**
    * React事件名称
    * 对于未知事件，此值为null
    * 表示这是一个非标准的React事件
    *
    * 说明：
    * 1. 用于区分标准和非标准事件
    * 2. 允许事件系统处理未知类型的事件
    * 3. 提供向后兼容性支持
    */
   _reactName: null;
};

/**
 * React合成事件联合类型
 * 可以是已知或未知的React合成事件
 * 这个类型用于事件处理函数的参数类型
 * 允许处理函数同时支持标准和非标准的React事件
 *
 * 使用场景：
 * 1. 事件处理函数的参数类型定义
 * 2. 事件分发系统的类型检查
 * 3. 自定义事件处理器的类型支持
 */
export type ReactSyntheticEvent =
   | KnownReactSyntheticEvent
   | UnknownReactSyntheticEvent;
