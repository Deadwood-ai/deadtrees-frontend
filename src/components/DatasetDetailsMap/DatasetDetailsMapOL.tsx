import { useEffect, useRef, useState } from "react";
import { BingMaps, TileWMS } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map, Tile } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";

import { IDataset, ILabels } from "../../types/dataset";
import fetchLabels from "./fetchLabels";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import Legend from "../DeadwoodMap/Legend";
import createDeadwoodGeotiffLayer from "../DeadwoodMap/createDeadwoodGeotiffLayer";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";

const DatasetDetailsMapOL = ({ data }: { data: IDataset }) => {
  const [map, setMap] = useState(null);
  const mapContainer = useRef();
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [sliderValueLabels, setSliderValueLabels] = useState<number>(0.6);
  const [sliderValueSatellite, setSliderValueSatellite] = useState<number>(1);
  const [labelsFetched, setLabelsFetched] = useState<boolean>(false);

  useEffect(() => {
    if (!map && data?.file_name) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      console.log("cog url:", Settings.COG_BASE_URL + data.cog_url);

      const orthoCogLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + data.cog_url,
              // url: "https://data.deadtrees.earth/cogs/v1/4b727747-f9ff-41d1-b28d-18f215c550ec_uavforsat_2020_CFB034_ortho/4b727747-f9ff-41d1-b28d-18f215c550ec_uavforsat_2020_CFB034_ortho_cog_jpeg_ovr8_q75.tif", // funktioniert
              // url: "https://data.deadtrees.earth/cogs/v1/262c8eae-e357-4c4d-93a2-552e860b4780_uavforsat_2017_CFB030_ortho/262c8eae-e357-4c4d-93a2-552e860b4780_uavforsat_2017_CFB030_ortho_cog_jpeg_ovr8_q75.tif", // funktioniert
              //  https://data.deadtrees.earth/cogs/v1/262c8eae-e357-4c4d-93a2-552e860b4780_uavforsat_2017_CFB030_ortho/262c8eae-e357-4c4d-93a2-552e860b4780_uavforsat_2017_CFB030_ortho_cog_jpeg_ovr8_q75.tif
              // url: "https://data.deadtrees.earth/cogs/v1/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho_cog_deflate_ovr8.tif", // does not work
              // url: "https://data.deadtrees.earth/cogs/v1/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho_cog_deflate_ovr8.tif", // is ok but 1 gb file
              // url: "https://data.deadtrees.earth/cogs/v1/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho_cog_jpeg_ovr8.tif", // funktioniert
              // url: "https://data.deadtrees.earth/cogs/v1/eb12a2ed-2811-4cd7-b9a7-2f1899892822_uavforsat_2017_CFB008_ortho/eb12a2ed-2811-4cd7-b9a7-2f1899892822_uavforsat_2017_CFB008_ortho_cog_jpeg_ovr6_q70.tif",
              // url: "https://data.deadtrees.earth/cogs/v1/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho/f9cd3537-38b2-46e7-a5e2-2cad10a1faf8_uavforsat_2017_CFB017_ortho_cog_lzw_ovr8.tif", // too big
              // nodata: 1,
            },
          ],
          // projection: "EPSG:4326",
          convertToRGB: true,
          // normalize: false,
          // interpolate: false,
        }),

        // style: {
        //   color: [
        //     "case",
        //     ["==", ["band", 3], 1],
        //     ["array", ["band", 1], ["band", 2], ["band", 3], 1], // Use RGB values directly with full opacity
        //     [0, 0, 0, 0],
        //   ],
        // },
        // style: {
        //   color: [
        //     "case",
        //     [
        //       "any",
        //       ["<=", ["band", 1], 0.000001], // Adjust this threshold if necessary
        //       ["<=", ["band", 2], 0.000001],
        //       ["<=", ["band", 3], 0.000001],
        //       // ["==", ["band", 4], 20],

        //       // ["==", ["band", 3], 0],
        //       // ["==", ["band", 1], 1],
        //     ], // Check if the Red band (band 1) is 0 (could check Green and Blue bands as well)
        //     [0, 0, 0, 0], // If true, set the pixel to fully transparent
        //     ["array", ["band", 1], ["band", 2], ["band", 3], 1], // Use RGB values directly with full opacity
        //   ],
        // },
        // style: {
        //   color: [
        //     "case",
        //     [
        //       "all",
        //       ["<=", ["band", 1], 1], // Adjust range if necessary
        //       ["<=", ["band", 2], 1],
        //       ["<=", ["band", 3], 1],
        //     ],
        //     [0, 0, 0, 0], // Set to fully transparent if all bands are no-data
        //     ["array", ["band", 1], ["band", 2], ["band", 3], 1], // Use RGB values directly
        //   ],
        // },

        maxZoom: 20,
        // cacheSize: 1024,
        // preload: 4,
        zIndex: 99,
      });
      console.log("orthoCogLayer", orthoCogLayer);
      console.log("ortho props:", orthoCogLayer.getSource());
      // console.log("extend of ortho is:", orthoCogLayer.getSource().getExtent());

      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");
      console.log("geotifLayer2018", geotifLayer2018);
      const geotifLayer2019 = createDeadwoodGeotiffLayer("2019");
      const geotifLayer2020 = createDeadwoodGeotiffLayer("2020");
      const geotifLayer2021 = createDeadwoodGeotiffLayer("2021");

      const newMap = new Map({
        target: mapContainer.current,
        // layers: [basemapLayer, orthoCogLayer, geotifLayer2018, geotifLayer2019, geotifLayer2020, geotifLayer2021],
        layers: [basemapLayer],
        view: orthoCogLayer.getSource().getView(),

        // view: new View({
        //   // center: [0, 0],
        //   // projection: "EPSG:4326",
        //   maxZoom: 21,
        // }),
        // view: new View({
        //   extent: orthoCogLayer.getExtent(),
        //   maxZoom: 22,
        //   smoothExtentConstraint: true,
        //   // showFullExtent: true,
        // }),

        overlays: [],
        controls: [],
      });

      fetchLabels({ dataset_id: data.dataset_id }).then((labelsData) => {
        console.log("labelsData", labelsData);
        const vectorLayerAOI = new VectorLayer({
          source: new VectorSource({
            features: new GeoJSON().readFeatures(labelsData?.aoi, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            }),
          }),
          style: {
            "stroke-color": "blue",
            "stroke-width": 1,
            "fill-color": "rgba(0, 0, 255, 0)",
          },
        });
        const vectorLayerLabels = new VectorLayer({
          source: new VectorSource({
            features: new GeoJSON().readFeatures(labelsData?.label, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            }),
          }),
          className: "labels",
          style: {
            "stroke-color": "red",
            "stroke-width": 1,
            "fill-color": "rgba(255, 0, 0, 0.8)",
          },
        });

        newMap.addLayer(orthoCogLayer);
        newMap.addLayer(geotifLayer2018);
        newMap.addLayer(geotifLayer2019);
        newMap.addLayer(geotifLayer2020);
        newMap.addLayer(geotifLayer2021);
        newMap.addLayer(vectorLayerAOI);
        newMap.addLayer(vectorLayerLabels);
        // fit view to extent of orthoCogLayer
        // newMap.getView().fit(vectorLayerAOI.getSource().getExtent(), {
        //   size: newMap.getSize(),
        //   maxZoom: 18,
        // });
        setLabelsFetched(true);
      });

      setMap(newMap);
    }
    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [data]);

  // update label opacity on slider change
  useEffect(() => {
    if (map && labelsFetched) {
      // const deadwoodLayer = map.getLayers().getArray()[7];
      // get layers with className_ === "labels"
      const labelsLayer = map
        .getLayers()
        .getArray()
        .filter((layer) => layer.className_ === "labels")[0];
      labelsLayer.setOpacity(sliderValueLabels);
    }
  }, [sliderValueLabels, map]);

  // update satellite layer opacity on slider change
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        // if has geotif in name
        // console.log("layer", layer.className_);
        if (layer.className_?.includes("geotiff")) {
          // if (layer instanceof TileLayerWebGL) {
          layer.setOpacity(sliderValueSatellite);
        }
      });
    }
  }, [sliderValueSatellite, map]);

  // update visibility of geotiff layers based on selectedYear
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        // if (layer instanceof TileLayerWebGL) {
        if (layer.className_?.includes("geotiff")) {
          layer.setVisible(layer.className_?.includes(selectedYear.toString()));
        }
      });
    }
  }, [selectedYear, map]);

  // update on mapStyle change
  useEffect(() => {
    if (map) {
      const layer = map.getLayers().getArray()[0]; // basemap layer
      // console.log(layer);
      layer.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      );
    }
  }, [mapStyle, map]);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
        ref={mapContainer}
      >
        {" "}
        <div className="absolute left-2 top-6 z-20">
          <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
        </div>
        <div className="absolute bottom-52 right-2 z-50">
          <Legend />
        </div>
        <div className="absolute bottom-6 right-2 z-50 ">
          <DeadwoodCardDetails
            year={selectedYear}
            setSelectedYear={setSelectedYear}
            sliderValueLabels={sliderValueLabels}
            setSliderValueLabels={setSliderValueLabels}
            sliderValueYear={sliderValueSatellite}
            setSliderValueYear={setSliderValueSatellite}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMapOL;
