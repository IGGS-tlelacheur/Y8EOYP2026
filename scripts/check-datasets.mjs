#!/usr/bin/env node
// Author-time only. Checks data/datasets.json against private/answers.json.
//
//   node scripts/check-datasets.mjs
//
// The two files come out of one generator, so this is not looking for typos. It
// is looking for the properties the questions quietly depend on and that nothing
// else enforces: that a marked point is not an extreme, that the column being
// read really does stop halfway between two gridlines, that the honest chart is
// the one the key says is honest, and above all that no answer is shared across
// all six variants - because a shared answer is the one thing six data sets exist
// to prevent.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data/datasets.json'), 'utf8'));
const key = JSON.parse(readFileSync(resolve(ROOT, 'private/answers.json'), 'utf8'));

let bad = 0;
const fail = (msg) => { console.error(`  FAIL  ${msg}`); bad += 1; };
const pass = (msg) => console.log(`  ok    ${msg}`);

function leastSquares(points) {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p[0], 0);
  const sy = points.reduce((s, p) => s + p[1], 0);
  const sxy = points.reduce((s, p) => s + p[0] * p[1], 0);
  const sxx = points.reduce((s, p) => s + p[0] * p[0], 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { m, c: (sy - m * sx) / n };
}

const first = (cp, i) => key.checkpoints[cp].variants[i][0];

console.log('\n--- answers must not be shared across variants ---');
for (const [id, cp] of Object.entries(key.checkpoints)) {
  const values = cp.variants.map((v) => String(v[0]));
  const distinct = new Set(values).size;
  if (distinct === 1) {
    fail(`${id}: all six variants answer ${values[0]} — a shared answer`);
  } else if (distinct === 2) {
    pass(`${id}: ${distinct} distinct answers (${values.join(', ')}) — thin but deliberate`);
  } else {
    pass(`${id}: ${distinct} distinct answers across six variants`);
  }
}

console.log('\n--- every numeric answer sits on its own search grid ---');
for (const [id, cp] of Object.entries(key.checkpoints)) {
  if (cp.type !== 'numeric') continue;
  const { min, max, step } = cp.search;
  for (const [i, accepted] of cp.variants.entries()) {
    for (const value of accepted) {
      const steps = (value - min) / step;
      if (value < min || value > max || Math.abs(steps - Math.round(steps)) > 1e-9) {
        fail(`${id} variant ${i + 1}: ${value} is not on the grid ${min}..${max} step ${step}`);
      }
    }
  }
}
if (!bad) pass('every accepted numeric value is reachable by the rung-4 band search');

console.log('\n--- each data set against its own key ---');
data.sets.forEach((s, i) => {
  const n = i + 1;

  const fit = leastSquares(s.points);
  const drawn = (s.line.y2 - s.line.y1) / (s.line.x2 - s.line.x1);
  if (Math.abs(fit.m - drawn) > Math.max(0.01, Math.abs(drawn) * 0.003)) {
    fail(`set ${n}: drawn gradient ${drawn} is not the least squares gradient ${fit.m.toFixed(3)}`);
  }
  if (Math.abs(drawn - first('l5.cp1', i)) > 1e-9) {
    fail(`set ${n}: cp5.1 says ${first('l5.cp1', i)} but the drawn line has gradient ${drawn}`);
  }

  const c = s.line.y1 - drawn * s.line.x1;
  const atRead = drawn * s.readAt + c;
  const wantRead = Math.round(atRead / s.readRound) * s.readRound;
  if (wantRead !== first('l5.cp2', i)) {
    fail(`set ${n}: cp5.2 says ${first('l5.cp2', i)}, the line gives ${atRead} → ${wantRead}`);
  }
  const atBeyond = drawn * s.beyondAt + c;
  const wantBeyond = Math.round(atBeyond / s.readRound) * s.readRound;
  if (wantBeyond !== first('l5.cp3', i)) {
    fail(`set ${n}: cp5.3 says ${first('l5.cp3', i)}, the line gives ${atBeyond} → ${wantBeyond}`);
  }
  if (s.readAt < s.dataRange.xMin || s.readAt > s.dataRange.xMax) {
    fail(`set ${n}: cp5.2 reads at ${s.readAt}, which is outside the data — that is not interpolation`);
  }
  if (s.beyondAt <= s.dataRange.xMax) {
    fail(`set ${n}: cp5.3 reads at ${s.beyondAt}, which is inside the data — that is not extrapolation`);
  }

  const ys = s.points.map((p) => p[1]);
  if (s.p[1] === Math.min(...ys) || s.p[1] === Math.max(...ys)) {
    fail(`set ${n}: P is an extreme, so "the largest" becomes a true answer`);
  }
  if (!s.points.some((p) => p[0] === s.p[0] && p[1] === s.p[1])) {
    fail(`set ${n}: P is not one of the plotted points`);
  }

  /* cp2.3 wants the strong negative one. Check the key really points at it. */
  const slopes = Object.fromEntries(
    Object.entries(s.four).map(([k, pts]) => [k, leastSquares(pts)])
  );
  const answerKey = first('l2.cp3', i);
  const chosen = slopes[answerKey];
  if (!chosen || chosen.m > -3) {
    fail(`set ${n}: cp2.3 answer ${answerKey} has gradient ${chosen?.m.toFixed(2)}, not a strong negative`);
  }
  for (const [k, f] of Object.entries(slopes)) {
    if (k !== answerKey && f.m < -3) {
      fail(`set ${n}: cp2.3 has a second strong negative at ${k}`);
    }
  }

  /* cp4.2 must stop halfway between two gridlines. */
  const bar = s.week.bars.find((b) => b.label === s.week.targetDay);
  if (!bar) fail(`set ${n}: cp4.2 names a day that is not on the chart`);
  else {
    if (bar.value !== first('l4.cp2', i)) {
      fail(`set ${n}: cp4.2 says ${first('l4.cp2', i)} but ${s.week.targetDay} is ${bar.value}`);
    }
    const gap = s.week.ticks[1] - s.week.ticks[0];
    const above = Math.ceil(bar.value / gap) * gap;
    if (Math.abs(bar.value - (above - gap / 2)) > 1e-9) {
      fail(`set ${n}: cp4.2's column does not stop halfway between two gridlines`);
    }
    if (bar.value > s.week.ticks[s.week.ticks.length - 1]) {
      fail(`set ${n}: cp4.2's column runs off the top of the chart`);
    }
    const halves = s.week.bars.filter((b) => {
      const up = Math.ceil(b.value / gap) * gap;
      return Math.abs(b.value - (up - gap / 2)) < 1e-9;
    }).length;
    if (halves < 2) {
      fail(`set ${n}: only one column stops between gridlines, which gives the answer away`);
    }
  }

  /* cp4.3: the honest chart starts at zero with even steps; the other two do not. */
  const honest = first('l4.cp3', i);
  for (const [k, ticks] of Object.entries(s.scales.axes)) {
    const steps = ticks.slice(1).map((t, j) => t - ticks[j]);
    const even = steps.every((st) => Math.abs(st - steps[0]) < 1e-9);
    const zeroed = ticks[0] === 0;
    if (k === honest && !(even && zeroed)) {
      fail(`set ${n}: cp4.3 calls ${k} honest, but it ${zeroed ? 'has uneven steps' : 'does not start at zero'}`);
    }
    if (k !== honest && even && zeroed) {
      fail(`set ${n}: cp4.3 has a second honest chart at ${k}`);
    }
    if (Math.max(...s.scales.values.map((v) => v.value)) > ticks[ticks.length - 1]) {
      fail(`set ${n}: a column runs off the top of scaling chart ${k}`);
    }
    if (Math.min(...s.scales.values.map((v) => v.value)) < ticks[0]) {
      fail(`set ${n}: a column falls below the axis on scaling chart ${k}`);
    }
  }

  /* L3's sheet has to say what the three answers claim it says. */
  const names = new Set(s.sheet.rows.map((r) => r.by));
  if (names.size !== first('l3.cp1', i)) {
    fail(`set ${n}: cp3.1 says ${first('l3.cp1', i)} people, the sheet shows ${names.size}`);
  }
  const blanks = s.sheet.rows.reduce((t, r) => t + r.cells.filter((x) => x === '').length, 0);
  if (blanks !== first('l3.cp3', i)) {
    fail(`set ${n}: cp3.3 says ${first('l3.cp3', i)} blanks, the sheet has ${blanks}`);
  }
  const blankRows = new Set(s.sheet.rows.map((r, j) => (r.cells.includes('') ? j + 1 : 0)).filter(Boolean));
  if (blankRows.size < 3) {
    fail(`set ${n}: blanks are spread over only ${blankRows.size} rows, contract wants at least three`);
  }
  const notes = s.sheet.rows.map((r) => r.note);
  const common = notes.sort((a, b) =>
    notes.filter((x) => x === b).length - notes.filter((x) => x === a).length)[0];
  const oddFound = s.sheet.rows.map((r, j) => (r.note === common ? 0 : j + 1)).filter(Boolean);
  if (oddFound.length !== 2) {
    fail(`set ${n}: the sheet has ${oddFound.length} rows with an odd method, wanted exactly two`);
  }
  const pairKey = first('l3.cp2', i);
  const pair = s.sheet.pairs[pairKey];
  if (!pair || pair.slice().sort().join() !== oddFound.slice().sort().join()) {
    fail(`set ${n}: cp3.2's answer ${pairKey} is ${pair}, the odd rows are ${oddFound}`);
  }
  for (const [k, pr] of Object.entries(s.sheet.pairs)) {
    if (k === pairKey) continue;
    const hits = pr.filter((r) => oddFound.includes(r)).length;
    if (hits !== 1) {
      fail(`set ${n}: cp3.2 distractor ${k} contains ${hits} odd rows, wanted exactly one`);
    }
  }

  if (!bad) pass(`set ${n} — ${s.theme}`);
});

console.log(
  bad === 0
    ? '\nALL SIX DATA SETS AGREE WITH THEIR ANSWERS\n'
    : `\n${bad} PROBLEM(S)\n`
);
process.exit(bad ? 1 : 0);
