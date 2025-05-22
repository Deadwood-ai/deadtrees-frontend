import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import { Style, Fill, Stroke } from "ol/style";
import { Draw, Modify, Snap } from "ol/interaction";
import GeoJSON from "ol/format/GeoJSON";
import { Button, Tooltip, message } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "../DatasetDetailsMap/DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer } from "../DatasetDetailsMap/createVectorLayer";
import { useDatasetLabels } from "../../hooks/useDatasetLabels";
import { ILabelData } from "../../types/labels";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { Layer } from "ol/layer";
import { useAOI } from "../../contexts/AOIContext";

interface DatasetAuditMapProps {
  dataset: IDataset;
  onAOIChange: (multiPolygon: GeoJSON.MultiPolygon) => void;
  initialAOI: GeoJSON.MultiPolygon | null;
}

const DatasetAuditMap = ({ dataset, onAOIChange, initialAOI }: DatasetAuditMapProps) => {
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [hasPolygon, setHasPolygon] = useState<boolean>(false);
  const aoiFeatureRef = useRef<Feature | null>(null);
  const { setHasUnsavedChanges } = useAOI();

  // Fetch label data for the current dataset
  const { data: labelData, isLoading: isLoadingLabel } = useDatasetLabels({
    datasetId: dataset?.id,
    labelData: ILabelData.DEADWOOD,
    enabled: !!dataset?.id,
  });

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<BingMaps>;
    orthoCog?: TileLayerWebGL;
    vectorAOI?: VectorLayer<VectorSource<Feature<Geometry>>>;
    deadwoodVector?: Layer; // Use generic Layer type to avoid specific VectorLayer type checking
  }>({});

  // Create the AOI vector source and layer
  const createAOIVectorLayer = () => {
    const source = new VectorSource<Feature<Geometry>>();
    const layer = new VectorLayer<VectorSource<Feature<Geometry>>>({
      source: source,
      style: new Style({
        fill: new Fill({
          color: "rgba(100, 150, 255, 0.2)",
        }),
        stroke: new Stroke({
          color: "rgba(20, 100, 240, 1)",
          width: 2.5,
        }),
      }),
    });

    return { source, layer };
  };

  // Initialize the map and layers
  useEffect(() => {
    if (!mapRef.current && dataset?.file_name && !isLoadingLabel) {
      // Create the AOI vector layer
      const { source: aoiSource, layer: aoiLayer } = createAOIVectorLayer();

      // Create ortho layer first
      const orthoCogLayer = new TileLayerWebGL({
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

      // Create all other layers before map initialization
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      // Only create deadwood vector layer if labels exist
      const deadwoodVectorLayer = createDeadwoodVectorLayer(labelData?.id);

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        vectorAOI: aoiLayer,
        deadwoodVector: deadwoodVectorLayer,
      };

      // Wait for the source to be ready and create map
      const source = orthoCogLayer.getSource();
      if (source) {
        source
          .getView()
          .then((viewOptions) => {
            if (!viewOptions?.extent) {
              return;
            }

            // Initialize map view
            const MapView = new View({
              center: viewOptions.center,
              zoom: undefined,
              extent: viewOptions.extent,
              maxZoom: 22,
              projection: "EPSG:3857",
              constrainOnlyCenter: true,
            });

            if (mapContainer.current) {
              const newMap = new Map({
                target: mapContainer.current,
                layers: [basemapLayer, orthoCogLayer, deadwoodVectorLayer, aoiLayer],
                view: MapView,
                controls: [],
              });

              // Fit view to extent
              MapView.fit(viewOptions.extent);

              mapRef.current = newMap;

              // Load initial AOI if provided
              if (initialAOI) {
                try {
                  const format = new GeoJSON();
                  const features = format.readFeatures(initialAOI, {
                    featureProjection: "EPSG:3857",
                  });

                  if (features && features.length > 0) {
                    aoiSource.addFeatures(features);
                    aoiFeatureRef.current = features[0];
                    setHasPolygon(true);
                  }
                } catch (error) {
                  console.error("Error loading initial AOI:", error);
                  message.error("Failed to load the Area of Interest");
                }
              }
            }
          })
          .catch((error) => {
            console.error("Error initializing map:", error);
          });
      }
    }

    return () => {
      // Preserve the AOI state in the parent component (DatasetAuditDetail)
      // We only need to clean up the interactions and map resources

      // Clear drawing interactions if they exist
      if (drawInteractionRef.current && mapRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }

      if (modifyInteractionRef.current && mapRef.current) {
        mapRef.current.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
      }

      if (snapInteractionRef.current && mapRef.current) {
        mapRef.current.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }

      if (mapRef.current) {
        // Clean up layers
        Object.values(layerRefs.current).forEach((layer) => {
          if (layer) {
            mapRef.current?.removeLayer(layer);
            // Safely access source and dispose methods
            try {
              const source = layer.getSource();
              if (source) {
                if ("clear" in source && typeof source.clear === "function") {
                  source.clear();
                }
                if ("dispose" in source && typeof source.dispose === "function") {
                  source.dispose();
                }
              }
              if (typeof layer.dispose === "function") {
                layer.dispose();
              }
            } catch (error) {
              console.error("Error during layer cleanup:", error);
            }
          }
        });

        // Clear layer references
        layerRefs.current = {};

        // Clean up map
        mapRef.current.setTarget(undefined);
        mapRef.current.dispose();
        mapRef.current = null;
      }
    };
  }, [dataset, isLoadingLabel, labelData, initialAOI]);

  // Update opacity effects
  useEffect(() => {
    if (mapRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setOpacity(deadwoodOpacity);
    }
  }, [deadwoodOpacity]);

  useEffect(() => {
    if (mapRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setOpacity(droneImageOpacity);
    }
  }, [droneImageOpacity]);

  // Update the map style effect
  useEffect(() => {
    if (mapRef.current && layerRefs.current.basemap) {
      const currentView = mapRef.current.getView();
      const currentCenter = currentView.getCenter();
      const currentZoom = currentView.getZoom();

      // Just update the source, don't recreate the map
      layerRefs.current.basemap.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      );

      // Ensure the viewport stays the same
      if (currentCenter && currentZoom) {
        currentView.setCenter(currentCenter);
        currentView.setZoom(currentZoom);
      }
    }
  }, [mapStyle]);

  // Update initialAOI when it changes from context
  useEffect(() => {
    if (mapRef.current && layerRefs.current.vectorAOI && initialAOI) {
      try {
        const source = layerRefs.current.vectorAOI.getSource();
        if (source) {
          // Clear any existing features
          source.clear();

          // Add the initialAOI features
          const format = new GeoJSON();
          const features = format.readFeatures(initialAOI, {
            featureProjection: "EPSG:3857",
          });

          if (features && features.length > 0) {
            source.addFeatures(features);
            aoiFeatureRef.current = features[0];
            setHasPolygon(true);
          }
        }
      } catch (error) {
        console.error("Error updating map with initialAOI:", error);
      }
    }
  }, [initialAOI]);

  // Function to safely convert a feature to GeoJSON and ensure MultiPolygon format
  const featureToGeoJSON = (feature: Feature): GeoJSON.MultiPolygon | null => {
    try {
      const format = new GeoJSON();
      const geojson = format.writeFeatureObject(feature);
      const geometry = geojson.geometry;

      // Handle both polygon and multipolygon types
      if (geometry.type === "Polygon") {
        // Convert polygon to multipolygon
        return {
          type: "MultiPolygon",
          coordinates: [geometry.coordinates],
        };
      } else if (geometry.type === "MultiPolygon") {
        return geometry as GeoJSON.MultiPolygon;
      }
      return null;
    } catch (error) {
      console.error("Error converting feature to GeoJSON:", error);
      return null;
    }
  };

  // Toggle drawing mode
  const toggleDrawingMode = () => {
    if (!mapRef.current || !layerRefs.current.vectorAOI) return;

    if (drawingMode) {
      // Turn off drawing mode
      if (drawInteractionRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }

      if (modifyInteractionRef.current) {
        mapRef.current.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
      }

      if (snapInteractionRef.current) {
        mapRef.current.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }

      setDrawingMode(false);
      // Don't clear the AOI when exiting drawing mode
    } else {
      // Turn on drawing mode
      const source = layerRefs.current.vectorAOI.getSource();
      if (!source) return;

      // Add drawing interaction
      const drawInteraction = new Draw({
        source: source,
        type: "Polygon", // Use Polygon instead of MultiPolygon for easier drawing
      });

      drawInteraction.on("drawstart", () => {
        // Only clear existing features if we're drawing a new polygon
        if (source.getFeatures().length > 0) {
          source.clear();
          aoiFeatureRef.current = null;
        }
      });

      drawInteraction.on("drawend", (event) => {
        try {
          // Store a reference to the drawn feature
          aoiFeatureRef.current = event.feature;
          setHasPolygon(true);

          // Notify parent component about the change
          const geojson = featureToGeoJSON(event.feature);
          if (geojson) {
            onAOIChange(geojson);
            // Track that we have unsaved changes
            setHasUnsavedChanges(true);
          }
        } catch (error) {
          console.error("Error handling draw end:", error);
          message.error("Failed to process the drawn area");
        }
      });

      // Add modify interaction
      const modifyInteraction = new Modify({
        source: source,
      });

      modifyInteraction.on("modifyend", () => {
        // Update the AOI when modifications are done
        if (source.getFeatures().length > 0) {
          const feature = source.getFeatures()[0];
          aoiFeatureRef.current = feature;

          // Notify parent about the change
          const geojson = featureToGeoJSON(feature);
          if (geojson) {
            onAOIChange(geojson);
            // Track that we have unsaved changes
            setHasUnsavedChanges(true);
          }
        }
      });

      // Add snap interaction
      const snapInteraction = new Snap({
        source: source,
      });

      // Add interactions to map
      mapRef.current.addInteraction(drawInteraction);
      mapRef.current.addInteraction(modifyInteraction);
      mapRef.current.addInteraction(snapInteraction);

      // Store references
      drawInteractionRef.current = drawInteraction;
      modifyInteractionRef.current = modifyInteraction;
      snapInteractionRef.current = snapInteraction;

      setDrawingMode(true);
      message.info("Draw a polygon by clicking on the map. Double-click to complete.");
    }
  };

  // Clear existing polygon
  const clearPolygon = () => {
    if (!mapRef.current || !layerRefs.current.vectorAOI) return;

    const source = layerRefs.current.vectorAOI.getSource();
    if (source) {
      source.clear();
      aoiFeatureRef.current = null;
      setHasPolygon(false);
      onAOIChange({ type: "MultiPolygon", coordinates: [] });
      // Track that we have unsaved changes when clearing the polygon
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
        ref={mapContainer}
      >
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

        <div className="absolute left-2 top-20 z-20 flex flex-col space-y-2">
          <Tooltip title={drawingMode ? "Finish Drawing" : "Draw AOI"} placement="right">
            <Button
              type={drawingMode ? "primary" : "default"}
              shape="circle"
              icon={<EditOutlined />}
              onClick={toggleDrawingMode}
            />
          </Tooltip>

          {hasPolygon && (
            <Tooltip title="Clear AOI" placement="right">
              <Button danger shape="circle" icon={<DeleteOutlined />} onClick={clearPolygon} />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetAuditMap;
