import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AuthProvider from "./hooks/useAuthProvider";
import DataProvider from "./hooks/useDataProvider";
import DatasetMapProvider from "./hooks/useDatasetMapProvider";

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
