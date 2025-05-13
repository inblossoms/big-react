/*
 * @Autor: ERP
 * @Email: 邮箱
 * @Description: 
 * @CreateDate: Do not edit
 * @LastEditors: houxinchao
 */
import { useTransition } from "react"

export default function Button (props) {
  // 页面更新后才展示新数据（猜测获取数据，进行dom预渲染后直接插入）
  // startTransition 是同步的
  const [isPending, startTransition] = useTransition()
  return (
    <div>
      <h3>CustomButton</h3>
      <button disabled={isPending} onClick={()=>startTransition(props.refresh)}>refresh</button>
      {isPending?'加载中':''}
    </div>
  )
}