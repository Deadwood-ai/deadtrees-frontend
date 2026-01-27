import React from "react";
import { Tooltip } from "antd";
import { CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DatasetAuditUserInfo } from "../hooks/useDatasetAudit";

type Props = {
  audit: DatasetAuditUserInfo;
};

const assessmentConfig = {
  no_issues: { 
    icon: <CheckCircleOutlined />, 
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    textColor: "text-green-700",
    label: "Predictions Verified" 
  },
  fixable_issues: { 
    icon: <ExclamationCircleOutlined />, 
    bgColor: "bg-yellow-50", 
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    label: "Predictions Have Issues" 
  },
  exclude_completely: { 
    icon: <WarningOutlined />, 
    bgColor: "bg-red-50", 
    borderColor: "border-red-200",
    textColor: "text-red-700",
    label: "Predictions Excluded" 
  },
};

const qualityConfig = {
  great: { icon: "🟢", label: "Great" },
  sentinel_ok: { icon: "🟡", label: "OK" },
  bad: { icon: "🔴", label: "Poor" },
};

const QualityRow = ({ label, quality }: { label: string; quality: string | null | undefined }) => {
  const config = quality ? qualityConfig[quality as keyof typeof qualityConfig] : null;
  if (!config) return null;
  
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="flex items-center gap-1">
        <span>{config.icon}</span>
        <span className="text-gray-700">{config.label}</span>
      </span>
    </div>
  );
};

const AuditInfoCard: React.FC<Props> = ({ audit }) => {
  const config = assessmentConfig[audit.final_assessment as keyof typeof assessmentConfig] || assessmentConfig.no_issues;
  
  const tooltipContent = (
    <div className="text-xs">
      <div className="font-medium mb-1">Audit Details</div>
      <div>Date: {audit.audit_date ? dayjs(audit.audit_date).format("YYYY-MM-DD") : "—"}</div>
      <div>Georeferenced: {audit.is_georeferenced ? "Yes" : "No"}</div>
      <div>Valid acquisition date: {audit.has_valid_acquisition_date ? "Yes" : "No"}</div>
      <div>Growing season: {audit.has_valid_phenology ? "Yes" : audit.has_valid_phenology === false ? "No" : "Unknown"}</div>
    </div>
  );

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 font-medium ${config.textColor}`}>
          {config.icon}
          <span>{config.label}</span>
        </div>
        <Tooltip title={tooltipContent} placement="left">
          <InfoCircleOutlined className="cursor-help text-gray-400 hover:text-gray-600" />
        </Tooltip>
      </div>
      
      {/* Quality ratings */}
      <div className="space-y-1">
        <QualityRow label="Forest Cover" quality={audit.forest_cover_quality} />
        <QualityRow label="Deadwood" quality={audit.deadwood_quality} />
      </div>
      
    </div>
  );
};

export default AuditInfoCard;
