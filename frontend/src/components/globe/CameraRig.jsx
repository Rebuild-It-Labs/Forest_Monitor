import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INDIA_CENTER, latLngToVec3 } from '../../lib/geo.js';

const FOCUS_DIST = 1.72; // camera distance after flying to a marker
const HOME_DIST = 3.0; // default "whole globe" distance
const IDLE_MS = 5500; // inactivity before gentle auto-rotation resumes

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Drives the camera without fighting OrbitControls:
 *  - cinematic fly-to (slerp around the globe + a gentle pull-back arc) when `target` changes
 *  - eases back out when the target is cleared
 *  - re-centres on India when `recenterToken` changes
 *  - shifts the projection (view offset) so the focused marker sits in the *visible* area beside the panel
 *  - pauses auto-rotation while the user is interacting or a site is selected; resumes after IDLE_MS
 *  - slows orbit speed as you zoom in
 */
export default function CameraRig({ target, inset, recenterToken }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls);

  const flight = useRef(null);
  const lastInteraction = useRef(-Infinity);
  const offset = useRef({ x: 0, y: 0 });
  const targetRef = useRef(target);
  targetRef.current = target;
  const tmp = useRef({ q: new THREE.Quaternion(), dir: new THREE.Vector3(), start: new THREE.Vector3() });

  const flyTo = (endDir, endDist, duration, arc) => {
    const start = camera.position.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(start, endDir.clone().normalize());
    flight.current = { t: 0, dur: duration, q, startDir: start, startDist: camera.position.length(), endDist, arc };
    if (controls) controls.enabled = false;
  };

  // selection changes → fly in / out
  useEffect(() => {
    if (!controls) return;
    if (target) {
      flyTo(latLngToVec3(target.lat, target.lng, 1), FOCUS_DIST, 1.9, 0.35);
    } else if (flight.current || camera.position.length() < HOME_DIST - 0.25) {
      flyTo(camera.position.clone(), HOME_DIST, 1.3, 0.1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, controls]);

  // "recenter on India" button
  useEffect(() => {
    if (!controls || !recenterToken) return;
    flyTo(latLngToVec3(INDIA_CENTER.lat + 3, INDIA_CENTER.lng, 1), HOME_DIST, 1.8, 0.25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  // track user interaction for the idle timer
  useEffect(() => {
    if (!controls) return undefined;
    const touch = () => {
      lastInteraction.current = performance.now();
    };
    controls.addEventListener('start', touch);
    controls.addEventListener('end', touch);
    return () => {
      controls.removeEventListener('start', touch);
      controls.removeEventListener('end', touch);
    };
  }, [controls]);

  useFrame((_, dt) => {
    if (!controls) return;
    const { q, dir } = tmp.current;

    // orbit speed scales with zoom (finer control near the surface)
    controls.rotateSpeed = THREE.MathUtils.clamp((camera.position.length() - 1) * 0.32, 0.1, 0.65);

    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = easeInOutCubic(f.t);
      q.identity().slerp(f.q, e);
      dir.copy(f.startDir).applyQuaternion(q);
      const dist = THREE.MathUtils.lerp(f.startDist, f.endDist, e) + Math.sin(Math.PI * e) * f.arc;
      camera.position.copy(dir).multiplyScalar(dist);
      camera.lookAt(0, 0, 0);
      if (f.t >= 1) {
        flight.current = null;
        controls.enabled = true;
        lastInteraction.current = performance.now();
      }
    }

    controls.autoRotate = !targetRef.current && !flight.current && performance.now() - lastInteraction.current > IDLE_MS;

    // slide the projection so the focus point clears the details panel
    const want = targetRef.current ? inset : { x: 0, y: 0 };
    const o = offset.current;
    o.x = THREE.MathUtils.damp(o.x, want.x, 4.5, dt);
    o.y = THREE.MathUtils.damp(o.y, want.y, 4.5, dt);
    const active = Math.abs(o.x) + Math.abs(o.y) > 0.4;
    if (active) {
      camera.setViewOffset(size.width, size.height, o.x, o.y, size.width, size.height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }
  });

  return null;
}
