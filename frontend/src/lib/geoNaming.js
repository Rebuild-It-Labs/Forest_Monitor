/**
 * geoNaming.js — Automated Coordinate Naming Strategy
 *
 * Automatically resolves geographic names, administrative states, and ecological
 * biomes for coordinates across India without requiring external geocoding APIs.
 */

const REGIONS = [
  // Andhra Pradesh & Telangana
  {
    bounds: { minLat: 16.2, maxLat: 17.2, minLng: 79.4, maxLng: 80.5 },
    name: 'Nagarjuna Sagar · Palnadu Sector',
    state: 'Andhra Pradesh / Telangana',
    biome: 'Dry Deciduous · Krishna River Basin',
  },
  {
    bounds: { minLat: 15.3, maxLat: 16.4, minLng: 78.3, maxLng: 79.5 },
    name: 'Nallamala Range · Srisailam Reserve',
    state: 'Andhra Pradesh',
    biome: 'Tropical Dry Deciduous · Eastern Ghats',
  },
  // Kerala, Tamil Nadu & Western Ghats
  {
    bounds: { minLat: 11.2, maxLat: 12.1, minLng: 75.8, maxLng: 76.8 },
    name: 'Wayanad Plateau · Nilgiri Corridor',
    state: 'Kerala',
    biome: 'Tropical Moist Evergreen · Western Ghats',
  },
  {
    bounds: { minLat: 8.5, maxLat: 10.5, minLng: 76.5, maxLng: 77.8 },
    name: 'Anamalai - Periyar Biosphere',
    state: 'Kerala / Tamil Nadu',
    biome: 'Tropical Wet Evergreen & Shola',
  },
  {
    bounds: { minLat: 12.0, maxLat: 14.5, minLng: 74.5, maxLng: 76.0 },
    name: 'Sharavathi - Kudremukh Forest',
    state: 'Karnataka',
    biome: 'Moist Evergreen · Central Western Ghats',
  },
  {
    bounds: { minLat: 15.0, maxLat: 19.5, minLng: 73.0, maxLng: 74.5 },
    name: 'Northern Western Ghats · Sahyadri',
    state: 'Maharashtra / Goa',
    biome: 'Semi-Evergreen & Montane Deciduous',
  },
  // Chhattisgarh, MP & Central Highlands
  {
    bounds: { minLat: 22.1, maxLat: 23.2, minLng: 82.0, maxLng: 83.2 },
    name: 'Hasdeo Arand Basin',
    state: 'Chhattisgarh',
    biome: 'Dense Sal & Mixed Deciduous Forest',
  },
  {
    bounds: { minLat: 18.5, maxLat: 19.8, minLng: 81.3, maxLng: 82.5 },
    name: 'Bastar Highlands · Indravati Valley',
    state: 'Chhattisgarh',
    biome: 'Sal Forest · Dandakaranya Plateau',
  },
  {
    bounds: { minLat: 21.2, maxLat: 22.8, minLng: 85.5, maxLng: 87.0 },
    name: 'Similipal Biosphere Reserve',
    state: 'Odisha',
    biome: 'Moist Deciduous & Semi-Evergreen',
  },
  {
    bounds: { minLat: 21.5, maxLat: 23.5, minLng: 78.5, maxLng: 81.5 },
    name: 'Satpura - Kanha Eco-Corridor',
    state: 'Madhya Pradesh',
    biome: 'Tropical Dry & Moist Deciduous',
  },
  // Bengal & North-East
  {
    bounds: { minLat: 21.5, maxLat: 22.8, minLng: 88.0, maxLng: 89.8 },
    name: 'Sundarbans Mangrove Delta',
    state: 'West Bengal',
    biome: 'Tidal Halophytic Mangrove Ecosystem',
  },
  {
    bounds: { minLat: 26.8, maxLat: 27.8, minLng: 94.8, maxLng: 96.2 },
    name: 'Dehing Patkai · Brahmaputra Valley',
    state: 'Assam',
    biome: 'Lowland Tropical Rainforest',
  },
  {
    bounds: { minLat: 27.0, maxLat: 28.2, minLng: 96.0, maxLng: 97.2 },
    name: 'Namdapha Basin',
    state: 'Arunachal Pradesh',
    biome: 'Eastern Himalayan Subtropical Evergreen',
  },
  // Uttarakhand & Himalayas
  {
    bounds: { minLat: 29.8, maxLat: 31.0, minLng: 78.0, maxLng: 79.8 },
    name: 'Garhwal - Kumaon Himalaya',
    state: 'Uttarakhand',
    biome: 'Temperate Oak & Himalayan Pine Forest',
  },
  // Islands
  {
    bounds: { minLat: 6.7, maxLat: 7.5, minLng: 93.5, maxLng: 94.2 },
    name: 'Great Nicobar Biosphere',
    state: 'Andaman & Nicobar Islands',
    biome: 'Tropical Island Rainforest',
  },
];

/**
 * Calculates UTM zone from longitude.
 */
function getUtmZone(lng) {
  return Math.floor((lng + 180) / 6) + 1;
}

/**
 * Resolves a coordinate into a human-readable title, state, and ecological biome.
 */
export function resolveCoordinateName(lat, lng, acres = 100) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const utm = getUtmZone(numLng);

  // Check landmark bounding boxes
  for (const reg of REGIONS) {
    if (
      numLat >= reg.bounds.minLat &&
      numLat <= reg.bounds.maxLat &&
      numLng >= reg.bounds.minLng &&
      numLng <= reg.bounds.maxLng
    ) {
      return {
        name: reg.name,
        state: `${reg.state} · UTM ${utm}N`,
        biome: `${reg.biome} (${acres} ac plot)`,
        regionKey: reg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };
    }
  }

  // Broad state quadrant fallback
  let state = 'India (Unclassified Sector)';
  if (numLat >= 8 && numLat <= 13 && numLng >= 74 && numLng <= 80) state = 'South India (Deccan)';
  else if (numLat >= 13 && numLat <= 19 && numLng >= 77 && numLng <= 84) state = 'Eastern Ghats / Deccan';
  else if (numLat >= 15 && numLat <= 21 && numLng >= 72 && numLng <= 78) state = 'Western Deccan';
  else if (numLat >= 19 && numLat <= 25 && numLng >= 80 && numLng <= 87) state = 'Central India Highlands';
  else if (numLat >= 24 && numLat <= 29 && numLng >= 89 && numLng <= 97) state = 'North-East India';
  else if (numLat >= 28 && numLat <= 36 && numLng >= 74 && numLng <= 81) state = 'Himalayan Belt';

  return {
    name: `Sector ${numLat.toFixed(3)}°N · ${numLng.toFixed(3)}°E`,
    state: `${state} · UTM ${utm}N`,
    biome: `Sentinel-2 LDSR Super-Resolved (${acres} ac plot)`,
    regionKey: `sector-${numLat.toFixed(2)}-${numLng.toFixed(2)}`,
  };
}
