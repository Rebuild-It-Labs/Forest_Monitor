/** Minimal bottom chrome: interaction hint, legend, and a "recenter India" control. */
export default function BottomBar({
  onRecenter,
  isMobile,
  hidden,
  onToggleSatelliteTracker,
  satelliteTrackerOpen,
}) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 transition-opacity duration-500 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="glass pointer-events-auto flex flex-wrap items-center justify-center gap-3 sm:gap-4 rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white/55">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm bg-gradient-to-r from-[#0b3a1a] to-neon" /> FOREST
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-sm bg-gradient-to-r from-alert-magenta to-alert-red" /> LOSS RISK
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-ping-ring rounded-full bg-neon" />
            <span className="h-2.5 w-2.5 rounded-full bg-neon" />
          </span>
          LIVE SITE
        </span>

        {onToggleSatelliteTracker && (
          <button
            onClick={onToggleSatelliteTracker}
            className={`rounded-full border px-2.5 py-0.5 transition-colors ${
              satelliteTrackerOpen
                ? 'border-neon bg-neon/20 text-neon shadow-neon'
                : 'border-white/20 text-white/70 hover:border-neon/40 hover:text-white'
            }`}
          >
            🛰 SATELLITES
          </button>
        )}

        <button
          onClick={onRecenter}
          className="rounded-full border border-neon/40 px-2.5 py-0.5 text-neon transition-colors hover:bg-neon/10 focus-visible:outline-neon"
        >
          RECENTER
        </button>
      </div>
      <p className="no-select hidden font-mono text-[10px] tracking-[0.3em] text-white/30 sm:block">
        {isMobile ? 'TAP A PULSAR OR SATELLITE' : 'DRAG · ORBIT    SCROLL · ZOOM    CLICK SATELLITES & PULSARS'}
      </p>
    </div>
  );
}
