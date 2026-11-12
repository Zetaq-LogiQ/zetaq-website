import * as THREE from 'three';
import { scene as onScroll } from '../core/scroll.js';
import { span, lerp, follow, RM } from '../core/math.js';
import { makeBrain } from './brainMesh.js';
import { glowTexture } from './parts.js';

// Chapter 8: a particle brain that lights up as you scroll ("before" -> "after the lesson").
export function brain(stage, sec) {
  const box = sec.querySelector('.sticky'), $ = (q) => sec.querySelector(q);
  const chips = [...sec.querySelectorAll('.chips span')], b1 = $('.b1'), b2 = $('.b2'), state = $('.bstate');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  const { group: head, uniforms } = makeBrain();
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -2;
  scene.add(head, halo);

  const cam = stage.cam;
  let t = 0, s = 0;

  onScroll(sec, (p, dt) => {
    if (!RM) t += dt;
    s = RM ? p : follow(s, p, dt);
    const light = span(s, .3, .8);

    uniforms.uTime.value = t;
    uniforms.uLight.value = lerp(-.2, 1.05, light);   // light spreads from the hubs but never floods the whole brain
    uniforms.uScale.value = box.clientHeight * stage.dpr / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    halo.material.color.set(0xff9a4d).multiplyScalar(.06 + light * .1);

    head.rotation.set(.18, -1.45 + Math.sin(t * .15) * .2 + s * .5, 0);   // side-on (how a brain is most recognisable), tilted slightly from above
    const zoom = Math.max(1, .8 * box.clientHeight / box.clientWidth);   // portrait: step back so the brain fits
    cam.position.set(0, .2, lerp(6.6, 4.8, s) * zoom);
    cam.lookAt(0, .05, 0);
    stage.render(box, scene);

    chips.forEach((c, i) => {
      const o = span(s, .06 + i * .05, .11 + i * .05) * (1 - span(s, .26, .32));
      c.style.opacity = o;
      c.style.translate = `0 ${(1 - o) * 14}px`;
    });
    state.style.opacity = span(s, .26, .32);
    state.textContent = light > .55 ? 'After the lesson' : 'Before the lesson';
    b1.style.opacity = span(s, .34, .42) * (1 - span(s, .6, .66));
    b2.style.opacity = span(s, .7, .78);
  });
}
