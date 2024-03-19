type BBox = [[number, number], [number, number]]; // [minLongitude, minLatitude, maxLongitude, maxLatitude]

function parseBBox(boxString: string): BBox | null {
  const regex = /BOX\((-?\d+\.\d+) (-?\d+\.\d+),(-?\d+\.\d+) (-?\d+\.\d+)\)/;
  const matches = boxString.match(regex);

  if (!matches) return null;

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = matches
    .slice(1)
    .map(Number);

  return [
    [minLatitude, minLongitude],
    [maxLatitude, maxLongitude],
  ];
}
export default parseBBox;
