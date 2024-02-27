import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AuthProvider from "./state/AuthProvider";
import DataProvider from "./state/DataProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);
