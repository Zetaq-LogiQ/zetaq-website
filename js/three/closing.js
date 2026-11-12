import * as THREE from 'three';
import { scene as onScroll } from '../core/scroll.js';
import { span, lerp, follow, RM } from '../core/math.js';
import { makeDevice, glowTexture } from './parts.js';
import { clip, show } from './videos.js';

// Chapter 12: the tablet comes back, turning from its back to face you, showing the school dashboard.
export function closing(stage, sec) {
  const box = sec.querySelector('.sticky'), end = sec.querySelector('.end');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.environment = stage.env;
  scene.environmentIntensity = .6;
  const key = new THREE.DirectionalLight(0xffe2c0, 1.4); key.position.set(3, 4, 5); scene.add(key);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -3; scene.add(glow);
  const dev = makeDevice(); scene.add(dev.g);

  const cam = stage.cam;
  let t = 0, s = 0;

  onScroll(sec, (p, dt) => {
    if (!RM) t += dt;
    s = RM ? p : follow(s, p, dt);
    const turn = span(s, 0, .7);
    dev.g.rotation.set(lerp(.4, .14, turn), lerp(-2.6, -.3, turn) + Math.sin(t * .5) * .06, .04);
    dev.g.position.set(0, -.6 + Math.sin(t * .8) * .05, 0);
    glow.material.color.set(0xff9a4d).multiplyScalar(.04 + turn * .1);
    show(dev.screenMat, clip('school'));
    const zoom = Math.max(1, .8 * box.clientHeight / box.clientWidth);   // portrait: step back so the tablet fits
    cam.position.set(0, .3, lerp(13, 10, turn) * zoom);
    cam.lookAt(0, -.15, 0);
    stage.render(box, scene);
    end.style.opacity = span(s, .25, .45);
  });
}
