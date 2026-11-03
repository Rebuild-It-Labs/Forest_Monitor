import { useEffect, useState } from 'react';
import { loadGeo } from '../lib/geo.js';

/** Lazily loads country geometry (separate chunk). Returns null while loading, { error } on failure. */
export function useGeoData() {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    let alive = true;
    loadGeo()
      .then((g) => alive && setGeo(g))
      .catch((error) => alive && setGeo({ error }));
    return () => {
      alive = false;
    };
  }, []);
  return geo;
}
