import { Suspense, useState } from "react";
import User from "../components/User";
import { fetchData } from "../utils";
import Num from "../components/Num";
import { SuspenseList } from "../whichReact";
import ErrorBoundaryPage from "./ErrorBoundaryPage";
const initialResource = fetchData()

export default function SuspensePage(props) {
  const [resource, setresource] = useState(initialResource)
  return (
    <div>
      <h3>SuspensePage-customTest</h3>
      <ErrorBoundaryPage fallback={<h1>出错了</h1>}>
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <Suspense fallback={<h3>加载User中....</h3>}>
            <User resource={resource}></User>
          </Suspense>
          <Suspense fallback={<h3>加载Num中....</h3>}>
            <Num resource={resource}></Num>
          </Suspense>
        </SuspenseList>
      </ErrorBoundaryPage>
      <button onClick={()=>setresource(fetchData())}>refresh</button>
    </div>
  )
}