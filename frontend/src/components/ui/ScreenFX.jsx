/** Full-screen CRT treatment: scanlines, vignette and a slow sweeping scan band. Pure CSS, pointer-events: none. */
export default function ScreenFX() {
  return (
    <div aria-hidden className="scanlines pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.7) 100%)' }}
      />
      <div className="absolute inset-x-0 top-0 h-28 animate-scan bg-gradient-to-b from-transparent via-neon/[0.05] to-transparent" />
    </div>
  );
}
