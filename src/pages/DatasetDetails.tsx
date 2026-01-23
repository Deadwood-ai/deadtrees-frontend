import { Button, Col, Row, Tag, Tooltip, Typography, message, Checkbox, Space, Popover, Badge, Spin } from "antd";
import { useParams, useNavigate, Link } from "react-router-dom";

import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  DownloadOutlined,
  FlagOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { Settings } from "../config";
import DatasetDetailsMap from "../components/DatasetDetailsMap/DatasetDetailsMap";
import PublicationLink from "../components/PublicationLink";
import countryList from "../utils/countryList";
import { isGeonadirDataset, getTruncatedAuthorDisplay } from "../utils/datasetUtils";
import { sanitizeText } from "../utils/textUtils";
import { usePublicDatasets } from "../hooks/useDatasets";
import { useDatasetLabels } from "../hooks/useDatasetLabels";
import { ILabelData } from "../types/labels";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useDownload } from "../hooks/useDownloadProvider";
import { useOverlappingDatasets } from "../hooks/useOverlappingDatasets";
import DatasetNavigation from "../components/DatasetDetailsMap/DatasetNavigation";
import { useDatasetDetailsMap } from "../hooks/useDatasetDetailsMapProvider";
import PhenologyBar from "../components/PhenologyBar/PhenologyBar";
import { usePhenologyData } from "../hooks/usePhenologyData";
import AuditBadge from "../components/AuditBadge";
import { useDatasetAudit } from "../hooks/useDatasetAudit";
import { Modal, Form, Input } from "antd";
import { useAuth } from "../hooks/useAuthProvider";
import { useCreateFlag, useDatasetFlags } from "../hooks/useDatasetFlags";
import { EditorToolbar } from "../components/PolygonEditor";
import usePolygonEditor from "../hooks/usePolygonEditor";
import useAISegmentation from "../hooks/useAISegmentation";
import {
  usePredictionLabel,
  useLoadGeometriesForEditing,
  useSaveCorrections,
  buildSavePayload,
  type LayerType,
} from "../hooks/useSaveCorrections";
import { useDatasetLabelTypes } from "../hooks/useDatasetLabelTypes";
import type { Map as OLMap } from "ol";
import type TileLayerWebGL from "ol/layer/WebGLTile.js";
import GeoJSON from "ol/format/GeoJSON";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: datasets } = usePublicDatasets();
  const [labelsOnly, setLabelsOnly] = useState(false);
  const { user } = useAuth();
  const { setViewport, setNavigationSource, navigatedFrom } = useDatasetDetailsMap();
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingLayerType, setEditingLayerType] = useState<LayerType | null>(null);
  const [initialFeatures, setInitialFeatures] = useState<Feature<Geometry>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const mapRef = useRef<OLMap | null>(null);
  const orthoLayerRef = useRef<TileLayerWebGL | null>(null);
  const geoJson = useMemo(() => new GeoJSON(), []);

  // Layer visibility during editing - hide the layer NOT being edited
  const hideDeadwoodLayer = isEditing && editingLayerType === "forest_cover";
  const hideForestCoverLayer = isEditing && editingLayerType === "deadwood";

  // Use the global download state
  const { isDownloading, startDownload, finishDownload, currentDownloadId } = useDownload();

  const dataset = datasets?.find((d) => d.id.toString() === id);

  // Fetch overlapping datasets
  const { data: overlappingDatasets, isLoading: isLoadingOverlapping } = useOverlappingDatasets(dataset?.id);

  // Fetch labels data
  const { data: labelsData } = useDatasetLabels({
    datasetId: dataset?.id || 0,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });

  // Fetch phenology data
  const { data: phenologyData, isLoading: isPhenologyLoading } = usePhenologyData(dataset?.id);

  // Fetch audit (for conditional rendering)
  const { data: auditInfo } = useDatasetAudit(dataset?.id);

  // Flags for this dataset (respect RLS - reporter sees own, auditors see all)
  const { data: flags = [] } = useDatasetFlags(dataset?.id);

  // Report Issue modal state
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm] = Form.useForm();
  const { mutateAsync: createFlag, isPending: isCreatingFlag } = useCreateFlag();

  // Watch fields for reactive validation
  const watchOrtho = Form.useWatch("is_ortho_mosaic_issue", reportForm);
  const watchPred = Form.useWatch("is_prediction_issue", reportForm);
  const watchDesc = Form.useWatch("description", reportForm);
  const canSubmit = !!((watchOrtho || watchPred) && (watchDesc || "").trim().length > 0);

  const myFlags = useMemo(() => (user?.id ? flags.filter((f) => f.created_by === user.id) : []), [flags, user?.id]);
  // Intentionally no extra computed counters; popover shows a short list and total badge

  // ========== INLINE EDITING HOOKS ==========
  
  // Fetch label types for editing
  const { deadwood: deadwoodLabel, forestCover: forestCoverLabel } = useDatasetLabelTypes({
    datasetId: dataset?.id,
    enabled: !!dataset?.id,
  });

  // Get the prediction label for the selected layer
  const { data: predictionLabel } = usePredictionLabel(
    dataset?.id,
    editingLayerType
  );

  // Load geometries when editing
  const { data: loadedGeometries, isLoading: isLoadingGeometries } = useLoadGeometriesForEditing(
    predictionLabel?.id,
    editingLayerType
  );

  // Correction save mutation
  const saveCorrections = useSaveCorrections();

  // Editor hooks
  const editor = usePolygonEditor({ mapRef: mapRef as React.MutableRefObject<OLMap | null> });
  const ai = useAISegmentation({
    mapRef: mapRef as React.MutableRefObject<OLMap | null>,
    getOrthoLayer: () => orthoLayerRef.current ?? undefined,
    getTargetVectorSource: () => editor.getOverlayLayer()?.getSource() ?? undefined,
  });

  // Check which layers are available
  const hasDeadwood = !!deadwoodLabel.data?.id;
  const hasForestCover = !!forestCoverLabel.data?.id && dataset?.is_forest_cover_done;

  // Map ready callback
  const handleMapReady = useCallback((map: OLMap) => {
    mapRef.current = map;
  }, []);

  const handleOrthoLayerReady = useCallback((layer: TileLayerWebGL) => {
    orthoLayerRef.current = layer;
  }, []);

  // Start editing handler
  const handleStartEditing = useCallback((layerType: LayerType) => {
    if (!user) {
      message.info("Please login to edit predictions");
      navigate("/sign-in");
      return;
    }
    setEditingLayerType(layerType);
    setIsEditing(true);
    editor.startEditing();
  }, [user, navigate, editor]);

  // Cancel editing handler
  const handleCancelEditing = useCallback(() => {
    editor.stopEditing();
    editor.getOverlayLayer()?.getSource()?.clear();
    setIsEditing(false);
    setEditingLayerType(null);
    setInitialFeatures([]);
    message.info("Editing cancelled");
  }, [editor]);

  // Save edits handler
  const handleSaveEdits = useCallback(async () => {
    if (!predictionLabel?.id || !editingLayerType || !user?.id || !dataset?.id) return;

    setIsSaving(true);
    try {
      const currentFeatures = editor.getOverlayLayer()?.getSource()?.getFeatures() || [];
      const { deletions, additions } = buildSavePayload(initialFeatures, currentFeatures, geoJson);

      if (deletions.length === 0 && additions.length === 0) {
        message.info("No changes to save");
        setIsSaving(false);
        return;
      }

      const result = await saveCorrections.mutateAsync({
        datasetId: dataset.id,
        labelId: predictionLabel.id,
        layerType: editingLayerType,
        deletions,
        additions,
      });

      if (!result.success) {
        if (result.conflict_ids && result.conflict_ids.length > 0) {
          message.error(`Conflict detected on ${result.conflict_ids.length} polygons. Please reload and try again.`);
        } else {
          message.error(result.message);
        }
        setIsSaving(false);
        return;
      }

      message.success("Corrections saved successfully!");

      // Clean up and exit editing mode
      editor.stopEditing();
      editor.getOverlayLayer()?.getSource()?.clear();
      setIsEditing(false);
      setEditingLayerType(null);
      setInitialFeatures([]);
      
      // Refresh vector tile layers to show updated data
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to save corrections:", error);
      message.error("Failed to save corrections");
    } finally {
      setIsSaving(false);
    }
  }, [predictionLabel?.id, editingLayerType, user?.id, dataset?.id, editor, initialFeatures, geoJson, saveCorrections]);

  // Load geometries into editor when editing starts and data is ready
  // This effect runs when loadedGeometries changes (after editing starts)
  const hasLoadedFeatures = useRef(false);
  useMemo(() => {
    if (isEditing && loadedGeometries && editingLayerType && mapRef.current && !hasLoadedFeatures.current) {
      hasLoadedFeatures.current = true;
      
      // Clone features for diff calculation
      const clonedFeatures = loadedGeometries.map((f) => {
        const clone = f.clone();
        clone.set("geometry_id", f.get("geometry_id"));
        clone.set("updated_at", f.get("updated_at"));
        return clone;
      });
      setInitialFeatures(clonedFeatures);

      // Load into editor overlay
      const overlaySource = editor.getOverlayLayer()?.getSource();
      if (overlaySource) {
        overlaySource.clear();
        loadedGeometries.forEach((f) => overlaySource.addFeature(f));
      }
    }
    if (!isEditing) {
      hasLoadedFeatures.current = false;
    }
  }, [isEditing, loadedGeometries, editingLayerType, editor]);

  // Keyboard shortcuts for editing
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo: Ctrl/Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (editor.canUndo) {
          editor.undo();
        }
        return;
      }

      // Save: Ctrl/Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveEdits();
        return;
      }

      // Skip if modifier keys (except for above)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "s":
          e.preventDefault();
          if (ai.isActive) {
            ai.disable();
          } else {
            ai.enable();
          }
          break;
        case "a":
          e.preventDefault();
          editor.toggleDraw();
          break;
        case "c":
          if (editor.selection && editor.selection.length === 1) {
            e.preventDefault();
            editor.cutHoleWithDrawn();
          }
          break;
        case "d":
          if (editor.selection && editor.selection.length > 0) {
            e.preventDefault();
            editor.deleteSelected();
          }
          break;
        case "g":
          if (editor.selection && editor.selection.length === 2) {
            e.preventDefault();
            editor.mergeSelected();
          }
          break;
        case "x":
          if (editor.selection && editor.selection.length === 2) {
            e.preventDefault();
            editor.clipSelected();
          }
          break;
        case "escape":
          handleCancelEditing();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, editor, ai, handleSaveEdits, handleCancelEditing]);

  if (!dataset) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ minHeight: "60vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  // Check if this is a GeoNadir dataset
  const isFromGeonadir = isGeonadirDataset(dataset);

  // console.log(dataset);

  return (
    <Row
      className="h-full bg-slate-50"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex h-full w-96 flex-col">
        {/* Fixed Header - Back Button */}
        <div className="p-3 pb-0 pr-4">
          <Button
            size="large"
            shape="circle"
            onClick={() => {
              // Reset the viewport context before navigating back
              setViewport({
                center: [0, 0],
                zoom: 2,
              });

              // Clear navigation source
              setNavigationSource(null);

              // If we navigated here from another dataset detail page,
              // go directly back to the main dataset list instead of the previous detail page
              if (navigatedFrom === "navigation") {
                navigate("/dataset");
              } else {
                // Regular back behavior
                navigate(-1);
              }
            }}
            icon={<ArrowLeftOutlined />}
          />
          {/* Removed left-column Report button per feedback (use map overlay instead) */}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 pr-4 pt-0">
          {dataset ? (
            <div className="p-2">
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
                  <Tooltip title={dataset.authors?.join(", ") + (isFromGeonadir ? " (via GeoNadir)" : "")}>
                    <Typography.Text strong>
                      {getTruncatedAuthorDisplay(dataset.authors, isFromGeonadir)}
                    </Typography.Text>
                  </Tooltip>
                </div>

                <div className="flex justify-between">
                  <Typography.Text className="pr-2">
                    {(() => {
                      // Determine the appropriate label based on available data
                      if (dataset.freidata_doi) {
                        return "DOI: ";
                      }
                      if (dataset.citation_doi) {
                        // Check if it's a DOI-like string (contains doi.org or has DOI format)
                        const isDoi =
                          dataset.citation_doi.includes("doi.org") ||
                          /^10\.\d{4,}\//.test(dataset.citation_doi) ||
                          dataset.citation_doi.toLowerCase().includes("zenodo");
                        return isDoi ? "DOI: " : "Link: ";
                      }
                      return "Source: ";
                    })()}
                  </Typography.Text>
                  <div style={{ maxWidth: "70%", textAlign: "right", overflow: "hidden" }}>
                    <PublicationLink freidataDoI={dataset.freidata_doi} citationDoi={dataset.citation_doi} />
                  </div>
                </div>

                {auditInfo?.final_assessment && (
                  <div className="flex justify-between">
                    <Typography.Text className="pr-2">Audit Status:</Typography.Text>
                    <div className="max-w-[70%] text-right">
                      <AuditBadge datasetId={dataset.id} audit={auditInfo} />
                    </div>
                  </div>
                )}
              </div>

              {/* Environmental Context Box */}
              <div className="mt-4 space-y-3 rounded-md bg-white p-4">
                <div className="flex justify-between">
                  <Typography.Text style={{ margin: 0 }}>
                    <Typography.Text className="pr-2">Biome: </Typography.Text>
                  </Typography.Text>
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
                  <div className="flex flex-col items-end">
                    <Typography.Text strong>
                      {new Date(
                        dataset.aquisition_year,
                        dataset.aquisition_month ? dataset.aquisition_month - 1 : 0,
                        dataset.aquisition_day ?? 1,
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        ...(dataset.aquisition_month && { month: "long" }),
                        ...(dataset.aquisition_day && { day: "numeric" }),
                      })}
                    </Typography.Text>
                  </div>
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
                  {dataset.ortho_file_size > 1024 * 1024 * 1024
                    ? `${dataset.ortho_file_size.toFixed(1)} MB`
                    : `${dataset.ortho_file_size.toFixed(0)} MB`}
                </div>
              </div>

              {/* Additional Information */}
              {dataset.additional_information && (
                <div className="mt-4 space-y-3 rounded-md bg-white p-4">
                  <div>
                    <Typography.Text className="pr-2" strong>
                      Additional Information:
                    </Typography.Text>
                    <div className="mt-2 block whitespace-pre-wrap break-words text-sm text-gray-500">
                      {sanitizeText(dataset.additional_information)
                        .split(/(https?:\/\/[^\s]+)/g)
                        .map((part: string, index: number) => {
                          if (part.match(/https?:\/\/[^\s]+/)) {
                            return (
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
                            );
                          }
                          return part;
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Removed left-side banner per feedback */}

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

              {/* Add the dataset navigation component near the bottom */}
              {dataset.id && (
                <DatasetNavigation
                  currentDatasetId={dataset.id}
                  overlappingDatasets={overlappingDatasets || []}
                  isLoading={isLoadingOverlapping}
                />
              )}

              <div className="mt-6 space-y-3 rounded-md bg-white p-4">
                <Space direction="vertical" className="w-full">
                  {isDownloading && currentDownloadId !== dataset.id.toString() && (
                    <div className="mb-2 text-center text-sm text-orange-500">Another dataset is being downloaded</div>
                  )}
                  <Tooltip
                    title={
                      isDownloading
                        ? currentDownloadId === dataset.id.toString()
                          ? "This dataset is currently being prepared for download..."
                          : "Another download is in progress. Only one download can be active at a time."
                        : isFromGeonadir && !labelsOnly
                          ? "Dataset download restricted by data provider. Labels/predictions are still available."
                          : labelsOnly
                            ? "Download vector data of tree mortality predictions (GPKG format)"
                            : "Download both orthophoto and tree mortality predictions"
                    }
                  >
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      className="w-full"
                      disabled={isDownloading || (isFromGeonadir && !labelsOnly)}
                      loading={isDownloading && currentDownloadId === dataset.id.toString()}
                      onClick={() => {
                        // Prevent downloads for GeoNadir datasets (except labels-only)
                        if (isFromGeonadir && !labelsOnly) {
                          message.warning(
                            "Dataset download restricted by data provider. You can download labels/predictions only.",
                          );
                          return;
                        }

                        // Prevent multiple downloads using global state
                        if (isDownloading) {
                          // If this dataset is already being downloaded, don't show an info message
                          if (currentDownloadId !== dataset.id.toString()) {
                            message.info("A download is already in progress. Please wait.");
                          }
                          return;
                        }

                        // Try to start the download in the global state
                        const downloadStarted = startDownload(dataset.id.toString());
                        if (!downloadStarted) {
                          return;
                        }

                        const baseUrl = labelsOnly
                          ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels.gpkg`
                          : `${Settings.API_URL}/download/datasets/${dataset.id}/dataset.zip`;

                        // Show persistent loading message until download is ready
                        const downloadMsg = message.loading({
                          content: `Preparing ${labelsOnly ? "predictions" : "complete dataset"} for download...`,
                          duration: 0,
                        });

                        // Both dataset.zip and labels.gpkg use the background job approach
                        // First initiate the download
                        fetch(baseUrl)
                          .then((response) => response.json())
                          .then((data) => {
                            const jobId = data.job_id;

                            // Build the correct status endpoint based on download type
                            const statusEndpoint = labelsOnly
                              ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels/status`
                              : `${Settings.API_URL}/download/datasets/${jobId}/status`;

                            // Build the correct download endpoint based on download type
                            const downloadEndpoint = labelsOnly
                              ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels/download`
                              : `${Settings.API_URL}/download/datasets/${jobId}/download`;

                            // Function to check status
                            const checkStatus = () => {
                              fetch(statusEndpoint)
                                .then((response) => response.json())
                                .then((statusData) => {
                                  if (statusData.status === "completed") {
                                    // Download is ready - close loading message
                                    downloadMsg();
                                    finishDownload(); // Update global state

                                    // Start actual download
                                    window.location.href = downloadEndpoint;

                                    // Show success message
                                    message.success({
                                      content: `${labelsOnly ? "Predictions" : "Dataset"} download started! The file will be saved to your downloads folder.`,
                                      duration: 5,
                                    });
                                  } else if (statusData.status === "failed") {
                                    // Handle failure
                                    downloadMsg();
                                    finishDownload(); // Update global state
                                    message.error({
                                      content: "Download preparation failed. Please try again.",
                                      duration: 5,
                                    });
                                  } else {
                                    // Still processing, check again in 1 second
                                    setTimeout(checkStatus, 1000);
                                  }
                                })
                                .catch((error) => {
                                  // Handle error
                                  downloadMsg();
                                  finishDownload(); // Update global state
                                  message.error({
                                    content: `Error checking download status: ${error.message}`,
                                    duration: 5,
                                  });
                                });
                            };

                            // Start checking status
                            checkStatus();
                          })
                          .catch((error) => {
                            // Handle error initiating download
                            downloadMsg();
                            finishDownload(); // Update global state
                            message.error({
                              content: `Error initiating download: ${error.message}`,
                              duration: 5,
                            });
                          });
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
        </div>
      </Col>
      <Col className="relative flex-1 pt-2">
        {/* Editor toolbar when editing */}
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
            onToggleAI={() => ai.isActive ? ai.disable() : ai.enable()}
            onDeleteSelected={editor.deleteSelected}
            onUndo={editor.undo}
            canUndo={editor.canUndo}
            onSave={handleSaveEdits}
            onCancel={handleCancelEditing}
            position="top-right"
            title={`Editing ${editingLayerType === "deadwood" ? "Deadwood" : "Forest Cover"}`}
          />
        )}

        {/* Action buttons overlay in top-right of the map (when not editing) */}
        {!isEditing && user && (
          <div className="absolute right-3 top-5 z-10 flex gap-2">
            {/* Edit Deadwood button */}
            {hasDeadwood && (
              <Tooltip title="Edit deadwood predictions">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleStartEditing("deadwood")}
                >
                  Edit Deadwood
                </Button>
              </Tooltip>
            )}

            {/* Edit Forest Cover button */}
            {hasForestCover && (
              <Tooltip title="Edit forest cover predictions">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleStartEditing("forest_cover")}
                >
                  Edit Forest Cover
                </Button>
              </Tooltip>
            )}

            {/* Report Issue button with badge and popover */}
            <Popover
              placement="leftTop"
              trigger={["hover"]}
              content={
                myFlags.length > 0 ? (
                  <div style={{ maxWidth: 320 }}>
                    <Typography.Text strong>You reported {myFlags.length} issue(s)</Typography.Text>
                    <div className="mt-2 space-y-2">
                      {myFlags.slice(0, 3).map((f) => {
                        const text = (f.description || "").slice(0, 200) + (f.description.length > 200 ? "…" : "");
                        return (
                          <div key={f.id} className="rounded border p-2">
                            <div className="mb-1 flex items-center gap-2">
                              {f.is_ortho_mosaic_issue && <Tag color="orange">Orthomosaic</Tag>}
                              {f.is_prediction_issue && <Tag color="blue">Segmentation</Tag>}
                              <Tag color={f.status === "open" ? "red" : f.status === "acknowledged" ? "gold" : "green"}>
                                {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                              </Tag>
                            </div>
                            <Tooltip title={f.description}>
                              <div className="text-xs text-gray-700">{text}</div>
                            </Tooltip>
                          </div>
                        );
                      })}
                      {myFlags.length > 3 && (
                        <div className="text-xs text-gray-500">+ {myFlags.length - 3} more in your profile</div>
                      )}
                      <Link to="/profile" className="text-blue-600">
                        View in Profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">Report issues you notice for this dataset.</div>
                )
              }
            >
              <Badge count={myFlags.length} size="small" offset={[0, 0]}>
                <Button size="small" icon={<FlagOutlined />} onClick={() => setReportModalOpen(true)}>
                  Report
                </Button>
              </Badge>
            </Popover>
          </div>
        )}

        {/* Show edit buttons for non-logged-in users with login prompt */}
        {!isEditing && !user && (hasDeadwood || hasForestCover) && (
          <div className="absolute right-3 top-5 z-10 flex gap-2">
            <Tooltip title="Login to edit predictions">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate("/sign-in")}
              >
                Edit Predictions
              </Button>
            </Tooltip>
          </div>
        )}
        <DatasetDetailsMap 
          data={dataset} 
          onMapReady={handleMapReady}
          onOrthoLayerReady={handleOrthoLayerReady}
          hideDeadwoodLayer={hideDeadwoodLayer}
          hideForestCoverLayer={hideForestCoverLayer}
          refreshKey={refreshKey}
        />
      </Col>

      {/* Report Issue Modal */}
      <Modal
        title="Report an Issue"
        open={isReportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        okText="Submit"
        confirmLoading={isCreatingFlag}
        okButtonProps={{ disabled: !canSubmit }}
        onOk={async () => {
          try {
            const values = await reportForm.validateFields();
            await createFlag({
              dataset_id: dataset.id,
              is_ortho_mosaic_issue: values.is_ortho_mosaic_issue || false,
              is_prediction_issue: values.is_prediction_issue || false,
              description: values.description,
            });
            message.success("Issue reported successfully");
            setReportModalOpen(false);
            reportForm.resetFields();
          } catch (e) {
            // Swallow validation errors; other errors will be surfaced by Ant message if thrown
          }
        }}
      >
        <Form
          form={reportForm}
          layout="vertical"
          initialValues={{ is_ortho_mosaic_issue: false, is_prediction_issue: false }}
        >
          <div className="mb-2 mt-6 flex items-center">
            <Typography.Text className="text-sm font-medium">Issue type</Typography.Text>
            <Tooltip
              title={
                <div>
                  <div>
                    <strong>Orthomosaic</strong>: base image problems (misalignment, seams, black/white borders, color
                    band issues, artifacts).
                  </div>
                  <div className="mt-1">
                    <strong>Segmentation</strong>: prediction problems (missing deadwood, false positives, poor
                    outlines, misclassification).
                  </div>
                </div>
              }
              placement="right"
            >
              <InfoCircleOutlined className="ml-1 text-blue-500" />
            </Tooltip>
          </div>
          <Form.Item className="mb-0" name="is_ortho_mosaic_issue" valuePropName="checked">
            <Checkbox>
              <Tooltip title="Base image problems: misalignment, seams, black/white borders, color band issues, artifacts">
                <span>Orthomosaic issue</span>
              </Tooltip>
            </Checkbox>
          </Form.Item>
          <Form.Item className="mb-4" name="is_prediction_issue" valuePropName="checked">
            <Checkbox>
              <Tooltip title="Segmentation problems: missing deadwood, false positives, poor outlines, obvious misclassification">
                <span>Segmentation issue</span>
              </Tooltip>
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please describe the issue" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Describe the issue and where it occurs. Mention Orthomosaic (alignment, seams, borders, bands) or Segmentation (missing, false positives, misclassification)."
            />
          </Form.Item>
          {/* Validation message removed; submit is disabled until valid per feedback */}
        </Form>
      </Modal>
    </Row>
  );
}
