import { updateContainer } from "react-reconciler/src/ReactFiberReconciler";
import { createFiberRoot } from "react-reconciler/src/ReactFiberRoot";
import type {
   Container,
   FiberRoot,
} from "react-reconciler/src/ReactInternalTypes";
import type { ReactNodeList } from "shared/ReactTypes";

type RootType = {
   render: (children: ReactNodeList) => void;
   _internalRoot: FiberRoot;
};

class ReactDOMRoot {
   constructor(private _internalRoot: FiberRoot) {
      this._internalRoot = _internalRoot;
   }

   render(children: ReactNodeList) {
      updateContainer(children, this._internalRoot);
   }
}

export function createRoot(container: Container): RootType {
   //? 1. 构建 fiber vdom tree
   const root: FiberRoot = createFiberRoot(container);

   return new (ReactDOMRoot as any)(root);
}

const ReactDOM = {
   createRoot,
};

export default ReactDOM;
