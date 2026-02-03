import { Button, Col, Row, Spin, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useState, useCallback } from "react";

import { usePublicDatasets } from "../hooks/useDatasets";
import { useDatasetLabels } from "../hooks/useDatasetLabels";
import { ILabelData } from "../types/labels";
import { useDownload } from "../hooks/useDownloadProvider";
import { useOverlappingDatasets } from "../hooks/useOverlappingDatasets";
import { useDatasetDetailsMap } from "../hooks/useDatasetDetailsMapProvider";
import { usePhenologyData } from "../hooks/usePhenologyData";
import { useAuth } from "../hooks/useAuthProvider";
import { useCreateFlag } from "../hooks/useDatasetFlags";
import { useDatasetEditing } from "../hooks/useDatasetEditing";
import { isGeonadirDataset } from "../utils/datasetUtils";

import DatasetDetailsMap from "../components/DatasetDetailsMap/DatasetDetailsMap";
import DatasetLayerControlPanel from "../components/DatasetDetailsMap/DatasetLayerControlPanel";
import EditingSidebar from "../components/DatasetDetailsMap/EditingSidebar";
import DatasetInfoSidebar from "../components/DatasetDetailsMap/DatasetInfoSidebar";
import DownloadSection from "../components/DatasetDetailsMap/DownloadSection";
import ReportIssueModal from "../components/DatasetDetailsMap/ReportIssueModal";
import { EditorToolbar } from "../components/PolygonEditor";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { data: datasets } = usePublicDatasets();
  const {
    setViewport,
    setNavigationSource,
    navigatedFrom,
    layerControl,
    setMapStyle,
    setShowForestCover,
    setShowDeadwood,
    setShowDroneImagery,
    setShowAOI,
    setLayerOpacity,
  } = useDatasetDetailsMap();

  // Find current dataset
  const dataset = datasets?.find((d) => d.id.toString() === id);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [labelsOnly, setLabelsOnly] = useState(false);

  // Report modal state
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const { mutateAsync: createFlag, isPending: isCreatingFlag } = useCreateFlag();

  // Download state
  const { isDownloading, startDownload, finishDownload, currentDownloadId } = useDownload();

  // Editing hook
  const editing = useDatasetEditing({ datasetId: dataset?.id, user });

  // Data hooks
  const { data: overlappingDatasets, isLoading: isLoadingOverlapping } = useOverlappingDatasets(dataset?.id);
  const { data: labelsData } = useDatasetLabels({
    datasetId: dataset?.id || 0,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });
  const { data: phenologyData, isLoading: isPhenologyLoading } = usePhenologyData(dataset?.id);
  const auditInfo = dataset
    ? {
      final_assessment: dataset.final_assessment,
      forest_cover_quality: dataset.forest_cover_quality,
      deadwood_quality: dataset.deadwood_quality,
      has_valid_phenology: dataset.has_valid_phenology ?? null,
      has_valid_acquisition_date: dataset.has_valid_acquisition_date ?? null,
      audit_date: dataset.audit_date ?? null,
    }
    : null;

  // Back button handler
  const handleBackClick = useCallback(() => {
    setViewport({ center: [0, 0], zoom: 2 });
    setNavigationSource(null);
    if (navigatedFrom === "navigation") {
      navigate("/dataset");
    } else {
      navigate(-1);
    }
  }, [setViewport, setNavigationSource, navigatedFrom, navigate]);

  // Report submit handler
  const handleReportSubmit = useCallback(
    async (values: { is_ortho_mosaic_issue: boolean; is_prediction_issue: boolean; description: string }) => {
      if (!dataset) return;
      await createFlag({ dataset_id: dataset.id, ...values });
      message.success("Issue reported successfully");
      setReportModalOpen(false);
    },
    [dataset, createFlag]
  );

  // Loading state
  if (!dataset) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ minHeight: "60vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  const isFromGeonadir = isGeonadirDataset(dataset);
  const { isEditing, editingLayerType, editor, ai, hasDeadwood, hasForestCover, refreshKey } = editing;

  return (
    <Row className="relative h-full bg-slate-50" style={{ width: "100%", height: "100%" }}>
      {/* Collapsible Sidebar */}
      {!sidebarCollapsed && (
        <Col className="flex h-full w-96 flex-col border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto p-3 pr-4 pt-14">
            {isEditing && editingLayerType ? (
              <EditingSidebar layerType={editingLayerType} />
            ) : (
              <DatasetInfoSidebar
                dataset={dataset}
                phenologyData={phenologyData}
                isPhenologyLoading={isPhenologyLoading}
                auditInfo={auditInfo}
                overlappingDatasets={overlappingDatasets || []}
                isLoadingOverlapping={isLoadingOverlapping}
              />
            )}
          </div>

          {/* Download Section - hidden when editing */}
          {!isEditing && (
            <DownloadSection
              dataset={dataset}
              isFromGeonadir={isFromGeonadir}
              labelsOnly={labelsOnly}
              setLabelsOnly={setLabelsOnly}
              hasLabels={!!labelsData}
              isDownloading={isDownloading}
              currentDownloadId={currentDownloadId}
              startDownload={startDownload}
              finishDownload={finishDownload}
            />
          )}
        </Col>
      )}

      {/* Back Button - hidden when editing */}
      {!isEditing && (
        <div className="absolute left-5 top-3 z-20">
          <Button size="large" shape="circle" onClick={handleBackClick} icon={<ArrowLeftOutlined />} className="bg-white" />
        </div>
      )}

      {/* Sidebar Toggle */}
      <div
        className="absolute top-3 z-20"
        style={{ left: sidebarCollapsed ? (isEditing ? "20px" : "68px") : "calc(24rem - 52px)" }}
      >
        <Button
          size="large"
          shape="circle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          className="bg-white"
        />
      </div>

      {/* Map Column */}
      <Col className="relative flex-1">
        {/* Layer Control Panel - hidden when editing */}
        {!isEditing && (
          <div className="absolute right-3 top-3 z-10">
            <DatasetLayerControlPanel
              mapStyle={layerControl.mapStyle}
              onMapStyleChange={setMapStyle}
              showForestCover={layerControl.showForestCover}
              setShowForestCover={setShowForestCover}
              showDeadwood={layerControl.showDeadwood}
              setShowDeadwood={setShowDeadwood}
              showDroneImagery={layerControl.showDroneImagery}
              setShowDroneImagery={setShowDroneImagery}
              showAOI={layerControl.showAOI}
              setShowAOI={setShowAOI}
              hasForestCover={hasForestCover && !!dataset.is_forest_cover_done}
              hasDeadwood={hasDeadwood}
              hasAOI={true}
              forestCoverQuality={auditInfo?.forest_cover_quality as "great" | "sentinel_ok" | "bad" | undefined}
              deadwoodQuality={auditInfo?.deadwood_quality as "great" | "sentinel_ok" | "bad" | undefined}
              opacity={layerControl.layerOpacity}
              setOpacity={setLayerOpacity}
              onReportClick={() => setReportModalOpen(true)}
              onEditForestCover={() => editing.handleStartEditing("forest_cover")}
              onEditDeadwood={() => editing.handleStartEditing("deadwood")}
              isLoggedIn={!!user}
            />
          </div>
        )}

        {/* Editor Toolbar - visible when editing */}
        {isEditing && (
          <EditorToolbar
            type={editingLayerType || "deadwood"}
            isDrawing={editor.isDrawing}
            hasSelection={editor.selection.length > 0}
            selectionCount={editor.selection.length}
            isAIActive={ai.isActive}
            isAIProcessing={ai.isProcessing}
            onToggleDraw={() => editor.toggleDraw()}
            onCutHole={editor.cutHoleWithDrawn}
            onMerge={editor.mergeSelected}
            onClip={editor.clipSelected}
            onToggleAI={() => (ai.isActive ? ai.disable() : ai.enable())}
            onDeleteSelected={editor.deleteSelected}
            onUndo={editor.undo}
            canUndo={editor.canUndo}
            onSave={editing.handleSaveEdits}
            onCancel={editing.handleCancelEditing}
            position="top-right"
            title={`Editing ${editingLayerType === "deadwood" ? "Deadwood" : "Forest Cover"}`}
          />
        )}

        <DatasetDetailsMap
          data={dataset}
          onMapReady={editing.handleMapReady}
          onOrthoLayerReady={editing.handleOrthoLayerReady}
          hideDeadwoodLayer={isEditing}
          hideForestCoverLayer={isEditing}
          refreshKey={refreshKey}
          showDeadwood={isEditing ? false : layerControl.showDeadwood}
          showForestCover={isEditing ? false : layerControl.showForestCover}
          showDroneImagery={layerControl.showDroneImagery}
          showAOI={layerControl.showAOI}
          layerOpacity={layerControl.layerOpacity}
          onEditDeadwood={() => editing.handleStartEditing("deadwood")}
          onEditForestCover={() => editing.handleStartEditing("forest_cover")}
          isLoggedIn={!!user}
        />
      </Col>

      {/* Report Issue Modal */}
      <ReportIssueModal
        open={isReportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        isSubmitting={isCreatingFlag}
      />
    </Row>
  );
}
