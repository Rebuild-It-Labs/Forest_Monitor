import { Component } from 'react';

/** Catches WebGL / render failures so the HUD can explain what happened instead of showing a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="glass-alert hud-corners max-w-md rounded-md p-5" style={{ '--hud': '#ff2e63' }}>
          <h2 className="font-display text-sm font-bold tracking-[0.2em] text-alert-red text-glow-red">RENDER FAULT</h2>
          <p className="mt-3 text-sm text-white/75">
            The 3D globe could not start. This usually means WebGL is disabled or unsupported in this browser/GPU.
          </p>
          <pre className="mt-3 max-h-28 overflow-auto rounded bg-black/60 p-2 font-mono text-[10px] text-alert-red/80">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      </div>
    );
  }
}
