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
   createContext,
   useContext,
   memo,
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

const CountContext = createContext(1);
const ThemeContext = createContext("yellow");

function FunctionComponent({ name }: { name: string }) {
   const [count, setCount] = useReducer((x: number) => x + 1, 10);
   const [num, setNum] = useState(0);
   const [text, setText] = useState("hello");
   const [textarea, setTextarea] = useState("hello textarea.");

   //    const ref = useRef(0);
   //    function handleClick() {
   //       ref.current = ref.current + 1;
   //       alert(`You clicked ${ref.current} times!`);
   //    }

   //    useLayoutEffect(() => {
   //       console.log("useLayoutEffect");
   //    }, [count]);

   //    useEffect(() => {
   //       console.log("useEffect");
   //    }, [num]);

   return (
      <div className="border">
         <h2>Hi! {name}</h2>

         {/* <button
            onClick={(e) => {
               console.log(
                  `🧠 [onClick] \x1b[91mFile: main.tsx\x1b[0m, \x1b[32mLine: 182\x1b[0m, Message: `,
                  e
               );
               setCount();
            }}
         >
            {count}
         </button> */}
         <button
            onClick={() => {
               setNum(num + 1);
            }}
         >
            {num}
         </button>

         <p>{text}</p>
         <input
            value={text}
            onInput={(e) => {
               setText((e.target as HTMLInputElement).value);
            }}
         ></input>

         {/* <MemoSlowList text={text}></MemoSlowList> */}
         {/* <p>{textarea}</p>
         <textarea
            value={textarea}
            onChange={(e) => {
               setTextarea(e.target.value);
            }}
         ></textarea> */}

         {/* <ThemeContext.Provider value="red">
            <CountContext.Provider value={count}>
               <CountContext.Provider value={count * 2}>
                  <Child />
               </CountContext.Provider>
               <Child />
            </CountContext.Provider>
         </ThemeContext.Provider> */}
         {/* <Child count={count} num={num} /> */}
         {/* <button onClick={handleClick}>Click me</button> */}
      </div>
   );
}

function List({ children }: { children: React.ReactNode }) {
   const now = performance.now();
   while (performance.now() - now < 3) {}
   return <div>{children}</div>;
}

interface SlowListProps {
   text: string;
}

const MemoSlowList = memo(
   function SlowList({ text }: SlowListProps) {
      console.log("slow list.");
      const l = [];

      for (let i = 0; i < 500; i++) {
         l.push(
            <List key={i}>
               Result: {i} for {`${text}`}
            </List>
         );
      }
      return (
         <div className="border-ov">
            <p>{text}</p>
            <ul>{l}</ul>
         </div>
      );
   },
   (prevProps: SlowListProps, nextProps: SlowListProps) => {
      return prevProps.text === nextProps.text;
   }
);

// function Child() {
//    const count = useContext(CountContext);
//    const theme = useContext(ThemeContext);

//    return (
//       <div className={"border " + theme}>
//          useContext:
//          <span>{count}</span>
//          <ThemeContext.Consumer>
//             {(theme) => {
//                return (
//                   <div className={theme}>
//                      consumer:
//                      <CountContext.Consumer>
//                         {(value) => {
//                            return <span>{value}</span>;
//                         }}
//                      </CountContext.Consumer>
//                   </div>
//                );
//             }}
//          </ThemeContext.Consumer>
//          <ClassComponent />
//       </div>
//    );
// }

// class ClassComponent extends Component {
//    static contextType = CountContext;

//    render() {
//       return (
//          <div className="border">
//             contextType:
//             <span>{this.context as number}</span>
//          </div>
//       );
//    }
// }

// function Child({ count, num }: { count: string; num: string }) {
//       useLayoutEffect(() => {
//          console.log("Child: useLayoutEffect");
//       }, [count]);

//       useEffect(() => {
//          console.log("Child: useEffect");
//       }, [num]);

//    return <div>Child</div>;
// }
// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <>{fragment}</>
// );

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(jsx);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   <FunctionComponent name="Roy." />
);
