import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { buildIndiaTexture } from '../../lib/satelliteTexture.js';

const DEG = Math.PI / 180;
const PATCH_RADIUS = 1.002;

/**
 * India only:
 *  • a sphere *patch* (just the lat/lng bounding box of India) textured with satellite imagery that is
 *    masked to the national boundary, so everything outside the border stays transparent;
 *  • a double neon outline (crisp + soft glow) around the boundary.
 */
export default function IndiaLayer({ geometry, borderPoints, bbox, imageUrl, textureSize = 1280, onReady, onProgress }) {
  const gl = useThree((s) => s.gl);
  const [texture, setTexture] = useState(null);

  // build texture (async, time-sliced)
  useEffect(() => {
    let cancelled = false;
    let built = null;
    buildIndiaTexture({ geometry, bbox, imageUrl, size: textureSize, onProgress })
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        built = tex;
        tex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
        setTexture(tex);
        onReady?.();
      })
      .catch((err) => {
        console.error('[IndiaLayer] texture build failed', err);
        onReady?.();
      });
    return () => {
      cancelled = true;
      built?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, bbox, imageUrl, textureSize]);

  // sphere patch that covers exactly the bbox
  const patch = useMemo(() => {
    const [w, s, e, n] = bbox;
    return new THREE.SphereGeometry(PATCH_RADIUS, 160, 160, (w + 180) * DEG, (e - w) * DEG, (90 - n) * DEG, (n - s) * DEG);
  }, [bbox]);
  useEffect(() => () => patch.dispose(), [patch]);

  return (
    <group>
      {texture && (
        <mesh geometry={patch} renderOrder={1}>
          <meshBasicMaterial
            map={texture}
            color={new THREE.Color(1.2, 1.2, 1.2)}
            transparent
            depthWrite={false}
            toneMapped={false}
            side={THREE.FrontSide}
          />
        </mesh>
      )}
      {/* soft outer glow */}
      <Line points={borderPoints} segments color="#00ff88" lineWidth={5} transparent opacity={0.16} depthWrite={false} renderOrder={2} />
      {/* crisp neon edge */}
      <Line points={borderPoints} segments color="#5dffb0" lineWidth={1.4} transparent opacity={0.95} depthWrite={false} renderOrder={3} />
    </group>
  );
}
