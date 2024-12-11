import { PlusOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Space, Typography, theme, Image, Tag } from "antd";
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
    key: "/about",
    label: <Link to="/about">About</Link>,
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
  const currentPath = "/" + location.pathname.split("/")[1];

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <div className="hidden rounded-lg bg-slate-200 md:block">
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          background: "#f8fafc",
          position: "sticky",
          top: 0,
          zIndex: 1,
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div className="flex flex-1 items-center justify-center md:justify-start">
          <img
            src="/assets/logo.png"
            alt="deadtrees.earth"
            onClick={() => nav("/")}
            className="mr-3 h-12 cursor-pointer"
          />
          <Tag color="warning">BETA</Tag>
        </div>
        <div style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <Menu
            mode="horizontal"
            selectedKeys={[currentPath === "/" ? "/home" : currentPath]}
            items={navigation}
            style={{
              justifyContent: "end",
              minWidth: 0,
              borderBottom: "none",
              backgroundColor: "#f8fafc",
              width: "100%",
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
