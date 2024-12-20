import { Button, Col, Row, Tag, Tooltip, Typography, message, notification } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../hooks/useDataProvider";

import { ArrowLeftOutlined, EnvironmentOutlined, DownloadOutlined } from "@ant-design/icons";
import { Settings } from "../config";
import DatasetDetailsMap from "../components/DatasetDetailsMap/DatasetDetailsMap";
import countryList from "../utils/countryList";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = useData();
  const dataset = data.data?.find((d) => d.id.toString() === id);

  if (!dataset) {
    return <div>Loading...</div>;
  }

  return (
    <Row
      className="bg-slate-50"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex w-96 flex-col p-3  pr-4 align-middle ">
        {/* {id} */}
        {dataset ? (
          <div className="p-2">
            <div>
              <Button
                size="large"
                shape="circle"
                onClick={() => navigate(-1)}
                // type="primary"
                icon={<ArrowLeftOutlined />}
              ></Button>
            </div>
            <div className="mt-4 rounded-md bg-white p-4">
              <div className="flex items-center pb-4">
                <EnvironmentOutlined style={{ fontSize: 24, color: "#1890ff" }} className="pr-2" />
                <Typography.Title style={{ margin: 0 }} level={5}>
                  {/* {dataset.admin_level_3 ? dataset.admin_level_3 : "Unknown"} */}
                  {`${dataset.admin_level_3}, ${countryList[dataset.admin_level_1 as keyof typeof countryList] ?? ""}`}
                </Typography.Title>
              </div>

              <div className="flex justify-between  p-1">
                <Typography.Text className="pr-2">Author: </Typography.Text>
                <Tooltip title={dataset.authors}>
                  <Typography.Text strong>
                    {dataset.authors && dataset.authors.slice(0, 30) + (dataset.authors.length > 30 ? "..." : "")}
                  </Typography.Text>
                </Tooltip>
              </div>
              {dataset.citation_doi && (
                <div className="flex justify-between p-1">
                  <Typography.Text className="pr-2">DOI: </Typography.Text>
                  <Tooltip title={dataset.citation_doi}>
                    <a href={dataset.citation_doi}>
                      {dataset.citation_doi &&
                        dataset.citation_doi.slice(0, 30) + (dataset.citation_doi.length > 30 ? "..." : "")}
                    </a>
                  </Tooltip>

                  {/* </Typography.Text> */}
                </div>
              )}
              <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Acquisition Date: </Typography.Text>
                <Typography.Text strong>
                  {
                    // date.toLocaleString("en-US", {
                    //   year: "numeric",
                    //   month: "long",
                    //   day: "numeric",
                    // })
                    new Date(
                      dataset.aquisition_year,
                      dataset.aquisition_month ? dataset.aquisition_month - 1 : 0,
                      dataset.aquisition_day ?? 1,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      ...(dataset.aquisition_month && { month: "long" }),
                      ...(dataset.aquisition_day && { day: "numeric" }),
                    })
                  }
                </Typography.Text>
              </div>
              {/* <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Has Labels: </Typography.Text>
                <Typography.Text strong>{dataset.has_labels ? "true" : "false"}</Typography.Text>
              </div> */}
              {/* <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Public: </Typography.Text>
                <Typography.Text strong>
                  {dataset.public ? "true" : "false"}
                </Typography.Text>
              </div> */}
            </div>

            <div className="mt-4 rounded-md bg-white p-4">
              {/* <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">License: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.license}</Tag>
              </div> */}
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Platform: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.platform}</Tag>
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">File Size: </Typography.Text>
                </Typography.Text>
                {dataset.file_size > 1024 * 1024 * 1024
                  ? `${(dataset.file_size / 1024 / 1024 / 1024).toFixed(1)} GB`
                  : `${(dataset.file_size / 1024 / 1024).toFixed(0)} MB`}
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Spectral Properties : </Typography.Text>
                </Typography.Text>
                <Tag color="blue"> {dataset.spectral_properties ? dataset.spectral_properties : "Unknown"}</Tag>
              </div>
            </div>
            {dataset.label_source && (
              <div className="mt-4 rounded-md bg-white p-4">
                <div className="flex justify-between p-2">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Source: </Typography.Text>
                  </Typography.Text>
                  <Tag color="blue">{dataset.label_source}</Tag>
                </div>
                <div className="flex justify-between p-2">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Type: </Typography.Text>
                  </Typography.Text>
                  <Tag color="blue">{dataset.label_type}</Tag>
                </div>
                <div className="flex justify-between p-2">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Quality: </Typography.Text>
                  </Typography.Text>
                  <Tag color="blue">{dataset.label_quality}</Tag>
                </div>
              </div>
            )}

            <Button
              href={`${Settings.API_URL}/download/datasets/${dataset.id}/dataset.zip`}
              type="primary"
              icon={<DownloadOutlined />}
              className="mt-6"
              onClick={() => message.info("Downloading Dataset, please wait...")}
            >
              Download Dataset
            </Button>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1 py-4">
        <DatasetDetailsMap data={dataset} />
      </Col>
    </Row>
  );
}
