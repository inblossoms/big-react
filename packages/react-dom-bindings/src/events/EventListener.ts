/**
 * 添加事件冒泡监听器
 * 在目标元素上添加一个事件监听器，该监听器在事件冒泡阶段触发
 *
 * @param {EventTarget} target - 要添加事件监听器的目标元素
 * @param {string} eventType - 事件类型，如 'click', 'mouseover' 等
 * @param {Function} listener - 事件处理函数
 * @param {boolean} passive - 是否使用被动事件监听器
 *                    true: 表示事件处理函数不会调用 preventDefault()
 *                    false: 表示事件处理函数可能会调用 preventDefault()
 * @returns {Function} 返回添加的监听器函数，可用于后续移除
 *
 * @example
 * // 添加一个点击事件监听器
 * const listener = addEventBubbleListener(
 *   document.getElementById('button'),
 *   'click',
 *   (e) => console.log('clicked'),
 *   true
 * );
 */
export function addEventBubbleListener(
   target: EventTarget,
   eventType: string,
   listener: Function,
   passive: boolean
): Function {
   target.addEventListener(eventType, listener as any, {
      capture: false,
      passive,
   });
   return listener;
}

/**
 * 添加事件捕获监听器
 * 在目标元素上添加一个事件监听器，该监听器在事件捕获阶段触发
 *
 * @param {EventTarget} target - 要添加事件监听器的目标元素
 * @param {string} eventType - 事件类型，如 'click', 'mouseover' 等
 * @param {Function} listener - 事件处理函数
 * @param {boolean} passive - 是否使用被动事件监听器
 *                    true: 表示事件处理函数不会调用 preventDefault()
 *                    false: 表示事件处理函数可能会调用 preventDefault()
 * @returns {Function} 返回添加的监听器函数，可用于后续移除
 *
 * @example
 * // 添加一个捕获阶段的点击事件监听器
 * const listener = addEventCaptureListener(
 *   document.getElementById('button'),
 *   'click',
 *   (e) => console.log('captured'),
 *   true
 * );
 */
export function addEventCaptureListener(
   target: EventTarget,
   eventType: string,
   listener: Function,
   passive: boolean
): Function {
   target.addEventListener(eventType, listener as any, {
      capture: true,
      passive,
   });
   return listener;
}

/**
 * 移除事件监听器
 * 从目标元素上移除指定的事件监听器
 *
 * @param {EventTarget} target - 要移除事件监听器的目标元素
 * @param {string} eventType - 事件类型，如 'click', 'mouseover' 等
 * @param {Function} listener - 要移除的事件处理函数
 * @param {boolean} capture - 是否移除捕获阶段的监听器
 *                    true: 移除捕获阶段的监听器
 *                    false: 移除冒泡阶段的监听器
 *
 * @example
 * // 移除之前添加的事件监听器
 * removeEventListener(
 *   document.getElementById('button'),
 *   'click',
 *   listener,
 *   false
 * );
 */
export function removeEventListener(
   target: EventTarget,
   eventType: string,
   listener: Function,
   capture: boolean
): void {
   target.removeEventListener(eventType, listener as any, capture);
}
