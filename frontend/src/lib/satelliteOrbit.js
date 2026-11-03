import * as THREE from 'three';
import { latLngToVec3 } from './geo.js';

const DEG = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
const TWO_PI = Math.PI * 2;
const SIDEREAL_DAY_MS = 86164090.5; // ~23h 56m 4.09s
const OMEGA_EARTH = TWO_PI / SIDEREAL_DAY_MS;

/**
 * Official constellation configuration for the satellites used in Google Earth Engine
 * and the forest monitoring pipeline (Sentinel-2A/B and Landsat-8/9).
 */
export const SATELLITE_CONSTELLATION = [
  {
    id: 'sentinel-2a',
    name: 'SENTINEL-2A',
    agency: 'ESA / COPERNICUS',
    noradId: 40697,
    color: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.4)',
    accent: 'neon',
    altitudeKm: 786,
    inclinationDeg: 98.62,
    periodMin: 100.65,
    swathKm: 290,
    resolutionM: 10,
    sensor: 'MSI (Multi-Spectral Instrument)',
    bands: '13 bands: B2 (Blue 10m), B3 (Green 10m), B4 (Red 10m), B8 (NIR 10m), Red Edge, SWIR',
    geeCollection: 'COPERNICUS/S2_SR_HARMONIZED',
    geeUrl: 'https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED',
    tleUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=40697&FORMAT=TLE',
    celestrakUrl: 'https://celestrak.org/satcat/records.php?CATNR=40697',
    phaseOffset: 0.85,
    raan0Deg: 42.0,
    launchDate: '2015-06-23',
    status: 'ACTIVE · NOMINAL',
  },
  {
    id: 'sentinel-2b',
    name: 'SENTINEL-2B',
    agency: 'ESA / COPERNICUS',
    noradId: 42063,
    color: '#00e5ff',
    glowColor: 'rgba(0, 229, 255, 0.4)',
    accent: 'cyan',
    altitudeKm: 786,
    inclinationDeg: 98.62,
    periodMin: 100.65,
    swathKm: 290,
    resolutionM: 10,
    sensor: 'MSI (Multi-Spectral Instrument)',
    bands: '13 bands: B2 (Blue 10m), B3 (Green 10m), B4 (Red 10m), B8 (NIR 10m), Red Edge, SWIR',
    geeCollection: 'COPERNICUS/S2_SR_HARMONIZED',
    geeUrl: 'https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED',
    tleUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=42063&FORMAT=TLE',
    celestrakUrl: 'https://celestrak.org/satcat/records.php?CATNR=42063',
    phaseOffset: 0.85 + Math.PI, // 180° phased opposite Sentinel-2A
    raan0Deg: 42.0,
    launchDate: '2017-03-07',
    status: 'ACTIVE · NOMINAL',
  },
  {
    id: 'landsat-9',
    name: 'LANDSAT-9',
    agency: 'USGS / NASA',
    noradId: 49260,
    color: '#ffaa00',
    glowColor: 'rgba(255, 170, 0, 0.4)',
    accent: 'amber',
    altitudeKm: 705,
    inclinationDeg: 98.2,
    periodMin: 98.9,
    swathKm: 185,
    resolutionM: 30,
    sensor: 'OLI-2 & TIRS-2',
    bands: '11 bands: B2-B4 (RGB 30m), B5 (NIR 30m), B6-B7 (SWIR 30m), B8 (Pan 15m), B10 (Thermal 100m)',
    geeCollection: 'LANDSAT/LC09/C02/T1_L2',
    geeUrl: 'https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_L2',
    tleUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=49260&FORMAT=TLE',
    celestrakUrl: 'https://celestrak.org/satcat/records.php?CATNR=49260',
    phaseOffset: 2.15,
    raan0Deg: 128.5,
    launchDate: '2021-09-27',
    status: 'ACTIVE · NOMINAL',
  },
  {
    id: 'landsat-8',
    name: 'LANDSAT-8',
    agency: 'USGS / NASA',
    noradId: 39084,
    color: '#ff5500',
    glowColor: 'rgba(255, 85, 0, 0.4)',
    accent: 'orange',
    altitudeKm: 705,
    inclinationDeg: 98.2,
    periodMin: 98.9,
    swathKm: 185,
    resolutionM: 30,
    sensor: 'OLI & TIRS',
    bands: '11 bands: B2-B4 (RGB 30m), B5 (NIR 30m), B6-B7 (SWIR 30m), B8 (Pan 15m), B10 (Thermal 100m)',
    geeCollection: 'LANDSAT/LC08/C02/T1_L2',
    geeUrl: 'https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2',
    tleUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=39084&FORMAT=TLE',
    celestrakUrl: 'https://celestrak.org/satcat/records.php?CATNR=39084',
    phaseOffset: 5.29, // 8-day offset in 16-day cycle from Landsat-9
    raan0Deg: 128.5,
    launchDate: '2013-02-11',
    status: 'ACTIVE · NOMINAL',
  },
];

/**
 * Calculates the exact 3D Cartesian position, sub-satellite (nadir) lat/lng,
 * velocity, and scanning status for a given satellite and timestamp.
 */
export function getSatelliteState(sat, timestampMs = Date.now()) {
  const rScene = 1.0 + sat.altitudeKm / EARTH_RADIUS_KM; // Three.js globe space (Earth radius = 1.0)
  const periodMs = sat.periodMin * 60 * 1000;
  const meanMotion = TWO_PI / periodMs; // rad/ms

  // True anomaly / orbit phase
  const u = (meanMotion * timestampMs + sat.phaseOffset) % TWO_PI;

  // Inclination in radians
  const inc = sat.inclinationDeg * DEG;

  // Node precession (Sun-synchronous rate ~0.9856 deg/day) + Earth rotation
  const ssoPrecession = (TWO_PI / (365.2422 * 86400000)) * timestampMs;
  const raan = (sat.raan0Deg * DEG + ssoPrecession - OMEGA_EARTH * timestampMs) % TWO_PI;

  // In orbital plane:
  // x_p = r * cos(u), y_p = r * sin(u)
  // Rotating by inclination around X-axis:
  const xp = rScene * Math.cos(u);
  const yp = rScene * Math.sin(u) * Math.cos(inc);
  const zp = rScene * Math.sin(u) * Math.sin(inc);

  // Rotating by RAAN around Y-axis (polar axis in Three.js):
  const x = xp * Math.cos(raan) + zp * Math.sin(raan);
  const y = yp;
  const z = -xp * Math.sin(raan) + zp * Math.cos(raan);

  // Convert (x, y, z) to ground track sub-satellite point (lat, lng):
  // According to geo.js convention:
  // phi = acos(y / r), lat = 90 - (phi / DEG)
  // theta = atan2(z, -x), lng = (theta / DEG) - 180
  const lat = Math.asin(Math.max(-1, Math.min(1, y / rScene))) / DEG;
  let lng = Math.atan2(z, -x) / DEG - 180;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;

  // Surface nadir position vector in Three.js
  const nadirPos = latLngToVec3(lat, lng, 1.002);
  const satPos = new THREE.Vector3(x, y, z);

  // Check if footprint covers India:
  // India approx: lat 6 to 37.5, lng 67 to 98.5
  const isOverIndia = lat >= 6 && lat <= 37.5 && lng >= 67 && lng <= 98.5;

  // Swath radius on the unit sphere
  const swathAngularRadius = (sat.swathKm / 2 / EARTH_RADIUS_KM);

  // Orbital velocity (circular orbit approximation v = sqrt(GM / r))
  const velKmS = Math.sqrt(398600.44 / (EARTH_RADIUS_KM + sat.altitudeKm));

  return {
    sat,
    pos: satPos,
    nadirPos,
    lat,
    lng,
    altitudeKm: sat.altitudeKm,
    velKmS: +velKmS.toFixed(2),
    isOverIndia,
    swathAngularRadius,
    u,
    raan,
  };
}

/**
 * Computes a series of 3D points forming the complete orbit ring around the globe.
 */
export function getOrbitRingPoints(sat, timestampMs = Date.now(), segments = 128) {
  const rScene = 1.0 + sat.altitudeKm / EARTH_RADIUS_KM;
  const inc = sat.inclinationDeg * DEG;
  const ssoPrecession = (TWO_PI / (365.2422 * 86400000)) * timestampMs;
  const raan = (sat.raan0Deg * DEG + ssoPrecession - OMEGA_EARTH * timestampMs) % TWO_PI;

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * TWO_PI;
    const xp = rScene * Math.cos(u);
    const yp = rScene * Math.sin(u) * Math.cos(inc);
    const zp = rScene * Math.sin(u) * Math.sin(inc);

    const x = xp * Math.cos(raan) + zp * Math.sin(raan);
    const y = yp;
    const z = -xp * Math.sin(raan) + zp * Math.cos(raan);

    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

