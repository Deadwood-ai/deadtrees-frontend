import { fromUrl } from "geotiff";
import proj4 from "proj4";
import * as geokeysToProj4 from "geotiff-geokeys-to-proj4";

const getPixelValueOfCoordinate = async ({ coordinates, cogUrl }: { coordinates: number[]; cogUrl: string }) => {
  // load image
  //   const [lng, lat] = coordinates;
  const tiff = await fromUrl(cogUrl);
  const image = await tiff.getImage();

  // reproject coordinates to the projection of the COG
  // is not necessary if COGs and coordinates are in EPSG:3857
  //   console.log("Image:", image);
  //   const geoKeys = image.getGeoKeys();
  //   const projObj = geokeysToProj4.toProj4(geoKeys);
  //   const projection = proj4(`WGS84`, projObj.proj4);
  //   console.log("Projection:", projection);
  //   const projectedCoords = projection.forward([lng, lat]);
  //   console.log("Projected Coordinates:", projectedCoords);

  // get pixel value of the projected coordinates
  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [xSize, ySize] = image.getResolution();
  const uWidth = xSize * width;
  const uHeight = ySize * height;

  const x = Math.floor(((coordinates[0] - originX) / uWidth) * width);
  const y = Math.floor(((coordinates[1] - originY) / uHeight) * height);
  //   console.log("Pixel Coordinates:", x, y);

  const values = await image.readRasters({ interleave: true, window: [x, y, x + 1, y + 1], samples: [0] });
  //   console.log("Pixel Value:", values);
  return values[0];
};

export default getPixelValueOfCoordinate;
