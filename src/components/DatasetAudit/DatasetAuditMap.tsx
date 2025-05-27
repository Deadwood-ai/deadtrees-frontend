import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
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
import { Polygon } from "ol/geom";
import { Style, Stroke, Fill, Circle } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import { click } from "ol/events/condition";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "../DatasetDetailsMap/DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer } from "../DatasetDetailsMap/createVectorLayer";
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

  const [mapStyle, setMapStyle] = useState("AerialWithLabelsOnDemand");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);

  // Only use state for UI controls that need to trigger re-renders
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasAOI, setHasAOI] = useState(false);

  // Fetch label data for the current dataset
  const { data: labelData } = useDatasetLabels({
    datasetId: dataset?.id,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });

  // Get existing AOI data
  const { data: aoiData, isLoading: isAOILoading } = useDatasetAOI(dataset.id);

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<BingMaps>;
    orthoCog?: TileLayerWebGL;
    deadwoodVector?: Layer;
    aoiVector?: VectorLayer<VectorSource>;
  }>({});

  // Initialize the map and layers
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log("Initializing map for dataset:", dataset?.file_name);

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
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
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

      // Create deadwood vector layer if labels exist
      const deadwoodVectorLayer = labelData ? createDeadwoodVectorLayer(labelData?.id) : null;

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer || undefined,
        deadwoodVector: deadwoodVectorLayer || undefined,
        aoiVector: aoiLayer,
      };

      // Create layers array
      const layers = [basemapLayer, aoiLayer];
      if (orthoCogLayer) layers.splice(1, 0, orthoCogLayer);
      if (deadwoodVectorLayer) layers.push(deadwoodVectorLayer);

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

      // If we have an ortho layer, fit to its extent when ready
      if (orthoCogLayer) {
        const source = orthoCogLayer.getSource();
        if (source) {
          source
            .getView()
            .then((viewOptions) => {
              if (viewOptions?.extent && mapInstanceRef.current) {
                mapInstanceRef.current.getView().fit(viewOptions.extent);
              }
            })
            .catch((error) => {
              console.error("Error getting ortho extent:", error);
            });
        }
      }

      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (mapInstanceRef.current) {
        console.log("Cleaning up map");

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
  }, [dataset, mapStyle]);

  // SIMPLIFIED: Get current geometry from the map layer directly
  const getCurrentGeometry = (): GeoJSON.MultiPolygon | GeoJSON.Polygon | null => {
    if (!aoiLayerRef.current) return null;

    const source = aoiLayerRef.current.getSource();
    if (!source) return null;

    const features = source.getFeatures();
    if (features.length === 0) return null;

    const feature = features[0];
    const geometry = feature.getGeometry();

    if (geometry instanceof Polygon) {
      const format = new GeoJSON();
      const geoJsonGeometry = format.writeGeometryObject(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }) as GeoJSON.Polygon;

      return {
        type: "MultiPolygon",
        coordinates: [geoJsonGeometry.coordinates],
      };
    }

    return null;
  };

  const updateAOIWithGeometry = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null, sourceAction: string) => {
    currentAOIRef.current = geometry;
    setHasAOI(!!geometry);
    if (onAOIChange) {
      onAOIChange(geometry);
    }
    console.log(`AOI updated via ${sourceAction}. Geometry:`, geometry ? "present" : "cleared", geometry);
  };

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
      console.log("Map or AOI layer not ready yet for AOI loading.");
      return;
    }
    const source = aoiLayerRef.current.getSource();
    if (!source) {
      console.log("AOI source not ready.");
      return;
    }

    if (isAOILoading) {
      console.log("AOI data is loading...");
      return;
    }

    console.log("useEffect for AOI load: isAOILoading is false. Current aoiData:", aoiData);
    source.clear();
    let loadedGeometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null = null;

    if (aoiData && aoiData.geometry) {
      // Ensure aoiData and its geometry exist
      try {
        const format = new GeoJSON();
        const feature = format.readFeature(aoiData.geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });
        if (feature && feature.getGeometry()) {
          // Ensure feature and its geometry are valid
          source.addFeature(feature);
          loadedGeometry = aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;
          console.log("Existing AOI feature added to map source:", loadedGeometry);
        } else {
          console.warn("Failed to read feature or feature geometry from aoiData.");
        }
      } catch (error) {
        console.error("Error processing existing AOI feature:", error);
      }
    } else {
      console.log("No existing AOI data found after loading or aoiData.geometry is null/undefined.");
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

  const startDrawing = () => {
    clearInteractions(); // Remove any existing interactions (like edit)
    if (!mapInstanceRef.current || !aoiLayerRef.current) return;
    const source = aoiLayerRef.current.getSource();
    if (!source) return;
    if (hasAOI && !isEditing) {
      // If AOI exists and not editing, don't allow new draw
      message.info("An AOI already exists. Edit or delete it first.");
      return;
    }
    source.clear(); // Clear existing AOI before drawing a new one
    updateAOIWithGeometry(null, "startDrawingClear");

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
      clearInteractions(); // Remove draw interaction itself
      setIsDrawing(false); // Add this line to update the drawing state

      const drawnFeature = event.feature;
      if (drawnFeature) {
        const geometry = drawnFeature.getGeometry();
        if (geometry instanceof Polygon) {
          // The feature is already on the source from the Draw interaction
          const format = new GeoJSON();
          const geoJsonGeom = format.writeGeometryObject(geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }) as GeoJSON.Polygon;
          const multiPolyGeom: GeoJSON.MultiPolygon = { type: "MultiPolygon", coordinates: [geoJsonGeom.coordinates] };
          updateAOIWithGeometry(multiPolyGeom, "drawEnd");
          message.success("AOI drawn successfully.");
        } else {
          updateAOIWithGeometry(null, "drawEndError");
        }
      } else {
        updateAOIWithGeometry(null, "drawEndNoFeature");
      }
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawing(true);
    setIsEditing(false);
  };

  const cancelDrawing = () => {
    clearInteractions();
    setIsDrawing(false);
    // Clear any partial drawing
    const source = aoiLayerRef.current?.getSource();
    source?.clear();
    updateAOIWithGeometry(null, "cancelDrawing");
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
      const modifiedFeature = event.features.getArray()[0];
      let newGeometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null = null;

      if (modifiedFeature) {
        const geometry = modifiedFeature.getGeometry(); // This is an OpenLayers Geometry
        if (geometry) {
          const format = new GeoJSON();
          // Convert OL Geometry to GeoJSON object.
          // writeGeometryObject can handle various OL geometry types.
          const geoJsonGeomObject = format.writeGeometryObject(geometry, {
            dataProjection: "EPSG:4326", // We want the output in WGS84
            featureProjection: "EPSG:3857", // The map's projection
          });

          // Ensure it's a Polygon or MultiPolygon for our state
          if (geoJsonGeomObject.type === "Polygon") {
            newGeometry = { type: "MultiPolygon", coordinates: [(geoJsonGeomObject as GeoJSON.Polygon).coordinates] };
          } else if (geoJsonGeomObject.type === "MultiPolygon") {
            newGeometry = geoJsonGeomObject as GeoJSON.MultiPolygon;
          } else {
            console.warn(
              "modify.on('modifyend'): Modified geometry is not Polygon or MultiPolygon, it's:",
              geoJsonGeomObject.type,
            );
          }
        } else {
          console.warn("modify.on('modifyend'): Modified feature has no geometry.");
        }
      } else {
        console.warn("modify.on('modifyend'): No modified feature in event.");
      }

      if (newGeometry) {
        updateAOIWithGeometry(newGeometry, "modifyEndSuccess");
      } else {
        // Fallback: update with whatever was in the ref before, or null if ref was null.
        // This prevents clearing a valid AOI if the event processing above fails unexpectedly.
        console.warn("modify.on('modifyend'): Failed to get new geometry, falling back to current ref or null.");
        updateAOIWithGeometry(currentAOIRef.current, "modifyEndFallback");
      }
    });

    mapInstanceRef.current.addInteraction(select);
    mapInstanceRef.current.addInteraction(modify);
    selectInteractionRef.current = select;
    modifyInteractionRef.current = modify;
    console.log("Editing interactions (select, modify) added.");
    return true;
  };

  const startEditing = () => {
    if (!hasAOI) {
      message.error("No AOI to edit.");
      return;
    }
    setIsDrawing(false); // Ensure not in drawing mode
    if (setupEditingInteractions()) {
      setIsEditing(true);
      message.info("AOI selected. Modify it and click Save/Cancel.");
    } else {
      message.error("Could not start editing. AOI feature might be missing.");
    }
  };

  const saveEditing = () => {
    // Geometry should already be updated in currentAOIRef.current by modifyend
    clearInteractions();
    setIsEditing(false);
    message.success("AOI edits applied. Save audit to persist.");
    console.log("saveEditing called. Current AOI in ref:", currentAOIRef.current);
  };

  const cancelEditing = () => {
    clearInteractions();
    setIsEditing(false);
    // Reload original AOI from aoiData if user cancels edit
    if (aoiData && aoiData.geometry) {
      const source = aoiLayerRef.current?.getSource();
      source?.clear();
      const format = new GeoJSON();
      const feature = format.readFeature(aoiData.geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      source?.addFeature(feature);
      updateAOIWithGeometry(aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon, "cancelEditingRestore");
    } else {
      // If there was no original aoiData (e.g. drawing a new one and cancelling edit on it)
      // Or handle as appropriate - maybe clear it or leave as is.
      // For now, just log. If it was a new drawing, it might have been cleared by startDrawing.
      console.log("cancelEditing: No original aoiData to restore or geometry was null.");
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
      console.log("DatasetAuditMap unmounting. Cleaning up interactions.");
      clearInteractions(); // Use the clearInteractions helper

      // Also, ensure the map target is undefined to help with OpenLayers cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null; // Help GC
        console.log("Map instance cleaned up.");
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

      {/* AOI Controls - Updated button logic */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        {!isDrawing && !isEditing && !hasAOI && !isAOILoading && (
          <Button type="primary" icon={<EditOutlined />} onClick={startDrawing} size="small">
            Draw AOI
          </Button>
        )}

        {isDrawing && (
          <Button onClick={cancelDrawing} size="small" danger>
            Cancel Drawing
          </Button>
        )}

        {hasAOI && !isEditing && !isDrawing && (
          <div className="flex flex-col gap-1">
            <div className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
              ✓ AOI {aoiData ? "Loaded" : "Defined"}
            </div>
            <div className="flex gap-1">
              <Button icon={<EditOutlined />} onClick={startEditing} size="small" title="Edit AOI">
                Edit
              </Button>
              <Button icon={<DeleteOutlined />} onClick={deleteAOI} size="small" danger title="Delete AOI">
                Delete
              </Button>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col gap-1">
            <div className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">Editing AOI...</div>
            <div className="flex gap-1">
              <Button icon={<SaveOutlined />} onClick={saveEditing} size="small" type="primary" title="Save changes">
                Save
              </Button>
              <Button icon={<CloseOutlined />} onClick={cancelEditing} size="small" title="Cancel editing">
                Cancel
              </Button>
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
          showLegend={labelData ? true : false}
        />
      </div>
    </div>
  );
};

export default DatasetAuditMap;
