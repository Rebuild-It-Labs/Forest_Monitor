import { useEffect, useRef, useState } from 'react';

const jitter = (cfg) => +(cfg.base + (Math.random() - 0.5) * 2 * cfg.jitter).toFixed(1);

/**
 * Turns the static `telemetry` block of data.json into a living HUD:
 * a UTC clock, jittering system readouts and a rolling event feed.
 * (Swap the intervals for a WebSocket / SSE subscription when you have a real backend.)
 */
export function useLiveTelemetry(telemetry) {
  const sys = telemetry.system;
  const idRef = useRef(0);
  const cursor = useRef(0);

  const makeEntry = (item, ts) => ({ ...item, ts, id: `f${idRef.current++}` });

  const [now, setNow] = useState(() => new Date());
  const [vals, setVals] = useState(() => ({
    latency: sys.latencyMs.base,
    ingest: sys.ingestRateMBs.base,
    gpu: sys.gpuLoadPct.base,
  }));
  const [feed, setFeed] = useState(() => {
    const base = Date.now();
    const items = telemetry.feed.slice(0, 5);
    cursor.current = items.length;
    return items.map((it, i) => makeEntry(it, new Date(base - (i + 1) * 47_000))).sort((a, b) => b.ts - a.ts);
  });

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setVals({ latency: jitter(sys.latencyMs), ingest: jitter(sys.ingestRateMBs), gpu: Math.round(jitter(sys.gpuLoadPct)) });
    }, 1000);
    return () => clearInterval(id);
  }, [sys]);

  useEffect(() => {
    if (!telemetry.feed.length) return undefined;
    const id = setInterval(() => {
      const item = telemetry.feed[cursor.current++ % telemetry.feed.length];
      setFeed((f) => [makeEntry(item, new Date()), ...f].slice(0, 7));
    }, 3600);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  return { now, vals, feed };
}
