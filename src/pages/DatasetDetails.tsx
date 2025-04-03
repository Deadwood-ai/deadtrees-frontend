import { Button, Col, Row, Tag, Tooltip, Typography, message, Checkbox, Space } from "antd";
import { useParams, useNavigate } from "react-router-dom";

import { ArrowLeftOutlined, EnvironmentOutlined, DownloadOutlined } from "@ant-design/icons";
import { Settings } from "../config";
import DatasetDetailsMap from "../components/DatasetDetailsMap/DatasetDetailsMap";
import countryList from "../utils/countryList";
import { useDatasets } from "../hooks/useDatasets";
import { useDatasetLabels } from "../hooks/useDatasetLabels";
import { ILabelData } from "../types/labels";
import { useState } from "react";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: datasets } = useDatasets();
  const [labelsOnly, setLabelsOnly] = useState(false);

  const dataset = datasets?.find((d) => d.id.toString() === id);

  // Fetch labels data
  const { data: labelsData } = useDatasetLabels({
    datasetId: dataset?.id || 0,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });

  if (!dataset) {
    return <div>Loading...</div>;
  }

  console.log(dataset);

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
            <div className="mt-4 space-y-3 rounded-md bg-white p-4">
              <div className="flex items-center pb-4">
                <EnvironmentOutlined style={{ fontSize: 24, color: "#1890ff" }} className="pr-2" />
                <Tooltip
                  title={
                    <div>
                      {dataset.admin_level_3 ? dataset.admin_level_3 : dataset.admin_level_2}
                      {dataset.admin_level_1 && <div>{dataset.admin_level_1}</div>}
                    </div>
                  }
                >
                  <Typography.Title style={{ margin: 0 }} level={5}>
                    {dataset.admin_level_1
                      ? `${
                          dataset.admin_level_3 || dataset.admin_level_2
                            ? `${dataset.admin_level_3 || dataset.admin_level_2}, `
                            : ""
                        }${countryList[dataset.admin_level_1 as keyof typeof countryList] ?? ""}`
                      : "unknown"}
                  </Typography.Title>
                </Tooltip>
              </div>

              <div className="flex justify-between">
                <Typography.Text className="pr-2">Author: </Typography.Text>
                <Tooltip title={dataset.authors?.join(", ")}>
                  <Typography.Text strong>
                    {dataset.authors && dataset.authors.length > 0
                      ? dataset.authors[0].slice(0, 18) +
                        (dataset.authors[0].length > 18 ? "..." : "") +
                        (dataset.authors.length > 1 ? ` +${dataset.authors.length - 1}` : "")
                      : ""}
                  </Typography.Text>
                </Tooltip>
              </div>
              {dataset.citation_doi && (
                <div className="flex justify-between">
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
              <div className="flex justify-between">
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
              <div className="flex justify-between">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Biom: </Typography.Text>
                </Typography.Text>
                <Tooltip title={dataset.biome_name}>
                  <Tag color="default" className="m-0">
                    {dataset.biome_name
                      ? dataset.biome_name.slice(0, 30) + (dataset.biome_name.length > 30 ? "..." : "")
                      : "Unknown"}
                  </Tag>
                </Tooltip>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-md bg-white p-4">
              <div className="flex justify-between">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Platform: </Typography.Text>
                </Typography.Text>
                <Tag color="default">{dataset.platform}</Tag>
              </div>
              <div className="flex justify-between">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">File Size: </Typography.Text>
                </Typography.Text>
                {dataset.file_size > 1024 * 1024 * 1024
                  ? `${dataset.ortho_file_size.toFixed(1)} MB`
                  : `${dataset.ortho_file_size.toFixed(0)} MB`}
              </div>
            </div>
            {labelsData && (
              <div className="mt-4 space-y-3 rounded-md bg-white p-4">
                <div className="flex justify-between">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Source: </Typography.Text>
                  </Typography.Text>
                  <Tag color="default">
                    {labelsData.label_source
                      .replace("_", " ")
                      .split(" ")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Tag>
                </div>
                <div className="flex justify-between">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Type: </Typography.Text>
                  </Typography.Text>
                  <Tag color="default">
                    {labelsData.label_type
                      .replace("_", " ")
                      .split(" ")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Tag>
                </div>
                <div className="flex justify-between">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Label Quality: </Typography.Text>
                  </Typography.Text>
                  <Tag color="default">{labelsData.label_quality}</Tag>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3 rounded-md bg-white p-4">
              <Space direction="vertical" className="w-full">
                <Tooltip
                  title={
                    labelsOnly
                      ? "Download vector data of tree mortality predictions (GPKG format)"
                      : "Download both orthophoto and tree mortality predictions"
                  }
                >
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    className="w-full"
                    onClick={() => {
                      const url = labelsOnly
                        ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels.gpkg`
                        : `${Settings.API_URL}/download/datasets/${dataset.id}/dataset.zip`;

                      window.location.href = url;
                      message.info(`Downloading ${labelsOnly ? "predictions" : "complete dataset"}, please wait...`);
                    }}
                  >
                    {labelsOnly ? "Download Predictions (GPKG)" : "Download Complete Dataset"}
                  </Button>
                </Tooltip>
                {labelsData && (
                  <Tooltip title="Only download the vector data containing tree mortality predictions, without the orthophoto">
                    <Checkbox checked={labelsOnly} onChange={(e) => setLabelsOnly(e.target.checked)} className="mt-2">
                      Download predictions only
                    </Checkbox>
                  </Tooltip>
                )}
              </Space>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1 pt-2">
        <DatasetDetailsMap data={dataset} />
      </Col>
    </Row>
  );
}
