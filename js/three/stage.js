import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// One WebGL renderer shared by every 3D chapter.
// The canvas moves into whichever chapter is drawing, so it scrolls away with that chapter.
// Returns null when WebGL isn't available.
export function createStage() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { return null; }

  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // filmic highlights instead of hard clipping
  renderer.domElement.className = 'gl';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  // Soft studio reflections for metal and glass.
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 100);

  // Post-processing draws into an off-screen buffer, where the canvas `antialias` flag does nothing.
  // So that buffer gets its own 4x multisampling, otherwise every edge is jagged.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  // Bloom with threshold 1: only colours brighter than white (our "emissive" bits) glow.
  const composer = new EffectComposer(renderer, target);
  const pass = new RenderPass(new THREE.Scene(), cam);
  composer.addPass(pass);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .8, .5, 1));
  composer.addPass(new OutputPass());

  let host = null, W = 0, H = 0;
  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };

  return {
    cam, env, dpr,
    // Draw `scene` inside `el` (a chapter's sticky box).
    render(el, scene) {
      if (host !== el) { host = el; el.prepend(renderer.domElement); W = H = 0; }
      fit();
      pass.scene = scene;
      composer.render();
    },
  };
}
