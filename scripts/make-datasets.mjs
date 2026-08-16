#!/usr/bin/env node
// Author-time only. Never runs in a browser.
//
//   node scripts/make-datasets.mjs
//
// Emits two files from one source of truth:
//
//   data/datasets.json      public. Every number the rooms draw. No answers.
//   private/answers.json    plaintext key, git-ignored, hashed by build-data.mjs
//
// Both come out of the same definitions below, which is the whole point. The
// answer to "read Thursday off Chart 4" is a property of the bars that chart is
// drawn from; deriving the two separately is how a room ends up marking a
// correct reading wrong. Nothing here is typed twice.
//
// Numbers are invented, on the client's instruction of 17/08/2026, shaped like
// published Melbourne Water and BoM figures. Every variant carries a source line
// saying so, and the staff sheet says so too. Lesson 6 is a lesson about honesty
// with data and cannot be built on quietly invented data.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/* Deterministic, so a rebuild does not silently reshuffle a girl's dataset.
   Seeded per variant and per artefact. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function leastSquares(points) {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p[0], 0);
  const sy = points.reduce((s, p) => s + p[1], 0);
  const sxy = points.reduce((s, p) => s + p[0] * p[1], 0);
  const sxx = points.reduce((s, p) => s + p[0] * p[0], 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { m, c: (sy - m * sx) / n };
}

/* Points whose least squares line IS the drawn line.

   A line of best fit that visibly is not the best fit teaches the opposite of
   the lesson, and by eye a Year 8 will see it. Residuals are generated, then the
   linear part of them is removed so the fit is exact, then they are rounded to
   whole numbers - which puts a little of the error back - and then nudged one
   unit at a time until the fit is right again. */
function fitPoints({ m, c, xs, spread, seed, minY = 0 }) {
  const rand = rng(seed);
  let r = xs.map(() => (rand() * 2 - 1) * spread);

  const rFit = leastSquares(xs.map((x, i) => [x, r[i]]));
  r = r.map((v, i) => v - (rFit.m * xs[i] + rFit.c));

  let pts = xs.map((x, i) => [x, Math.max(minY, Math.round(m * x + c + r[i]))]);

  /* Tolerances are relative to the data, not absolute. What has to be true is
     that nobody can see the difference between the drawn line and the best fit:
     on a chart 400px tall with a y range of 84, an intercept out by 0.12 is a
     fifth of a pixel. An absolute limit rejected that and would have forced the
     numbers to be chosen for the checker rather than for the room. */
  const span = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
  const mTol = Math.max(0.004, Math.abs(m) * 0.002);
  const cTol = Math.max(0.05, span * 0.01);

  const score = (p) => {
    const f = leastSquares(p);
    return ((f.m - m) / mTol) ** 2 + ((f.c - c) / cTol) ** 2;
  };

  for (let pass = 0; pass < 20000; pass += 1) {
    const f = leastSquares(pts);
    if (Math.abs(f.m - m) < mTol && Math.abs(f.c - c) < cTol) break;
    const i = Math.floor(rand() * pts.length);
    const before = score(pts);
    for (const d of [1, -1]) {
      if (pts[i][1] + d < minY) continue;
      pts[i][1] += d;
      if (score(pts) < before) break;
      pts[i][1] -= d;
    }
  }

  const f = leastSquares(pts);
  if (Math.abs(f.m - m) > mTol || Math.abs(f.c - c) > cTol) {
    throw new Error(
      `fit did not converge: wanted y=${m}x+${c}, got y=${f.m.toFixed(3)}x+${f.c.toFixed(3)} `
      + `(tolerances ${mTol.toFixed(4)}, ${cTol.toFixed(3)})`
    );
  }
  return { points: pts, fit: f };
}

const roundTo = (v, step) => Math.round(v / step) * step;

/* ---- the six variants ----------------------------------------------------- */

/* Order is the client's confirmed list of 17/08/2026. Index 4 - "Data set 5" on
   her hub - is the negative one, as required. */
const VARIANTS = [
  {
    theme: 'Rainfall and reservoir inflow',
    ev: 'Monthly rainfall', evUnit: 'millimetres', evShort: 'mm',
    rv: 'Inflow to the reservoir', rvUnit: 'megalitres', rvShort: 'ML',
    chose: 'read the rainfall for each month, then measured the inflow that followed',
    m: 0.5, c: 5, xs: [20, 30, 30, 40, 45, 55, 60, 60, 70, 75, 85, 90, 95, 100, 105, 110, 115, 120],
    spread: 6, readAt: 70, beyondAt: 160, readRound: 5,
    markA: 40, markB: 100, weekGap: 20, weekK: 3,
    source: 'Shaped like Melbourne Water catchment figures. The numbers are invented for this task.'
  },
  {
    theme: 'Rain days and storage level',
    ev: 'Days of rain in the month', evUnit: 'days', evShort: 'days',
    rv: 'Storage level at the end of the month', rvUnit: 'per cent', rvShort: '%',
    chose: 'counted the days of rain each month, then read the storage level at the end of it',
    m: 3, c: 35, xs: [2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 11, 11, 12, 13, 14, 15, 16],
    spread: 5, readAt: 10, beyondAt: 20, readRound: 5,
    markA: 6, markB: 14, weekGap: 30, weekK: 4,
    source: 'Shaped like Melbourne Water storage reports. The numbers are invented for this task.'
  },
  {
    theme: 'Shower length and water used',
    ev: 'Shower length', evUnit: 'minutes', evShort: 'minutes',
    rv: 'Water used', rvUnit: 'litres', rvShort: 'litres',
    chose: 'chose how long each shower ran, then measured the water it used',
    m: 9, c: 16, xs: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11, 11],
    spread: 8, readAt: 6, beyondAt: 15, readRound: 10,
    markA: 2, markB: 10, weekGap: 50, weekK: 3,
    source: 'Measured by a Year 8 crew. The numbers are invented for this task.'
  },
  {
    theme: 'Tank size and days of watering',
    ev: 'Tank size', evUnit: 'kilolitres', evShort: 'kL',
    rv: 'Days the garden can be watered', rvUnit: 'days', rvShort: 'days',
    chose: 'chose ten tanks of different sizes, then counted the days each one could water a garden',
    m: 10, c: 15, xs: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9, 9, 10],
    spread: 9, readAt: 6, beyondAt: 14, readRound: 5,
    markA: 2, markB: 8, weekGap: 40, weekK: 4,
    source: 'Shaped like rainwater tank supplier figures. The numbers are invented for this task.'
  },
  {
    /* The negative one. Per person, so it falls as the household grows. */
    theme: 'Household size and water used per person',
    ev: 'People in the house', evUnit: 'people', evShort: 'people',
    rv: 'Water used per person each day', rvUnit: 'litres', rvShort: 'litres',
    chose: 'chose houses of different sizes, then measured the water each person used in a day',
    m: -15, c: 225, xs: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 7],
    spread: 12, readAt: 4, beyondAt: 11, readRound: 5,
    markA: 2, markB: 6, weekGap: 20, weekK: 5,
    source: 'Shaped like Melbourne Water per-person usage figures. The numbers are invented for this task.'
  },
  {
    theme: 'Roof area and water collected',
    ev: 'Roof area', evUnit: 'square metres', evShort: 'm²',
    rv: 'Water collected in one storm', rvUnit: 'litres', rvShort: 'litres',
    chose: 'chose roofs of different sizes, then measured the water each one collected in a storm',
    m: 8, c: 20, xs: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100],
    spread: 45, readAt: 50, beyondAt: 120, readRound: 10,
    markA: 20, markB: 80, weekGap: 50, weekK: 4,
    source: 'Shaped like published roof-runoff figures. The numbers are invented for this task.'
  }
];

/* ---- artefacts that rotate ------------------------------------------------ */

const KEYS = ['opt_a', 'opt_b', 'opt_c', 'opt_d'];

/* Which of the four plots in cp2.3 is the strong negative one, and which of the
   three scalings in cp4.3 is honest, both move between variants. A girl who is
   told "it was C" by the crew at the next table learns nothing that helps her. */
const FOUR_ANSWER = ['opt_c', 'opt_a', 'opt_b', 'opt_d', 'opt_a', 'opt_c'];
const SCALE_ANSWER = ['opt_b', 'opt_c', 'opt_a', 'opt_c', 'opt_b', 'opt_a'];

/* cp4.1 asks which display suits the data. Three variants get measurements to a
   tenth, where almost nothing repeats and a histogram is the only one that shows
   the spread; three get whole numbers that repeat, where a dot plot does. The
   concept is tested from both sides rather than six times from one. */
const DISPLAY_KIND = ['histogram', 'dot', 'histogram', 'dot', 'histogram', 'dot'];

/* How many different people appear in the Measured by column of the L3 sheet.
   The contract fixed this at three for all six; three across six variants is a
   shared answer, and a shared answer is worth nothing. The reading load is the
   same at two as at five. */
const SHEET_NAMES = [3, 4, 5, 3, 4, 5];
const NAME_POOL = [
  ['Anika', 'Bree', 'Sofia', 'Mei', 'Talia'],
  ['Harriet', 'Nadia', 'Prue', 'Ivy', 'Zara'],
  ['Anika', 'Bree', 'Sofia', 'Mei', 'Talia'],
  ['Clara', 'Devi', 'Immy', 'Rosa', 'Wren'],
  ['Elke', 'Juno', 'Marta', 'Pia', 'Suri'],
  ['Bonnie', 'Etta', 'Lena', 'Noor', 'Vida']
];

/* ---- build ---------------------------------------------------------------- */

const sets = [];
const answers = { checkpoints: {}, rooms: {} };

function put(cpId, spec, variantIndex, accepted) {
  const cp = answers.checkpoints[cpId] ?? (answers.checkpoints[cpId] = {
    ...spec, variants: [null, null, null, null, null, null]
  });
  cp.variants[variantIndex] = accepted;
}

VARIANTS.forEach((v, i) => {
  const { points, fit } = fitPoints({ m: v.m, c: v.c, xs: v.xs, spread: v.spread, seed: 1000 + i * 37 });
  const at = (x) => v.m * x + v.c;

  /* Two points ON the line for the gradient question. Both land on whole numbers
     by construction, so she is reading coordinates and not estimating them. */
  const marked = [[v.markA, at(v.markA)], [v.markB, at(v.markB)]];
  if (!Number.isInteger(marked[0][1]) || !Number.isInteger(marked[1][1])) {
    throw new Error(`variant ${i + 1}: marked points are not whole numbers`);
  }

  /* P is a real data point, mid-range on both axes so that "the largest" and
     "the longest" are both false of it, and never at an x that another question
     asks her to read - a circled point sitting exactly where Lesson 5 says "go
     up from here" invites her to read the point instead of the line. */
  const ys = points.map((q) => q[1]).sort((a, b) => a - b);
  const xsSorted = points.map((q) => q[0]).sort((a, b) => a - b);
  const busyX = new Set([v.readAt, v.beyondAt, v.markA, v.markB]);
  const p = points.find((q) =>
    !busyX.has(q[0])
    && q[1] > ys[2] && q[1] < ys[ys.length - 3]
    && q[0] > xsSorted[2] && q[0] < xsSorted[xsSorted.length - 3]);
  if (!p) throw new Error(`variant ${i + 1}: no suitable point to mark as P`);

  const readValue = roundTo(at(v.readAt), v.readRound);
  const beyondValue = roundTo(at(v.beyondAt), v.readRound);

  /* ---- cp2.3: four plots on shared axes ---- */
  const fourRand = rng(2000 + i);
  const fx = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shapes = {
    strongPositive: fx.map((x) => [x, Math.round(12 + 7 * x + (fourRand() * 2 - 1) * 4)]),
    strongNegative: fx.map((x) => [x, Math.round(88 - 7 * x + (fourRand() * 2 - 1) * 4)]),
    weak: fx.map((x) => [x, Math.round(20 + 4 * x + (fourRand() * 2 - 1) * 22)]),
    none: fx.map((x) => [x, Math.round(50 + (fourRand() * 2 - 1) * 6)])
  };
  const fourOrder = [];
  const remaining = ['strongPositive', 'weak', 'none'];
  for (const key of KEYS) {
    if (key === FOUR_ANSWER[i]) fourOrder.push('strongNegative');
    else fourOrder.push(remaining.shift());
  }
  const four = {};
  KEYS.forEach((k, n) => { four[k] = shapes[fourOrder[n]]; });

  /* ---- cp4.2: a week of daily totals ---- */
  const gap = v.weekGap;
  const weekRand = rng(3000 + i);
  const target = gap * (v.weekK + 0.5);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const targetDay = ['Thu', 'Tue', 'Thu', 'Wed', 'Fri', 'Tue'][i];
  /* One other column also stops halfway between two gridlines, so the one being
     asked about is not the only one on the chart that looks like that. */
  const decoyDay = days.find((d) => d !== targetDay && weekRand() < 0.5) ?? 'Sun';
  const bars = days.map((d) => {
    if (d === targetDay) return { label: d, value: target };
    const steps = 1 + Math.floor(weekRand() * Math.max(2, v.weekK + 1));
    const half = d === decoyDay ? gap / 2 : 0;
    return { label: d, value: gap * steps + half };
  });
  const weekMax = Math.max(...bars.map((b) => b.value));
  const weekTicks = [];
  for (let t = 0; t <= Math.ceil(weekMax / gap) * gap; t += gap) weekTicks.push(t);

  /* ---- cp4.3: one set of six readings, three axes ---- */
  const scaleRand = rng(4000 + i);
  const scaleBase = 236 + Math.round(scaleRand() * 8);
  const scaleValues = [0, 1, 2, 3, 4, 5].map((n) => ({
    label: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][n],
    value: scaleBase + Math.round(n * 2.6 + (scaleRand() * 2 - 1) * 2)
  }));
  const lo = Math.min(...scaleValues.map((s) => s.value));
  const hi = Math.max(...scaleValues.map((s) => s.value));
  const honestTicks = [];
  for (let t = 0; t <= Math.ceil((hi + 20) / 50) * 50; t += 50) honestTicks.push(t);
  const zoomedTicks = [];
  for (let t = Math.floor((lo - 2) / 5) * 5; t <= Math.ceil((hi + 2) / 5) * 5; t += 5) zoomedTicks.push(t);
  const unevenTicks = [0, 100, 200, Math.floor(lo / 10) * 10, Math.floor(lo / 10) * 10 + 10,
    Math.floor(lo / 10) * 10 + 20, Math.ceil((hi + 5) / 10) * 10];
  const scaleAxes = {};
  const spare = [zoomedTicks, unevenTicks];
  for (const key of ['opt_a', 'opt_b', 'opt_c']) {
    scaleAxes[key] = key === SCALE_ANSWER[i] ? honestTicks : spare.shift();
  }

  /* ---- L3: the supplied recording sheet ---- */
  const nameCount = SHEET_NAMES[i];
  const names = NAME_POOL[i].slice(0, nameCount);
  const sheetRand = rng(5000 + i);
  const oddRows = [[4, 9], [3, 10], [5, 8], [2, 11], [6, 9], [4, 7]][i];
  const blankCells = [
    [[3, 0], [6, 1], [8, 0], [11, 1]],
    [[2, 1], [5, 0], [7, 1], [9, 0], [12, 1]],
    [[1, 1], [4, 0], [10, 1]],
    [[2, 0], [6, 1], [8, 1], [12, 0]],
    [[3, 1], [5, 0], [9, 1], [10, 0], [11, 1], [12, 0]],
    [[1, 0], [7, 1], [11, 0]]
  ][i];
  const oddNotes = [
    ['Guessed the time. No phone in the bathroom', 'Counted songs on the radio instead of timing'],
    ['Estimated from memory a week later', 'Used a different gauge borrowed from next door'],
    ['Guessed the time. No phone in the bathroom', 'Counted songs on the radio instead of timing'],
    ['Read the label instead of measuring the tank', 'Asked the neighbour rather than checking'],
    ['Counted only the people who were home that night', 'Used last month s bill instead of measuring'],
    ['Paced the roof out instead of measuring it', 'Estimated the water from the splash marks']
  ][i];
  const goodNote = [
    'Read from the rain gauge at 9 am, same gauge each time',
    'Counted from the weather log, checked twice',
    'Timed on a phone, water caught in the 10 L bucket',
    'Measured the tank with the dipstick, same dipstick each time',
    'Counted the people at dinner, water read off the meter',
    'Measured the roof with a tape, water caught in the drum'
  ][i];

  const sheetRows = [];
  for (let row = 1; row <= 12; row += 1) {
    const src = points[(row * 3) % points.length];
    const isOdd = oddRows.includes(row);
    const cells = isOdd
      ? [String(src[0] + 1), String(src[1] + 7)]
      : [String(src[0]), String(src[1])];
    for (const [r, col] of blankCells) if (r === row) cells[col] = '';
    sheetRows.push({
      date: `${String(2 + Math.floor((row - 1) / 2)).padStart(2, '0')}/08/2026`,
      by: names[Math.floor(sheetRand() * names.length)],
      cells,
      note: isOdd ? oddNotes[oddRows.indexOf(row)] : goodNote
    });
  }
  /* Every name has to actually appear, or the answer is not what it says. */
  const used = new Set(sheetRows.map((r) => r.by));
  for (const name of names) {
    if (!used.has(name)) {
      const free = sheetRows.findIndex((r, n) => !oddRows.includes(n + 1)
        && sheetRows.filter((q) => q.by === r.by).length > 1);
      sheetRows[free === -1 ? 0 : free].by = name;
    }
  }
  const finalNames = new Set(sheetRows.map((r) => r.by));
  if (finalNames.size !== nameCount) {
    throw new Error(`variant ${i + 1}: sheet shows ${finalNames.size} names, wanted ${nameCount}`);
  }
  const blanks = sheetRows.reduce((n, r) => n + r.cells.filter((c) => c === '').length, 0);

  /* ---- the answer key, from the very same numbers ---- */
  const evFirst = ['opt_a', 'opt_c', 'opt_a', 'opt_b', 'opt_d', 'opt_a'][i];
  const pMeaning = ['opt_b', 'opt_a', 'opt_a', 'opt_c', 'opt_b', 'opt_d'][i];

  /* Which slot holds which kind of option, so the correct one is not always in
     the same place. Publishing this order gives nothing away: she can read all
     four on screen anyway, and knowing which is right still means doing the
     maths. The answer itself stays a hash. */
  const place = (correctKey, roles) => {
    const out = {};
    const rest = roles.slice(1);
    for (const k of KEYS) out[k] = k === correctKey ? roles[0] : rest.shift();
    return out;
  };
  const roles = {
    'l2.cp1': place(evFirst, ['ev', 'rv', 'smaller', 'either']),
    'l2.cp2': place(pMeaning, ['point', 'swapped', 'total', 'extreme'])
  };

  sets.push({
    n: i + 1,
    theme: v.theme,
    ev: v.ev, evUnit: v.evUnit, evShort: v.evShort,
    rv: v.rv, rvUnit: v.rvUnit, rvShort: v.rvShort,
    chose: v.chose,
    source: v.source,
    points,
    p,
    line: { x1: marked[0][0], y1: marked[0][1], x2: marked[1][0], y2: marked[1][1] },
    marked,
    /* No `gradient` field. It is the answer to cp5.1, and a public file should
       not carry a value under the name of the thing being asked for. The line is
       here because the chart has to be drawn, and its gradient is recoverable
       from the two coordinates printed on that chart - which is the task. */
    readAt: v.readAt,
    beyondAt: v.beyondAt,
    readRound: v.readRound,
    dataRange: { xMin: Math.min(...v.xs), xMax: Math.max(...v.xs) },
    four,
    week: { bars, ticks: weekTicks, targetDay },
    scales: { values: scaleValues, axes: scaleAxes },
    sheet: { names: nameCount, rows: sheetRows, oddRows, blanks },
    display: DISPLAY_KIND[i],
    roles
  });

  put('l2.cp1', { type: 'choice' }, i, [evFirst]);
  put('l2.cp2', { type: 'choice' }, i, [pMeaning]);
  put('l2.cp3', { type: 'choice' }, i, [FOUR_ANSWER[i]]);

  put('l3.cp1', { type: 'numeric', round: 0, search: { min: 1, max: 12, step: 1 } }, i, [nameCount]);
  put('l3.cp2', { type: 'choice' }, i, [['opt_a', 'opt_b', 'opt_c', 'opt_d'][i % 4]]);
  put('l3.cp3', { type: 'numeric', round: 0, search: { min: 0, max: 24, step: 1 } }, i, [blanks]);

  put('l4.cp1', { type: 'choice' }, i, [DISPLAY_KIND[i] === 'histogram' ? 'opt_a' : 'opt_b']);
  put('l4.cp2', {
    type: 'numeric', round: 0, search: { min: 0, max: 600, step: 5 }
  }, i, [target, target - gap / 2, target + gap / 2]);
  put('l4.cp3', { type: 'choice' }, i, [SCALE_ANSWER[i]]);

  put('l5.cp1', {
    type: 'numeric', round: 1, search: { min: -60, max: 60, step: 0.1 }
  }, i, [Number(v.m.toFixed(1))]);
  put('l5.cp2', {
    type: 'numeric', round: 0, search: { min: 0, max: 1200, step: 5 }
  }, i, [readValue, readValue - v.readRound, readValue + v.readRound]);
  put('l5.cp3', {
    type: 'numeric', round: 0, search: { min: 0, max: 1200, step: 5 }
  }, i, [beyondValue, beyondValue - v.readRound, beyondValue + v.readRound]);

  console.log(
    `variant ${i + 1}  ${v.theme}\n`
    + `    fit y = ${fit.m.toFixed(2)}x + ${fit.c.toFixed(2)}  (wanted ${v.m}x + ${v.c})\n`
    + `    P ${JSON.stringify(p)}   read ${v.readAt}→${readValue}   beyond ${v.beyondAt}→${beyondValue}\n`
    + `    sheet ${nameCount} names, ${blanks} blanks, odd rows ${oddRows.join(' and ')}\n`
    + `    cp2.3 ${FOUR_ANSWER[i]}   cp4.1 ${DISPLAY_KIND[i]}   cp4.2 ${target}   cp4.3 ${SCALE_ANSWER[i]}`
  );
});

/* ---- the L3 row-pair options, which need the sheet to exist first ---------- */
sets.forEach((s, i) => {
  const correct = answers.checkpoints['l3.cp2'].variants[i][0];
  const [a, b] = s.sheet.oddRows;
  const others = [];
  for (let r = 1; r <= 12 && others.length < 3; r += 1) {
    if (r !== a && r !== b) others.push(r);
  }
  /* Each wrong pair carries exactly one of the two odd rows, so none can be
     dropped at a glance. */
  const pairs = {};
  const wrong = [[a, others[0]], [b, others[1]], [a, others[2]]];
  let w = 0;
  for (const key of KEYS) {
    pairs[key] = key === correct ? [a, b] : wrong[w++];
  }
  s.sheet.pairs = pairs;
});

/* Claim A, for the Lesson 1 and Lesson 6 decks. Streaming subscriptions against
   Melbourne's water use, both climbing through the 2010s because the population
   did. The correlation is genuine; the causation is absurd; and the deck cuts the
   y axis on top of that so it is wrong in two separate ways at once.

   Shaped like published ACMA subscription figures and Melbourne Water demand
   reports. The numbers are invented, and the deck says so on the slide where it
   is resolved rather than quietly in a corner. */
const CLAIM_A = {
  years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  subs: [0.2, 0.4, 0.7, 1.1, 1.8, 3.5, 6.0, 8.5, 10.5, 12.5, 15.0, 17.0, 18.2, 19.0, 19.8, 20.5],
  water: [1090, 1105, 1130, 1150, 1175, 1195, 1220, 1240, 1265, 1280, 1300, 1325, 1345, 1360, 1380, 1400],
  subsLabel: 'Streaming subscriptions in Australia', subsUnit: 'millions',
  waterLabel: 'Melbourne water use', waterUnit: 'megalitres a day',
  population: [4.08, 4.17, 4.25, 4.35, 4.44, 4.53, 4.64, 4.74, 4.85, 4.94, 4.98, 4.97, 5.03, 5.13, 5.21, 5.28],
  populationLabel: 'People in Melbourne', populationUnit: 'millions',
  source: 'Shaped like ACMA and Melbourne Water figures. The numbers are invented for this task.'
};

/* Claim B is the same story for everyone: it has to be recognisable in Lesson 6
   as the thing the whole cohort was shown. */
const CLAIM_B = {
  points: [[12, 48], [18, 61], [23, 77], [27, 84], [31, 96], [35, 104],
           [38, 118], [42, 127], [46, 133], [51, 149]],
  xLabel: 'Ice creams sold at the canteen', xUnit: 'per day',
  yLabel: 'Water drunk from the fountains', yUnit: 'litres per day',
  title: 'Ice creams and drinking fountains',
  source: 'Invented for this task. Lesson 6 explains why.'
};

answers.rooms = {
  l2: { bypass: 'RAINGAUGE-L2' },
  l3: { bypass: 'RIVERMOUTH-L3' },
  l4: { bypass: 'TIDEMARK-L4' },
  l5: { bypass: 'WATERSHED-L5' }
};

answers._note = 'GENERATED by scripts/make-datasets.mjs from the same numbers that draw the '
  + 'charts in data/datasets.json. Do not hand-edit: rerun the generator. Never commit this file.';

writeFileSync(resolve(ROOT, 'data/datasets.json'),
  JSON.stringify({ version: 1, generated: new Date().toISOString().slice(0, 10), claimA: CLAIM_A, claimB: CLAIM_B, sets }, null, 2) + '\n');
console.log('\nwrote: data/datasets.json');

writeFileSync(resolve(ROOT, 'private/answers.json'), JSON.stringify(answers, null, 2) + '\n');
console.log('wrote: private/answers.json  (git-ignored)');
console.log('\nnow run: node scripts/build-data.mjs');
