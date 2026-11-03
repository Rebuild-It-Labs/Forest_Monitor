import { useCallback, useEffect, useMemo, useState } from 'react';
import InteractiveGlobe from './components/InteractiveGlobe.jsx';
import DetailsPanel from './components/DetailsPanel.jsx';
import TelemetryOverlay from './components/TelemetryOverlay.jsx';
import BottomBar from './components/BottomBar.jsx';
import BootScreen from './components/BootScreen.jsx';
import ScreenFX from './components/ui/ScreenFX.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SatelliteTrackerCard from './components/panel/SatelliteTrackerCard.jsx';
import { useMonitoringData } from './hooks/useMonitoringData.js';
import { useMediaQuery, useViewportSize } from './hooks/useMediaQuery.js';

const PANEL_W = 480;
const MIN_BOOT_MS = 1500;

export default function App() {
  const { status, data, error } = useMonitoringData();
  const [selectedId, setSelectedId] = useState(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const [stages, setStages] = useState({ data: false, geo: false, texture: false });
  const [textureProgress, setTextureProgress] = useState(0);
  const [bootDelayDone, setBootDelayDone] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Satellite tracking states
  const [selectedSatelliteId, setSelectedSatelliteId] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [focusTargetOverride, setFocusTargetOverride] = useState(null);
  const [satelliteTrackerOpen, setSatelliteTrackerOpen] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { w, h } = useViewportSize();

  useEffect(() => {
    const t = setTimeout(() => setBootDelayDone(true), MIN_BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status === 'ready') setStages((s) => ({ ...s, data: true }));
  }, [status]);

  const onStage = useCallback((name) => setStages((s) => (s[name] ? s : { ...s, [name]: true })), []);

  const selected = useMemo(() => data?.locations.find((l) => l.id === selectedId) ?? null, [data, selectedId]);

  // how far (px) to slide the projection so the focused marker stays visible beside / above the panel
  const panelInset = useMemo(
    () => (isMobile ? { x: 0, y: (h * 0.64) / 2 } : { x: (Math.min(PANEL_W, w - 24) + 24) / 2, y: 0 }),
    [isMobile, w, h],
  );

  const close = useCallback(() => setSelectedId(null), []);
  const select = useCallback((id) => {
    setSelectedId(id);
    setFocusTargetOverride(null); // Clear satellite focus when selecting ground site
  }, []);

  const handleSelectSatellite = useCallback((satOrId) => {
    const satId = typeof satOrId === 'string' ? satOrId : satOrId.id;
    setSelectedSatelliteId(satId);
    setSatelliteTrackerOpen(true);
  }, []);

  const handleFocusSatellite = useCallback((sat, state) => {
    setSelectedId(null); // Close site details panel so view is clean
    setFocusTargetOverride({
      id: `sat-focus-${sat.id}-${Date.now()}`,
      lat: state.lat,
      lng: state.lng,
    });
  }, []);

  const handleCloseSatelliteTracker = useCallback(() => {
    setSatelliteTrackerOpen(false);
    setSelectedSatelliteId(null);
    setFocusTargetOverride(null);
  }, []);

  const handleToggleSatelliteTracker = useCallback(() => {
    setSatelliteTrackerOpen((o) => {
      const next = !o;
      if (next && !selectedSatelliteId) {
        setSelectedSatelliteId('sentinel-2a');
      }
      return next;
    });
  }, [selectedSatelliteId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        handleCloseSatelliteTracker();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCloseSatelliteTracker]);

  const booting = !(stages.data && stages.geo && stages.texture && bootDelayDone) && status !== 'error';

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black font-body text-white">
      {/* 3D layer */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          {data && (
            <InteractiveGlobe
              locations={data.locations}
              selectedId={selectedId}
              onSelect={select}
              selectedSatelliteId={selectedSatelliteId}
              onSelectSatellite={handleSelectSatellite}
              showOrbits={showOrbits}
              focusTargetOverride={focusTargetOverride}
              panelInset={panelInset}
              recenterToken={recenterToken}
              indiaTexture={data.meta.indiaTexture}
              onStage={onStage}
              onProgress={setTextureProgress}
              onError={setGeoError}
            />
          )}
        </ErrorBoundary>
      </div>

      <ScreenFX />

      {data && (
        <>
          <TelemetryOverlay
            telemetry={data.telemetry}
            meta={data.meta}
            locations={data.locations}
            selectedId={selectedId}
            onSelect={select}
            onSelectSatellite={handleSelectSatellite}
            selectedSatelliteId={selectedSatelliteId}
            isMobile={isMobile}
          />

          <BottomBar
            onRecenter={() => {
              setFocusTargetOverride(null);
              setRecenterToken((t) => t + 1);
            }}
            isMobile={isMobile}
            hidden={Boolean(selected) && isMobile}
            onToggleSatelliteTracker={handleToggleSatelliteTracker}
            satelliteTrackerOpen={satelliteTrackerOpen}
          />

          <DetailsPanel location={selected} meta={data.meta} onClose={close} isMobile={isMobile} />

          {/* Satellite Tracker Floating HUD Card */}
          {satelliteTrackerOpen && (
            <SatelliteTrackerCard
              selectedSatelliteId={selectedSatelliteId || 'sentinel-2a'}
              onSelectSatellite={handleSelectSatellite}
              showOrbits={showOrbits}
              onToggleOrbits={() => setShowOrbits((s) => !s)}
              onFocusSatellite={handleFocusSatellite}
              onClose={handleCloseSatelliteTracker}
              isMobile={isMobile}
            />
          )}
        </>
      )}

      <BootScreen visible={booting} stages={stages} textureProgress={textureProgress} />

      {(status === 'error' || geoError) && (
        <div className="fixed inset-x-0 top-4 z-[60] mx-auto w-[min(520px,92vw)]">
          <div className="glass-alert hud-corners rounded-md p-4" style={{ '--hud': '#ff2e63' }}>
            <h2 className="font-display text-xs font-bold tracking-[0.25em] text-alert-red text-glow-red">
              {status === 'error' ? 'DATA LINK FAILURE' : 'GEOMETRY FAULT'}
            </h2>
            <p className="mt-2 text-sm text-white/75">{status === 'error' ? error : geoError}</p>
            {status === 'error' && (
              <p className="mt-1 font-mono text-[10px] text-white/40">Check VITE_DATA_URL / public/data/data.json, then reload.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
