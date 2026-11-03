const TONES = {
  neon: 'text-neon text-glow border-neon/20',
  alert: 'text-alert-red text-glow-red border-alert-red/25',
  magenta: 'text-alert-magenta border-alert-magenta/25',
  white: 'text-white border-white/15',
};

export default function StatTile({ label, value, unit, tone = 'neon', sub }) {
  return (
    <div className={`rounded-md border bg-black/40 px-3 py-2.5 ${TONES[tone]}`}>
      <div className="font-mono text-[9px] tracking-[0.2em] text-white/45">{label}</div>
      <div className="mt-1 font-display text-xl font-bold leading-none">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium opacity-70">{unit}</span>}
      </div>
      {sub && <div className="mt-1 font-mono text-[10px] text-white/45">{sub}</div>}
    </div>
  );
}
