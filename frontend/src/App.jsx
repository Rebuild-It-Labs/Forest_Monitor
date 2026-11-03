import { useCallback, useEffect, useMemo, useState } from 'react';
import InteractiveGlobe from './components/InteractiveGlobe.jsx';
import DetailsPanel from './components/DetailsPanel.jsx';
import TelemetryOverlay from './components/TelemetryOverlay.jsx';
import BottomBar from './components/BottomBar.jsx';
import BootScreen from './components/BootScreen.jsx';
import ScreenFX from './components/ui/ScreenFX.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
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
  const select = useCallback((id) => setSelectedId(id), []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSelectedId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
            isMobile={isMobile}
          />
          <BottomBar onRecenter={() => setRecenterToken((t) => t + 1)} isMobile={isMobile} hidden={Boolean(selected) && isMobile} />
          <DetailsPanel location={selected} meta={data.meta} onClose={close} isMobile={isMobile} />
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
