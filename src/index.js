import { React, createRoot } from "./whichReact";
// import UseContextPage from "./pages/UseContextPage";
// import UseContextPage from "./pages/ContextPage2";
// import UseEffectPage from "./pages/UseEffectPage";
// import UseCallbackPage from "./custom/UseCallbackPage";
// import jsx from "./pages/ExamplePage";
// import TransitionPage from "./pages/TransitionPage";
// import LifeCyclePage from "./pages/LifeCyclePage";
// import SuspensePage from "./pages/SuspensePage";
// import UseCallbackPage from "./pages/UseCallbackPage";
// import UseMemoPage from "./pages/UseMemoPage";
// import SuspensePage from "./custom/SuspensePage";
import FunctionComponent from "./pages/FunctionComponent";

import "./UseContextPage.css";
import "./index.css";

// ReactDOM.render(jsx, document.getElementById("root"));

const root = createRoot(document.getElementById("root"));

root.render(<FunctionComponent />);
// root.render(jsx);
// root.render(<UseMemoPage />);
// root.render(<UseCallbackPage/>);
// root.render(<UseEffectPage />);
// root.render(<UseContextPage />);

console.log("React", React.version); //sy-log
