import { useEffect, useState } from "react";
import { Alert, Avatar, Badge, Button, Segmented, Typography } from "antd";
import { useAuth } from "../hooks/useAuthProvider";
import DataTable from "../components/DataTable";
import UploadButton from "../components/Upload/UploadButton";
import { useNavigate } from "react-router-dom";
import { useUserDatasets } from "../hooks/useDatasets";
import { useDatasetSubscription } from "../hooks/useDatasetSubscription";
import { FileOutlined } from "@ant-design/icons";
import PublicationModal from "../components/PublicationModal";
import PublicationsTable from "../components/PublicationsTable";

interface ProfileAvatarProps {
  email: string;
  size?: number;
}

interface DatasetType {
  id: number;
  file_name: string;
  platform?: string;
  aquisition_year?: number;
  citation_doi?: string;
  freidata_doi?: string;
  current_status?: string;
  is_upload_done?: boolean;
  is_ortho_done?: boolean;
  is_cog_done?: boolean;
  is_thumbnail_done?: boolean;
  is_metadata_done?: boolean;
}

export function ProfileAvatar({ email, size = 84 }: ProfileAvatarProps) {
  // Create a consistent hash from email for the seed
  const emailHash = email.toLowerCase().trim();

  // Use DiceBear API with the email hash as seed
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${emailHash}`;

  return <Avatar size={size} src={avatarUrl} alt={`Avatar for ${email}`} className="bg-primary/10" />;
}

export default function ProfilePage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  useDatasetSubscription();

  const { data: userData } = useUserDatasets();

  const [activeTab, setActiveTab] = useState<string>("My Data");
  const [selectedDatasets, setSelectedDatasets] = useState<DatasetType[]>([]);
  const [isPublicationModalVisible, setIsPublicationModalVisible] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/sign-in");
    }
  }, [session, navigate]);

  const handleSelectedRowsChange = (rows: DatasetType[]) => {
    setSelectedDatasets(rows);
  };

  const showPublicationModal = () => {
    setIsPublicationModalVisible(true);
  };

  const handlePublicationModalCancel = () => {
    setIsPublicationModalVisible(false);
  };

  if (!session) {
    return null;
  } else {
    return (
      <div className="m-auto min-h-screen w-full max-w-7xl">
        <div className="flex items-center pb-8 pt-12">
          <div className="w-1/2">
            <Badge count={userData?.length} color="red">
              <ProfileAvatar email={user?.email ?? ""} />
            </Badge>
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
                    <a href="mailto:info@deadtrees.earth?subject=deadtrees.earth issue">contact us</a>.
                  </p>
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
        <div className="w-full">
          <div className="mb-4 flex justify-between">
            <Segmented
              options={["My Data", "Publications"]}
              size="large"
              value={activeTab}
              onChange={(value) => {
                setActiveTab(value.toString());
              }}
            />
            <div className="flex gap-2">
              {activeTab === "My Data" ? (
                <>
                  {selectedDatasets.length > 0 ? (
                    <Button size="large" type="primary" icon={<FileOutlined />} onClick={showPublicationModal}>
                      Publish Data ({selectedDatasets.length})
                    </Button>
                  ) : (
                    <UploadButton />
                  )}
                </>
              ) : null}
            </div>
          </div>

          {activeTab === "My Data" ? (
            <DataTable onSelectedRowsChange={handleSelectedRowsChange} />
          ) : (
            <PublicationsTable />
          )}

          <PublicationModal
            visible={isPublicationModalVisible}
            onCancel={handlePublicationModalCancel}
            datasets={selectedDatasets}
          />
        </div>
      </div>
    );
  }
}
