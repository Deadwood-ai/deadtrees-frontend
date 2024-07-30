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
// import { click, singleClick, Pointer } from "ol/events/condition";

const DatasetMapOL = ({ data }: { data: IDataset[] }) => {
  const navigate = useNavigate();

  const [map, setMap] = useState<Map | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map && data.length > 0) {
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

      const vectorSourceExtend = new VectorSource();
      data.forEach((dataset) => {
        if (dataset.bbox) {
          const feature = new Feature(fromExtent(parseBBox(dataset.bbox)).transform("EPSG:4326", "EPSG:3857"));
          feature.setProperties({
            id: dataset.id,
            title: dataset.file_name,
          });
          vectorSourceExtend.addFeature(feature);
        }
      });

      const extendDefaultStyle = new Style({
        fill: new Fill({
          color: [0, 0, 255, 0.4],
        }),
        stroke: new Stroke({
          color: "black",
          width: 1,
        }),
      });

      const extendHoverStyle = new Style({
        fill: new Fill({
          color: [0, 0, 255, 0.5],
        }),
        stroke: new Stroke({
          color: "white",
          width: 4,
        }),
      });

      const vectorLayerExtend = new VectorLayer({
        source: vectorSourceExtend,
        style: extendDefaultStyle,
      });

      const vectorSourceMarker = new VectorSource();
      data.forEach((dataset) => {
        if (dataset.bbox) {
          const featureExtent = new Feature(fromExtent(parseBBox(dataset.bbox)).transform("EPSG:4326", "EPSG:3857"));
          const point = featureExtent.getGeometry().getInteriorPoint();
          const feature = new Feature(point);
          feature.setProperties({
            id: dataset.id,
            title: dataset.file_alias,
          });
          vectorSourceMarker.addFeature(feature);
        }
      });

      const markerDefaultStyle = new Style({
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

      const markerHoverStyle = new Style({
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

      const vectorLayerMarker = new VectorLayer({
        source: vectorSourceMarker,
        style: markerDefaultStyle,
      });

      newMap.addLayer(vectorLayerExtend);
      newMap.addLayer(vectorLayerMarker);

      if (vectorSourceExtend.getFeatures().length > 0) {
        newMap.getView().fit(vectorSourceExtend.getExtent(), {
          size: newMap.getSize(),
          maxZoom: 18,
        });
      }

      const element = document.createElement("div");
      element.className = "tooltip hidden";
      const tooltip = new Overlay({
        element: element,
        offset: [0, -50],
        positioning: "top-center",
      });
      newMap.addOverlay(tooltip);

      newMap.on("pointermove", function (evt) {
        if (evt.dragging) {
          return;
        }
        const pixel = newMap.getEventPixel(evt.originalEvent);
        const feature = newMap.forEachFeatureAtPixel(pixel, function (feature) {
          return feature;
        });

        if (feature) {
          newMap.getTargetElement().style.cursor = "pointer";

          if (feature.getGeometry() instanceof Polygon) {
            feature.setStyle(extendHoverStyle);
          } else {
            feature.setStyle(markerHoverStyle);
          }

          const coordinate = evt.coordinate;
          tooltip.setPosition(coordinate);
          tooltip.getElement().innerHTML = feature.get("title");
          tooltip.getElement().classList.remove("hidden");
        } else {
          newMap.getTargetElement().style.cursor = "";

          vectorLayerExtend
            .getSource()
            .getFeatures()
            .forEach((f) => f.setStyle(extendDefaultStyle));
          vectorLayerMarker
            .getSource()
            .getFeatures()
            .forEach((f) => f.setStyle(markerDefaultStyle));

          tooltip.getElement().classList.add("hidden");
        }
      });
      const selectOnClick = new Select({
        condition: function (event) {
          if (event.type === "pointerup") {
            console.log("pointerup");
            return true;
          }
        },
      });

      // Make sure wheel event is not prevented for map zooming
      newMap.getViewport().addEventListener("wheel", function (evt) {
        evt.preventDefault();
      });

      newMap.addInteraction(selectOnClick);
      selectOnClick.on("select", function (e) {
        // console.log("selected", e.selected);
        const selectedFeatures = e.selected;
        if (selectedFeatures.length > 0) {
          const feature = selectedFeatures[0];
          const id = feature.get("id");
          navigate(`/dataset/${id}`);
        }
      });

      return () => {
        if (map) {
          map.setTarget(null);
        }
      };
    }
  }, [map, data, mapStyle]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%", borderRadius: 8 }}></div>;
};

export default DatasetMapOL;
