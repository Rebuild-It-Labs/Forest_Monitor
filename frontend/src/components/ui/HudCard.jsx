/** Glass card with neon corner brackets and a mono-spaced title strip. tone: 'neon' | 'alert' */
export default function HudCard({ title, right, tone = 'neon', className = '', bodyClassName = 'p-3', children }) {
  const alert = tone === 'alert';
  return (
    <section
      className={`${alert ? 'glass-alert' : 'glass'} hud-corners rounded-md ${className}`}
      style={{ '--hud': alert ? '#ff2e63' : '#00ff88' }}
    >
      {title && (
        <header className={`flex items-center justify-between border-b px-3 py-1.5 ${alert ? 'border-alert-red/20' : 'border-neon/15'}`}>
          <h3 className={`font-mono text-[10px] tracking-[0.3em] ${alert ? 'text-alert-red' : 'text-neon/85'}`}>{title}</h3>
          {right}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
