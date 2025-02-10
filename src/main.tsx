import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AuthProvider from "./hooks/useAuthProvider";
import { DataProvider } from "./providers/DataProvider";
import DatasetMapProvider from "./hooks/useDatasetMapProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <DatasetMapProvider>
          <App />
        </DatasetMapProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>,
);
