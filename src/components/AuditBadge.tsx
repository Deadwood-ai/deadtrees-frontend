import React, { useMemo } from "react";
import { Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useDatasetAudit, DatasetAuditUserInfo } from "../hooks/useDatasetAudit";

type Props = {
  datasetId: number;
  audit?: DatasetAuditUserInfo | null;
  size?: "small" | "default";
};

const assessmentToVisual = (assessment: DatasetAuditUserInfo["final_assessment"]) => {
  switch (assessment) {
    case "no_issues":
      return { color: "green", text: "✅ Audited" };
    case "fixable_issues":
      return { color: "gold", text: "🔧 Issues" };
    case "exclude_completely":
      return { color: "red", text: "🚫 Excluded" };
    default:
      return { color: "default", text: "Audited" };
  }
};

function renderBool(value: boolean | null | undefined): string {
  if (value === true) return "✅ Yes";
  if (value === false) return "❌ No";
  return "—";
}

function renderQuality(value: string | null | undefined): string {
  if (!value) return "—";
  switch (value) {
    case "great":
      return "🟢 great";
    case "sentinel_ok":
      return "🟡 ok";
    case "bad":
      return "🔴 bad";
    default:
      return value;
  }
}

function buildTooltip(audit: DatasetAuditUserInfo) {
  const acquisitionHint = audit.has_valid_phenology
    ? "Acquisition during growing season"
    : audit.has_valid_phenology === false
      ? "Acquisition likely outside growing season"
      : "Acquisition season unknown";

  return (
    <div className="space-y-1 text-sm">
      <div>
        <strong>Final assessment:</strong> {assessmentToVisual(audit.final_assessment).text}
      </div>
      <div>
        <strong>Audit date:</strong> {audit.audit_date ? dayjs(audit.audit_date).format("YYYY-MM-DD") : "—"}
      </div>
      <div>
        <strong>Georeferenced:</strong> {renderBool(audit.is_georeferenced)}
      </div>
      <div>
        <strong>Valid acquisition date:</strong> {renderBool(audit.has_valid_acquisition_date)}
      </div>
      <div>
        <strong>Phenology:</strong> {renderBool(audit.has_valid_phenology)} ({acquisitionHint})
      </div>
      <div>
        <strong>Deadwood quality:</strong> {renderQuality(audit.deadwood_quality || null)}
      </div>
      <div>
        <strong>Forest cover quality:</strong> {renderQuality(audit.forest_cover_quality || null)}
      </div>
      {audit.has_cog_issue && (
        <div>
          <strong>COG issues:</strong> {audit.cog_issue_notes}
        </div>
      )}
      {audit.has_thumbnail_issue && (
        <div>
          <strong>Thumbnail issues:</strong> {audit.thumbnail_issue_notes}
        </div>
      )}
    </div>
  );
}

const AuditBadge: React.FC<Props> = ({ datasetId, audit: auditProp, size = "small" }) => {
  const { data: auditFetched } = useDatasetAudit(datasetId);

  const audit = (auditProp ?? auditFetched) as DatasetAuditUserInfo | null;
  const show = Boolean(audit && audit.final_assessment);

  const visual = useMemo(() => assessmentToVisual(audit?.final_assessment ?? null), [audit?.final_assessment]);

  if (!show) return null;

  return (
    <Tooltip title={audit ? buildTooltip(audit) : undefined} overlayStyle={{ maxWidth: 360 }}>
      <Tag color={visual.color}>{visual.text}</Tag>
    </Tooltip>
  );
};

export default AuditBadge;
