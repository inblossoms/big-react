import type { Fiber } from "react-reconciler/src/ReactInternalTypes";

/**
 * 基础事件接口定义
 * 包含事件的基本属性和方法
 */
const EventInterface = {
   eventPhase: 0,
   bubbles: 0,
   cancelable: 0,
   timeStamp: function (event: { [propName: string]: any }) {
      return event.timeStamp || Date.now();
   },
   defaultPrevented: 0,
   isTrusted: 0,
};

/**
 * UI事件接口定义
 * 继承自基础事件接口，添加了UI相关属性
 */
const UIEventInterface = {
   ...EventInterface,
   view: 0,
   detail: 0,
};

/**
 * 事件接口类型定义
 * 可以是数字0或一个接收事件对象并返回任意值的函数
 */
type EventInterfaceType = {
   [propName: string]: 0 | ((event: { [propName: string]: any }) => any);
};

/**
 * 返回true的函数
 * @returns {boolean} 始终返回true
 */
function functionThatReturnsTrue() {
   return true;
}

/**
 * 返回false的函数
 * @returns {boolean} 始终返回false
 */
function functionThatReturnsFalse() {
   return false;
}

/**
 * 合成事件实例接口
 * 定义了合成事件对象的结构和必需的方法
 */
interface SyntheticEventInstance {
   /** React事件名称 */
   _reactName: string | null;
   /** 目标Fiber实例 */
   _targetInst: Fiber | null;
   /** 事件类型 */
   type: string;
   /** 原生事件对象 */
   nativeEvent: { [propName: string]: any };
   /** 事件目标元素 */
   target: EventTarget | null;
   /** 当前事件目标元素 */
   currentTarget: EventTarget | null;
   /** 其他可能的属性 */
   [key: string]: any;
   /** 检查是否阻止了默认行为 */
   isDefaultPrevented: () => boolean;
   /** 检查是否阻止了事件传播 */
   isPropagationStopped: () => boolean;
   /** 阻止默认行为 */
   preventDefault: () => void;
   /** 阻止事件传播 */
   stopPropagation: () => void;
   /** 持久化事件对象 */
   persist: () => void;
   /** 检查事件是否持久化 */
   isPersistent: () => boolean;
}

/**
 * 创建合成事件构造函数
 * 该函数用于创建一个合成事件类，用于包装原生DOM事件，提供统一的接口和跨浏览器兼容性
 * @param {EventInterfaceType} Interface - 事件接口定义，定义了事件对象应该具有的属性和方法
 * @returns {Function} 合成事件构造函数
 */
function createSyntheticEvent(Interface: EventInterfaceType) {
   /**
    * 合成事件基类构造函数
    * 创建一个包装原生DOM事件的合成事件对象，提供统一的接口和跨浏览器兼容性
    * @param {string|null} reactName - React事件名称，如'onClick'
    * @param {string} reactEventType - React事件类型，如'click'
    * @param {Fiber|null} targetInst - 目标Fiber实例，用于事件冒泡
    * @param {Object} nativeEvent - 原生DOM事件对象
    * @param {EventTarget|null} nativeEventTarget - 原生事件目标元素
    */
   function SyntheticBaseEvent(
      this: SyntheticEventInstance,
      reactName: string | null,
      reactEventType: string,
      targetInst: Fiber | null,
      nativeEvent: { [propName: string]: any },
      nativeEventTarget: null | EventTarget
   ) {
      // 保存React相关的事件信息
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;

      // 遍历事件接口定义，将原生事件属性标准化
      for (const propName in Interface) {
         if (!Interface.hasOwnProperty(propName)) {
            continue;
         }
         const normalize = Interface[propName];
         if (normalize && typeof normalize === "function") {
            // 如果接口定义了标准化函数，使用它来处理属性值
            this[propName] = normalize(nativeEvent);
         } else {
            // 否则直接使用原生事件的属性值
            this[propName] = nativeEvent[propName];
         }
      }

      // 处理默认行为阻止状态
      // 优先使用原生事件的 defaultPrevented 属性
      // 如果不存在，则检查 returnValue 是否为 false（IE兼容）
      const defaultPrevented =
         nativeEvent.defaultPrevented != null
            ? nativeEvent.defaultPrevented
            : nativeEvent.returnValue === false;

      // 根据默认行为阻止状态设置 isDefaultPrevented 方法
      if (defaultPrevented) {
         this.isDefaultPrevented = functionThatReturnsTrue;
      } else {
         this.isDefaultPrevented = functionThatReturnsFalse;
      }

      // 初始化事件传播状态
      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
   }

   // 为合成事件原型添加事件处理方法
   Object.assign(SyntheticBaseEvent.prototype, {
      /**
       * 阻止默认行为
       * 调用原生事件的preventDefault方法，并更新状态
       */
      preventDefault: function (this: SyntheticEventInstance) {
         this.defaultPrevented = true;
         const event = this.nativeEvent;
         if (!event) {
            return;
         }

         // 优先使用标准的 preventDefault 方法
         if (event.preventDefault) {
            event.preventDefault();
         } else if (typeof event.returnValue !== "undefined") {
            // IE兼容性处理
            event.returnValue = false;
         }
         this.isDefaultPrevented = functionThatReturnsTrue;
      },

      /**
       * 阻止事件传播
       * 调用原生事件的stopPropagation方法，并更新状态
       */
      stopPropagation: function (this: SyntheticEventInstance) {
         const event = this.nativeEvent;
         if (!event) {
            return;
         }

         // 优先使用标准的stopPropagation方法
         if (event.stopPropagation) {
            event.stopPropagation();
         } else if (typeof event.cancelBubble !== "undefined") {
            // IE兼容性处理
            event.cancelBubble = true;
         }

         this.isPropagationStopped = functionThatReturnsTrue;
      },

      /**
       * 持久化事件对象
       * 在现代事件系统中，事件对象不再被重用，此方法仅为了兼容性保留
       */
      persist: function () {
         // Modern event system doesn't use pooling.
      },

      // 检查事件是否持久化，在现代事件系统中始终返回true
      isPersistent: functionThatReturnsTrue,
   });

   return SyntheticBaseEvent;
}

/**
 * 修饰键到属性的映射
 */
const modifierKeyToProp: { [key: string]: string } = {
   Alt: "altKey",
   Control: "ctrlKey",
   Meta: "metaKey",
   Shift: "shiftKey",
};

/**
 * 获取修饰键状态
 * @param {string} keyArg - 修饰键名称
 * @returns {boolean} 修饰键是否被按下
 */
function modifierStateGetter(this: SyntheticEventInstance, keyArg: string) {
   const syntheticEvent = this;
   const nativeEvent = syntheticEvent.nativeEvent;
   if (nativeEvent.getModifierState) {
      return nativeEvent.getModifierState(keyArg);
   }
   const keyProp = modifierKeyToProp[keyArg];
   return keyProp ? !!nativeEvent[keyProp] : false;
}

/** 鼠标移动X坐标 */
let lastMovementX: number = 0;
/** 鼠标移动Y坐标 */
let lastMovementY: number = 0;
/** 上一个鼠标事件 */
let lastMouseEvent: { [propName: string]: any } | null = null;

/**
 * 更新鼠标移动状态
 * @param {Object} event - 鼠标事件对象
 */
function updateMouseMovementPolyfillState(event: { [propName: string]: any }) {
   if (event !== lastMouseEvent) {
      if (lastMouseEvent && event.type === "mousemove") {
         lastMovementX = event.screenX - lastMouseEvent.screenX;
         lastMovementY = event.screenY - lastMouseEvent.screenY;
      } else {
         lastMovementX = 0;
         lastMovementY = 0;
      }
      lastMouseEvent = event;
   }
}

/**
 * 获取事件修饰键状态
 * @param {Object} nativeEvent - 原生事件对象
 * @returns {Function} 修饰键状态获取函数
 */
function getEventModifierState(nativeEvent: { [propName: string]: any }) {
   return modifierStateGetter;
}

/**
 * 鼠标事件接口定义
 * 继承自UI事件接口，添加了鼠标相关属性
 */
const MouseEventInterface = {
   ...UIEventInterface,
   screenX: 0,
   screenY: 0,
   clientX: 0,
   clientY: 0,
   pageX: 0,
   pageY: 0,
   ctrlKey: 0,
   shiftKey: 0,
   altKey: 0,
   metaKey: 0,
   getModifierState: getEventModifierState,
   button: 0,
   buttons: 0,
   /**
    * 获取相关目标元素
    * @param {Object} event - 事件对象
    * @returns {Element|null} 相关目标元素
    */
   relatedTarget: function (event: { [propName: string]: any }) {
      if (event.relatedTarget === undefined)
         return event.fromElement === event.srcElement
            ? event.toElement
            : event.fromElement;

      return event.relatedTarget;
   },
   /**
    * 获取鼠标X轴移动距离
    * @param {Object} event - 事件对象
    * @returns {number} X轴移动距离
    */
   movementX: function (event: { [propName: string]: any }) {
      if ("movementX" in event) {
         return event.movementX;
      }
      updateMouseMovementPolyfillState(event);
      return lastMovementX;
   },
   /**
    * 获取鼠标Y轴移动距离
    * @param {Object} event - 事件对象
    * @returns {number} Y轴移动距离
    */
   movementY: function (event: { [propName: string]: any }) {
      if ("movementY" in event) {
         return event.movementY;
      }
      return lastMovementY;
   },
};

/**
 * 基础合成事件构造函数
 */
export const SyntheticEvent = createSyntheticEvent(
   EventInterface as EventInterfaceType
);

/**
 * 鼠标合成事件构造函数
 */
export const SyntheticMouseEvent = createSyntheticEvent(
   MouseEventInterface as EventInterfaceType
);
