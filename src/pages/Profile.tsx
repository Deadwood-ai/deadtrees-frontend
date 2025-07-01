import { useEffect, useState } from "react";
import { Alert, Avatar, Badge, Button, Segmented, Typography } from "antd";
import { useAuth } from "../hooks/useAuthProvider";
import DataTable from "../components/DataTable";
import UploadButton from "../components/Upload/UploadButton";
import { useNavigate } from "react-router-dom";
import { useUserDatasets } from "../hooks/useDatasets";
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

enum ActiveTab {
  MyDatasets = "My Datasets",
  Publications = "Publications",
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

  const { data: userData } = useUserDatasets();

  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.MyDatasets);
  const [selectedDatasets, setSelectedDatasets] = useState<DatasetType[]>([]);
  const [isPublicationModalVisible, setIsPublicationModalVisible] = useState(false);
  const [resetSelectionFlag, setResetSelectionFlag] = useState(false);

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

  const handlePublicationSuccess = () => {
    // Close the modal
    setIsPublicationModalVisible(false);
    // Trigger selection reset
    setResetSelectionFlag(true);
  };

  const handleResetComplete = () => {
    setResetSelectionFlag(false);
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
              message="Upload and Publish Your Data"
              className="max-w-5xl"
              description={
                <>
                  <p>
                    Orthophoto and label uploads are now available! Once uploaded, your data will be seamlessly
                    integrated and visualized on the platform. You can also publish your datasets via{" "}
                    <a href="https://freidata.uni-freiburg.de/" target="_blank" rel="noopener noreferrer">
                      FreiDATA
                    </a>{" "}
                    , the University of Freiburg's data repository, to get a DOI and make your data citable.
                  </p>
                  <p>
                    If you encounter any issues or have questions, feel free to{" "}
                    <a href="mailto:info@deadtrees.earth?subject=deadtrees.earth issue">contact us</a>.
                  </p>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    <li>
                      📏 <strong>Resolution:</strong> Higher than 20 cm
                    </li>
                    <li>
                      🌈 <strong>Color:</strong> RGB format, but you can upload NIRRGB images
                    </li>
                    <li>
                      🗺️ <strong>File Format:</strong> GeoTIFF
                    </li>
                    <li>
                      🌐 <strong>Reference Systems:</strong> All supported
                    </li>
                    <li>
                      🏆 <strong>Publication:</strong> Get a DOI via{" "}
                      <a href="https://freidata.uni-freiburg.de/" target="_blank" rel="noopener noreferrer">
                        FreiDATA
                      </a>{" "}
                      for your datasets
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
              options={["My Datasets", "Publications"]}
              size="large"
              value={activeTab}
              onChange={(value) => {
                setActiveTab(value as ActiveTab);
              }}
            />
            <div className="flex gap-2">
              {activeTab === ActiveTab.MyDatasets ? (
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

          {activeTab === ActiveTab.MyDatasets ? (
            <DataTable
              onSelectedRowsChange={handleSelectedRowsChange}
              resetSelection={resetSelectionFlag}
              onResetSelectionComplete={handleResetComplete}
            />
          ) : (
            <PublicationsTable />
          )}

          <PublicationModal
            visible={isPublicationModalVisible}
            onCancel={handlePublicationModalCancel}
            datasets={selectedDatasets}
            onSuccess={handlePublicationSuccess}
          />
        </div>
      </div>
    );
  }
}
