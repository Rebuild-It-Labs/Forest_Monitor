import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { resolveAsset } from '../../lib/format.js';

/** Display order of the four time slices. Keys match `location.imagery` in data.json. */
export const ORDER = ['tenYearsAgo', 'fiveYearsAgo', 'current', 'heatmap'];
const STEP_MS = 3000;

function HeatLegend() {
  return (
    <div className="absolute bottom-2 right-2 rounded border border-alert-magenta/40 bg-black/70 px-2 py-1 font-mono text-[9px] tracking-widest text-white/70">
      <div className="mb-0.5 flex justify-between">
        <span>LOW</span>
        <span>12-MO LOSS RISK</span>
        <span>HIGH</span>
      </div>
      <div className="h-1.5 w-40 rounded-sm bg-gradient-to-r from-transparent via-alert-magenta to-alert-red" />
    </div>
  );
}

function Meta({ item }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2 pt-8 font-mono text-[9.5px] tracking-wider text-white/70">
      <span>
        {item.date} · {item.sensor || item.model}
        {item.resolutionM ? ` · ${item.resolutionM} m` : ''}
        {item.horizonMonths ? ` · +${item.horizonMonths} mo` : ''}
      </span>
      <span className="text-white/45">
        {item.cloudCover != null ? `CLOUD ${item.cloudCover}%` : item.confidence != null ? `CONF ${(item.confidence * 100).toFixed(1)}%` : ''}
      </span>
    </div>
  );
}

export default function ImageryViewer({ imagery, artifacts, assetBase }) {
  const [mode, setMode] = useState('sequence'); // 'sequence' | 'compare' | 'timelapse' | 'diagnostic'
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [pair, setPair] = useState({ a: 'tenYearsAgo', b: 'current' });
  const [pos, setPos] = useState(50);
  const src = (k) => resolveAsset(assetBase, imagery[k].src);
  const preloaded = useRef(false);

  // preload all four frames so cross-fades never flash empty
  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    ORDER.forEach((k) => {
      const i = new Image();
      i.src = src(k);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'sequence' || !playing) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % ORDER.length), STEP_MS);
    return () => clearInterval(id);
  }, [mode, playing]);

  const key = ORDER[idx];
  const item = imagery[key];
  const pick = (i) => {
    setIdx(i);
    setPlaying(false);
  };

  const hasTimelapse = Boolean(artifacts?.timelapse);
  const hasDiagnostic = Boolean(artifacts?.compare);

  const availableModes = [
    ['sequence', 'SEQUENCE'],
    ['compare', 'COMPARE'],
    ...(hasTimelapse ? [['timelapse', 'TIMELAPSE']] : []),
    ...(hasDiagnostic ? [['diagnostic', 'DIAGNOSTIC']] : []),
  ];

  return (
    <section aria-label="Temporal imagery">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-neon/85">TEMPORAL IMAGERY</h3>
        <div className="flex overflow-hidden rounded border border-neon/30 font-mono text-[9px] tracking-widest">
          {availableModes.map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-2 py-1 transition-colors ${mode === m ? 'bg-neon/20 text-neon' : 'text-white/50 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'sequence' && (
        <>
          <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-neon/25 bg-black">
            <AnimatePresence initial={false}>
              <motion.img
                key={key}
                src={src(key)}
                alt={`${item.label} satellite view`}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,255,136,.05)_1px,transparent_1px)] bg-[length:100%_4px]" />
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded border border-neon/40 bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-neon">
              <span className={`h-1.5 w-1.5 rounded-full ${key === 'heatmap' ? 'bg-alert-magenta' : 'bg-neon'} animate-blink`} />
              {item.label}
            </div>
            <Meta item={item} />
            {key === 'heatmap' && <HeatLegend />}
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause sequence' : 'Play sequence'}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded border border-neon/40 bg-black/70 font-mono text-[11px] text-neon hover:bg-neon/15"
            >
              {playing ? '❚❚' : '▶'}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2">
            {ORDER.map((k, i) => {
              const active = i === idx;
              const heat = k === 'heatmap';
              return (
                <button
                  key={k}
                  onClick={() => pick(i)}
                  aria-label={imagery[k].label}
                  aria-current={active}
                  className={`group relative overflow-hidden rounded border text-left transition-all ${
                    active ? (heat ? 'border-alert-magenta shadow-alert' : 'border-neon shadow-neon') : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <img src={src(k)} alt="" draggable={false} className={`h-11 w-full object-cover transition-opacity ${active ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`} />
                  <span className={`block px-1.5 py-1 font-mono text-[9px] tracking-widest ${active ? (heat ? 'text-alert-magenta' : 'text-neon') : 'text-white/50'}`}>
                    {imagery[k].short}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === 'compare' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <select
              value={pair.a}
              onChange={(e) => setPair((p) => ({ ...p, a: e.target.value }))}
              aria-label="Before frame"
              className="rounded border border-neon/30 bg-black/80 px-2 py-1 text-neon focus:outline-none"
            >
              {ORDER.map((k) => (
                <option key={k} value={k} disabled={k === pair.b} className="bg-black text-white">
                  {imagery[k].label}
                </option>
              ))}
            </select>
            <span className="text-white/40">VS</span>
            <select
              value={pair.b}
              onChange={(e) => setPair((p) => ({ ...p, b: e.target.value }))}
              aria-label="After frame"
              className="rounded border border-neon/30 bg-black/80 px-2 py-1 text-neon focus:outline-none"
            >
              {ORDER.map((k) => (
                <option key={k} value={k} disabled={k === pair.a} className="bg-black text-white">
                  {imagery[k].label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="hud-corners relative aspect-[8/5] cursor-ew-resize select-none overflow-hidden rounded-lg border border-neon/25 bg-black"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const update = (evt) => {
                const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
                setPos((x / rect.width) * 100);
              };
              update(e);
              const move = (evt) => update(evt);
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          >
            <img src={src(pair.b)} alt={imagery[pair.b].label} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pos}%` }}>
              <img src={src(pair.a)} alt={imagery[pair.a].label} draggable={false} className="absolute inset-0 h-full max-w-none object-cover" style={{ width: '100cqw' }} />
            </div>

            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
              <div className="absolute -left-px inset-y-0 w-0.5 bg-neon shadow-neon" />
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-neon bg-black/80 font-mono text-[9px] text-neon">
                ↔
              </div>
            </div>

            <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
              {imagery[pair.a].short}
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
              {imagery[pair.b].short}
            </div>
          </div>
        </div>
      )}

      {mode === 'timelapse' && hasTimelapse && (
        <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-alert-magenta/40 bg-black">
          <img
            src={resolveAsset(assetBase, artifacts.timelapse)}
            alt="Multi-year animated timelapse"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded border border-alert-magenta/60 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-widest text-alert-magenta">
            <span className="h-1.5 w-1.5 rounded-full bg-alert-magenta animate-blink" />
            MULTI-YEAR TIMELAPSE
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 font-mono text-[9.5px] text-white/70">
            Looping 10Y → 5Y → Now Sentinel-2 Composite
          </div>
        </div>
      )}

      {mode === 'diagnostic' && hasDiagnostic && (
        <div className="hud-corners relative aspect-[8/5] overflow-hidden rounded-lg border border-neon/30 bg-black">
          <img
            src={resolveAsset(assetBase, artifacts.compare)}
            alt="Multi-channel comparison diagnostic"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain bg-black"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded border border-neon/60 bg-black/80 px-2 py-1 font-mono text-[10px] tracking-widest text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            4-PANEL AI COMPARISON
          </div>
        </div>
      )}
    </section>
  );
}
