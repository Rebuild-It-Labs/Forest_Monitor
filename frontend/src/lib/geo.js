/**
 * geo.js — geometry helpers shared by the globe components.
 *
 * Coordinate convention (identical to three-globe / the three.js SphereGeometry UV layout):
 *   phi   = (90 - lat) °   → polar angle from +Y
 *   theta = (lng + 180) °  → azimuth
 *   x = -r·sin(phi)·cos(theta),  y = r·cos(phi),  z = r·sin(phi)·sin(theta)
 *
 * Because of that, a SphereGeometry created with phiStart/phiLength/thetaStart/thetaLength from a lat/lng
 * bounding box lines up exactly with points produced by `latLngToVec3`.
 */
import * as THREE from 'three';
import { feature } from 'topojson-client';

const DEG = Math.PI / 180;

/** [west, south, east, north] — square on purpose so a square canvas maps 1:1. */
export const INDIA_BBOX = [67, 6, 98.5, 37.5];
export const INDIA_CENTER = { lat: 21, lng: 80 };

export function latLngToVec3(lat, lng, r = 1, out = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Quaternion that rotates local +Z onto the outward surface normal at (lat, lng). */
export function surfaceQuaternion(lat, lng) {
  const n = latLngToVec3(lat, lng, 1).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
}

export function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

const isIndia = (f) => f?.properties?.name === 'India' || String(f?.id) === '356';

/** Push a ring as line-segment pairs (x0,y0,z0,x1,y1,z1 …), subdividing long edges so they hug the sphere. */
function pushRing(ring, r, stepDeg, out, tmpA, tmpB) {
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng0, lat0] = ring[i];
    const [lng1, lat1] = ring[i + 1];
    if (Math.abs(lng1 - lng0) > 180) continue; // wrapped across the antimeridian
    if (Math.abs(lng0) >= 179.99 && Math.abs(lng1) >= 179.99) continue; // edge lying on the ±180° cut
    if (lat0 <= -89.9 && lat1 <= -89.9) continue; // Antarctica's closing edge along the pole
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(lng1 - lng0), Math.abs(lat1 - lat0)) / stepDeg));
    for (let k = 0; k < n; k++) {
      const a = k / n;
      const b = (k + 1) / n;
      latLngToVec3(lat0 + (lat1 - lat0) * a, lng0 + (lng1 - lng0) * a, r, tmpA);
      latLngToVec3(lat0 + (lat1 - lat0) * b, lng0 + (lng1 - lng0) * b, r, tmpB);
      out.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
    }
  }
}

/** Flat Float32Array of segment pairs for a set of GeoJSON features / geometries. */
export function buildSegments(geometries, r, stepDeg) {
  const out = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const g of geometries) {
    for (const poly of polygonsOf(g)) for (const ring of poly) pushRing(ring, r, stepDeg, out, a, b);
  }
  return new Float32Array(out);
}

/** Same as buildSegments but as an array of [x,y,z] triples (the format drei's <Line segments> wants). */
export function buildSegmentPoints(geometry, r, stepDeg) {
  const flat = buildSegments([geometry], r, stepDeg);
  const pts = new Array(flat.length / 3);
  for (let i = 0; i < pts.length; i++) pts[i] = [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]];
  return pts;
}

// ---- topology loading (lazy chunks, CDN fallback) ---------------------------------------------------
async function loadTopo(res) {
  try {
    const mod = res === '110m' ? await import('world-atlas/countries-110m.json') : await import('world-atlas/countries-50m.json');
    return mod.default ?? mod;
  } catch (err) {
    console.warn(`[geo] local world-atlas ${res} import failed, falling back to CDN`, err);
    const r = await fetch(`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${res}.json`);
    if (!r.ok) throw new Error(`Could not load country geometry (${res}): HTTP ${r.status}`);
    return r.json();
  }
}

let geoPromise = null;

/**
 * Loads country borders once.
 * @returns {Promise<{ worldSegments: Float32Array, indiaGeometry: object, indiaBorderPoints: number[][] }>}
 */
export function loadGeo() {
  if (!geoPromise) {
    geoPromise = (async () => {
      const [lo, hi] = await Promise.all([loadTopo('110m'), loadTopo('50m')]);
      const world = feature(lo, lo.objects.countries).features;
      const detailed = feature(hi, hi.objects.countries).features;
      const india = detailed.find(isIndia);
      if (!india) throw new Error('India geometry not found in world-atlas topology');
      return {
        // every country except India: thin dark-grey outlines
        worldSegments: buildSegments(
          world.filter((f) => !isIndia(f)).map((f) => f.geometry),
          1.0012,
          2.5,
        ),
        indiaGeometry: india.geometry,
        // India: neon outline, drawn slightly higher so it never z-fights with the satellite patch
        indiaBorderPoints: buildSegmentPoints(india.geometry, 1.0035, 1.2),
      };
    })();
  }
  return geoPromise;
}
