import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AuthProvider from "./state/AuthProvider";
import DataProvider from "./state/DataProvider";
import DatasetMapProvider from "./state/DatasetMapProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <AuthProvider>
    <DataProvider>
      <DatasetMapProvider>
        <App />
      </DatasetMapProvider>
    </DataProvider>
  </AuthProvider>,
  // </React.StrictMode>
);
