// Dinosaur Gallery of the ZetaQ Museum (website copy of 3_AI_Research/Skill_Trials/_outputs/14_museum).
// All nine galleries are built as empty halls so every doorway leads somewhere real, but only the dinosaur gallery is open:
// its own ten exhibits, plus one far exhibit in each neighbouring hall that you glimpse through the doorways.
// Room grid: col -1..1 (west to east), row -1..1 (north to south). Local x,z in metres, room spans -16..16.
// Exhibit: [file, kind, x, z, size, turn(deg), title, fact, opts]. kind: p floor plinth, e pedestal, c glass case, h hanging.
export const OPEN = 'dino';

export const ROOMS = [
  { id: 'entrance', name: 'Entrance Hall', col: 0, row: 1, H: 10, wall: '#6d6a60', amb: [.62, .60, .55],
    line: 'Lion pillars, an iron pillar and India\'s great cats greet every visitor.' },
  { id: 'great', name: 'The Great Hall', col: 0, row: 0, H: 17, wall: '#7f7a6c', amb: [.72, .72, .70], skylight: true,
    line: 'A blue whale hangs under the skylight, over a T. rex and the giants of the past.' },
  { id: 'dino', name: 'Age of Dinosaurs', col: 0, row: -1, H: 16, wall: '#34504c', amb: [.46, .50, .47] },
  { id: 'seas', name: 'Seas of Deep Time', col: 1, row: -1, H: 10, wall: '#2c4257', amb: [.36, .44, .54],
    line: 'Mosasaurs, megalodon and the strange hunters of ancient oceans.' },
  { id: 'ocean', name: 'Ocean Life', col: 1, row: 0, H: 10, wall: '#20405c', amb: [.30, .42, .58],
    line: 'A whale shark, manta rays and the giant squid of the deep sea.' },
  { id: 'earth', name: 'Earth and Space', col: 1, row: 1, H: 9, wall: '#3c3a44', amb: [.40, .39, .44],
    line: 'Walk into a giant geode and hold rocks that fell from space.' },
  { id: 'ice', name: 'The Ice Age', col: -1, row: -1, H: 10, wall: '#56666c', amb: [.52, .57, .60],
    line: 'Mammoths, sabre-toothed cats and the giants of the last Ice Age.' },
  { id: 'human', name: 'The Human Story', col: -1, row: 0, H: 9, wall: '#75593c', amb: [.52, .46, .38],
    line: 'From Lucy to the first farmers, and the oldest art people made.' },
  { id: 'india', name: 'Ancient India', col: -1, row: 1, H: 10, wall: '#7c4a34', amb: [.56, .45, .37],
    line: 'Harappan seals, a stupa and gateway, and the gold of the Guptas.' },
];

export const EXHIBITS = {
  dino: [
    ['sauropod_skeleton', 'p', 0, 1, 20, -39, 'Sauropod Skeleton', 'Long-necked plant-eaters were the largest animals ever to walk on land.', { h: 13.5 }],
    ['t_rex', 'p', -9, -9.5, 10, 12, 'Tyrannosaurus rex', 'Its bite was among the strongest of any land animal known.'],
    ['spinosaurus', 'p', 9, -10.5, 11, -12, 'Spinosaurus', 'A sail-backed predator of North Africa that fed on fish and spent much of its time near water.'],
    ['triceratops', 'p', -9.5, 11, 8, -15, 'Triceratops', 'A large plant-eater with a beak for cropping tough plants.'],
    ['rajasaurus', 'p', 9.5, 11, 8, 15, 'Rajasaurus', 'An Indian dinosaur, found in Gujarat. Its name means "princely lizard".'],
    ['velociraptor_feathered', 'e', -14, -3.5, 1.9, 90, 'Velociraptor', 'About the size of a turkey, and covered in feathers.'],
    ['oviraptor_on_nest', 'e', 14, -3.5, 1.7, -90, 'Oviraptor on its Nest', 'Fossils show that these dinosaurs sat on their nests, much like birds.'],
    ['dinosaur_egg_nest', 'c', -14, 5, 1, 0, 'Nest of Eggs', 'Dinosaurs laid eggs. India has rich nesting sites in the Narmada valley.'],
    ['baby_dinosaur_hatching', 'c', 14, 5, .8, 0, 'Hatchling', 'A reconstruction of a baby dinosaur breaking out of its egg.'],
    ['dinosaur_footprint_slab', 'e', 0, -14, 2.2, 0, 'Footprint Slab', 'Fossil footprints record how an animal walked, and how fast.'],
  ],
  // glimpses through the doorways (lighter copies: 1K textures)
  great: [
    ['t_rex_skeleton', 'p', 0, 0, 12, 20, 'Tyrannosaurus rex', 'One of the largest meat-eating land animals ever.', { h: 6.4 }],
    ['blue_whale_skeleton', 'h', 0, 0, 20, 110, 'Blue Whale Skeleton', 'The largest animal known to have lived.', { y: 12.4, cutDark: true }],
  ],
  seas: [['mosasaurus', 'h', 0, 0, 13, 25, 'Mosasaurus', 'A giant sea lizard from the last part of the age of dinosaurs.', { y: 6.2 }]],
  ice: [['mammoth_skeleton', 'p', 0, 0, 5.5, 25, 'Mammoth Skeleton', 'Mammoths are close relatives of the elephants living today.']],
};
