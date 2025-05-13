import { PureComponent, useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
export default function UseCallbackPage() {
  const [count, setCount] = useState(0)
  const [value, setValue] = useState('')
  // flushSync(()=>{
  //   console.log(1)
  //   // setCount(c => c + 1);
  // })
  // console.log(2)
  // setTimeout(() => {
  //   console.log('触发了')
  //   setCount(c => c + 1);
  //   setValue(f => f + 233);
  // }, 1000);
  const addClick = useCallback(() => {
    console.log('改动了useCallback')
    return count
  }, [count])
  // const addClick = () => {
  //   console.log('加了', count)
  //   return count
  //   // let sum = 0
  //   // for(let i in count) {
  //   //   sum+=i
  //   // }
  //   // console.log('加了', sum)
  //   // return sum
  // }
  return (
    <div>
      <p>{count}</p>
      <p>{value}</p>
      <button onClick={()=>setCount(count + 1)}>add</button>
      <input value={value} onChange={(e) => setValue(e.target.value)}/>
      <Child addClick={addClick}></Child>
    </div>
  )
}
/**
 * pure function（有返回值）
 * 结果只依赖于入参变化，不被函数外部变量影响，也不影响外部变量
 * 1. 如果入参不变结果一定相同，因此可以被缓存（v8），提升运行速度
 * 2. 不产生副作用（不影响外部任何信息）
 */
/**
 * PureComponent（注意使用）
 * 拥有纯函数的优势，即可被缓存，无副作用
 * 不需要 shouldComponentUpdate 
 * 注意：此时props与state的对比是浅比较（Shallow Compared）。因此Pure Components不能够使用嵌套式数据结构（nested data structure）。
 * 浅比较：在比较简单类型，例如数字与string时，对比他们的类型与值是否相等；在比较复杂类型，例如数组与对象时，对比他们的引用是否相等。这也就会导致在比较嵌套式数据结构时，可能永远都会比较他们的引用而不是内部的属性值，从而永远返回false阻止重新渲染。
 */

class Child extends PureComponent {
  render() {
  console.log("child render");
  const {addClick} = this.props
    return (
      <div>
        <h3>Child</h3>
        <button onClick={()=>console.log(addClick())}>add</button>
      </div>
    )
  }
}