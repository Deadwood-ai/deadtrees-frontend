import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "antd";

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
import Impressum from "./pages/Impressum";
import Footer from "./components/Footer";
import Datenschutzerklaerung from "./pages/Datenschutzerklaerung";
import TermsOfServices from "./pages/TermsOfServices";
const { Content } = Layout;

function LayoutWrapper() {
  const location = useLocation();
  const fullHeightPaths = ["/dataset", "/deadtrees", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

  const shouldUseFullHeight = fullHeightPaths.some((path) => location.pathname.startsWith(path));

  return (
    <div>
      <Layout
        style={{
          margin: "0 auto",
          paddingTop: 16,
          height: shouldUseFullHeight ? "100vh" : "auto",
          backgroundColor: "transparent",
        }}
      >
        <Navigation />
        <Content>
          <Outlet />
        </Content>
        <Footer />
      </Layout>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="dataset" element={<Dataset />} />
          <Route path="dataset/:id" element={<DatasetDetails />} />
          <Route path="deadtrees" element={<Deadtrees />} />
          <Route path="about" element={<About />} />
          <Route path="impressum" element={<Impressum />} />
          <Route path="datenschutzerklaerung" element={<Datenschutzerklaerung />} />
          <Route path="terms-of-services" element={<TermsOfServices />} />
          <Route path="sign-up" element={<SignUp />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="forgot-password" element={<Forgotpassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
