import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import { Layer } from "ol/layer";
import { Button, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Draw } from "ol/interaction";
import { Polygon } from "ol/geom";
import { Style, Stroke, Fill } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";

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
  const [mapStyle, setMapStyle] = useState("AerialWithLabelsOnDemand");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);
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

  // Load existing AOI when data is available
  useEffect(() => {
    if (isAOILoading || !aoiLayerRef.current) return;

    if (aoiData) {
      const source = aoiLayerRef.current.getSource();
      if (!source) return;

      try {
        const format = new GeoJSON();
        const feature = format.readFeature(aoiData.geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });

        source.clear();
        source.addFeature(feature);
        setHasAOI(true);

        // Notify parent component
        if (onAOIChange) {
          onAOIChange(aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon);
        }

        console.log("Existing AOI loaded and displayed");
      } catch (error) {
        console.error("Error loading existing AOI:", error);
        message.error("Failed to load existing AOI");
      }
    } else {
      // No existing AOI
      setHasAOI(false);
      if (onAOIChange) {
        onAOIChange(null);
      }
    }
  }, [aoiData, isAOILoading, onAOIChange]);

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
    if (!mapInstanceRef.current || !aoiLayerRef.current || hasAOI) return;

    const source = aoiLayerRef.current.getSource();
    if (!source) return;

    // Create draw interaction
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
      const feature = event.feature;
      const geometry = feature.getGeometry();

      if (geometry instanceof Polygon) {
        // Convert to GeoJSON
        const format = new GeoJSON();
        const geoJsonGeometry = format.writeGeometryObject(geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as GeoJSON.Polygon;

        // Convert Polygon to MultiPolygon for consistency
        const multiPolygonGeometry: GeoJSON.MultiPolygon = {
          type: "MultiPolygon",
          coordinates: [geoJsonGeometry.coordinates],
        };

        setHasAOI(true);
        setIsDrawing(false);

        // Remove draw interaction
        if (drawInteractionRef.current) {
          mapInstanceRef.current?.removeInteraction(drawInteractionRef.current);
          drawInteractionRef.current = null;
        }

        // Notify parent component
        if (onAOIChange) {
          onAOIChange(multiPolygonGeometry);
        }

        message.success("AOI drawn successfully");
      }
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawing(true);
  };

  const cancelDrawing = () => {
    if (drawInteractionRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
      setIsDrawing(false);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* AOI Controls - Updated */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        {!hasAOI && !isDrawing && !isAOILoading && (
          <Button type="primary" icon={<EditOutlined />} onClick={startDrawing} size="small">
            Draw AOI
          </Button>
        )}

        {isDrawing && (
          <Button onClick={cancelDrawing} size="small">
            Cancel Drawing
          </Button>
        )}

        {hasAOI && (
          <div className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
            ✓ AOI {aoiData ? "Loaded" : "Defined"}
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
