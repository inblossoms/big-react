import {
   ReactDOM,
   Fragment,
   Component,
   useState,
   useReducer,
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

function FunctionComponent({ name }: { name: string }) {
   const [count, setCount] = useReducer((x: number) => x + 1, 0);
   const [num, setNum] = useState(1);

   //    const arr = count % 2 === 0 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];
   const arr = count % 2 === 0 ? [0, 1, 2, 3, 4, 5] : [3, 2, 4, 0, 5, 1];

   const _cls = count % 2 === 0 ? "red yellow_border" : "yellow red_border";

   return (
      <div className="border">
         <h2 className={_cls}>Hi! {name}</h2>
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
         <ul>
            {arr.map((i) => (
               <li key={"li" + i}>{i}</li>
            ))}
         </ul>
      </div>
   );
}

const jsx = (
   <div className="box border">
      <h1 className="border">Big-React</h1>
      {/* {fragment} */}
      {/* <ClassComponent context="Hello!" /> */}
      <FunctionComponent name=" Roy." />
      <h2 className="border">ooooops ....</h2>
   </div>
);

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <>{fragment}</>
// );

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(jsx);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
   <FunctionComponent name="Roy." />
);
