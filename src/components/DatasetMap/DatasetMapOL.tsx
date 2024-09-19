import { useEffect, useRef } from "react";
import { Map, View } from "ol";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import "ol/ol.css";
import { fromExtent } from "ol/geom/Polygon.js";
import { Polygon } from "ol/geom";
import { useNavigate } from "react-router-dom";
import { IDataset } from "../../types/dataset";
import parseBBox from "../../utils/parseBBox";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Overlay from "ol/Overlay";
import Select from "ol/interaction/Select.js";
import { useDatasetMap } from "../../state/DatasetMapProvider";
import "./tooltip.css";
import { useData } from "../../state/DataProvider";

const defaultExtendStyle = new Style({
  fill: new Fill({ color: [0, 0, 255, 0.4] }),
  stroke: new Stroke({ color: "black", width: 1 }),
});

const hoverExtendStyle = new Style({
  fill: new Fill({ color: [0, 0, 255, 0.5] }),
  stroke: new Stroke({ color: "white", width: 4 }),
});

const defaultMarkerStyle = new Style({
  image: new Circle({
    radius: 10,
    fill: new Fill({ color: [0, 0, 255, 0.5] }),
    stroke: new Stroke({ color: "black", width: 2 }),
  }),
});

const hoverMarkerStyle = new Style({
  image: new Circle({
    radius: 10,
    fill: new Fill({ color: [0, 0, 255, 0.5] }),
    stroke: new Stroke({ color: "white", width: 4 }),
  }),
});

const DatasetMapOL = ({ data }: { data: IDataset[] }) => {
  const navigate = useNavigate();
  const mapRef = useRef<Map | null>(null);
  const vectorLayerExtendRef = useRef<VectorLayer<VectorSource> | null>(null);
  const vectorLayerMarkerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const { viewport, setViewport } = useDatasetMap();
  const { filter } = useData();


  useEffect(() => {
    if (!mapRef.current && mapContainer.current) {
      const initialView = new View({
        center: viewport.center,
        zoom: viewport.zoom,
      });

      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: "RoadOnDemand",
          culture: "en-us",
        }),
      });

      const map = new Map({
        target: mapContainer.current,
        layers: [basemapLayer],
        controls: [],
        view: initialView,
      });

      mapRef.current = map;

      const vectorSourceExtend = new VectorSource();
      const vectorLayerExtend = new VectorLayer({ source: vectorSourceExtend });
      vectorLayerExtendRef.current = vectorLayerExtend;
      map.addLayer(vectorLayerExtend);

      const vectorSourceMarker = new VectorSource();
      const vectorLayerMarker = new VectorLayer({
        source: vectorSourceMarker,
        maxZoom: 11,
      });
      vectorLayerMarkerRef.current = vectorLayerMarker;
      map.addLayer(vectorLayerMarker);

      const element = document.createElement("div");
      element.className = "tooltip hidden";
      const tooltip = new Overlay({
        element,
        offset: [0, -50],
        positioning: "top-center",
      });
      map.addOverlay(tooltip);

      map.on("moveend", () => {
        const newViewport = {
          center: map.getView().getCenter() as number[],
          zoom: map.getView().getZoom() as number,
        };
        setViewport(newViewport);
      });

      map.on("pointermove", (evt) => {
        if (evt.dragging) return;
        const pixel = map.getEventPixel(evt.originalEvent);

        vectorLayerExtend
          .getSource()
          .getFeatures()
          .forEach((f) => f.setStyle(defaultExtendStyle));
        vectorLayerMarker
          .getSource()
          .getFeatures()
          .forEach((f) => f.setStyle(defaultMarkerStyle));

        let hoveredFeature = null;
        map.forEachFeatureAtPixel(pixel, (feature) => {
          if (!hoveredFeature) {
            hoveredFeature = feature;
            return true;
          }
        });

        if (hoveredFeature) {
          map.getTargetElement().style.cursor = "pointer";
          hoveredFeature.setStyle(
            hoveredFeature.getGeometry() instanceof Polygon
              ? hoverExtendStyle
              : hoverMarkerStyle
          );
          tooltip.setPosition(evt.coordinate);
          tooltip.getElement().innerHTML = hoveredFeature.get("title");
          tooltip.getElement().classList.remove("hidden");
        } else {
          map.getTargetElement().style.cursor = "";
          tooltip.getElement().classList.add("hidden");
        }
      });

      const selectOnClick = new Select({
        condition: (event) => event.type === "pointerup",
      });

      map.addInteraction(selectOnClick);
      selectOnClick.on("select", (e) => {
        const selectedFeatures = e.selected;
        if (selectedFeatures.length > 0) {
          const feature = selectedFeatures[0];
          const id = feature.get("id");
          navigate(`/dataset/${id}`);
        }
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.setTarget(null);
          mapRef.current = null;
        }
      };
    }
  }, []); // Only run when the container is ready

  useEffect(() => {
    console.log("updating data");
    if (
      vectorLayerExtendRef.current &&
      vectorLayerMarkerRef.current &&
      mapRef.current
    ) {
      const vectorSourceExtend = vectorLayerExtendRef.current.getSource();
      const vectorSourceMarker = vectorLayerMarkerRef.current.getSource();

      vectorSourceExtend.clear();
      vectorSourceMarker.clear();

      data.forEach((dataset) => {
        if (dataset.bbox) {
          const extentFeature = new Feature(
            fromExtent(parseBBox(dataset.bbox)).transform(
              "EPSG:4326",
              "EPSG:3857"
            )
          );
          extentFeature.setProperties({
            id: dataset.id,
            title: dataset.file_name,
          });
          extentFeature.setStyle(defaultExtendStyle);
          vectorSourceExtend.addFeature(extentFeature);

          const point = extentFeature.getGeometry().getInteriorPoint();
          const pointFeature = new Feature(point);
          pointFeature.setProperties({
            id: dataset.id,
            title: dataset.file_alias,
          });
          pointFeature.setStyle(defaultMarkerStyle);
        
          vectorSourceMarker.addFeature(pointFeature);
        }
      });
      if (filter) {
        // Only fit view on initial load or specific conditions
        mapRef.current.getView().fit(vectorSourceExtend.getExtent(), {
          size: mapRef.current.getSize(),
          maxZoom: 18,
        });
      };
    }
  }, [data, filter]); // Update when data changes

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    ></div>
  );
};

export default DatasetMapOL;
