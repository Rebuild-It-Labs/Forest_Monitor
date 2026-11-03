import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SATELLITE_CONSTELLATION, getOrbitRingPoints, getSatelliteState } from '../../lib/satelliteOrbit.js';

function OrbitRing({ sat, isSelected }) {
  const points = useMemo(() => getOrbitRingPoints(sat), [sat]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <primitive object={new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: sat.color,
        transparent: true,
        opacity: isSelected ? 0.85 : 0.28,
        depthWrite: false,
      })
    )} />
  );
}

function SatelliteEntity({ sat, isSelected, isHovered, onSelect, onHover }) {
  const satRef = useRef();
  const beamRef = useRef();
  const nadirDiscRef = useRef();
  const pulseRef = useRef(0);

  // Reusable vectors
  const tmpBeamPoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);
  const beamGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(tmpBeamPoints), [tmpBeamPoints]);

  useFrame((_, delta) => {
    const state = getSatelliteState(sat, Date.now());
    if (satRef.current) {
      satRef.current.position.copy(state.pos);
      satRef.current.lookAt(0, 0, 0); // nadir orientation toward earth center
    }

    if (beamRef.current) {
      const posAttr = beamRef.current.geometry.attributes.position;
      posAttr.setXYZ(0, state.pos.x, state.pos.y, state.pos.z);
      posAttr.setXYZ(1, state.nadirPos.x, state.nadirPos.y, state.nadirPos.z);
      posAttr.needsUpdate = true;
    }

    if (nadirDiscRef.current) {
      nadirDiscRef.current.position.copy(state.nadirPos);
      nadirDiscRef.current.lookAt(0, 0, 0);

      pulseRef.current += delta * 3;
      const s = 1 + 0.2 * Math.sin(pulseRef.current);
      nadirDiscRef.current.scale.set(s, s, s);
    }
  });

  const satColor = new THREE.Color(sat.color);

  return (
    <group>
      {/* Sensor Nadir Track Line down to Earth */}
      <primitive object={new THREE.Line(
        beamGeom,
        new THREE.LineBasicMaterial({
          color: sat.color,
          transparent: true,
          opacity: isSelected ? 0.7 : 0.25,
          depthWrite: false,
        })
      )} ref={beamRef} />

      {/* Earth Surface Nadir Swath Target */}
      <group ref={nadirDiscRef}>
        <mesh>
          <ringGeometry args={[0.015, 0.035, 24]} />
          <meshBasicMaterial
            color={sat.color}
            transparent
            opacity={isSelected ? 0.8 : 0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Satellite Body in Orbit */}
      <group
        ref={satRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(sat);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(sat.id);
        }}
        onPointerOut={() => onHover?.(null)}
      >
        {/* Large invisible click / hover target disc */}
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Satellite main bus / payload */}
        <mesh>
          <boxGeometry args={[0.024, 0.024, 0.04]} />
          <meshStandardMaterial color="#c0c5cc" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Solar Arrays Left & Right */}
        <mesh position={[0.05, 0, 0]}>
          <boxGeometry args={[0.065, 0.018, 0.003]} />
          <meshStandardMaterial color="#1a4b88" metalness={0.9} roughness={0.1} emissive="#0a2040" />
        </mesh>
        <mesh position={[-0.05, 0, 0]}>
          <boxGeometry args={[0.065, 0.018, 0.003]} />
          <meshStandardMaterial color="#1a4b88" metalness={0.9} roughness={0.1} emissive="#0a2040" />
        </mesh>

        {/* Nadir Sensor Aperture */}
        <mesh position={[0, 0, 0.022]}>
          <cylinderGeometry args={[0.008, 0.008, 0.006, 16]} rotation={[Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color={sat.color} />
        </mesh>

        {/* Status Beacon LED */}
        <mesh position={[0, 0.016, 0]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshBasicMaterial color={sat.color} />
        </mesh>

        {/* Selection Aura */}
        {(isSelected || isHovered) && (
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={sat.color} transparent opacity={0.3} wireframe />
          </mesh>
        )}
      </group>
    </group>
  );
}

export default function SatelliteConstellation({
  selectedSatelliteId,
  onSelectSatellite,
  showOrbits = true,
  hoverId,
  setHoverId,
}) {
  return (
    <group name="satellite-constellation">
      {SATELLITE_CONSTELLATION.map((sat) => (
        <group key={sat.id}>
          {showOrbits && (
            <OrbitRing sat={sat} isSelected={selectedSatelliteId === sat.id} />
          )}
          <SatelliteEntity
            sat={sat}
            isSelected={selectedSatelliteId === sat.id}
            isHovered={hoverId === sat.id}
            onSelect={onSelectSatellite}
            onHover={setHoverId}
          />
        </group>
      ))}
    </group>
  );
}

