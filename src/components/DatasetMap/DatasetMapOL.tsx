import { useEffect, useRef, useCallback, useMemo, useState } from "react";
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
import { debounce } from 'lodash';

const defaultExtendStyle = new Style({
  fill: new Fill({ color: [0, 0, 255, 0.4] }),
  stroke: new Stroke({ color: "black", width: 1 }),
});

const hoverExtendStyle = new Style({
  fill: new Fill({ color: [255, 255, 255, 0.] }),  // Orange with 60% opacity
  stroke: new Stroke({ color: "white", width: 6 }),  // Dark orange stroke
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
    stroke: new Stroke({ color: "white", width: 6 }),
  }),
});

const DatasetMapOL = ({ data, hoveredItem, setHoveredItem }: { data: IDataset[], hoveredItem: number | null, setHoveredItem: (id: number | null) => void }) => {
  const navigate = useNavigate();
  const mapRef = useRef<Map | null>(null);
  const vectorLayerExtendRef = useRef<VectorLayer<VectorSource> | null>(null);
  const vectorLayerMarkerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const { DatasetViewport, setDatasetViewport } = useDatasetMap();
  const { filter, setVisibleFeatures, setFilter } = useData();
  const [userInteracted, setUserInteracted] = useState(false);

  const debouncedUpdateVisibleFeatures = useCallback(
    debounce(() => {
      if (mapRef.current && vectorLayerExtendRef.current) {
        const extent = mapRef.current.getView().calculateExtent(mapRef.current.getSize());
        const visibleFeatures = vectorLayerExtendRef.current.getSource().getFeaturesInExtent(extent);
        const visibleIds = visibleFeatures.map(feature => feature.get('id'));
        setVisibleFeatures(visibleIds);
      }
    }, 300),
    [setVisibleFeatures]
  );

  useEffect(() => {
    // console.log("initial map useEffect");
    if (!mapRef.current && mapContainer.current) {
      const initialView = new View({
        center: DatasetViewport.center,
        zoom: DatasetViewport.zoom,
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
        setDatasetViewport(newViewport);
        debouncedUpdateVisibleFeatures();
        setUserInteracted(true);
      });

      map.on("pointermove", (evt) => {
        if (evt.dragging) return;
        const pixel = map.getEventPixel(evt.originalEvent);

        let hoveredFeature = null;
        map.forEachFeatureAtPixel(pixel, (feature) => {
          if (!hoveredFeature) {
            hoveredFeature = feature;
            return true;
          }
        });

        if (hoveredFeature) {
          const featureId = hoveredFeature.get("id");
          setHoveredItem(featureId);
          map.getTargetElement().style.cursor = "pointer";
          tooltip.setPosition(evt.coordinate);
          tooltip.getElement().innerHTML = hoveredFeature.get("title") + " (" + hoveredFeature.get("date") + ")";
          tooltip.getElement().classList.remove("hidden");

          // Apply hover styles
          hoveredFeature.setStyle(hoveredFeature.getGeometry() instanceof Polygon ? hoverExtendStyle : hoverMarkerStyle);
        } else {
          setHoveredItem(null);
          map.getTargetElement().style.cursor = "";
          tooltip.getElement().classList.add("hidden");

          // Reset styles when not hovering
          vectorLayerExtendRef.current?.getSource().getFeatures().forEach(f => f.setStyle(defaultExtendStyle));
          vectorLayerMarkerRef.current?.getSource().getFeatures().forEach(f => f.setStyle(defaultMarkerStyle));
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
  }, []); // Add updateVisibleFeaturesCallback and setHoveredItem to the dependency array


  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.id === hoveredItem) return 1;
      if (b.id === hoveredItem) return -1;
      return 0;
    });
  }, [data, hoveredItem]);

  useEffect(() => {
    // console.log("updating data");
    if (
      vectorLayerExtendRef.current &&
      vectorLayerMarkerRef.current &&
      mapRef.current
    ) {
      const vectorSourceExtend = vectorLayerExtendRef.current.getSource();
      const vectorSourceMarker = vectorLayerMarkerRef.current.getSource();

      vectorSourceExtend.clear();
      vectorSourceMarker.clear();

      sortedData.forEach((dataset) => {
        if (dataset.bbox) {
          const extentFeature = new Feature(
            fromExtent(parseBBox(dataset.bbox)).transform(
              "EPSG:4326",
              "EPSG:3857"
            )
          );
          extentFeature.setProperties({
            id: dataset.id,
            title: dataset.admin_level_3 + "_" + dataset.admin_level_1 + "_" + dataset.id,
            date: new Date(
              dataset.aquisition_year,
              dataset.aquisition_month,
              dataset.aquisition_day,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).toString(),
          });
          extentFeature.setStyle(defaultExtendStyle);
          vectorSourceExtend.addFeature(extentFeature);

          const point = extentFeature.getGeometry().getInteriorPoint();
          const pointFeature = new Feature(point);
          pointFeature.setProperties({
            id: dataset.id,
            title: `${dataset.admin_level_3}_${dataset.admin_level_1}_${dataset.id}`.replace(/\s+/g, '_'),
            date: new Date(
              dataset.aquisition_year,
              dataset.aquisition_month,
              dataset.aquisition_day,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).toString(),
          });
          pointFeature.setStyle(defaultMarkerStyle);

          vectorSourceMarker.addFeature(pointFeature);
        }
      });

      // Only fit the extent if the user hasn't interacted with the map
      if (filter && !userInteracted) {
        const extent = vectorSourceExtend.getExtent();
        mapRef.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
      }
    }
  }, [sortedData, filter, userInteracted]);

  useEffect(() => {
    // user interacted with the map
    setUserInteracted(false);
  }, [filter]);


  useEffect(() => {
    // console.log("hoveredItem changed", hoveredItem);
    if (vectorLayerExtendRef.current && vectorLayerMarkerRef.current) {
      const vectorSourceExtend = vectorLayerExtendRef.current.getSource();
      const vectorSourceMarker = vectorLayerMarkerRef.current.getSource();

      vectorSourceExtend.getFeatures().forEach((feature) => {
        const featureId = feature.get("id");
        feature.setStyle(featureId === hoveredItem ? hoverExtendStyle : defaultExtendStyle);
      });

      vectorSourceMarker.getFeatures().forEach((feature) => {
        const featureId = feature.get("id");
        feature.setStyle(featureId === hoveredItem ? hoverMarkerStyle : defaultMarkerStyle);
      });
    }
  }, [hoveredItem]);


  useEffect(() => {
    // console.log("useEffect on moveend");
    if (mapRef.current) {
      const moveEndListener = () => {
        debouncedUpdateVisibleFeatures();
        setUserInteracted(true);
      };
      mapRef.current.on('moveend', moveEndListener);
      return () => {
        if (mapRef.current) {
          mapRef.current.un('moveend', moveEndListener);
        }
      };
    }
  }, [debouncedUpdateVisibleFeatures]);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    ></div>
  );
};

export default DatasetMapOL;