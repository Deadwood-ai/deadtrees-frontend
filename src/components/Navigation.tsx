import { PlusOutlined } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Layout,
  Menu,
  Space,
  Typography,
  theme,
  Image,
} from "antd";
import { Link } from "react-router-dom";
const { Header } = Layout;

import { useAuth } from "../state/AuthProvider";

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
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        background: colorBgContainer,
        // paddingLeft: 48,
        position: "sticky",
        top: 0,
        zIndex: 1,
        borderRadius: "0 0 8px 8px",
      }}
    >
      <div className="flex flex-1 items-center justify-center md:justify-start">
        <img
          src="assets/tree-icon.png"
          alt="deadtrees.earth"
          className="mr-3 h-8 w-8"
        />
        <h1 className=" text-3xl font-semibold text-gray-600 md:text-2xl">
          deadtrees.earth
        </h1>
      </div>
      <div className="hidden md:block">
        <Menu
          mode="horizontal"
          defaultSelectedKeys={["1"]}
          items={navigation}
          defaultActiveFirst
          style={{
            justifyContent: "end",
            flex: 1,
            minWidth: 0,
            borderBottom: "none",
          }}
        />
      </div>
      <Button
        className="ml-8 hidden  md:block"
        type="primary"
        onClick={signOut}
      >
        {session ? "Sign Out" : "Sign In"}
      </Button>
    </Header>
  );
}
