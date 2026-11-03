import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVec3, surfaceQuaternion } from '../../lib/geo.js';
import { getGlowTexture } from '../../lib/glowTexture.js';
import { SEVERITY_STYLE } from '../../lib/format.js';

const NEON = '#00ff88';
const CIRCLE_PTS = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  return [Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0];
});
const BEAM = [
  [0, 0, -0.004],
  [0, 0, 0.055],
];

/**
 * A glowing, pulsing "pulsar" pinned to a lat/lng.
 *  idle     → subtle double-ring pulse + soft glow
 *  hover    → core + glow scale up, pulse faster and brighter, label appears
 *  selected → stays lit and gains a slowly rotating dashed reticle
 * All animation is done by mutating refs in useFrame — no React re-renders per frame.
 */
export default function PulsarMarker({ location, hovered, selected, onHover, onSelect }) {
  const { id, lat, lng, name, severity } = location;
  const pos = useMemo(() => latLngToVec3(lat, lng, 1.0045), [lat, lng]);
  const quat = useMemo(() => surfaceQuaternion(lat, lng), [lat, lng]);
  const phase = useMemo(() => ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 100) / 100, [id]);
  const glowTex = useMemo(() => getGlowTexture(), []);

  const ringA = useRef();
  const ringB = useRef();
  const glow = useRef();
  const core = useRef();
  const reticle = useRef();
  const amt = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    amt.current = THREE.MathUtils.damp(amt.current, hovered || selected ? 1 : 0, 9, dt);
    const h = amt.current;
    const speed = 0.5 + h * 0.4;

    [ringA, ringB].forEach((ref, i) => {
      const m = ref.current;
      if (!m) return;
      const p = (t * speed + i * 0.5 + phase) % 1;
      m.scale.setScalar(1 + p * (2.5 + h * 1.5));
      m.material.opacity = Math.pow(1 - p, 1.6) * (0.5 + h * 0.5);
    });
    if (core.current) core.current.scale.setScalar(1 + h * 0.9 + Math.sin(t * 3 + phase * 6) * 0.07);
    if (glow.current) {
      glow.current.scale.setScalar(1 + h * 1.0 + Math.sin(t * 2.2 + phase * 6) * 0.1);
      glow.current.material.opacity = 0.5 + h * 0.5;
    }
    if (reticle.current) {
      reticle.current.rotation.z += dt * 0.9;
      reticle.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    }
  });

  const lit = hovered || selected;
  const sev = SEVERITY_STYLE[severity] || SEVERITY_STYLE.STABLE;

  return (
    <group position={pos} quaternion={quat} renderOrder={4}>
      <Line points={BEAM} color={NEON} lineWidth={1} transparent opacity={0.55} depthWrite={false} />

      <mesh ref={glow} renderOrder={4}>
        <planeGeometry args={[0.12, 0.12]} />
        <meshBasicMaterial map={glowTex} color={NEON} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {[ringA, ringB].map((ref, i) => (
        <mesh key={i} ref={ref} renderOrder={5}>
          <ringGeometry args={[0.0105, 0.0138, 48]} />
          <meshBasicMaterial color={NEON} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}

      <mesh ref={core} position={[0, 0, 0.0015]} renderOrder={6}>
        <circleGeometry args={[0.0078, 24]} />
        <meshBasicMaterial color="#c8ffe2" toneMapped={false} depthWrite={false} />
      </mesh>

      {selected && (
        <group ref={reticle}>
          <Line points={CIRCLE_PTS} color={NEON} lineWidth={1.4} dashed dashSize={0.018} gapSize={0.012} transparent opacity={0.9} depthWrite={false} />
        </group>
      )}

      {/* generous invisible hit-target */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return; // it was a drag, not a click
          onSelect(id);
        }}
      >
        <circleGeometry args={[0.034, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {lit && (
        <Html position={[0, 0, 0.02]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="no-select -translate-y-9 whitespace-nowrap rounded border border-neon/40 bg-black/75 px-2.5 py-1 font-mono text-[11px] tracking-wider text-neon shadow-neon backdrop-blur-sm">
            <span className="font-semibold text-white">{name.toUpperCase()}</span>
            <span className={`ml-2 ${sev.text}`}>● {severity}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
