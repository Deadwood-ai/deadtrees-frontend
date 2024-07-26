import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import getDeadwoodCOGUrl from "../../utils/getDeadwoodCOGUrl";

const createDeadwoodGeotiffLayer = (year) => {
  const geotiffLayer = new TileLayerWebGL({
    source: new GeoTIFF({
      sources: [
        {
          url: getDeadwoodCOGUrl(year),
          min: 0,
          max: 10000,
        },
      ],
      interpolate: false,
      normalize: true,
    }),
    className: "geotiff-layer" + year,
    style: {
      color: [
        "interpolate",
        ["linear"],
        ["band", 1],
        0,
        [129, 176, 247, 0],
        0.2,
        [129, 176, 247, 0.2],
        0.4,
        [129, 176, 247, 0.3],
        0.6,
        [129, 176, 247, 0.6],
        0.8,
        [129, 176, 247, 0.8],
        1,
        [129, 176, 247, 1],
      ],
    },
    visible: true ? year === "2018" : false,
  });
  return geotiffLayer;
};

export default createDeadwoodGeotiffLayer;
