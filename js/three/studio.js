import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { glowTexture } from './parts.js';

// The hero's "product shot" set: a mirror floor, two drifting colour lights,
// floating dust for depth, and a light sheen that sweeps across the tablet's glass.

const canvasTex = (w, h, draw) => {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
};

export function studio(scene, dev) {
  // Mirror floor, faded to black towards the edges so there's no visible horizon.
  const floor = new Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: 1024, textureHeight: 1024, color: 0x5a5a5a });
  const fadeMap = canvasTex(256, 256, (x) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgb(150,150,150)');   // grey = partly see-through: the reflection shows
    g.addColorStop(.35, 'rgb(225,225,225)');
    g.addColorStop(1, 'rgb(255,255,255)');   // white = solid background colour
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  });
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x050507, transparent: true, alphaMap: fadeMap }));
  // The floor writes no depth, so the colour lights behind can spill over it (no hard horizon),
  // while the tablet still hides them. The fade draws before the lights.
  floor.material.depthWrite = fade.material.depthWrite = false;
  fade.renderOrder = -2;
  floor.rotation.x = fade.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  fade.position.y = -2.495;
  scene.add(floor, fade);

  // Two soft lights behind the tablet: brand amber and a cool teal from the product UI.
  const light = (hex, k, x) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(hex).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.renderOrder = -1;
    m.position.set(x, .4, -6);
    scene.add(m);
    return m;
  };
  const warm = light(0xff8a3d, .3, -3.2), cool = light(0x2fb6c8, .16, 3.4);

  // Dust drifting slowly upward.
  const N = 700, P = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) P.set([(Math.random() - .5) * 18, -2 + Math.random() * 8, -7 + Math.random() * 11], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe2c0, size: .018, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  // Sheen: a soft diagonal stripe of light that slides across the screen every few seconds.
  const sheenMap = canvasTex(512, 4, (x, w) => {
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.42, 'rgba(255,255,255,0)');
    g.addColorStop(.5, 'rgba(255,255,255,.55)');
    g.addColorStop(.58, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, 4);
  });
  sheenMap.center.set(.5, .5);
  sheenMap.rotation = -.45;
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(dev.W, dev.H), new THREE.MeshBasicMaterial({ map: sheenMap, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sheen.position.z = .064;
  dev.g.add(sheen);

  // t: seconds. hero: 1 in the opening shot (drives the sheen). set: 0 while the screen fills the view (hides floor and dust).
  return function update(t, dt, hero, set) {
    warm.position.x = -3.2 + Math.sin(t * .23) * 1.2; warm.position.y = .4 + Math.cos(t * .19) * .6;
    cool.position.x = 3.4 + Math.sin(t * .17 + 2) * 1.2; cool.position.y = .2 + Math.cos(t * .21 + 1) * .6;
    for (let i = 1; i < P.length; i += 3) { P[i] += dt * .1; if (P[i] > 6) P[i] = -2; }
    dustGeo.attributes.position.needsUpdate = true;
    const phase = (t % 6) / 6;                                // one sweep every 6 seconds
    sheenMap.offset.x = 1.1 - phase * 2.6;
    sheen.material.opacity = hero * .14;                      // subtle: stays under the bloom threshold
    sheen.visible = hero > .01;
    dust.visible = floor.visible = fade.visible = set > .01;
  };
}
