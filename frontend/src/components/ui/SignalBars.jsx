/** Four animated "signal strength" bars. */
export default function SignalBars({ className = '', color = 'bg-neon' }) {
  return (
    <span className={`inline-flex h-3.5 items-end gap-[3px] ${className}`} aria-hidden>
      {[0, 0.18, 0.36, 0.54].map((d, i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom animate-signal rounded-sm ${color}`}
          style={{ height: `${40 + i * 20}%`, animationDelay: `${d}s` }}
        />
      ))}
    </span>
  );
}
