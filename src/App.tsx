import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "antd";
import { theme } from "antd";

import Navigation from "./components/Navigation";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile";
import Dataset from "./pages/Dataset";
import DatasetDetails from "./pages/DatasetDetails";
import Deadtrees from "./pages/Deadtrees";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import Forgotpassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import About from "./pages/About";

const { Content } = Layout;

export default function App() {
  const LayoutWrapper = () => {
    return (
      // className="bg-gradient-to-b from-white to-purple-100"
      <div >
        <Layout
          style={{
            margin: "0 auto",
            padding: 16,
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
            <Route path="about" element={<About />} />
            <Route path="sign-up" element={<SignUp />}></Route>
            <Route path="sign-in" element={<SignIn />}></Route>
            <Route path="forgot-password" element={<Forgotpassword />}></Route>
            <Route path="reset-password" element={<ResetPassword />}></Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
