import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { fmtNum } from '../../lib/format.js';

/** Counts up from 0 → value without re-rendering React on every frame. */
export default function AnimatedNumber({ value, decimals = 0, duration = 1.3 }) {
  const ref = useRef(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = fmtNum(v, decimals);
      },
    });
    return () => controls.stop();
  }, [value, decimals, duration]);
  return <span ref={ref}>{fmtNum(value, decimals)}</span>;
}
