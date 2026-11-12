// ZetaQ tour: the portal entrance, then Design 4's flight past big, readable showcases.
import { start } from '../../js/core/scroll.js';
import { header } from '../../js/core/header.js';
import { createStage } from '../../js/three/stage.js';
import { flush } from '../../js/three/videos.js';
import { tour } from './tour.js';

const stage = createStage();
if (stage) {
  window.__tour = 1;            // tells the page's load check that the 3D tour started
  tour(stage, document.getElementById('tour'));
  const updateHeader = header();
  start(() => { updateHeader(); flush(); });
}
