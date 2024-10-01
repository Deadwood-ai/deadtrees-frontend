import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Alert, Avatar, Typography, theme } from "antd";
import { supabase } from "../useSupabase";
import { useAuth } from "../hooks/useAuthProvider";
import DataTable from "../components/DataTable";
import { Content } from "antd/es/layout/layout";
import UploadButton from "../components/Upload/UploadButton";
import { Link, useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { session, user } = useAuth();
  const navigate = useNavigate();
  console.log(window.origin);
  useEffect(() => {
    if (!session) {
      navigate("/sign-in");
    }
  }, [session, navigate]);

  if (!session) {
    return null; //
    // return (
    //   <div className="m-auto flex h-full max-w-7xl items-center justify-center">
    //     <div className="w-96 rounded-md bg-white p-8 ">
    //       <h1 className="mb-8 text-3xl font-semibold text-gray-600">Sign in</h1>

    //       <Auth
    //         redirectTo={window.origin + "/profile"}
    //         supabaseClient={supabase}
    //         appearance={{ theme: ThemeSupa }}
    //         showLinks={true}            // providers={["google", "github"]}
    //         providers={[]}
    //         view="update_password"
    //       />
    //     </div>
    //   </div>
    // );
  } else {
    return (
      <div className=" m-auto h-full max-w-7xl">
        <div className="flex pt-16">
          <div className="w-full">
            <Avatar size={64} src="https://avatars.githubusercontent.com/u/8186664?v=7" />
            <Typography.Title className="font-3xl m-0">Profile</Typography.Title>
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
          </div>
          {/* <div>
            <Alert
              message="Upload is available!"
              description={
                <>
                  You can upload your data now, but integration and visualization on the platform are still in
                  development. Full functionality will be available soon. For any questions, please{" "}
                  <a href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration">
                    contact
                  </a>{" "}
                  us.
                </>
              }
              type="info"
              showIcon
            />
          </div> */}
        </div>
        <div className=" w-full">
          <div className="mb-4 flex justify-end">
            <UploadButton />
          </div>
          <DataTable supabase={supabase} /> {/* Use the new DataTable component */}
        </div>
      </div>
    );
  }
}
