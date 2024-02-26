import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Avatar, Col, Flex, Row, Space, Typography, theme } from "antd";
import { supabase } from "../components/useSupabase";
import { useAuth } from "../state/AuthProvider";
import DataTable from "../components/DataTable";
import { Content } from "antd/es/layout/layout";
import UploadButton from "../components/UploadButton";

export default function ProfilePage() {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { session, user } = useAuth();

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 300,
          }}
        >
          <div
            style={{
              marginBottom: 32,
            }}
          >
            <Typography.Title type="secondary" level={2}>
              Sign in to continue
            </Typography.Title>
          </div>
          <Auth
            redirectTo={window.origin}
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            // providers={["google", "github"]}
            providers={[]}
          />
        </div>
      </div>
    );
  } else {
    return (
      //   <div
      <Content
        style={{
          padding: "24px",
          margin: "0 auto",
          width: "1200px",
          height: "100vh",
        }}
      >
        <Row align={"middle"} style={{ paddingBottom: 48, paddingTop: 48 }}>
          <Col>
            <Avatar size={64} src="https://avatars.githubusercontent.com/u/8186664?v=7" />
          </Col>
          <Col style={{ paddingLeft: 24 }}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Profile
            </Typography.Title>
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
          </Col>
        </Row>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Flex vertical align="end">
            <UploadButton />
          </Flex>
          <DataTable supabase={supabase} /> {/* Use the new DataTable component */}
        </Space>
      </Content>
    );
  }
}
