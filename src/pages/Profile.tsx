import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Alert, Avatar, Typography, theme } from "antd";
import { supabase } from "../hooks/useSupabase";
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
        <div className="flex pt-12 pb-8">
          <div className="w-1/2">
            <Avatar size={84} src="https://avatar.iran.liara.run/public" />
            <Typography.Title style={{ marginBottom: '4px' }}>Profile</Typography.Title>
            <Typography.Text className="p-0 m-0 text-lg" type="secondary">{user?.email}</Typography.Text>
          </div>
          <div>
            <Alert
              message="Upload is available!"
              description={
                <>
                  <p>
                    Orthophoto and label uploads are now available! Once uploaded, your data will be seamlessly integrated and visualized on the platform.
                    Please note that this feature is currently in beta. If you encounter any issues or have questions, feel free to{" "}
                    <a href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration">
                      contact us
                    </a>.
                  </p>
                  {/* <p className="font-semibold p-0 m-0">Requirements for upload:</p> */}
                  <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    <li>📏 <strong>Resolution:</strong> Higher than 10 cm</li>
                    <li>🌈 <strong>Color:</strong> RGB format</li>
                    <li>🗺️ <strong>File Format:</strong> GeoTIFF</li>
                    <li>🌐 <strong>Reference Systems:</strong> All supported</li>
                  </ul>
                </>
              }
              type="info"
              showIcon
            />
          </div>
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
