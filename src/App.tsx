import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "antd";

import Navigation from "./components/Navigation";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile";

const { Content } = Layout;

export default function App() {
  const LayoutWrapper = () => {
    return (
      <Layout>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
