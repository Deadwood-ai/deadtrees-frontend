import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "antd";
import { theme } from "antd";

import Navigation from "./components/Navigation";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile";
import Dataset from "./pages/Dataset";
import DatasetDetails from "./pages/DatasetDetails";
import Deadtrees from "./pages/Deadtrees";

const { Content } = Layout;

export default function App() {
  const LayoutWrapper = () => {
    return (
      <div className="md:bg-slate-100">
        <Layout
          style={{
            margin: "0 auto",
            padding: 24,
            height: "100vh",
            backgroundColor: "transparent",
          }}
        >
          <Navigation />
          <Content>
            <Outlet />
          </Content>
        </Layout>
      </div>
    );
  };

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LayoutWrapper />}>
            <Route path="/" element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="dataset" element={<Dataset />} />
            <Route path="dataset/:id" element={<DatasetDetails />} />
            <Route path="deadtrees" element={<Deadtrees />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
