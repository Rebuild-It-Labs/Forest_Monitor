import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Rest-of-world: one LineSegments draw call of thin dark-grey country outlines (no textures). */
export default function CountryBorders({ positions }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={2}>
      <lineBasicMaterial color="#3b524b" transparent opacity={0.8} depthWrite={false} />
    </lineSegments>
  );
}
