import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "antd";
import { theme } from "antd";

import Navigation from "./components/Navigation";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile";
import Datasets from "./pages/Datasets";

const { Content } = Layout;

export default function App() {
  const { token } = theme.useToken();

  const LayoutWrapper = () => {
    return (
      <Layout
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: "100vh",
          padding: 0,
        }}
      >
        <Navigation />
        <Content>
          <Outlet />
        </Content>
      </Layout>
    );
  };

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LayoutWrapper />}>
            <Route path="/" element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="datasets" element={<Datasets />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
