// The brain's shape as a distance function (negative inside, positive outside), used by brainMesh.js.
// Two hemispheres and temporal lobes blended into one skin, a groove between the hemispheres,
// folds (gyri) pushed in and out of the surface, the cerebellum with fine layers, and the brain stem.
// Axes: x = left/right, y = up, z = front (+) / back (-). Everything fits inside [-1, 1].

// [centre x, y, z, radius x, y, z]
const LOBES = [
  [.34, .17, .02, .4, .52, .8], [-.34, .17, .02, .4, .52, .8],            // hemispheres
  [.42, -.15, .2, .28, .27, .5], [-.42, -.15, .2, .28, .27, .5],          // temporal lobes
];
const CEREBELLUM = [[.17, -.35, -.56, .23, .2, .27], [-.17, -.35, -.56, .23, .2, .27]];

const ellipsoid = (x, y, z, [cx, cy, cz, rx, ry, rz]) => {
  const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
  return (Math.sqrt(a * a + b * b + c * c) - 1) * Math.min(rx, ry, rz);
};
// Smooth minimum: blends two shapes into one skin instead of leaving a crease.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
// Sulci: thin winding grooves. A smooth wavy pattern crosses zero along meandering lines;
// near those lines this returns 1 (a groove), elsewhere 0 (smooth folds between grooves).
const wave = (x, y, z) => Math.sin(x * 5.3 + Math.sin(z * 4.1) * 1.7) * Math.cos(y * 5.9 + Math.sin(x * 3.7) * 1.3) + .6 * Math.sin(z * 6.7 + Math.cos(y * 4.3) * 1.5);
const sulci = (x, y, z) => { const n = Math.abs(wave(x, y, z)); return n > .16 ? 0 : 1 - (n / .16) ** 2; };

export function brainSdf(x, y, z) {
  let cortex = ellipsoid(x, y, z, LOBES[0]);
  for (let i = 1; i < LOBES.length; i++) cortex = smin(cortex, ellipsoid(x, y, z, LOBES[i]), .14);
  if (y > -.1) cortex = Math.max(cortex, .035 - Math.abs(x));             // the groove between the hemispheres
  cortex += .035 * sulci(x, y, z);                                        // cut the grooves into the surface
  let cere = smin(ellipsoid(x, y, z, CEREBELLUM[0]), ellipsoid(x, y, z, CEREBELLUM[1]), .08);
  cere -= .01 * Math.sin(y * 70);                                         // fine layers on the cerebellum
  // Brain stem: a tapering capsule under the middle.
  const t = Math.min(1, Math.max(0, (-.25 - y) / .62));
  const stem = Math.hypot(x, y - (-.25 - t * .62), z - (-.26 - t * .12)) - (.1 - t * .03);
  return Math.min(smin(cortex, cere, .05), stem);
}

// Regions where the light starts when the brain "lights up".
export const HUBS = [[.35, .4, .55], [-.35, .4, .55], [.3, .6, -.2], [-.42, -.15, .25], [-.3, .2, -.62], [0, -.36, -.56]];
