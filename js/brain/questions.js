// "Test your brain" question bank, v1 (design: _src/BRAIN_TEST.md).
// Three age groups, ten questions each. No question has one right answer: every choice adds to one or more traits,
// and the engine (js/brain/app.js) adds process signals (time before acting, changes, checking, how sure you were).
//
// Traits: R reasoning, A attention, M memory, P planning, C creativity, F confidence.
// Styles (the "thinking style" headline): planner, analyst, explorer, creator.
//
// Question types
//   choice  options [{t, w, s}], optional why {prompt, options [{t, w}]}
//   order   items [{t, early, s}]: `early` weights count fully for the item placed first, nothing for the last
//   slider  min, max, step, start, unit, bands [{lo, hi, w, q}] (q = how sensible the estimate is, 0..1), hint
//   memory  show [..] for `seconds`, then pick them from pool [..] (show + look-alikes)
//   spot    cells [..], targets = indices of cells that match the rule
//   pick    items [{t, cost, value, tag}] within `limit` (any mix that fits is allowed)
//   uses    items [{t, u}]: u = how unusual a workable idea is (0, 1, 2); u -1 = not a use (not counted)
// Any question with sure: true then asks "How sure are you that you did well?" (scored against how it actually went).

export const VERSION = 'bc1';

export const TRAITS = {
  R: { name: 'Reasoning', line: 'Finding the pattern, weighing the evidence, explaining why.' },
  A: { name: 'Attention', line: 'Noticing the details and staying with the task.' },
  M: { name: 'Memory', line: 'Holding information in mind and using it.' },
  P: { name: 'Planning', line: 'Thinking ahead: ordering steps, using time and money well.' },
  C: { name: 'Creativity', line: 'Seeing more than one way, and useful ideas others miss.' },
  F: { name: 'Confidence', line: 'Trusting yourself, and knowing how sure to be.' },
};

export const STYLES = {
  planner: { name: 'The Planner', line: 'You like to see the whole road before you start walking.' },
  analyst: { name: 'The Analyst', line: 'You look for the pattern and the evidence before you decide.' },
  explorer: { name: 'The Explorer', line: 'You learn by doing: try it, see what happens, adjust.' },
  creator: { name: 'The Creator', line: 'You look for the way nobody else thought of.' },
};

export const KIND_LABEL = { choice: 'Choose', order: 'Plan it', slider: 'Estimate', memory: 'Remember', spot: 'Spot it', pick: 'Decide', uses: 'Ideas' };

export const AGES = [
  { id: '9-12', label: 'Ages 9 to 12', line: 'Class 4 to 7' },
  { id: '12-14', label: 'Ages 12 to 14', line: 'Class 7 to 9' },
  { id: '15-17', label: 'Ages 15 to 17', line: 'Class 10 to 12' },
];

// ---------------------------------------------------------------- Ages 9 to 12
const A = [
  { id: 'a01', type: 'choice',
    prompt: 'Your class is planting a small garden, but the seed packets have lost their labels. What do you do first?',
    options: [
      { t: 'Plant a few right away and watch what comes up', w: { C: 2, F: 1 }, s: 'explorer' },
      { t: 'Look closely at the seeds and sort them by size and colour', w: { A: 2, R: 1 }, s: 'analyst' },
      { t: 'Ask someone who grows plants, like the school gardener', w: { R: 1, P: 1 }, s: 'analyst' },
      { t: 'Make a plan: which corner gets which seed, and when to water', w: { P: 2 }, s: 'planner' },
    ],
    why: { prompt: 'Why that first?', options: [
      { t: "It's the quickest way to find out", w: { F: 1 } },
      { t: "So we don't waste any seeds", w: { P: 2 } },
      { t: 'The clues are usually hidden in the details', w: { A: 1, R: 1 } },
      { t: 'Someone who knows can save us a lot of time', w: { R: 1, F: 1 } },
    ] } },
  { id: 'a02', type: 'order',
    prompt: "You're going on a school trip tomorrow. Put these in the order you'd do them.",
    sub: 'Tap them one by one: first tap = first thing you do.',
    items: [
      { t: 'Make a list of what to take', early: { P: 3 }, s: 'planner' },
      { t: 'Check the weather for tomorrow', early: { P: 1, A: 1 }, s: 'analyst' },
      { t: 'Pack your bag', early: {}, s: 'explorer' },
      { t: 'Set an alarm', early: { P: 1 } },
      { t: "Lay out tomorrow's clothes", early: {} },
      { t: 'Go to bed on time', early: {} },
    ] },
  { id: 'a03', type: 'slider', sure: true,
    prompt: 'About how many of your steps would it take to walk the length of a cricket pitch?',
    sub: 'From one set of stumps to the other. Make your best guess.',
    min: 0, max: 200, step: 1, start: 100, unit: 'steps',
    hint: 'A cricket pitch is about as long as four cars parked in a row.',
    bands: [{ lo: 20, hi: 50, w: { R: 3 }, q: 1 }, { lo: 12, hi: 19, w: { R: 2 }, q: .66 }, { lo: 51, hi: 80, w: { R: 2 }, q: .66 },
      { lo: 81, hi: 120, w: { R: 1 }, q: .33 }, { lo: 0, hi: 11, w: {}, q: 0 }, { lo: 121, hi: 200, w: {}, q: 0 }] },
  { id: 'a04', type: 'memory', sure: true, seconds: 6,
    prompt: "Remember these six things. You'll see them for 6 seconds.",
    show: ['kite', 'mango', 'bus', 'drum', 'lamp', 'shell'],
    pool: ['kite', 'mango', 'bus', 'drum', 'lamp', 'shell', 'ring', 'boat', 'cup', 'rope', 'bell', 'leaf'] },
  { id: 'a05', type: 'pick',
    prompt: 'Your team has ₹100 for a class picnic. What will you buy?',
    sub: 'Any mix that fits in ₹100 is fine.',
    limit: 100, unit: '₹',
    items: [
      { t: 'Fruit', cost: 30, value: 4 }, { t: 'Sandwiches', cost: 40, value: 5 }, { t: 'Water bottles', cost: 20, value: 5 },
      { t: 'A football', cost: 35, value: 3 }, { t: 'Mats to sit on', cost: 25, value: 3 },
      { t: 'Paper and colours for a group drawing', cost: 15, value: 2, tag: 'unusual' }, { t: 'Sweets', cost: 20, value: 2 },
    ] },
  { id: 'a06', type: 'uses',
    prompt: 'An old bicycle wheel. Tap every use you think could really work.',
    sub: 'Pick as many as you like.',
    items: [
      { t: 'A spinning game', u: 1 }, { t: 'A frame for climbing plants', u: 2 }, { t: 'A big wall clock', u: 2 },
      { t: 'Fix it on another bicycle', u: 0 }, { t: 'A target for a ring-throwing game', u: 1 }, { t: 'A wall decoration', u: 1 },
      { t: 'A pulley to lift a bucket', u: 2 }, { t: 'A frame for a hanging mobile', u: 2 }, { t: 'Throw it away', u: -1 },
    ] },
  { id: 'a07', type: 'spot', sure: true,
    prompt: 'Tap every letter b.',
    sub: 'Take your time. Tap again to undo.',
    cells: 'dbpqbdqpdbqpbdpqdqbpdqpdbqpdbqpdqd'.split('').slice(0, 30),
    targets: null },
  { id: 'a08', type: 'choice',
    prompt: 'Which one is the odd one out?',
    sub: 'Any of them can be the answer. It depends on how you look at it.',
    options: [
      { t: 'Cow', w: { C: 2 }, s: 'creator' }, { t: 'Hen', w: { R: 1, A: 1 }, s: 'analyst' },
      { t: 'Fish', w: { R: 1 }, s: 'analyst' }, { t: 'Goat', w: { C: 2 }, s: 'creator' },
    ],
    why: { prompt: 'What made it different?', options: [
      { t: 'Where it lives', w: { R: 1 } },
      { t: 'Its body: legs, wings or fins', w: { R: 2, A: 1 } },
      { t: 'What it gives us', w: { R: 1, C: 1 } },
      { t: 'I just felt it was different', w: { C: 1 } },
    ] } },
  { id: 'a09', type: 'choice',
    prompt: "You've been stuck on a really hard puzzle for ten minutes. What do you usually do?",
    options: [
      { t: "Keep trying the same way. I'll get it", w: { F: 2 }, s: 'explorer' },
      { t: 'Try a completely different way', w: { C: 2, R: 1 }, s: 'creator' },
      { t: 'Take a short break and come back to it', w: { P: 1, F: 1 }, s: 'planner' },
      { t: 'Ask a friend for a small hint', w: { R: 1, F: 1 }, s: 'analyst' },
    ] },
  { id: 'a10', type: 'order',
    prompt: "It's Sunday. Homework is due Monday, cricket with friends is at 4, and your cousins visit at 6. Put your day in order.",
    sub: 'Tap them one by one: first tap = first thing you do.',
    items: [
      { t: 'Do the homework', early: { P: 2 }, s: 'planner' },
      { t: 'Play cricket with friends', early: { F: 1 }, s: 'explorer' },
      { t: 'Help get the house ready for the cousins', early: { P: 1 } },
      { t: 'Rest or watch something', early: {} },
      { t: 'Pack your school bag for Monday', early: { P: 1, M: 1 } },
    ] },
];

// ---------------------------------------------------------------- Ages 12 to 14
const B = [
  { id: 'b01', type: 'choice',
    prompt: 'Your group has to make a two-minute video for a school contest. Nobody has started. What is your first move?',
    options: [
      { t: 'Start filming something and fix it later', w: { C: 1, F: 2 }, s: 'explorer' },
      { t: 'Watch past winning videos to see what works', w: { A: 1, R: 2 }, s: 'analyst' },
      { t: 'Split the jobs: script, camera, editing', w: { P: 3 }, s: 'planner' },
      { t: 'Throw out wild ideas until one feels right', w: { C: 3 }, s: 'creator' },
    ],
    why: { prompt: 'Why start there?', options: [
      { t: 'It gets the group moving', w: { F: 1 } },
      { t: 'It avoids a last-minute panic', w: { P: 2 } },
      { t: 'Good ideas come from studying examples', w: { R: 1, A: 1 } },
      { t: 'The best idea is rarely the first one', w: { C: 2 } },
    ] } },
  { id: 'b02', type: 'order',
    prompt: 'You have one hour before tuition: a worksheet to finish, dinner to eat and a friend to call back. Put these in order.',
    sub: 'Tap them one by one: first tap = first thing you do.',
    items: [
      { t: 'Check how long each thing will take', early: { P: 3 }, s: 'planner' },
      { t: 'Do the hardest part of the worksheet', early: { P: 1, A: 1 }, s: 'analyst' },
      { t: 'Eat', early: {} },
      { t: 'Call your friend back', early: { F: 1 }, s: 'explorer' },
      { t: 'Pack your tuition bag', early: { P: 1, M: 1 } },
      { t: 'Finish the rest of the worksheet', early: {} },
    ] },
  { id: 'b03', type: 'slider', sure: true,
    prompt: 'Roughly how many litres of water does one person in a city use in a day?',
    sub: 'Drinking, cooking, bathing, washing: everything.',
    min: 0, max: 500, step: 5, start: 40, unit: 'litres',
    hint: 'One bucket holds about 15 to 20 litres.',
    bands: [{ lo: 90, hi: 200, w: { R: 3 }, q: 1 }, { lo: 50, hi: 85, w: { R: 2 }, q: .66 }, { lo: 205, hi: 300, w: { R: 2 }, q: .66 },
      { lo: 20, hi: 45, w: { R: 1 }, q: .33 }, { lo: 305, hi: 400, w: { R: 1 }, q: .33 }, { lo: 0, hi: 15, w: {}, q: 0 }, { lo: 405, hi: 500, w: {}, q: 0 }] },
  { id: 'b04', type: 'memory', sure: true, seconds: 7,
    prompt: "You're catching a train. Remember these eight details. You'll see them for 7 seconds.",
    show: ['Platform 4', '7:45', 'Coach S2', 'Seat 31', 'Blue bag', 'Pune', 'Uncle Ravi', 'Window side'],
    pool: ['Platform 4', '7:45', 'Coach S2', 'Seat 31', 'Blue bag', 'Pune', 'Uncle Ravi', 'Window side',
      'Platform 2', '7:15', 'Coach S4', 'Seat 13', 'Red bag', 'Nashik'] },
  { id: 'b05', type: 'pick',
    prompt: 'Your science-fair stall has ₹500. What will you spend it on?',
    sub: 'Any mix that fits in ₹500 is fine.',
    limit: 500, unit: '₹',
    items: [
      { t: 'Poster board and markers', cost: 80, value: 4 }, { t: 'Batteries and wires', cost: 120, value: 5 },
      { t: 'A small motor', cost: 150, value: 4 }, { t: 'Printed photos', cost: 100, value: 2 },
      { t: 'Snacks for visitors', cost: 90, value: 1 }, { t: 'Magnifying glasses', cost: 110, value: 3 },
      { t: 'A kit of recycled materials', cost: 60, value: 3, tag: 'unusual' },
    ] },
  { id: 'b06', type: 'uses',
    prompt: 'A pile of old newspapers. Tap every use you think could really work.',
    sub: 'Pick as many as you like.',
    items: [
      { t: 'Wrap fragile things', u: 0 }, { t: 'Make paper bags', u: 1 }, { t: 'Papier-mâché models', u: 1 },
      { t: 'Compost for plants', u: 2 }, { t: 'Keep a pot of food warm', u: 2 }, { t: 'Practise calligraphy', u: 1 },
      { t: 'Build a tall tower in a challenge', u: 2 }, { t: 'Clean glass windows', u: 1 }, { t: 'Sell to the raddiwala', u: 0 },
      { t: 'Seed-starter pots', u: 2 },
    ] },
  { id: 'b07', type: 'spot', sure: true,
    prompt: 'Tap every 7 that comes straight after a 3 in the same row.',
    sub: 'Read each row from left to right. Tap again to undo.',
    cols: 7,
    cells: '3742137' + '5373817' + '1637437' + '7313752' + '6837337' + '4371739',
    targets: null },
  { id: 'b08', type: 'choice',
    prompt: 'Which city is the odd one out: Mumbai, Chennai, Kolkata or Delhi?',
    sub: 'Any of them can be the answer. It depends on how you look at it.',
    options: [
      { t: 'Mumbai', w: { C: 2 }, s: 'creator' }, { t: 'Chennai', w: { R: 1 }, s: 'analyst' },
      { t: 'Kolkata', w: { R: 1, C: 1 }, s: 'creator' }, { t: 'Delhi', w: { R: 1 }, s: 'analyst' },
    ],
    why: { prompt: 'What makes it different?', options: [
      { t: 'Where it is on the map', w: { R: 2 } },
      { t: 'Its history or its name', w: { R: 1, M: 1 } },
      { t: 'Its size, or how busy it is', w: { R: 1, A: 1 } },
      { t: 'It just felt different', w: { C: 1 } },
    ] } },
  { id: 'b09', type: 'choice',
    prompt: "Your friend's answer and yours are different, and you both feel sure. What do you do?",
    options: [
      { t: 'Check both answers step by step', w: { R: 2, A: 1 }, s: 'analyst' },
      { t: 'Go with mine. I was careful', w: { F: 2 }, s: 'explorer' },
      { t: 'Ask a third person who knows', w: { R: 1, P: 1 }, s: 'planner' },
      { t: 'See if both could be right in some way', w: { C: 2, R: 1 }, s: 'creator' },
    ] },
  { id: 'b10', type: 'order',
    prompt: "Your phone's storage is full in exam week. Put what you'd do in order.",
    sub: 'Tap them one by one: first tap = first thing you do.',
    items: [
      { t: 'See what is taking the most space', early: { R: 2, P: 1 }, s: 'analyst' },
      { t: 'Back up your photos', early: { P: 2, M: 1 }, s: 'planner' },
      { t: 'Delete old videos', early: { F: 1 }, s: 'explorer' },
      { t: 'Uninstall games you never play', early: {} },
      { t: 'Clear out old chats and downloads', early: { A: 1 } },
    ] },
];

// ---------------------------------------------------------------- Ages 15 to 17
const C = [
  { id: 'c01', type: 'choice',
    prompt: 'You have one week to choose a topic for a project competition. What do you do first?',
    options: [
      { t: 'Pick the first topic that excites me and dive in', w: { C: 1, F: 2 }, s: 'explorer' },
      { t: 'List five options and score each on interest, time and resources', w: { P: 2, R: 2 }, s: 'planner' },
      { t: 'Talk to people who entered last year', w: { R: 1, P: 1 }, s: 'analyst' },
      { t: 'Look for a problem around me that nobody has solved', w: { C: 3 }, s: 'creator' },
    ],
    why: { prompt: 'Why that approach?', options: [
      { t: 'Energy matters more than the perfect choice', w: { F: 1, C: 1 } },
      { t: 'A clear comparison avoids regret later', w: { P: 2 } },
      { t: "Other people's mistakes are cheap lessons", w: { R: 2 } },
      { t: 'Original work stands out', w: { C: 2 } },
    ] } },
  { id: 'c02', type: 'order',
    prompt: 'Board exams are six weeks away. Put these in the order you would start.',
    sub: 'Tap them one by one: first tap = first thing you do.',
    items: [
      { t: 'Find out exactly what is in the syllabus, and the marks for each part', early: { P: 3 }, s: 'planner' },
      { t: 'Take a full practice paper to see where I stand', early: { R: 2, A: 1 }, s: 'analyst' },
      { t: 'Make a week-by-week timetable', early: { P: 2 } },
      { t: 'Start with my favourite subject', early: { F: 1 }, s: 'explorer' },
      { t: 'Join or form a study group', early: { R: 1 } },
      { t: 'Buy new stationery', early: {} },
    ] },
  { id: 'c03', type: 'slider', sure: true,
    prompt: 'About how many times does a human heart beat in one day?',
    sub: 'A resting adult. Make your best estimate.',
    min: 0, max: 500000, step: 5000, start: 250000, unit: 'beats',
    hint: 'A resting heart beats about 70 times a minute.',
    bands: [{ lo: 70000, hi: 150000, w: { R: 3 }, q: 1 }, { lo: 40000, hi: 65000, w: { R: 2 }, q: .66 }, { lo: 155000, hi: 250000, w: { R: 2 }, q: .66 },
      { lo: 10000, hi: 35000, w: { R: 1 }, q: .33 }, { lo: 255000, hi: 400000, w: { R: 1 }, q: .33 }, { lo: 0, hi: 5000, w: {}, q: 0 }, { lo: 405000, hi: 500000, w: {}, q: 0 }] },
  { id: 'c04', type: 'memory', sure: true, seconds: 8,
    prompt: "You're at the help desk of a school event. Remember who needs what. You'll see it for 8 seconds.",
    show: ['Room 12: projector', 'Stage: mic 2', 'Gate B: 40 chairs', 'Aman: hall keys', 'Table 3: water', 'Lab: extension cord', 'Hall: 4 fans', 'Mrs Rao: a chair'],
    pool: ['Room 12: projector', 'Stage: mic 2', 'Gate B: 40 chairs', 'Aman: hall keys', 'Table 3: water', 'Lab: extension cord', 'Hall: 4 fans', 'Mrs Rao: a chair',
      'Room 21: projector', 'Stage: mic 1', 'Gate A: 40 chairs', 'Aman: laptop', 'Table 3: forms', 'Hall: 6 fans'] },
  { id: 'c05', type: 'pick',
    prompt: 'You have ₹2,000 to set up a stall at the school fair. Choose your starting stock.',
    sub: 'Any mix that fits in ₹2,000 is fine.',
    limit: 2000, unit: '₹',
    items: [
      { t: 'Lemonade supplies', cost: 400, value: 5 }, { t: 'Printed T-shirts', cost: 900, value: 4 },
      { t: 'Handmade bookmarks', cost: 300, value: 3, tag: 'unusual' }, { t: 'A board-game corner', cost: 600, value: 4, tag: 'unusual' },
      { t: 'Samosas from a local shop', cost: 500, value: 5 }, { t: 'Decorations and a banner', cost: 350, value: 2 },
      { t: 'A UPI QR stand', cost: 150, value: 3 },
    ] },
  { id: 'c06', type: 'uses',
    prompt: 'An old phone with a cracked screen that still works. Tap every use you think could really work.',
    sub: 'Pick as many as you like.',
    items: [
      { t: 'A home security camera', u: 2 }, { t: 'A music player for the kitchen', u: 1 }, { t: 'An e-book reader', u: 1 },
      { t: 'A remote for the TV or laptop', u: 2 }, { t: 'A data logger for a science project', u: 2 }, { t: 'Sell it for parts', u: 0 },
      { t: 'Give it to a grandparent for calls', u: 0 }, { t: 'A digital photo frame', u: 1 }, { t: 'A baby monitor', u: 2 },
      { t: 'Throw it in the dustbin', u: -1 },
    ] },
  { id: 'c07', type: 'spot', sure: true,
    prompt: 'Tap every word that names a colour.',
    sub: 'Some words only look like colours. Tap again to undo.',
    cols: 5,
    cells: ['table', 'teal', 'reed', 'river', 'indigo', 'index', 'paper', 'maroon', 'marine', 'cloud',
      'amber', 'ample', 'metal', 'olive', 'olden', 'coral', 'choral', 'train', 'violet', 'violin',
      'red', 'read', 'teak', 'stone', 'tile', 'cotton', 'rust', 'trust', 'tower', 'bridge'],
    targets: [1, 4, 7, 10, 13, 15, 18, 20, 26] },
  { id: 'c08', type: 'choice',
    prompt: 'Which is the odd one out: guitar, tabla, flute or sitar?',
    sub: 'Any of them can be the answer. It depends on how you look at it.',
    options: [
      { t: 'Guitar', w: { R: 1 }, s: 'analyst' }, { t: 'Tabla', w: { R: 1, A: 1 }, s: 'analyst' },
      { t: 'Flute', w: { R: 1 }, s: 'analyst' }, { t: 'Sitar', w: { C: 2 }, s: 'creator' },
    ],
    why: { prompt: 'What makes it different?', options: [
      { t: 'How it makes its sound', w: { R: 2, A: 1 } },
      { t: 'Where it comes from', w: { R: 1, M: 1 } },
      { t: 'How you play it: hands, breath or strings', w: { R: 2 } },
      { t: 'The feeling of its music', w: { C: 2 } },
    ] } },
  { id: 'c09', type: 'choice',
    prompt: 'A team project is going badly, two days before the deadline. What is your move?',
    options: [
      { t: 'Do the whole thing myself tonight', w: { F: 2 }, s: 'explorer' },
      { t: 'Call a quick meeting, cut the scope, split what is left', w: { P: 3, R: 1 }, s: 'planner' },
      { t: 'Ask the teacher for advice, or for more time', w: { R: 1, F: 1 }, s: 'analyst' },
      { t: 'Find a simpler, smarter way to show the same idea', w: { C: 2, R: 1 }, s: 'creator' },
    ],
    why: { prompt: 'Why?', options: [
      { t: 'Quality matters most', w: { A: 1 } },
      { t: 'A small finished project beats a big unfinished one', w: { P: 2, R: 1 } },
      { t: 'Asking early is better than failing late', w: { F: 1, R: 1 } },
      { t: 'Limits often lead to better ideas', w: { C: 2 } },
    ] } },
  { id: 'c10', type: 'choice',
    prompt: 'How do you usually learn something new and hard, like a new app or a tough topic?',
    options: [
      { t: 'Read or watch a full explanation first', w: { P: 2, A: 1 }, s: 'planner' },
      { t: 'Jump in and figure it out by trying', w: { C: 1, F: 2 }, s: 'explorer' },
      { t: 'Find examples and work out the pattern', w: { R: 2 }, s: 'analyst' },
      { t: 'Explain it to someone else as I learn', w: { M: 2, R: 1 }, s: 'creator' },
    ] },
];

// Spot targets for letter and digit grids are worked out from the rule, so the grids can be edited freely.
A[6].targets = A[6].cells.map((c, i) => (c === 'b' ? i : -1)).filter((i) => i >= 0);
{
  const q = B[6], cells = q.cells.split(''), cols = q.cols;
  q.cells = cells;
  q.targets = cells.map((c, i) => (c === '7' && i % cols > 0 && cells[i - 1] === '3' ? i : -1)).filter((i) => i >= 0);
}

export const SETS = { '9-12': A, '12-14': B, '15-17': C };
