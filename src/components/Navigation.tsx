import { PlusOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Space, Typography, theme } from "antd";
import { Link } from "react-router-dom";
const { Header } = Layout;

import { useAuth } from "../state/AuthProvider";

const navigation = [
  {
    key: "/home",
    label: <Link to="/">Home</Link>,
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
        paddingLeft: 48,
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      <Space size={24}>
        <PlusOutlined />
        <Typography.Title level={4} style={{ margin: 0 }}>
          deadtrees.earth
        </Typography.Title>
      </Space>
      <Menu
        mode="horizontal"
        defaultSelectedKeys={["1"]}
        items={navigation}
        style={{ justifyContent: "end", flex: 1, minWidth: 0, borderBottom: "none" }}
      />
      <Button
        style={{
          marginLeft: 48,
        }}
        type="primary"
        onClick={signOut}
      >
        {session ? "Sign Out" : "Sign In"}
      </Button>
    </Header>
  );
}
