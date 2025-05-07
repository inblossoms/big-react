import {
   ReactDOM,
   Fragment,
   Component,
   useState,
   useReducer,
   useMemo,
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

function FunctionComponent({ name }: { name: string }) {
   const [count, setCount] = useReducer((x: number) => x + 1, 0);
   const [num, setNum] = useState(1);

   const expensive = useMemo(() => {
      console.log("compute");
      let sum = 0;

      for (let i = 0; i < count * 10; i++) {
         sum += i;
      }

      return sum;
   }, [count]);

   return (
      <div className="border">
         <h2>Hi! {name}</h2>

         <p>{expensive}</p>
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
      </div>
   );
}

// const jsx = (
//    <div className="box border">
//       <h1 className="border">Big-React</h1>
//       {/* {fragment} */}
//       {/* <ClassComponent context="Hello!" /> */}
//       <FunctionComponent name=" Roy." />
//       <h2 className="border">ooooops ....</h2>
//    </div>
// );

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <>{fragment}</>
// );

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(jsx);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   <FunctionComponent name="Roy." />
);
