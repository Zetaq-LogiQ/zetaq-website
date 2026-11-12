// Boots the page: every chapter registers with the shared scroll loop.
import { start } from './core/scroll.js';
import { autoplay } from './core/media.js';
import { reveal } from './core/reveal.js';
import { header } from './core/header.js';
import { createStage } from './three/stage.js';
import { flush } from './three/videos.js';
import { product } from './three/product.js';
import { brain } from './three/brain.js';
import { closing } from './three/closing.js';
import { films } from './sections/films.js';
import { inside } from './sections/inside.js';
import { grow } from './sections/grow.js';
import { fan } from './sections/fan.js';
import { words } from './sections/words.js';
import { analyse } from './sections/analyse.js';
import { roles } from './sections/roles.js';
import { wall } from './sections/wall.js';

const $ = (q) => document.querySelector(q);

// 3D chapters (fall back to their recordings when WebGL is missing).
const stage = createStage();
if (stage) {
  product(stage, $('#product'));
  brain(stage, $('#brain'));
  closing(stage, $('#close'));
} else {
  document.documentElement.classList.add('no3d');
}

films($('#films'));
inside($('#inside'));
grow($('#adaptive'));
fan($('#games'));
words($('#why'));
analyse($('#analyse'));
roles($('#roles'));
wall($('#beyond'));

autoplay();
reveal();
const updateHeader = header();
start(() => {
  updateHeader();
  if (stage) flush();   // play the 3D clips that were shown this frame, pause the rest
});
