import * as THREE from 'three';

// Video textures for the 3D chapters.
// Chapters call clip() every frame for what they show; flush() then plays those,
// pauses everything else, and frees the least recently used clips.

const cache = new Map();
const wanted = new Set();const KEEP = 10;
// Resolved from this file's location, so pages in sub-folders (design2/, design3/) find the same assets.
const ASSETS = new URL('../../assets/', import.meta.url).href;
// key: unique name. src: file in assets (defaults to key).
// at: show a still frame at this time instead of playing.
// crop: the video's aspect ratio, when it differs from our 16:10 screens (we crop the sides).
// from/to: play only that part of the recording, looped (the same file can then appear twice with different parts).
export function clip(key, { src = key, at, crop, from, to } = {}) {
  if (from != null) key = `${key}@${from}`;
  let e = cache.get(key);
  if (!e) {
    const v = Object.assign(document.createElement('video'), { src: `${ASSETS}${src}.mp4`, muted: true, loop: true, playsInline: true, preload: 'auto' });
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Mipmaps + anisotropic filtering keep screen text sharp instead of shimmering when tilted or small.
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    if (crop) { const r = 1.6 / crop; tex.repeat.set(r, 1); tex.offset.set((1 - r) / 2, 0); }
    if (from != null) {
      v.loop = false;
      v.addEventListener('loadedmetadata', () => { v.currentTime = from; }, { once: true });
      v.addEventListener('timeupdate', () => { if (v.currentTime >= (to ?? v.duration - .1) || v.currentTime < from - .5) v.currentTime = from; });
      v.addEventListener('ended', () => { v.currentTime = from; v.play().catch(() => {}); });
    }
    if (at != null) {
      v.addEventListener('loadedmetadata', () => { v.currentTime = at; }, { once: true });
      v.addEventListener('seeked', () => { tex.needsUpdate = true; });
    }
    // hold: set by a chapter to freeze the clip on its current frame (e.g. at the end of a walkthrough step).
    cache.set(key, e = { v, tex, still: at != null, hold: false, last: 0 });
  }
  wanted.add(key);
  e.last = performance.now();
  return e;
}

// Point a material at a clip. Only touches the material when the clip changes.
export function show(mat, e) {
  if (mat.map === e.tex) return;
  mat.map = e.tex;
  mat.needsUpdate = true;
}

export function flush() {
  cache.forEach((e, key) => {
    const on = wanted.has(key) && !e.still && !e.hold;
    if (on && e.v.paused) e.v.play().catch(() => {});
    else if (!on && !e.v.paused) e.v.pause();
  });
  if (cache.size > KEEP) {
    let oldest = null;
    cache.forEach((e, key) => { if (!wanted.has(key) && (!oldest || e.last < oldest[1].last)) oldest = [key, e]; });
    if (oldest) {
      const [key, e] = oldest;
      e.v.removeAttribute('src'); e.v.load(); e.tex.dispose();
      cache.delete(key);
    }
  }
  wanted.clear();
}
