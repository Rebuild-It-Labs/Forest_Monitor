import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, Stars } from '@react-three/drei';
import GlobeBase from './globe/GlobeBase.jsx';
import CountryBorders from './globe/CountryBorders.jsx';
import IndiaLayer from './globe/IndiaLayer.jsx';
import PulsarMarker from './globe/PulsarMarker.jsx';
import SatelliteConstellation from './globe/SatelliteConstellation.jsx';
import CameraRig from './globe/CameraRig.jsx';
import { useGeoData } from '../hooks/useGeoData.js';
import { INDIA_BBOX, INDIA_CENTER, latLngToVec3 } from '../lib/geo.js';

/**
 * InteractiveGlobe
 * ------------------------------------------------------------------------------------------------
 * Props
 *  locations            Array<{ id, name, lat, lng, severity }>   pulsar sites
 *  selectedId           string | null                              currently focused site
 *  onSelect(id)         called when a pulsar is clicked
 *  selectedSatelliteId  string | null                              currently focused satellite
 *  onSelectSatellite    (sat) => void                              called when satellite is clicked
 *  showOrbits           boolean                                    toggle 3D orbit rings
 *  focusTargetOverride  { id, lat, lng } | null                   optional target override
 *  panelInset           { x, y } px the projection is shifted by while a site is selected
 *  recenterToken        number — increment to fly back to the whole-India view
 *  indiaTexture         { url?: string|null, bbox?: number[] }     optional real imagery override
 *  onStage(name)        'geo' | 'texture' — boot progress callbacks
 *  onProgress(p)        0..1 procedural texture progress
 *  onError(msg)         non-recoverable geometry failure
 */
export default function InteractiveGlobe({
  locations,
  selectedId,
  onSelect,
  selectedSatelliteId,
  onSelectSatellite,
  showOrbits = true,
  focusTargetOverride = null,
  panelInset = { x: 0, y: 0 },
  recenterToken = 0,
  indiaTexture,
  onStage,
  onProgress,
  onError,
}) {
  const geo = useGeoData();
  const [hoverId, setHoverId] = useState(null);
  const [hoverSatId, setHoverSatId] = useState(null);
  const [maxDpr, setMaxDpr] = useState(1.75);

  const bbox = indiaTexture?.bbox || INDIA_BBOX;
  const selected = useMemo(
    () => focusTargetOverride || locations.find((l) => l.id === selectedId) || null,
    [focusTargetOverride, locations, selectedId]
  );
  const startPos = useMemo(() => latLngToVec3(INDIA_CENTER.lat + 3, INDIA_CENTER.lng, 3.2).toArray(), []);

  useEffect(() => {
    if (!geo) return;
    if (geo.error) {
      onError?.(`Border geometry failed to load: ${geo.error.message}`);
      onStage?.('geo');
      onStage?.('texture');
    } else {
      onStage?.('geo');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  // pointer cursor while hovering a pulsar or satellite
  useEffect(() => {
    document.body.style.cursor = hoverId || hoverSatId ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoverId, hoverSatId]);

  const ready = geo && !geo.error;

  return (
    <Canvas
      flat
      dpr={[1, maxDpr]}
      camera={{ fov: 40, near: 0.1, far: 80, position: startPos }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => gl.setClearColor('#000000')}
      aria-label="Interactive 3D globe of India with satellite monitoring sites and live constellation"
    >
      <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
      <Stars radius={45} depth={30} count={1600} factor={3} saturation={0} fade speed={0.35} />

      <GlobeBase />
      {ready && <CountryBorders positions={geo.worldSegments} />}
      {ready && (
        <IndiaLayer
          geometry={geo.indiaGeometry}
          borderPoints={geo.indiaBorderPoints}
          bbox={bbox}
          imageUrl={indiaTexture?.url || null}
          onProgress={onProgress}
          onReady={() => onStage?.('texture')}
        />
      )}

      {locations.map((l) => (
        <PulsarMarker
          key={l.id}
          location={l}
          hovered={hoverId === l.id}
          selected={selectedId === l.id}
          onHover={setHoverId}
          onSelect={onSelect}
        />
      ))}

      {/* Real-time Constellation (Sentinel-2A, Sentinel-2B, Landsat-9, Landsat-8) */}
      <SatelliteConstellation
        selectedSatelliteId={selectedSatelliteId}
        onSelectSatellite={onSelectSatellite}
        showOrbits={showOrbits}
        hoverId={hoverSatId}
        setHoverId={setHoverSatId}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={1.35}
        maxDistance={4.6}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI - 0.3}
        zoomSpeed={0.6}
        autoRotateSpeed={0.35}
      />
      <CameraRig target={selected} inset={panelInset} recenterToken={recenterToken} />
    </Canvas>
  );
}
