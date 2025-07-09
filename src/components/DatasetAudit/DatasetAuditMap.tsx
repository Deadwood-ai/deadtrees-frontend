import { useEffect, useRef, useState } from "react";
import { XYZ } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import { Layer } from "ol/layer";
import { Button, message } from "antd";
import { EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Draw, Modify, Select } from "ol/interaction";
import { Polygon, MultiPolygon } from "ol/geom";
import { Style, Stroke, Fill, Circle } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import { click } from "ol/events/condition";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "../DatasetDetailsMap/DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer, createForestCoverVectorLayer } from "../DatasetDetailsMap/createVectorLayer";
import { useDatasetLabels } from "../../hooks/useDatasetLabels";
import { ILabelData } from "../../types/labels";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";

interface DatasetAuditMapProps {
  dataset: IDataset;
  onAOIChange?: (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null) => void;
}

const DatasetAuditMap = ({ dataset, onAOIChange }: DatasetAuditMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const aoiLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);

  // Use ref instead of state to avoid re-renders
  const currentAOIRef = useRef<GeoJSON.MultiPolygon | GeoJSON.Polygon | null>(null);

  const [mapStyle, setMapStyle] = useState("satellite-streets-v12");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);
  const [forestCoverOpacity, setForestCoverOpacity] = useState<number>(1);

  // Only use state for UI controls that need to trigger re-renders
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasAOI, setHasAOI] = useState(false);

  // Add state to track if a polygon is selected during editing
  const [selectedFeatureForEdit, setSelectedFeatureForEdit] = useState<any>(null);

  // Fetch label data for the current dataset
  const { data: labelData } = useDatasetLabels({
    datasetId: dataset?.id,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });

  // Fetch forest cover label data for the current dataset
  const { data: forestCoverLabelData } = useDatasetLabels({
    datasetId: dataset?.id,
    labelData: ILabelData.FOREST_COVER,
    enabled: !!dataset?.id,
  });

  // Get existing AOI data
  const { data: aoiData, isLoading: isAOILoading } = useDatasetAOI(dataset.id);

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<XYZ>;
    orthoCog?: TileLayerWebGL;
    deadwoodVector?: Layer;
    forestCoverVector?: Layer;
    aoiVector?: VectorLayer<VectorSource>;
  }>({});

  // Initialize the map and layers
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // console.log("Initializing map for dataset:", dataset?.file_name);

    try {
      // Create AOI vector layer
      const aoiSource = new VectorSource();
      const aoiLayer = new VectorLayer({
        source: aoiSource,
        style: new Style({
          stroke: new Stroke({
            color: "#ff6b35",
            width: 3,
          }),
          fill: new Fill({
            color: "rgba(255, 107, 53, 0.1)",
          }),
        }),
      });
      aoiLayerRef.current = aoiLayer;

      // Create basemap layer
      const basemapLayer = new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/tiles/512/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
          attributions: "© Mapbox © OpenStreetMap contributors",
        }),
      });

      // Create ortho layer if COG path exists
      let orthoCogLayer: TileLayerWebGL | null = null;
      if (dataset?.cog_path) {
        orthoCogLayer = new TileLayerWebGL({
          source: new GeoTIFF({
            sources: [
              {
                url: Settings.COG_BASE_URL + dataset.cog_path,
                nodata: 0,
                bands: [1, 2, 3],
              },
            ],
            convertToRGB: true,
          }),
          maxZoom: 23,
          cacheSize: 4096,
          preload: 0,
        });
      }

      // Create deadwood vector layer - always create it, let the layer handle null labelId
      const deadwoodVectorLayer = createDeadwoodVectorLayer(labelData?.id);

      // Create forest cover vector layer - always create it, let the layer handle null labelId
      const forestCoverVectorLayer = createForestCoverVectorLayer(forestCoverLabelData?.id);

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer || undefined,
        deadwoodVector: deadwoodVectorLayer || undefined,
        forestCoverVector: forestCoverVectorLayer || undefined,
        aoiVector: aoiLayer,
      };

      // Create layers array
      const layers = [basemapLayer, aoiLayer];
      if (orthoCogLayer) layers.splice(1, 0, orthoCogLayer);
      if (deadwoodVectorLayer) layers.push(deadwoodVectorLayer);
      if (forestCoverVectorLayer) layers.push(forestCoverVectorLayer);

      // Initialize map view
      const initialCenter =
        dataset?.longitude && dataset?.latitude
          ? fromLonLat([dataset.longitude, dataset.latitude])
          : fromLonLat([0, 0]);

      const MapView = new View({
        center: initialCenter,
        zoom: 15,
        maxZoom: 22,
        projection: "EPSG:3857",
      });

      // Create map
      const newMap = new Map({
        target: mapRef.current,
        layers: layers,
        view: MapView,
        controls: [],
      });

      mapInstanceRef.current = newMap;

      // If we have an ortho layer, fit to its extent and constrain the view
      if (orthoCogLayer) {
        const source = orthoCogLayer.getSource();
        if (source) {
          source
            .getView()
            .then((viewOptions) => {
              if (viewOptions?.extent && mapInstanceRef.current) {
                // Fit the view to the extent
                mapInstanceRef.current.getView().fit(viewOptions.extent);

                // Create a new view with a more flexible extent constraint
                const constrainedView = new View({
                  center: mapInstanceRef.current.getView().getCenter(),
                  zoom: mapInstanceRef.current.getView().getZoom(),
                  maxZoom: 23,
                  minZoom: 2, // Allow zooming out further
                  extent: viewOptions.extent, // Use the exact ortho extent
                  constrainOnlyCenter: true, // Only constrain the center, not the whole viewport
                  showFullExtent: true, // Allow zooming out to show the full extent
                  smoothExtentConstraint: true, // Allow slight exceedance (default, but explicit)
                  projection: "EPSG:3857",
                });

                // Replace the current view with the constrained one
                mapInstanceRef.current.setView(constrainedView);
              }
            })
            .catch((error) => {
              // console.error("Error getting ortho extent:", error);
            });
        }
      }

      // console.log("Map initialized successfully");
    } catch (error) {
      // console.error("Error initializing map:", error);
    }

    return () => {
      if (mapInstanceRef.current) {
        // console.log("Cleaning up map");

        // Clean up layers
        Object.values(layerRefs.current).forEach((layer) => {
          if (layer) {
            try {
              mapInstanceRef.current?.removeLayer(layer);
              const source = layer.getSource();
              if (source && typeof source.clear === "function") {
                source.clear();
              }
            } catch (error) {
              console.error("Error during layer cleanup:", error);
            }
          }
        });

        // Clear layer references
        layerRefs.current = {};
        aoiLayerRef.current = null;

        // Clean up map
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [dataset, mapStyle, labelData, forestCoverLabelData]);

  // Update getCurrentGeometry to handle both Polygon and MultiPolygon
  const getCurrentGeometry = (): GeoJSON.MultiPolygon | GeoJSON.Polygon | null => {
    // console.log("getCurrentGeometry called");

    if (!aoiLayerRef.current) {
      // console.log("getCurrentGeometry: No AOI layer ref");
      return null;
    }

    const source = aoiLayerRef.current.getSource();
    if (!source) {
      // console.log("getCurrentGeometry: No source");
      return null;
    }

    const features = source.getFeatures();
    // console.log(`getCurrentGeometry: Found ${features.length} features`);

    if (features.length === 0) {
      // console.log("getCurrentGeometry: No features");
      return null;
    }

    const format = new GeoJSON();

    if (features.length === 1) {
      // console.log("getCurrentGeometry: Processing single feature");
      const feature = features[0];
      const geometry = feature.getGeometry();

      if (geometry instanceof Polygon) {
        // console.log("getCurrentGeometry: Single Polygon found");
        const geoJsonGeometry = format.writeGeometryObject(geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as GeoJSON.Polygon;

        const result = {
          type: "MultiPolygon",
          coordinates: [geoJsonGeometry.coordinates],
        };
        // console.log("getCurrentGeometry: Returning MultiPolygon with 1 polygon", result);
        return result;
      } else if (geometry instanceof MultiPolygon) {
        // console.log("getCurrentGeometry: Single MultiPolygon found");
        const result = format.writeGeometryObject(geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as GeoJSON.MultiPolygon;
        // console.log("getCurrentGeometry: Returning MultiPolygon", result);
        return result;
      } else {
        // console.log("getCurrentGeometry: Unknown geometry type:", geometry?.getType());
      }
    } else if (features.length > 1) {
      // console.log("getCurrentGeometry: Processing multiple features");
      // Multiple features - combine into MultiPolygon
      const polygonCoordinates: number[][][] = [];

      features.forEach((feature) => {
        const geometry = feature.getGeometry();
        if (geometry instanceof Polygon) {
          const geoJsonGeometry = format.writeGeometryObject(geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }) as GeoJSON.Polygon;
          polygonCoordinates.push(geoJsonGeometry.coordinates);
        }
      });

      if (polygonCoordinates.length > 0) {
        return {
          type: "MultiPolygon",
          coordinates: polygonCoordinates,
        };
      }
    }

    // console.log("getCurrentGeometry: Returning null");
    return null;
  };

  const updateAOIWithGeometry = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null, sourceAction: string) => {
    // console.log(`AOI updated via ${sourceAction}. Geometry:`, geometry ? "present" : "cleared", geometry);
    // console.log(`Current hasAOI before update:`, hasAOI);
    // console.log(`Will set hasAOI to:`, !!geometry);

    currentAOIRef.current = geometry;
    setHasAOI(!!geometry);

    if (onAOIChange) {
      onAOIChange(geometry);
    }

    // console.log(`hasAOI state should now be:`, !!geometry);
  };

  // Add this useEffect to debug hasAOI changes
  useEffect(() => {
    // console.log(`hasAOI state changed to:`, hasAOI);
    // console.log(`Current features in source:`, aoiLayerRef.current?.getSource()?.getFeatures().length || 0);
    // console.log(`Current geometry in ref:`, currentAOIRef.current ? "present" : "null");
  }, [hasAOI]);

  const clearInteractions = () => {
    if (mapInstanceRef.current) {
      if (drawInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
        console.log("Draw interaction removed");
      }
      if (selectInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(selectInteractionRef.current);
        selectInteractionRef.current = null;
        console.log("Select interaction removed");
      }
      if (modifyInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
        console.log("Modify interaction removed");
      }
    }
  };

  // Load existing AOI when data is available
  useEffect(() => {
    if (!aoiLayerRef.current || !mapInstanceRef.current) {
      // console.log("Map or AOI layer not ready yet for AOI loading.");
      return;
    }
    const source = aoiLayerRef.current.getSource();
    if (!source) {
      // console.log("AOI source not ready.");
      return;
    }

    if (isAOILoading) {
      // console.log("AOI data is loading...");
      return;
    }

    // console.log("useEffect for AOI load: isAOILoading is false. Current aoiData:", aoiData);
    source.clear();
    let loadedGeometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null = null;

    if (aoiData && aoiData.geometry) {
      try {
        const format = new GeoJSON();
        loadedGeometry = aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;

        // Handle MultiPolygon by creating separate features for each polygon
        if (loadedGeometry.type === "MultiPolygon") {
          loadedGeometry.coordinates.forEach((polygonCoords) => {
            const polygonGeometry: GeoJSON.Polygon = {
              type: "Polygon",
              coordinates: polygonCoords,
            };

            const feature = format.readFeature(polygonGeometry, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            });

            if (feature && feature.getGeometry()) {
              source.addFeature(feature);
            }
          });
          // console.log(`Loaded MultiPolygon with ${loadedGeometry.coordinates.length} polygons`);
        } else if (loadedGeometry.type === "Polygon") {
          // Handle single Polygon
          const feature = format.readFeature(loadedGeometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          if (feature && feature.getGeometry()) {
            source.addFeature(feature);
          }
          // console.log("Loaded single Polygon");
        }

        // console.log("Existing AOI feature(s) added to map source:", loadedGeometry);
      } catch (error) {
        // console.error("Error processing existing AOI feature:", error);
        loadedGeometry = null;
      }
    } else {
      // console.log("No existing AOI data found after loading or aoiData.geometry is null/undefined.");
    }

    updateAOIWithGeometry(loadedGeometry, "initialLoad");
  }, [aoiData, isAOILoading]);

  // Update opacity effects
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setOpacity(deadwoodOpacity);
    }
  }, [deadwoodOpacity]);

  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setOpacity(droneImageOpacity);
    }
  }, [droneImageOpacity]);

  // Update forest cover layer opacity
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.forestCoverVector) {
      layerRefs.current.forestCoverVector.setOpacity(forestCoverOpacity);
    }
  }, [forestCoverOpacity]);

  // Update map style effect
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.basemap) {
      layerRefs.current.basemap.setSource(
        new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/tiles/512/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
          attributions: "© Mapbox © OpenStreetMap contributors",
        }),
      );
    }
  }, [mapStyle]);

  // Simplified startDrawing - always draws one polygon
  const startDrawing = () => {
    clearInteractions();
    if (!mapInstanceRef.current || !aoiLayerRef.current) return;
    const source = aoiLayerRef.current.getSource();
    if (!source) return;

    const draw = new Draw({
      source: source,
      type: "Polygon",
      style: new Style({
        stroke: new Stroke({
          color: "#ff6b35",
          width: 2,
          lineDash: [5, 5],
        }),
        fill: new Fill({
          color: "rgba(255, 107, 53, 0.1)",
        }),
      }),
    });

    draw.on("drawend", (event) => {
      const drawnFeature = event.feature;
      if (drawnFeature) {
        const geometry = drawnFeature.getGeometry();
        if (geometry instanceof Polygon) {
          // Use a small timeout to ensure OpenLayers has finished processing
          setTimeout(() => {
            clearInteractions();
            setIsDrawing(false);

            const currentGeometry = getCurrentGeometry();
            updateAOIWithGeometry(currentGeometry, "drawEnd");
            message.success("Polygon drawn successfully.");
          }, 10); // Small delay to ensure feature is fully processed
        }
      }
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawing(true);
    setIsEditing(false);
  };

  // Simplified addAnotherPolygon - just calls startDrawing
  const addAnotherPolygon = () => {
    startDrawing();
  };

  // Simplified cancelDrawing
  const cancelDrawing = () => {
    clearInteractions();
    setIsDrawing(false);
    message.info("Drawing cancelled");
  };

  const setupEditingInteractions = () => {
    // This function should only be called if hasAOI is true and a feature exists
    if (!mapInstanceRef.current || !aoiLayerRef.current) return false;
    const source = aoiLayerRef.current.getSource();
    if (!source || source.getFeatures().length === 0) {
      console.warn("setupEditingInteractions: No features in source to edit.");
      return false;
    }

    clearInteractions(); // Clear previous interactions (like draw)

    const select = new Select({
      condition: click,
      layers: [aoiLayerRef.current],
      style: new Style({
        stroke: new Stroke({ color: "#00FFFF", width: 3 }),
        fill: new Fill({ color: "rgba(0, 255, 255, 0.1)" }),
      }),
    });

    // Track selected features
    select.on("select", (event) => {
      const selectedFeatures = event.target.getFeatures();
      if (selectedFeatures.getLength() > 0) {
        setSelectedFeatureForEdit(selectedFeatures.item(0));
        // console.log("Feature selected for editing");
      } else {
        setSelectedFeatureForEdit(null);
        // console.log("No feature selected");
      }
    });

    const modify = new Modify({
      features: select.getFeatures(),
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: "#00FFFF" }),
          stroke: new Stroke({ color: "white", width: 1 }),
        }),
      }),
    });

    modify.on("modifyend", (event) => {
      // Get the complete geometry from all features in the source
      // This ensures we capture all polygons, not just the modified one
      const currentGeometry = getCurrentGeometry();

      if (currentGeometry) {
        updateAOIWithGeometry(currentGeometry, "modifyEndSuccess");
        // console.log("Modified polygon. Updated complete geometry:", currentGeometry);
      } else {
        console.warn("modify.on('modifyend'): Failed to get current geometry from source");
        updateAOIWithGeometry(currentAOIRef.current, "modifyEndFallback");
      }
    });

    mapInstanceRef.current.addInteraction(select);
    mapInstanceRef.current.addInteraction(modify);
    selectInteractionRef.current = select;
    modifyInteractionRef.current = modify;
    // console.log("Editing interactions (select, modify) added.");
    return true;
  };

  // Add function to delete selected polygon
  const deleteSelectedPolygon = () => {
    if (!selectedFeatureForEdit || !aoiLayerRef.current) {
      message.error("No polygon selected for deletion.");
      return;
    }

    const source = aoiLayerRef.current.getSource();
    if (!source) return;

    // Remove the selected feature from the source
    source.removeFeature(selectedFeatureForEdit);
    setSelectedFeatureForEdit(null);

    // Update the geometry with remaining features
    const currentGeometry = getCurrentGeometry();
    updateAOIWithGeometry(currentGeometry, "deleteSelectedPolygon");

    if (currentGeometry) {
      message.success("Selected polygon deleted.");
    } else {
      // If no polygons left, exit editing mode
      setIsEditing(false);
      clearInteractions();
      message.success("Last polygon deleted. Exiting edit mode.");
    }
  };

  const startEditing = () => {
    if (!hasAOI) {
      message.error("No AOI to edit.");
      return;
    }
    setIsDrawing(false); // Ensure not in drawing mode
    setSelectedFeatureForEdit(null); // Reset selected feature
    if (setupEditingInteractions()) {
      setIsEditing(true);
      message.info("Click on a polygon to select and edit it.");
    } else {
      message.error("Could not start editing. AOI feature might be missing.");
    }
  };

  const saveEditing = () => {
    // Geometry should already be updated in currentAOIRef.current by modifyend
    clearInteractions();
    setIsEditing(false);
    setSelectedFeatureForEdit(null); // Reset selected feature
    message.success("AOI edits applied. Save audit to persist.");
    // console.log("saveEditing called. Current AOI in ref:", currentAOIRef.current);
  };

  const cancelEditing = () => {
    clearInteractions();
    setIsEditing(false);
    setSelectedFeatureForEdit(null); // Reset selected feature

    // Reload original AOI from aoiData if user cancels edit
    if (aoiData && aoiData.geometry) {
      const source = aoiLayerRef.current?.getSource();
      source?.clear();

      try {
        const format = new GeoJSON();
        const loadedGeometry = aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;

        // Use the same logic as initial loading to handle MultiPolygon correctly
        if (loadedGeometry.type === "MultiPolygon") {
          loadedGeometry.coordinates.forEach((polygonCoords) => {
            const polygonGeometry: GeoJSON.Polygon = {
              type: "Polygon",
              coordinates: polygonCoords,
            };

            const feature = format.readFeature(polygonGeometry, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            });

            if (feature && feature.getGeometry()) {
              source.addFeature(feature);
            }
          });
          // console.log(`Restored MultiPolygon with ${loadedGeometry.coordinates.length} polygons`);
        } else if (loadedGeometry.type === "Polygon") {
          // Handle single Polygon
          const feature = format.readFeature(loadedGeometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          if (feature && feature.getGeometry()) {
            source.addFeature(feature);
          }
          // console.log("Restored single Polygon");
        }

        updateAOIWithGeometry(aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon, "cancelEditingRestore");
      } catch (error) {
        // console.error("Error restoring AOI after cancel:", error);
      }
    } else {
      // console.log("cancelEditing: No original aoiData to restore or geometry was null.");
    }

    message.info("Editing cancelled.");
  };

  const deleteAOI = () => {
    clearInteractions();
    const source = aoiLayerRef.current?.getSource();
    source?.clear();
    updateAOIWithGeometry(null, "deleteAOI");
    setIsEditing(false);
    setIsDrawing(false);
    message.success("AOI deleted.");
  };

  // useEffect for unmount cleanup
  useEffect(() => {
    return () => {
      // console.log("DatasetAuditMap unmounting. Cleaning up interactions.");
      clearInteractions(); // Use the clearInteractions helper

      // Also, ensure the map target is undefined to help with OpenLayers cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null; // Help GC
        // console.log("Map instance cleaned up.");
      }
      // You might also want to explicitly clear layer sources if not handled by OL's map disposal
      // if (aoiLayerRef.current) {
      //   aoiLayerRef.current.getSource()?.clear();
      // }
      // ... any other specific OpenLayers cleanup ...
    };
  }, []); // Empty dependency array means this runs only on mount and unmount

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* Simplified AOI Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        {!isDrawing && !isEditing && !hasAOI && !isAOILoading && (
          <Button type="primary" icon={<EditOutlined />} onClick={startDrawing} size="small">
            Draw Polygon
          </Button>
        )}

        {isDrawing && (
          <div className="flex flex-col gap-1">
            <div className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Drawing polygon...</div>
            <Button onClick={cancelDrawing} size="small" danger>
              Cancel Drawing
            </Button>
          </div>
        )}

        {hasAOI && !isEditing && !isDrawing && (
          <div className="flex flex-col gap-1">
            <div className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
              ✓ AOI {aoiData ? "Loaded" : "Defined"}
              {/* Show polygon count */}
              {currentAOIRef.current?.type === "MultiPolygon" && (
                <div className="text-xs">
                  ({currentAOIRef.current.coordinates.length} polygon
                  {currentAOIRef.current.coordinates.length !== 1 ? "s" : ""})
                </div>
              )}
            </div>
            <div className="flex gap-1 rounded-sm bg-slate-100 p-1">
              <Button icon={<EditOutlined />} onClick={startEditing} size="small" title="Edit polygons">
                Edit
              </Button>
              <Button icon={<EditOutlined />} onClick={addAnotherPolygon} size="small" title="Add another polygon">
                Add Another
              </Button>
              <Button icon={<DeleteOutlined />} onClick={deleteAOI} size="small" danger title="Delete all polygons">
                Delete all
              </Button>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col gap-1">
            <div className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
              {selectedFeatureForEdit ? "Polygon selected - edit or delete it" : "Click polygon to select..."}
            </div>
            <div className="flex gap-1 rounded-sm bg-slate-100 p-1">
              <Button icon={<SaveOutlined />} onClick={saveEditing} size="small" type="primary" title="Save changes">
                Save
              </Button>
              <Button icon={<CloseOutlined />} onClick={cancelEditing} size="small" title="Cancel editing">
                Cancel
              </Button>

              {selectedFeatureForEdit && (
                // <div className="mt-1 flex gap-1">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={deleteSelectedPolygon}
                  size="small"
                  danger
                  title="Delete selected"
                  className="w-full"
                >
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        )}

        {isAOILoading && <div className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Loading AOI...</div>}
      </div>

      <div className="absolute left-2 top-4 z-20">
        <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
      </div>

      <div className="absolute bottom-4 right-6 z-50">
        <DeadwoodCardDetails
          deadwoodOpacity={deadwoodOpacity}
          setDeadwoodOpacity={setDeadwoodOpacity}
          droneImageOpacity={droneImageOpacity}
          setDroneImageOpacity={setDroneImageOpacity}
          forestCoverOpacity={forestCoverOpacity}
          setForestCoverOpacity={setForestCoverOpacity}
          showLegend={labelData ? true : false}
          showForestCoverLegend={forestCoverLabelData ? true : false}
        />
      </div>
    </div>
  );
};

export default DatasetAuditMap;
