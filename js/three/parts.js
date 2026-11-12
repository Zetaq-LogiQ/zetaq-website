import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Reusable 3D pieces: the tablet, a soft glow sprite, a rounded-corner mask.

const canvas = (w, h, draw) => {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
};

let glowTex, roundTex;

// Radial white-to-clear blob. Tint it with the material colour; use additive blending.
export function glowTexture() {
  return glowTex ??= canvas(256, 256, (x) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,.55)');
    g.addColorStop(.45, 'rgba(255,255,255,.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  });
}

// White rounded rectangle on black, used as an alphaMap to round the corners of video panes.
export function roundTexture() {
  return roundTex ??= canvas(640, 400, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(0, 0, w, h, 26); x.fill();
  });
}

// A slim tablet: dark aluminium body and a 16:10 screen (the same shape as the product recordings).
export function makeDevice() {
  const W = 3.2, H = 2;
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W + .2, H + .2, .12, 6, .1),
    new THREE.MeshPhysicalMaterial({ color: 0x1c1d22, metalness: .9, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 }),
  );
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), screenMat);
  screen.position.z = .061;
  g.add(body, screen);
  return { g, screenMat, W, H };
}
