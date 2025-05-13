/*
 * @Autor: ERP
 * @Email: 邮箱
 * @Description: 
 * @CreateDate: Do not edit
 * @LastEditors: houxinchao
 */
import { useDeferredValue, useState } from "react";
import MySlowList from "../components/MySlowList";

export default function UseDeferredValuePage(props) {
  const [text, settext] = useState('hello')
  const deferredText = useDeferredValue(text)
  const handleChange = ({target: {value}})=>{
    console.log('修改了', value)
    settext(value)
  }
  return (
    <div>
      <input value={text} onChange={handleChange}/>
      <MySlowList text={deferredText}/>
    </div>
  )
}