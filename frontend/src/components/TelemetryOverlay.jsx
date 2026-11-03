import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HudCard from './ui/HudCard.jsx';
import AnimatedNumber from './ui/AnimatedNumber.jsx';
import SignalBars from './ui/SignalBars.jsx';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry.js';
import { fmtClock, fmtNum } from '../lib/format.js';

const TYPE_STYLE = {
  ALERT: 'text-alert-red border-alert-red/40 bg-alert-red/10',
  PASS: 'text-neon border-neon/40 bg-neon/10',
  MODEL: 'text-alert-magenta border-alert-magenta/40 bg-alert-magenta/10',
  INFO: 'text-white/60 border-white/20 bg-white/5',
};
const TONE_TEXT = { neon: 'text-neon text-glow', alert: 'text-alert-red text-glow-red' };

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] font-mono text-[11px]">
      <span className="tracking-[0.18em] text-white/45">{label}</span>
      <span className="text-right text-neon">{children}</span>
    </div>
  );
}

/**
 * Left-hand floating telemetry stack: brand + clock, system status, key metrics and a live event feed.
 * On small screens it collapses to a single header bar that expands on tap.
 */
export default function TelemetryOverlay({ telemetry, meta, locations, selectedId, onSelect, isMobile }) {
  const { now, vals, feed } = useLiveTelemetry(telemetry);
  const [open, setOpen] = useState(false);
  const expanded = !isMobile || open;
  const sys = telemetry.system;
  const nameOf = (id) => locations.find((l) => l.id === id)?.name;

  return (
    <aside
      className={`pointer-events-none fixed left-3 top-3 z-20 flex w-[min(300px,calc(100vw-1.5rem))] flex-col gap-2.5 ${
        isMobile ? 'max-h-[70dvh]' : 'bottom-3'
      }`}
    >
      {/* brand */}
      <HudCard className="pointer-events-auto animate-fade-up" bodyClassName="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-[15px] font-bold leading-none tracking-[0.12em] text-white text-glow">
              INDIA<span className="text-neon"> FOREST</span> WATCH
            </h1>
            <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.2em] text-white/45">SATELLITE DEFORESTATION MONITOR</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[13px] tabular-nums text-neon">{fmtClock(now)}</div>
            <div className="font-mono text-[9px] tracking-[0.25em] text-white/40">UTC</div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 flex w-full items-center justify-between rounded border border-neon/25 bg-neon/5 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-neon"
          >
            <span>TELEMETRY</span>
            <span>{open ? '▾' : '▸'}</span>
          </button>
        )}
        {meta.dataStatus === 'SYNTHETIC_DEMO' && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-alert-amber/40 bg-alert-amber/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-alert-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-alert-amber" /> SIMULATED DEMO DATA
          </div>
        )}
      </HudCard>

      {expanded && (
        <div className="scroll-thin pointer-events-none flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {/* system status */}
          <HudCard
            title="SYSTEM STATUS"
            className="pointer-events-auto animate-fade-up [animation-delay:80ms]"
            right={
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-neon">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-neon" /> {sys.uplink}
                <SignalBars />
              </span>
            }
          >
            <Row label="LATENCY">{vals.latency} ms</Row>
            <Row label="INGEST">{vals.ingest} MB/s</Row>
            <Row label="GPU LOAD">
              <span className="inline-flex items-center gap-2">
                <span className="relative h-1 w-14 overflow-hidden rounded bg-white/10">
                  <span className="absolute inset-y-0 left-0 bg-neon transition-all duration-700" style={{ width: `${vals.gpu}%` }} />
                </span>
                {vals.gpu}%
              </span>
            </Row>
            <Row label="MODEL">{sys.modelVersion}</Row>
            <Row label="LAST COMPOSITE">{sys.lastCompositeUtc.slice(5, 16).replace('T', ' ')}Z</Row>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {sys.constellation.map((s) => (
                <div key={s.name} className="rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[9px] leading-tight">
                  <div className="flex items-center gap-1 text-white/80">
                    <span className={`h-1 w-1 rounded-full ${s.status === 'NOMINAL' ? 'bg-neon' : 'bg-alert-amber'}`} />
                    {s.name}
                  </div>
                  <div className="text-white/40">PASS +{s.nextPassMin}m</div>
                </div>
              ))}
            </div>
          </HudCard>

          {/* key metrics */}
          <HudCard title="KEY METRICS" className="pointer-events-auto animate-fade-up [animation-delay:160ms]">
            <div className="grid grid-cols-2 gap-2">
              {telemetry.metrics.map((m) => (
                <div key={m.id} className="rounded border border-white/10 bg-black/40 px-2 py-1.5">
                  <div className={`font-display text-lg font-bold leading-none ${TONE_TEXT[m.tone] || TONE_TEXT.neon}`}>
                    <AnimatedNumber value={m.value} decimals={m.id === 'confidence' ? 1 : 0} />
                    <span className="ml-0.5 text-[10px] font-medium opacity-70">{m.unit}</span>
                  </div>
                  <div className="mt-1 font-mono text-[8.5px] leading-tight tracking-[0.14em] text-white/45">{m.label}</div>
                </div>
              ))}
            </div>
          </HudCard>

          {/* live feed */}
          <HudCard
            title="LIVE FEED"
            className="pointer-events-auto flex min-h-[9rem] flex-1 animate-fade-up flex-col [animation-delay:240ms]"
            bodyClassName="min-h-0 flex-1 overflow-hidden p-2"
            right={<span className="font-mono text-[9px] tracking-widest text-white/40">{fmtNum(feed.length)} EVT</span>}
          >
            <ul className="flex h-full flex-col gap-1 overflow-hidden">
              <AnimatePresence initial={false}>
                {feed.map((f) => (
                  <motion.li
                    key={f.id}
                    layout
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <button
                      onClick={() => f.locationId && onSelect(f.locationId)}
                      className={`w-full rounded border px-1.5 py-1 text-left transition-colors hover:border-neon/50 hover:bg-neon/5 ${
                        f.locationId === selectedId ? 'border-neon/60 bg-neon/10' : 'border-white/10 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[9px]">
                        <span className="tabular-nums text-white/40">{fmtClock(f.ts)}</span>
                        <span className={`rounded-sm border px-1 tracking-widest ${TYPE_STYLE[f.type] || TYPE_STYLE.INFO}`}>{f.type}</span>
                        <span className="truncate text-white/55">{nameOf(f.locationId)}</span>
                      </div>
                      <div className="mt-0.5 text-[12px] leading-snug text-white/80">{f.text}</div>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </HudCard>
        </div>
      )}
    </aside>
  );
}
