import { PlusOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Space, Typography, theme, Image } from "antd";
import { Link, useLocation } from "react-router-dom";
const { Header } = Layout;

import { useAuth } from "../hooks/useAuthProvider";
import { useNavigate } from "react-router-dom";

const navigation = [
  {
    key: "/home",
    label: <Link to="/">Home</Link>,
  },
  {
    key: "/deadtrees",
    label: <Link to="/deadtrees">Map</Link>,
  },
  {
    key: "/dataset",
    label: <Link to="/dataset">Dataset</Link>,
  },
  {
    key: "/profile",
    label: <Link to="/profile">Profile</Link>,
  },
];

export default function Navigation() {
  const { session, signOut } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // Get the base path for matching navigation
  const currentPath = '/' + location.pathname.split('/')[1];

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <div className="hidden md:block">
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          background: colorBgContainer,
          position: "sticky",
          top: 0,
          zIndex: 1,
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div className="flex flex-1 items-center justify-center md:justify-start">
          <img src="/assets/logo.png" alt="deadtrees.earth" onClick={() => nav("/")} className="mr-3 h-12 cursor-pointer" />
          <div>
            <p className="rounded-2xl bg-yellow-400 p-1.5 align-text-top text-xs font-semibold text-gray-600 -mt-2">
              BETA
            </p>
          </div>
        </div>
        <div>
          <Menu
            mode="horizontal"
            selectedKeys={[currentPath === '/' ? '/home' : currentPath]}
            items={navigation}
            style={{
              justifyContent: "end",
              flex: 1,
              minWidth: 0,
              borderBottom: "none",
            }}
          />
        </div>
        <Button className="ml-8" type="primary" onClick={session ? signOut : () => nav("/sign-in")}>
          {session ? "Sign Out" : "Sign In"}
        </Button>
      </Header>
    </div>
  );
}
