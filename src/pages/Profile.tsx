import { useEffect, useState } from "react";
import { Alert, Avatar, Badge, Button, Segmented, Typography, Table, Tag, Tooltip } from "antd";
import { useAuth } from "../hooks/useAuthProvider";
import DataTable from "../components/DataTable";
import UploadButton from "../components/Upload/UploadButton";
import { useNavigate, Link } from "react-router-dom";
// import { useUserDatasets } from "../hooks/useDatasets";
import { useMyFlags } from "../hooks/useDatasetFlags";
import type { DatasetFlag } from "../types/flags";
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
  MyIssues = "My Issues",
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

  // const { data: userData } = useUserDatasets();
  const { data: myFlags = [] } = useMyFlags();

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
            <Badge count={myFlags.length} color="red">
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
                    Upload and visualize your data on the platform. Publish datasets via{" "}
                    <a href="https://freidata.uni-freiburg.de/" target="_blank" rel="noopener noreferrer">
                      FreiDATA
                    </a>{" "}
                    to get a DOI. Questions?{" "}
                    <a href="mailto:info@deadtrees.earth?subject=deadtrees.earth issue">Contact us</a>.
                  </p>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    <li>
                      🗺️ <strong>Formats:</strong> GeoTIFF (max 16GB) or ZIP with raw drone images - JPEG, JPG, TIF (max
                      20GB)
                    </li>
                    <li>
                      🔧 <strong>Raw Images:</strong> ODM processing with 85%-front, 75%-side overlap
                    </li>
                    <li>
                      📏 <strong>Requirements:</strong> RGB/NIRRGB, &gt;10cm resolution, any reference system
                    </li>
                    <li>
                      🏆 <strong>Publishing:</strong> Get DOI via{" "}
                      <a href="https://freidata.uni-freiburg.de/" target="_blank" rel="noopener noreferrer">
                        FreiDATA
                      </a>
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
              options={["My Datasets", "Publications", "My Issues"]}
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
          ) : activeTab === ActiveTab.Publications ? (
            <PublicationsTable />
          ) : (
            <div className="mt-4">
              {myFlags.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center">
                  <Typography.Title level={4}>No issues yet</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    Report an issue from any dataset’s details page to see it here.
                  </Typography.Paragraph>
                </div>
              ) : (
                <>
                  <Typography.Title level={5}>My Issues</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    User-reported issues you've filed. Only you and auditors can view them.
                  </Typography.Paragraph>
                  <Table
                    rowKey="id"
                    dataSource={myFlags}
                    columns={[
                      {
                        title: "Dataset ID",
                        dataIndex: "dataset_id",
                        key: "dataset_id",
                        render: (id: number) => (
                          <Link to={`/dataset/${id}`} className="text-blue-600">
                            {id}
                          </Link>
                        ),
                      },
                      {
                        title: "Description",
                        key: "description",
                        render: (_: unknown, f: DatasetFlag) => (
                          <Tooltip title={f.description}>
                            <span>{(f.description || "").slice(0, 120) + (f.description.length > 120 ? "…" : "")}</span>
                          </Tooltip>
                        ),
                      },
                      {
                        title: "Categories",
                        key: "categories",
                        render: (_: unknown, f: DatasetFlag) => (
                          <span>
                            {f.is_ortho_mosaic_issue && <Tag color="orange">Auto mosaic</Tag>}
                            {f.is_prediction_issue && <Tag color="blue">Prediction</Tag>}
                          </span>
                        ),
                      },
                      {
                        title: "Status",
                        dataIndex: "status",
                        key: "status",
                        render: (status: string) => (
                          <Tag color={status === "open" ? "red" : status === "acknowledged" ? "gold" : "green"}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Tag>
                        ),
                      },
                      {
                        title: "Created",
                        dataIndex: "created_at",
                        key: "created_at",
                        render: (iso: string) => new Date(iso).toLocaleString(),
                      },
                      // Removed last status change per requirements
                      {
                        title: "Actions",
                        key: "actions",
                        render: (_: unknown, f: DatasetFlag) => (
                          <Button size="small" onClick={() => navigate(`/dataset/${f.dataset_id}`)}>
                            View Map
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              )}
            </div>
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
