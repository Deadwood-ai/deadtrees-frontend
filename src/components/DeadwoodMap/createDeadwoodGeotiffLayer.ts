import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import getDeadwoodCOGUrl from "../../utils/getDeadwoodCOGUrl";

const createDeadwoodGeotiffLayer = (year: string) => {
  const source = new GeoTIFF({
    sources: [
      {
        url: getDeadwoodCOGUrl(year),
        min: 0,
        max: 10000,
      },
    ],
    interpolate: false,
    normalize: true,
  });

  const layer = new TileLayerWebGL({
    source,
    className: "geotiff-layer" + year,
    opacity: 0,
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
    visible: year === "2018",
  });

  layer.cleanup = () => {
    source.clear();
    source.dispose();
    layer.dispose();
  };

  return layer;
};

export default createDeadwoodGeotiffLayer;
