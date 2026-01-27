import { Typography, Tooltip, Tag } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import type { IDataset } from "../../types/dataset";
import type { DatasetAuditUserInfo } from "../../hooks/useDatasetAudit";
import countryList from "../../utils/countryList";
import { isGeonadirDataset, getTruncatedAuthorDisplay } from "../../utils/datasetUtils";
import { sanitizeText } from "../../utils/textUtils";
import PublicationLink from "../PublicationLink";
import PhenologyBar from "../PhenologyBar/PhenologyBar";
import AuditInfoCard from "../AuditInfoCard";
import DatasetNavigation from "./DatasetNavigation";

interface DatasetInfoSidebarProps {
  dataset: IDataset;
  phenologyData: unknown;
  isPhenologyLoading: boolean;
  auditInfo: DatasetAuditUserInfo | null | undefined;
  overlappingDatasets: IDataset[];
  isLoadingOverlapping: boolean;
}

export default function DatasetInfoSidebar({
  dataset,
  phenologyData,
  isPhenologyLoading,
  auditInfo,
  overlappingDatasets,
  isLoadingOverlapping,
}: DatasetInfoSidebarProps) {
  const isFromGeonadir = isGeonadirDataset(dataset);

  return (
    <div className="p-2">
      {/* Location Header */}
      <div className="space-y-3 rounded-md bg-white p-4">
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
          <Tooltip title={dataset.authors?.join(", ") + (isFromGeonadir ? " (via GeoNadir)" : "")}>
            <Typography.Text strong>
              {getTruncatedAuthorDisplay(dataset.authors, isFromGeonadir)}
            </Typography.Text>
          </Tooltip>
        </div>

        <div className="flex justify-between">
          <Typography.Text className="pr-2">
            {dataset.freidata_doi
              ? "DOI: "
              : dataset.citation_doi
                ? dataset.citation_doi.includes("doi.org") ||
                  /^10\.\d{4,}\//.test(dataset.citation_doi) ||
                  dataset.citation_doi.toLowerCase().includes("zenodo")
                  ? "DOI: "
                  : "Link: "
                : "Reference: "}
          </Typography.Text>
          <div style={{ maxWidth: "70%", textAlign: "right", overflow: "hidden" }}>
            <PublicationLink freidataDoI={dataset.freidata_doi} citationDoi={dataset.citation_doi} />
          </div>
        </div>
      </div>

      {/* Environmental Context */}
      <div className="mt-4 space-y-3 rounded-md bg-white p-4">
        <div className="flex justify-between">
          <Typography.Text className="pr-2">Biome: </Typography.Text>
          <Tooltip title={dataset.biome_name}>
            <Tag color="default" className="m-0">
              {dataset.biome_name
                ? dataset.biome_name.slice(0, 30) + (dataset.biome_name.length > 30 ? "..." : "")
                : "Unknown"}
            </Tag>
          </Tooltip>
        </div>

        <div className="flex justify-between">
          <Typography.Text className="pr-2">Acquisition Date: </Typography.Text>
          <Typography.Text strong>
            {new Date(
              dataset.aquisition_year,
              dataset.aquisition_month ? dataset.aquisition_month - 1 : 0,
              dataset.aquisition_day ?? 1
            ).toLocaleDateString("en-US", {
              year: "numeric",
              ...(dataset.aquisition_month && { month: "long" }),
              ...(dataset.aquisition_day && { day: "numeric" }),
            })}
          </Typography.Text>
        </div>

        <div className="flex justify-between">
          <Typography.Text className="pr-4">Phenology: </Typography.Text>
          <div className="max-w-[200px] flex-1">
            {isPhenologyLoading ? (
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            ) : phenologyData ? (
              <PhenologyBar
                phenologyData={phenologyData}
                acquisitionYear={dataset.aquisition_year}
                acquisitionMonth={dataset.aquisition_month}
                acquisitionDay={dataset.aquisition_day}
                showTooltips={true}
              />
            ) : (
              <Typography.Text className="text-gray-500">Not available</Typography.Text>
            )}
          </div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="mt-4 space-y-3 rounded-md bg-white p-4">
        <div className="flex justify-between">
          <Typography.Text className="pr-2">Platform: </Typography.Text>
          <Tag color="default">{dataset.platform}</Tag>
        </div>
        <div className="flex justify-between">
          <Typography.Text className="pr-2">File Size: </Typography.Text>
          {dataset.ortho_file_size > 1024 * 1024 * 1024
            ? `${dataset.ortho_file_size.toFixed(1)} MB`
            : `${dataset.ortho_file_size.toFixed(0)} MB`}
        </div>
      </div>

      {/* Additional Information */}
      {dataset.additional_information && (
        <div className="mt-4 space-y-3 rounded-md bg-white p-4">
          <Typography.Text className="pr-2" strong>
            Additional Information:
          </Typography.Text>
          <div className="mt-2 block whitespace-pre-wrap break-words text-sm text-gray-500">
            {sanitizeText(dataset.additional_information)
              .split(/(https?:\/\/[^\s]+)/g)
              .map((part: string, index: number) =>
                part.match(/https?:\/\/[^\s]+/) ? (
                  <Tooltip key={index} title={part}>
                    <a
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-blue-600 underline hover:text-blue-800"
                    >
                      link
                    </a>
                  </Tooltip>
                ) : (
                  part
                )
              )}
          </div>
        </div>
      )}

      {/* Audit Info */}
      {auditInfo?.final_assessment && (
        <div className="mt-4">
          <AuditInfoCard audit={auditInfo} />
        </div>
      )}

      {/* Navigation */}
      {dataset.id && (
        <DatasetNavigation
          currentDatasetId={dataset.id}
          overlappingDatasets={overlappingDatasets || []}
          isLoading={isLoadingOverlapping}
        />
      )}
    </div>
  );
}
