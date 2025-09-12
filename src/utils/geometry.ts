// polygon-clipping types are loose; call with spread args to satisfy overloads
import * as pc from "polygon-clipping";
import Geometry from "ol/geom/Geometry";
import Polygon from "ol/geom/Polygon";
import MultiPolygon from "ol/geom/MultiPolygon";

type PCRing = [number, number][]; // [[x,y], ...]
type PCPolygon = PCRing[]; // [outer, hole1, ...]
type PCMultiPolygon = PCPolygon[]; // array of polygons

function polygonToPC(poly: Polygon): PCMultiPolygon {
  const coords = poly.getCoordinates(); // rings
  return [coords.map((ring) => ring.map((c) => [c[0], c[1]]))];
}

function multiPolygonToPC(mpoly: MultiPolygon): PCMultiPolygon {
  const polys = mpoly.getCoordinates();
  return polys.map((poly) => poly.map((ring) => ring.map((c) => [c[0], c[1]])));
}

function olToPC(geom: Geometry): PCMultiPolygon | null {
  if (geom instanceof Polygon) return polygonToPC(geom);
  if (geom instanceof MultiPolygon) return multiPolygonToPC(geom);
  return null;
}

function pcToOL(mp: PCMultiPolygon): Polygon | MultiPolygon {
  if (mp.length === 1) {
    const rings = mp[0].map((ring) => ring.map(([x, y]) => [x, y] as [number, number]));
    return new Polygon(rings);
  }
  const polys = mp.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x, y] as [number, number])));
  return new MultiPolygon(polys);
}

export function union(a: Geometry, b: Geometry): Geometry | null {
  const A = olToPC(a);
  const B = olToPC(b);
  if (!A || !B) return null;
  // polygon-clipping can be exported under default in some bundlers; resolve safely
  const any = pc as unknown as {
    union?: (...polys: PCPolygon[]) => PCMultiPolygon;
    default?: { union?: (...polys: PCPolygon[]) => PCMultiPolygon };
  };
  const fn = any.union || any.default?.union;
  if (!fn) return null;
  const res = fn(...A, ...B);
  if (!res || res.length === 0) return null;
  return pcToOL(res);
}

export function difference(subject: Geometry, clip: Geometry): Geometry | null {
  const S = olToPC(subject);
  const C = olToPC(clip);
  if (!S || !C) return null;
  const any = pc as unknown as {
    difference?: (...polys: PCPolygon[]) => PCMultiPolygon;
    default?: { difference?: (...polys: PCPolygon[]) => PCMultiPolygon };
  };
  const fn = any.difference || any.default?.difference;
  if (!fn) return null;
  const res = fn(...S, ...C);
  if (!res || res.length === 0) return null;
  return pcToOL(res);
}

// Returns true if geometries have any overlapping area
export function intersects(a: Geometry, b: Geometry): boolean {
  const A = olToPC(a);
  const B = olToPC(b);
  if (!A || !B) return false;
  const any = pc as unknown as {
    intersection?: (...polys: PCPolygon[]) => PCMultiPolygon;
    default?: { intersection?: (...polys: PCPolygon[]) => PCMultiPolygon };
  };
  const fn = any.intersection || any.default?.intersection;
  if (!fn) return false;
  const inter = fn(...A, ...B);
  return Array.isArray(inter) && inter.length > 0;
}
