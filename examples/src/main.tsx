import {
   ReactDOM,
   Fragment,
   Component,
   useState,
   useReducer,
   useMemo,
   useCallback,
   useRef,
   useEffect,
   useLayoutEffect,
} from "../which-react";
import "./index.css";

// const fragment = (
//    <>
//       <>
//          <>
//             <>-</>
//          </>
//       </>
//       Hi!
//       <>Roy</>
//    </>
// );

// const fragment = <Fragment>DEVELOP</Fragment>;

// interface ComponentProps {
//    context: string;
// }

// class ClassComponent extends Component<ComponentProps> {
//    render() {
//       return <span>{this.props.context}</span>;
//    }
// }

// function FunctionComponent({ name }: { name: string }) {
//    const [count, setCount] = useReducer((x: number) => x + 1, 0);
//    const [num, setNum] = useState(1);

//    //    const arr = count % 2 === 0 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];
//    const arr = count % 2 === 0 ? [0, 1, 2] : [3, 5, 1];

//    const _cls = count % 2 === 0 ? "red yellow_border" : "yellow red_border";

//    return (
//       <div className="border">
//          <h2 className={_cls}>Hi! {name}</h2>
//          <button
//             onClick={() => {
//                setCount();
//             }}
//          >
//             {count}
//          </button>
//          <button
//             onClick={() => {
//                setNum(num + 1);
//             }}
//          >
//             {num}
//          </button>
//          <ul>
//             {arr.map((i) => (
//                <li key={"li" + i}>{i}</li>
//             ))}
//          </ul>
//          {num % 2 === 0 ? <div>null</div> : null}
//          {num % 2 === 0 ? <div>undefined</div> : undefined}
//          {num % 2 === 0 && <div>boolean</div>}
//       </div>
//    );
// }

// function FunctionComponent({ name }: { name: string }) {
//    const [count, setCount] = useReducer((x: number) => x + 1, 0);
//    const [num, setNum] = useState(0);

//    const addClick = useCallback(() => {
//       console.log("useCallbak");
//       let sum = 0;

//       for (let i = 0; i < count * 10; i++) {
//          sum += i;
//       }

//       return sum;
//    }, [count]);

//    const expensive = useMemo(() => {
//       console.log("compute");
//       //   let sum = 0;

//       //   for (let i = 0; i < count * 10; i++) {
//       //      sum += i;
//       //   }

//       return addClick();
//    }, [addClick]);

//    return (
//       <div className="border">
//          <h2>Hi! {name}</h2>

//          <p>{expensive}</p>
//          <button
//             onClick={() => {
//                setCount();
//             }}
//          >
//             {count}
//          </button>
//          <button
//             onClick={() => {
//                setNum(num + 1);
//             }}
//          >
//             {num}
//          </button>

//          {/* <Child addClick={addClick} /> */}
//       </div>
//    );
// }

// memo 允许组件在 props 没有发生变化的情况下跳过重新渲染
// const Child = memo(({addClick}: {addClick: () => number)=> {
// 	console.log("child render.");

// 	return (
// 		<div>
// 		    <h3>Child</h3>
// 			<button onClick={() => console.log(addClick())}>add</button>
// 		</div>
// 	)

// })

// const jsx = (
//    <div className="box border">
//       <h1 className="border">Big-React</h1>
//       {/* {fragment} */}
//       {/* <ClassComponent context="Hello!" /> */}
//       <FunctionComponent name=" Roy." />
//       <h2 className="border">ooooops ....</h2>
//    </div>
// );
function FunctionComponent({ name }: { name: string }) {
   const [count, setCount] = useReducer((x: number) => x + 1, 0);
   const [num, setNum] = useState(0);

   //    const ref = useRef(0);
   //    function handleClick() {
   //       ref.current = ref.current + 1;
   //       alert(`You clicked ${ref.current} times!`);
   //    }

   useLayoutEffect(() => {
      console.log("useLayoutEffect");
   }, [count]);

   useEffect(() => {
      console.log("useEffect");
   }, [num]);

   return (
      <div className="border">
         <h2>Hi! {name}</h2>

         <Child count={count} num={num} />

         <button
            onClick={() => {
               setCount();
            }}
         >
            {count}
         </button>
         <button
            onClick={() => {
               setNum(num + 1);
            }}
         >
            {num}
         </button>

         {/* <button onClick={handleClick}>Click me</button> */}
      </div>
   );
}

function Child({ count, num }: { count: string; num: string }) {
   useLayoutEffect(() => {
      console.log("Child: useLayoutEffect");
   }, [count]);

   useEffect(() => {
      console.log("Child: useEffect");
   }, [num]);

   return <div>Child</div>;
}
// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <>{fragment}</>
// );

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(jsx);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   <FunctionComponent name="Roy." />
);
