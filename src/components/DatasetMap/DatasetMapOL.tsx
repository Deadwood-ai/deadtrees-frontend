import { useEffect, useRef, useState } from "react";
import { Collection, Map, View } from "ol";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import "ol/ol.css";
import { fromExtent } from "ol/geom/Polygon.js";

import { useNavigate } from "react-router-dom";

import { IDataset } from "../../types/dataset";
import parseBBox from "../../utils/parseBBox";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Overlay from "ol/Overlay";
import Select from "ol/interaction/Select.js";

import "./tooltip.css";

const DatasetMapOL = ({ data }: { data: IDataset[] }) => {
  const navigate = useNavigate();

  const [map, setMap] = useState<Map | null>(null);
  const [vectorLayerExtend, setVectorLayerExtend] = useState<VectorLayer | null>(null);
  const [vectorLayerMarker, setVectorLayerMarker] = useState<VectorLayer | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const mapContainer = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!map) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      const newMap = new Map({
        target: mapContainer.current as HTMLElement,
        layers: [basemapLayer],
        controls: [],
        view: new View({
          center: [0, 0],
          zoom: 2,
        }),
      });

      setMap(newMap);
      const defaultExtendStyle = new Style({
        fill: new Fill({
          color: [0, 0, 255, 0.4],
        }),
        stroke: new Stroke({
          color: "black",
          width: 1,
        }),
      });
      
      const hoverExtendStyle = new Style({
        fill: new Fill({
          color: [0, 0, 255, 0.5],
        }),
        stroke: new Stroke({
          color: "white",
          width: 4,
        }),
      });
      
      const defaultMarkerStyle = new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({
            color: [0, 0, 255, 0.5],
          }),
          stroke: new Stroke({
            color: "black",
            width: 2,
          }),
        }),
      });
      
      const hoverMarkerStyle = new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({
            color: [0, 0, 255, 0.5],
          }),
          stroke: new Stroke({
            color: "white",
            width: 4,
          }),
        }),
      });

      const vectorSourceExtend = new VectorSource();
      const vectorLayerExtend = new VectorLayer({
        source: vectorSourceExtend,
      });
      setVectorLayerExtend(vectorLayerExtend);
      newMap.addLayer(vectorLayerExtend);

      const vectorSourceMarker = new VectorSource();
      const vectorLayerMarker = new VectorLayer({
        source: vectorSourceMarker,
      });
      setVectorLayerMarker(vectorLayerMarker);
      newMap.addLayer(vectorLayerMarker);

      // Add the tooltip functionality and select interactions (same as before)
      const element = document.createElement("div");
      element.className = "tooltip hidden";
      const tooltip = new Overlay({
        element: element,
        offset: [0, -50],
        positioning: "top-center",
      });
      newMap.addOverlay(tooltip);

      newMap.on("pointermove", function (evt) {
        if (evt.dragging) return;
        const pixel = newMap.getEventPixel(evt.originalEvent);

        vectorLayerExtend.getSource().getFeatures().forEach((f) => f.setStyle(defaultExtendStyle));
        vectorLayerMarker.getSource().getFeatures().forEach((f) => f.setStyle(defaultMarkerStyle));

        let hoveredFeature = null;
        newMap.forEachFeatureAtPixel(pixel, function (feature) {
          if (!hoveredFeature) {
            hoveredFeature = feature;
            return true;
          }
        });

        if (hoveredFeature) {
          newMap.getTargetElement().style.cursor = "pointer";
          hoveredFeature.setStyle(hoveredFeature.getGeometry() instanceof Polygon ? hoverExtendStyle : hoverMarkerStyle);
          const coordinate = evt.coordinate;
          tooltip.setPosition(coordinate);
          tooltip.getElement().innerHTML = hoveredFeature.get("title");
          tooltip.getElement().classList.remove("hidden");
        } else {
          newMap.getTargetElement().style.cursor = "";
          tooltip.getElement().classList.add("hidden");
        }
      });

      const selectOnClick = new Select({
        condition: (event) => event.type === "pointerup",
      });

      newMap.addInteraction(selectOnClick);
      selectOnClick.on("select", function (e) {
        const selectedFeatures = e.selected;
        if (selectedFeatures.length > 0) {
          const feature = selectedFeatures[0];
          const id = feature.get("id");
          navigate(`/dataset/${id}`);
        }
      });

      return () => {
        if (map) map.setTarget(null);
      };
    }
  }, [map, mapStyle, navigate]);

  // Update the map layers when data changes
  useEffect(() => {
    if (vectorLayerExtend && vectorLayerMarker) {
      const vectorSourceExtend = vectorLayerExtend.getSource() as VectorSource;
      const vectorSourceMarker = vectorLayerMarker.getSource() as VectorSource;

      vectorSourceExtend.clear();
      vectorSourceMarker.clear();

      data.forEach((dataset) => {
        if (dataset.bbox) {
          const extentFeature = new Feature(fromExtent(parseBBox(dataset.bbox)).transform("EPSG:4326", "EPSG:3857"));
          extentFeature.setProperties({
            id: dataset.id,
            title: dataset.file_name,
          });
          vectorSourceExtend.addFeature(extentFeature);

          const point = extentFeature.getGeometry().getInteriorPoint();
          const pointFeature = new Feature(point);
          pointFeature.setProperties({
            id: dataset.id,
            title: dataset.file_alias,
          });
          vectorSourceMarker.addFeature(pointFeature);
        }
      });

      if (vectorSourceExtend.getFeatures().length > 0 && map) {
        map.getView().fit(vectorSourceExtend.getExtent(), {
          size: map.getSize(),
          maxZoom: 18,
        });
      }
    }
  }, [data, map, vectorLayerExtend, vectorLayerMarker]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%", borderRadius: 8 }}></div>;
};

export default DatasetMapOL;
