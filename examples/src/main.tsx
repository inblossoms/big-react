import { ReactDOM, Fragment, Component, useReducer } from "../which-react";
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

   return (
      <div className="border">
         {/* <h3>Hi! {name}</h3> */}
         {/* <h4>{count}</h4> */}
         <button
            onClick={() => {
               setCount();
            }}
         >
            {count}
         </button>
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
