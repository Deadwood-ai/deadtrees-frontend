import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import {
  Avatar,
  Col,
  Divider,
  Flex,
  Row,
  Space,
  Typography,
  theme,
} from "antd";
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
      <div className="m-auto flex h-full max-w-7xl items-center justify-center">
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
      <div className=" m-auto h-full max-w-6xl">
        <div className="w-full pt-16">
          <Avatar
            size={64}
            src="https://avatars.githubusercontent.com/u/8186664?v=7"
          />
          <Typography.Title className="font-3xl m-0">Profile</Typography.Title>
          <Typography.Text type="secondary">{user?.email}</Typography.Text>
        </div>
        <div className=" w-full">
          <div className="mb-4 flex justify-end">
            <UploadButton />
          </div>
          <DataTable supabase={supabase} />{" "}
          {/* Use the new DataTable component */}
        </div>
      </div>
    );
  }
}
