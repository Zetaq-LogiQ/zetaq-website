import { scene } from '../core/scroll.js';
import { span, lerp } from '../core/math.js';

// Chapter 5: the video opens from a rounded card to full bleed.
export function grow(sec) {
  const media = sec.querySelector('.grow'), video = media.querySelector('video'), head = sec.querySelector('.head'), foot = sec.querySelector('.foot');
  scene(sec, (p) => {
    const k = span(p, .08, .62);
    media.style.clipPath = `inset(${lerp(30, 0, k)}% ${lerp(22, 0, k)}% ${lerp(10, 0, k)}% round ${lerp(28, 0, k)}px)`;
    video.style.transform = `scale(${lerp(1.18, 1, k)})`;
    head.style.opacity = 1 - span(p, .3, .48);
    foot.style.opacity = span(p, .7, .84);
  });
}
