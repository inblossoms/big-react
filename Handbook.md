**Hook 使⽤规则：**不要在循环 ，条件或嵌套函数 中调⽤ Hook， 确保总是在你的 React 函数的最顶层以及 任何 return 之前调⽤他们。

1. 原因

> React 函数 ：React 组件函数、⾃定义 Hook。
> 函数组件的 fiber.memoizedState 单链表的每 个 hook 节点没有名字或者 key， 因为除了它们的顺序，我们⽆法记录它们的唯⼀性。因此为了确保某个 Hook 是它本身 ，我们不能破坏这个链表的稳定性。
