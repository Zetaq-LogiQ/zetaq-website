// The tour, section by section. Desktop (tour/) and mobile (m/tour.html) both read this file.
// Next / Back move between SECTIONS. Inside a section the small ‹ › control (a swipe on phones) moves between its ITEMS.
// Keep it short (user 2026-11-12): about 5 chapter videos, 1-2 interactive lessons per subject, one clip per lab,
// and one each for the quiz, notes, weekly plan, Sage, teachers, parents and schools.
// A clip: { key, src?, at?, crop?, from?, to? }. key = file in assets/ (or src); at = a still frame from that second;
// crop = the video's aspect when it isn't our 16:10 screen shape; from/to = play only that part of the recording, looped.
// Every key needs a poster at assets/posters/<key>.jpg. More clips to choose from: js/data/library.js, _src/clip_inventory.md.
import { LABS } from './labs.js';
import { STUDENT_STEPS } from './steps.js';

const one = (lab, fallback) => {    // the Curiosity Hub: one clip per lab, recorded clips first
  const byLab = new Map();
  [...(LABS ?? []), ...fallback].forEach((it) => { if (!byLab.has(it.group)) byLab.set(it.group, it); });
  return [...byLab.values()];
};

// Section types: 'walk' = the student walkthrough (items are its steps), 'shelf' = a row of clips you browse,
// 'brain' = the live diverging brain, 'end' = the closing ring.
export const SECTIONS = [
  { key: 'dashboard', label: 'Student dashboard', type: 'walk', kick: 'For students', title: 'Everything a child needs, <em>in one place</em>',
    clip: { key: 'student_dark' }, items: STUDENT_STEPS.map(([from, to, name]) => ({ name, from, to })) },

  { key: 'videos', label: 'Chapter videos', type: 'shelf', kick: 'Chapter videos', title: 'A film for <em>every chapter</em>',
    items: [
      { clip: { key: 'lib/c5-math-fractions', crop: 16 / 9 }, name: 'Fractions', sub: 'Class 5 · Mathematics' },
      { clip: { key: 'lib/c7-sci-acids', crop: 16 / 9 }, name: 'Acidic, Basic and Neutral', sub: 'Class 7 · Science' },
      { clip: { key: 'lib/c7-sci-electricity', crop: 16 / 9 }, name: 'Electricity', sub: 'Class 7 · Science' },
      { clip: { key: 'lib/c6-ss-landforms', crop: 16 / 9 }, name: 'Landforms and Life', sub: 'Class 6 · Social Science' },
      { clip: { key: 'lib/c7-sci-plants', crop: 16 / 9 }, name: 'Life Processes in Plants', sub: 'Class 7 · Science' },
    ] },

  { key: 'interactive', label: 'Interactive lessons', type: 'shelf', kick: 'Interactive lessons', title: 'Step <em>inside</em> every subject',
    items: [
      { clip: { key: 'geo_volcano', crop: 16 / 9 }, name: 'Wake a <em>volcano</em>', sub: 'Geography · See what happens deep below' },
      { clip: { key: 'hero_mohenjo', crop: 16 / 9 }, name: 'Dive in. <em>See how they lived.</em>', sub: 'History · Explore Mohenjo-daro, answer as you go' },
      { clip: { key: 'stoneage', crop: 16 / 9 }, name: 'Step into <em>prehistory.</em>', sub: 'History · From a museum case to a Stone Age camp' },
      { clip: { key: 'optics' }, name: 'Change the rules. <em>Watch nature answer.</em>', sub: 'Physics · Bend light, measure the angle' },
      { clip: { key: 'molecules', crop: 16 / 9 }, name: 'A full lab, <em>right in your hands</em>', sub: 'Chemistry · Turn a molecule in your hand' },
      { clip: { key: 'cell', crop: 16 / 9 }, name: 'Explore life, <em>cell by cell</em>', sub: 'Biology · Tap a cell open' },
      { clip: { key: 'hero_enzyme', crop: 16 / 9 }, name: 'Watch an enzyme <em>at work</em>', sub: 'Biology · Inside digestion' },
      { clip: { key: 'math_trig', crop: 16 / 9 }, name: 'Stand <em>inside</em> the maths', sub: 'Mathematics · Measure a real mountain' },
      { clip: { key: 'lang_lesson', crop: 16 / 9 }, name: 'Learn grammar <em>by using it</em>', sub: 'Languages · Fix your own mistakes' },
    ] },

  { key: 'quiz', label: 'Adaptive quiz', type: 'shelf', kick: 'Adaptive quiz', title: 'It levels up <em>as you do</em>',
    items: [{ clip: { key: 'adaptive', crop: 16 / 9 }, name: 'Every answer sets the next question', sub: 'Get it right and the level goes up' }] },

  { key: 'notes', label: 'Chapter notes', type: 'shelf', kick: 'Chapter notes', title: 'Every chapter, <em>on one page</em>',
    items: [{ clip: { key: 'lib/notes-key-ideas' }, name: 'Notes for every chapter', sub: 'Read it, revise it, before every test' }] },

  { key: 'weekly', label: 'Weekly plan', type: 'shelf', kick: 'Weekly study plan', title: 'A plan made <em>for this week</em>',
    items: [{ clip: { key: 'weekly_plan' }, name: 'Your study roadmap', sub: 'Exams, homework and the chapters to work on' }] },

  { key: 'sage', label: 'Sage', type: 'shelf', kick: 'Sage, the doubt solver', title: 'Ask anything. <em>Get it your way.</em>',
    items: [{ clip: { key: 'lib/sage-teacher' }, name: 'Ask Sage', sub: 'Answers that explain why, not just what' }] },

  { key: 'games', label: 'Games', type: 'shelf', kick: 'Games', title: 'Where the right answer is <em>how you win</em>',
    items: [
      { clip: { key: 'game', crop: 16 / 9 }, name: 'True or false race', sub: 'Ride through the right gate' },
      { clip: { key: 'leaderboard_dark' }, name: 'Leaderboards', sub: 'Class-wise and subject-wise' },
    ] },

  { key: 'hub', label: 'Curiosity Hub', type: 'shelf', kick: 'Curiosity Hub', title: 'Labs to explore, <em>build and wonder</em>',
    items: one(LABS, [
      { clip: { key: 'assembly' }, name: 'Build a rocket', sub: 'Piece by piece', group: 'Engineering Lab' },
      { clip: { key: 'litmus' }, name: 'Litmus test', sub: 'Acid or base?', group: 'Chemistry Lab' },
      { clip: { key: 'human', crop: 16 / 9 }, name: 'The human body', sub: 'Every system, in 3D', group: 'Biology Lab' },
      { clip: { key: 'refract', crop: 16 / 9 }, name: 'Bending light', sub: 'Refraction you can play with', group: 'Physics Lab' },
      { clip: { key: 'solar', crop: 16 / 9 }, name: 'The solar system', sub: 'Travel planet to planet', group: 'Virtual Observatory' },
      { clip: { key: 'pottery', crop: 16 / 9 }, name: 'Make it yours', sub: 'Shape it, then paint your own design', group: 'Creativity Hub' },
    ]) },

  { key: 'brain', label: 'The brain', type: 'brain', kick: 'The science inside', film: { key: 'universe' },
    lines: [[0, 'Every response <em>tells us something</em>'], [2.9, 'Each signal <em>branches</em>'], [7.4, 'A universe of signals <em>for every child</em>'],
      [10.4, 'All of it maps to <em>the Learning Brain</em>'], [13.4, 'Then it reaches <em>the people who can help</em>']],
    sub: 'Built by scientists. An engine that reads every response, every choice, every mistake, and asks one question: why?' },

  // The grown-ups' dashboards. feats = [second in the recording, feature]: the caption follows the recording.
  { key: 'grown', label: 'Teachers, parents, schools', type: 'shelf', kick: 'For the grown-ups', title: 'Everyone who helps, <em>sees clearly</em>',
    items: [
      { key: 'teachers', clip: { key: 'teacher_dark' }, name: 'For teachers: see how each child <em>thinks</em>', group: 'Teachers',
        feats: [[0, 'Every answer, from every student'], [3.4, 'At-risk students'], [6.4, 'Groups'], [8.8, 'Real score'], [11, 'Root gaps'], [13, 'One child in depth'], [16, 'Evidence and action'], [18.8, 'Habits and memory'], [22.4, 'Ten layers of analysis'], [31.4, 'Ask Sage']] },
      { key: 'parents', clip: { key: 'parent_dark' }, name: 'For parents: know exactly <em>how to help</em>', group: 'Parents',
        feats: [[0, 'In plain words'], [3.4, 'Where your child is lagging'], [7, 'Habits'], [10.4, 'Learning Brain'], [12.9, 'Ask Sage about your child']] },
      { key: 'schools', clip: { key: 'school_dark' }, name: 'For schools: every class, <em>in your control</em>', group: 'Schools',
        feats: [[0, 'School health'], [3.4, 'Class and subject'], [7.1, 'Where gaps begin'], [10.3, 'Teachers'], [13.6, 'Exams and controls']] },
    ] },

  { key: 'contact', label: 'Contact', type: 'end', title: 'See ZetaQ <em>in your school.</em>' },
];

// Links into the tour: tour/#<section key> or #<section key>-<item number, 1-based> (e.g. #videos-3), and the old names below.
export const ALIASES = { students: 'dashboard', chapter: 'videos', subjects: 'interactive', plan: 'weekly', teachers: 'grown-1', parents: 'grown-2', schools: 'grown-3', enter: null };
