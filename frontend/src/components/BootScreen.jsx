import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  { key: 'data', text: 'FETCHING SITE REGISTRY  ·  data.json' },
  { key: 'geo', text: 'LOADING BORDER GEOMETRY  ·  world-atlas' },
  { key: 'texture', text: 'COMPOSITING INDIA SATELLITE MOSAIC' },
];

/** Full-screen boot sequence shown until data, geometry and the India texture are all ready. */
export default function BootScreen({ visible, stages, textureProgress = 0 }) {
  const done = STEPS.filter((s) => stages[s.key]).length;
  const pct = Math.round(((done + (stages.texture ? 0 : textureProgress * 0.9)) / STEPS.length) * 100);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boot"
          className="scanlines bg-grid fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className="w-[min(420px,86vw)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inset-0 animate-ping-ring rounded-full bg-neon" />
                <span className="h-3 w-3 rounded-full bg-neon" />
              </span>
              <h2 className="font-display text-lg font-bold tracking-[0.25em] text-white text-glow">INDIA FOREST WATCH</h2>
            </div>
            <ul className="space-y-2 font-mono text-[11px] tracking-[0.15em]">
              {STEPS.map((s) => (
                <li key={s.key} className={`flex items-center gap-2 ${stages[s.key] ? 'text-neon' : 'text-white/40'}`}>
                  <span className="w-4">{stages[s.key] ? '✔' : <span className="animate-blink">▸</span>}</span>
                  {s.text}
                </li>
              ))}
            </ul>
            <div className="mt-6 h-[3px] w-full overflow-hidden rounded bg-white/10">
              <div className="h-full bg-neon shadow-neon transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.25em] text-white/35">
              <span>UPLINK HANDSHAKE</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
