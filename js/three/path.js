import * as THREE from 'three';

// The learning path (Designs 3 and 4): a glowing curve the camera flies along.
// Its colour runs from amber at the start to teal at the end; small "signals" travel along it.

const POINTS = [[0, 0, 8], [0, 0, 0], [3, .6, -14], [-2.6, -.4, -30], [2.6, .8, -46], [-2.2, 0, -62], [1.8, .5, -78], [0, .2, -94], [0, 0, -106]];
const AMBER = new THREE.Color(0x5aa8ff), TEAL = new THREE.Color(0x3fd6e0);   // cold blue to teal (name kept from the brochure)

export function makePath(scene) {
  const curve = new THREE.CatmullRomCurve3(POINTS.map((p) => new THREE.Vector3(...p)));
  const SEG = 900, RAD = 8;

  // Tube with a colour per ring of vertices. Values above 1 glow under bloom.
  const tube = new THREE.TubeGeometry(curve, SEG, .022, RAD, false);
  const colors = [], c = new THREE.Color();
  for (let i = 0; i <= SEG; i++) {
    c.lerpColors(AMBER, TEAL, i / SEG).multiplyScalar(1.35);   // just over 1: a fine glow, not a beam
    for (let j = 0; j <= RAD; j++) colors.push(c.r, c.g, c.b);
  }
  tube.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));

  // Bright beads ("signals") that travel forward along the path.
  const N = 10, beadGeo = new THREE.SphereGeometry(.07, 12, 12);
  const beads = Array.from({ length: N }, (_, k) => {
    const m = new THREE.Mesh(beadGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().lerpColors(AMBER, TEAL, k / N).multiplyScalar(5), toneMapped: false }));
    scene.add(m);
    return m;
  });

  return {
    curve,
    update(t) {
      beads.forEach((m, k) => {
        const u = (t * .012 + k / N) % 1;
        m.position.copy(curve.getPointAt(u));
        m.scale.setScalar(.7 + .5 * Math.sin(t * 3 + k));
      });
    },
  };
}

// A point near the path at progress u: `side` to the right, `up` above, `fwd` further along.
const T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
export function near(curve, u, side = 0, up = 0) {
  u = Math.min(1, Math.max(0, u));   // the curve only exists between 0 and 1
  const p = curve.getPointAt(u);
  curve.getTangentAt(u, T);
  S.crossVectors(T, Y).normalize();
  U.crossVectors(S, T).normalize();
  return p.addScaledVector(S, side).addScaledVector(U, up);
}
