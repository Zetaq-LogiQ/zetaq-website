import * as THREE from 'three';
import { glowTexture } from './parts.js';

// Background: a deep star field and a few soft nebula glows placed along the route.
export function makeSpace(scene) {
  const N = 4500, P = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) P.set([(Math.random() - .5) * 90, (Math.random() - .5) * 60, 25 - Math.random() * 160], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc9d4ff, size: .07, transparent: true, opacity: .8, depthWrite: false, fog: false })));

  // [colour, strength, x, y, z, size]
  [[0x7a5cff, .35, -14, 6, -40, 46], [0x3fd6e0, .28, 16, -4, -70, 50], [0x3a7bff, .3, -8, 2, -104, 44], [0x7a5cff, .25, 12, 8, -12, 36]]
    .forEach(([hex, k, x, y, z, size]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(hex).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set(x, y, z);
      scene.add(m);
    });
}
