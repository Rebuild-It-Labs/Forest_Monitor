import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * The dark, translucent-feeling planet body:
 *  - near-black core with a fresnel rim in emerald
 *  - a faint 15° lat/long graticule drawn in the fragment shader (no extra geometry)
 *  - an additive atmosphere shell behind it
 *
 * The body mesh also swallows pointer events so markers on the far side can't be hovered "through" the planet.
 */
const bodyVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const bodyFrag = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec2 vUv;
  uniform vec3 uCore;
  uniform vec3 uRim;

  float gridLine(vec2 uv, vec2 n) {
    vec2 g = uv * n;
    vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    return 1.0 - min(min(d.x, d.y), 1.0);
  }

  void main() {
    float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.6);
    vec3 c = mix(uCore, uRim * 0.55, fres);
    float g = gridLine(vUv, vec2(24.0, 12.0));
    c += uRim * g * 0.075;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  void main() {
    // back faces: normals point away from the viewer, so -dot grows toward the planet's silhouette
    float a = clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    float i = pow(a, 1.7) * 2.4;
    gl_FragColor = vec4(uColor * i, i);
  }
`;

export default function GlobeBase() {
  const bodyUniforms = useMemo(
    () => ({ uCore: { value: new THREE.Color('#010504') }, uRim: { value: new THREE.Color('#00ff88') } }),
    [],
  );
  const atmoUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#00ff88') } }), []);
  const swallow = (e) => e.stopPropagation();

  return (
    <group>
      <mesh onPointerMove={swallow} onPointerOver={swallow} onClick={swallow}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial vertexShader={bodyVert} fragmentShader={bodyFrag} uniforms={bodyUniforms} />
      </mesh>
      <mesh scale={1.13} renderOrder={0}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          uniforms={atmoUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
