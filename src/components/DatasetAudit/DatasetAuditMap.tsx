import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import { Layer } from "ol/layer";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "../DatasetDetailsMap/DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer } from "../DatasetDetailsMap/createVectorLayer";
import { useDatasetLabels } from "../../hooks/useDatasetLabels";
import { ILabelData } from "../../types/labels";

interface DatasetAuditMapProps {
  dataset: IDataset;
}

const DatasetAuditMap = ({ dataset }: DatasetAuditMapProps) => {
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("AerialWithLabelsOnDemand");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);

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
    deadwoodVector?: Layer;
  }>({});

  // Initialize the map and layers
  useEffect(() => {
    if (!mapRef.current && dataset?.file_name && !isLoadingLabel) {
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

      // Create basemap layer
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
                layers: [basemapLayer, orthoCogLayer, deadwoodVectorLayer],
                view: MapView,
                controls: [],
              });

              // Fit view to extent
              MapView.fit(viewOptions.extent);

              mapRef.current = newMap;
            }
          })
          .catch((error) => {
            console.error("Error initializing map:", error);
          });
      }
    }

    return () => {
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
  }, [dataset, isLoadingLabel, labelData, mapStyle]);

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
      </div>
    </div>
  );
};

export default DatasetAuditMap;
