import { useEffect } from 'react';

/**
 * Inertial ("momentum") wheel scrolling for a scroll container.
 * Wheel deltas move a target position; the real scrollTop eases toward it every frame.
 * Touch, keyboard and scrollbar-drag scrolling stay native (and re-sync the target).
 * Disabled automatically for users who prefer reduced motion.
 */
export function useSmoothScroll(ref, { ease = 0.11, speed = 0.95 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let pos = el.scrollTop;
    let target = pos;
    let raf = 0;
    let running = false;
    const max = () => Math.max(0, el.scrollHeight - el.clientHeight);

    const tick = () => {
      const d = target - pos;
      if (Math.abs(d) < 0.35) {
        pos = target;
        el.scrollTop = pos;
        running = false;
        return;
      }
      pos += d * ease;
      el.scrollTop = pos;
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.deltaY === 0) return; // pinch-zoom / horizontal gestures stay native
      if (max() <= 0) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? el.clientHeight : 1;
      target = Math.min(max(), Math.max(0, target + e.deltaY * unit * speed));
      if (!running) {
        running = true;
        pos = el.scrollTop;
        raf = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      if (!running) {
        pos = el.scrollTop;
        target = pos;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
    };
  }, [ref, ease, speed]);
}
