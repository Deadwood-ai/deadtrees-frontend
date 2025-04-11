import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AuthProvider from "./hooks/useAuthProvider";
import DataProvider from "./hooks/useDataProvider";
import DatasetMapProvider from "./hooks/useDatasetMapProvider";
import DownloadProvider from "./hooks/useDownloadProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookieBanner } from "./components/cookieBanner/CookieBanner";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <DatasetMapProvider>
          <DownloadProvider>
            <App />
            <CookieBanner />
          </DownloadProvider>
        </DatasetMapProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>,
);
