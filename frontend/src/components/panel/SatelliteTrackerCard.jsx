import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SATELLITE_CONSTELLATION, getSatelliteState } from '../../lib/satelliteOrbit.js';
import { fmtLat, fmtLng } from '../../lib/format.js';

export default function SatelliteTrackerCard({
  selectedSatelliteId,
  onSelectSatellite,
  showOrbits,
  onToggleOrbits,
  onFocusSatellite,
  onClose,
  isMobile,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sat = SATELLITE_CONSTELLATION.find((s) => s.id === selectedSatelliteId) || SATELLITE_CONSTELLATION[0];
  const state = getSatelliteState(sat, now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.25 }}
      className={`glass-strong hud-corners pointer-events-auto fixed z-30 flex flex-col border border-neon/30 bg-black/85 p-3.5 shadow-neon ${
        isMobile
          ? 'inset-x-3 bottom-14 max-h-[50dvh] overflow-y-auto rounded-xl'
          : 'bottom-14 left-3 w-[360px] rounded-xl'
      }`}
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between border-b border-neon/20 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: sat.color }} />
            <span className="relative h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sat.color }} />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-[0.25em] text-white">
            LIVE SATELLITE TRACKER
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleOrbits}
            title="Toggle 3D Orbit Rings"
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wider transition-colors ${
              showOrbits ? 'bg-neon/20 text-neon border border-neon/40' : 'bg-white/5 text-white/50 border border-white/10'
            }`}
          >
            RINGS: {showOrbits ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onClose}
            aria-label="Close Satellite Tracker"
            className="flex h-6 w-6 items-center justify-center rounded border border-white/20 text-white/60 hover:border-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Constellation Selector Tabs */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 font-mono text-[9px]">
        {SATELLITE_CONSTELLATION.map((s) => {
          const active = s.id === sat.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSatellite(s.id)}
              className={`rounded border px-1 py-1 text-center font-bold tracking-wider transition-all ${
                active
                  ? 'border-neon bg-neon/20 text-neon shadow-neon'
                  : 'border-white/15 bg-black/40 text-white/50 hover:border-white/30 hover:text-white'
              }`}
            >
              {s.name.replace('SENTINEL-', 'S-').replace('LANDSAT-', 'L-')}
            </button>
          );
        })}
      </div>

      {/* Active Satellite Details */}
      <div className="mt-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[15px] font-bold text-white" style={{ color: sat.color }}>
            {sat.name}
          </span>
          <span className="font-mono text-[9.5px] tracking-widest text-white/50">
            NORAD #{sat.noradId} · {sat.agency}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between rounded bg-white/5 px-2.5 py-1.5 font-mono text-[10px]">
          <span className="text-white/60">GROUND TRACK:</span>
          {state.isOverIndia ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-alert-red animate-blink">
              <span className="h-1.5 w-1.5 rounded-full bg-alert-red" /> SCANNING INDIA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-neon">
              <span className="h-1.5 w-1.5 rounded-full bg-neon animate-blink" /> NOMINAL TRANSIT
            </span>
          )}
        </div>

        {/* Real-time Telemetry Grid */}
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">NADIR LATITUDE</div>
            <div className="text-white font-bold">{fmtLat(state.lat)}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">NADIR LONGITUDE</div>
            <div className="text-white font-bold">{fmtLng(state.lng)}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">ALTITUDE</div>
            <div className="text-white font-bold">{sat.altitudeKm} km</div>
          </div>
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">ORBIT SPEED</div>
            <div className="text-white font-bold">{state.velKmS} km/s</div>
          </div>
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">SWATH WIDTH</div>
            <div className="text-white font-bold">{sat.swathKm} km</div>
          </div>
          <div className="rounded border border-white/10 bg-black/50 p-1.5">
            <div className="text-[8.5px] text-white/40">ORBIT PERIOD</div>
            <div className="text-white font-bold">{sat.periodMin} min</div>
          </div>
        </div>

        {/* Google Earth Engine Pipeline Connection */}
        <div className="rounded border border-neon/20 bg-neon/5 p-2 font-mono text-[9.5px]">
          <div className="text-[8.5px] tracking-wider text-neon">EARTH ENGINE COLLECTION (KAGGLE PIPELINE)</div>
          <a
            href={sat.geeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-white hover:text-neon underline decoration-neon/40"
          >
            {sat.geeCollection}
          </a>
          <div className="mt-1 text-[8.5px] text-white/50">{sat.bands}</div>
        </div>

        {/* Official No-API Link to CelesTrak */}
        <div className="flex items-center justify-between font-mono text-[9px] text-white/40 pt-1">
          <span>TLE SOURCE: CELESTRAK (PUBLIC)</span>
          <a
            href={sat.tleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon hover:underline"
          >
            RAW TLE DATA ↗
          </a>
        </div>

        {/* Focus on Satellite / Nadir Button */}
        <button
          onClick={() => onFocusSatellite?.(sat, state)}
          className="mt-1 w-full rounded border border-neon/50 bg-neon/15 py-1.5 font-mono text-[10px] font-bold tracking-[0.2em] text-neon transition-colors hover:bg-neon/30 shadow-neon"
        >
          FOCUS 3D GLOBE ON SATELLITE
        </button>
      </div>
    </motion.div>
  );
}

