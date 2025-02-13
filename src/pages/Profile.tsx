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

interface ProfileAvatarProps {
  email: string;
  size?: number;
}

export function ProfileAvatar({ email, size = 84 }: ProfileAvatarProps) {
  // Create a consistent hash from email for the seed
  const emailHash = email.toLowerCase().trim();

  // Use DiceBear API with the email hash as seed
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${emailHash}`;

  return <Avatar size={size} src={avatarUrl} alt={`Avatar for ${email}`} className="bg-primary/10" />;
}

export default function ProfilePage() {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { session, user } = useAuth();
  const navigate = useNavigate();
  console.log(window.origin);
  console.log("session", session);

  useEffect(() => {
    if (!session) {
      navigate("/sign-in");
    }
  }, [session, navigate]);

  if (!session) {
    return null;
  } else {
    return (
      <div className=" m-auto min-h-screen w-full max-w-7xl">
        <div className="flex items-center pb-8 pt-12">
          <div className="w-1/2">
            <ProfileAvatar email={user?.email ?? ""} />
            <Typography.Title style={{ marginBottom: "4px" }}>Profile</Typography.Title>
            <Typography.Text className="m-0 p-0 text-lg" type="secondary">
              {user?.email}
            </Typography.Text>
          </div>
          <div>
            <Alert
              message="Upload is available!"
              className="max-w-5xl"
              description={
                <>
                  <p>
                    Orthophoto and label uploads are now available! Once uploaded, your data will be seamlessly
                    integrated and visualized on the platform. Please note that this feature is currently in beta. If
                    you encounter any issues or have questions, feel free to{" "}
                    <a href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration">
                      contact us
                    </a>
                    .
                  </p>
                  {/* <p className="font-semibold p-0 m-0">Requirements for upload:</p> */}
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    <li>
                      📏 <strong>Resolution:</strong> Higher than 20 cm
                    </li>
                    <li>
                      🌈 <strong>Color:</strong> RGB format
                    </li>
                    <li>
                      🗺️ <strong>File Format:</strong> GeoTIFF
                    </li>
                    <li>
                      🌐 <strong>Reference Systems:</strong> All supported
                    </li>
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
