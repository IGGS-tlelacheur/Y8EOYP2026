#!/usr/bin/env node
// Author-time only. Never runs in a browser.
//
//   node scripts/make-staff-sheet.mjs
//
// Writes private/staff-sheet.html — the paper the supervisors hold. It carries
// the four staff codes and all seventy-two answers in plain text, which is
// exactly why it is written into private/ and never into the repo.
//
// CLAUDE.md: no plaintext answers or unlock codes anywhere in the repo, hashes
// only. BUILD_PLAN §9: keep the answer keys on paper only, because anything
// plaintext on a public Pages site is one URL guess away from being circulated.
// This script is how both of those hold at once - the teacher gets a real
// printable, and the repository never sees it.
//
// Print it, keep it, and do not email it to anyone.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CRIBS, BADGE_RULES, TROUBLE } from '../js/cribs.js';

const ROOT = resolve(import.meta.dirname, '..');

function read(path) {
  const p = resolve(ROOT, path);
  if (!existsSync(p)) {
    console.error(`missing source file: ${path}`);
    console.error('run: node scripts/make-datasets.mjs');
    process.exit(1);
  }
  return readFileSync(p, 'utf8');
}

const key = JSON.parse(read('private/answers.json'));
const data = JSON.parse(read('data/datasets.json'));
const programme = JSON.parse(read('data/programme.json'));

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ROOM_NAMES = { l2: 'Lesson 2 · Reader', l3: 'Lesson 3 · Collector', l4: 'Lesson 4 · Plotter', l5: 'Lesson 5 · Predictor' };

/* Answers are printed as the student would type them, not as the key stores
   them. "opt_b" is not something anyone can check against a screen. */
function readable(checkpointId, variantIndex) {
  const cp = key.checkpoints[checkpointId];
  const accepted = cp.variants[variantIndex];
  const set = data.sets[variantIndex];

  if (cp.type !== 'choice') {
    const [first, ...rest] = accepted;
    return rest.length ? `${first}   (also accepts ${rest.join(', ')})` : String(first);
  }

  const letter = (k) => k.slice(-1).toUpperCase();

  if (checkpointId === 'l2.cp3') return `Chart ${letter(accepted[0])}`;
  if (checkpointId === 'l4.cp3') return `Chart ${letter(accepted[0])}`;
  if (checkpointId === 'l4.cp1') {
    return accepted[0] === 'opt_a' ? 'A histogram' : 'A dot plot';
  }
  if (checkpointId === 'l3.cp2') {
    const pair = set.sheet.pairs[accepted[0]];
    return `Rows ${pair[0]} and ${pair[1]}   (option ${letter(accepted[0])})`;
  }
  if (checkpointId === 'l2.cp1') {
    const role = set.roles['l2.cp1'][accepted[0]];
    return `Option ${letter(accepted[0])} — ${set.ev.toLowerCase()}, because the other depends on it   (role: ${role})`;
  }
  if (checkpointId === 'l2.cp2') {
    return `Option ${letter(accepted[0])} — one reading of ${set.p[0]} ${set.evShort} and ${set.p[1]} ${set.rvShort}`;
  }
  return `Option ${letter(accepted[0])}`;
}

const QUESTION_NAMES = {
  'l2.cp1': 'Which variable goes on the horizontal axis',
  'l2.cp2': 'What point P means',
  'l2.cp3': 'Which chart is the strong negative one',
  'l3.cp1': 'How many people measured',
  'l3.cp2': 'Which two rows used a different method',
  'l3.cp3': 'How many measurements are missing',
  'l4.cp1': 'Which display suits the data',
  'l4.cp2': 'Read a value off the column graph',
  'l4.cp3': 'Which of the three scales is honest',
  'l5.cp1': 'The gradient of the line',
  'l5.cp2': 'Reading inside the data',
  'l5.cp3': 'Reading beyond the data'
};

const ids = Object.keys(key.checkpoints);

const variantTables = data.sets.map((set, i) => `
  <section class="variant">
    <h3>Data set ${set.n} — ${esc(set.theme)}</h3>
    <p class="vmeta">
      ${esc(set.ev)} (${esc(set.evUnit)}) against ${esc(set.rv)} (${esc(set.rvUnit)}).
      Recording sheet: ${set.sheet.names} names, ${set.sheet.blanks} blank cells,
      odd rows ${set.sheet.oddRows.join(' and ')}.
    </p>
    <table>
      <tr><th style="width:26mm">Question</th><th>What it asks</th><th style="width:62mm">Answer</th></tr>
      ${ids.map((id) => `
        <tr>
          <td><code>${esc(id)}</code></td>
          <td>${esc(QUESTION_NAMES[id] ?? '')}</td>
          <td class="ans">${esc(readable(id, i))}</td>
        </tr>`).join('')}
    </table>
  </section>`).join('');

const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>H₂O — Towards 2040 · Staff sheet · CONFIDENTIAL</title>
<style>
  :root{ --brand:#003DA5; --ink:#06232B; --sage:#7E9793; --line:#B7C8C4;
         --gold:#F2B705; --gold-dark:#B98A05; --tint:#E9EEF8; }
  @page{ size:A4; margin:14mm; }
  *{ box-sizing:border-box; }
  body{ margin:0 auto; max-width:182mm; padding:0; color:var(--ink);
        font-family:'Segoe UI','Carlito',system-ui,sans-serif; font-size:10pt; line-height:1.4; }
  h1{ font-size:20pt; color:var(--brand); margin:0 0 1mm; }
  h2{ font-size:12pt; color:var(--brand); margin:6mm 0 2mm;
      border-bottom:2px solid var(--brand); padding-bottom:1mm; break-after:avoid; }
  h3{ font-size:10.5pt; color:var(--brand); margin:0 0 1mm; }
  .sub{ text-transform:uppercase; letter-spacing:.16em; font-size:7.5pt;
        font-weight:700; color:var(--sage); margin-bottom:4mm; }
  .stop{ border:2px solid var(--gold-dark); background:#FFFBF0; padding:3mm 4mm; margin:0 0 4mm; }
  .stop b{ color:var(--gold-dark); }
  table{ border-collapse:collapse; width:100%; margin:0 0 3mm; font-size:9pt; }
  th,td{ border:1px solid var(--line); padding:1.2mm 2mm; text-align:left; vertical-align:top; }
  th{ background:var(--tint); font-size:7.5pt; text-transform:uppercase; letter-spacing:.08em; }
  code{ font-family:ui-monospace,Consolas,monospace; font-size:8.5pt; }
  .ans{ font-weight:700; }
  .codes td{ font-size:11pt; }
  .codes .code{ font-family:ui-monospace,Consolas,monospace; font-weight:700; letter-spacing:.1em; }
  .crib{ border:1px solid var(--line); border-left:4px solid var(--brand);
         padding:2.5mm 3.5mm; margin:0 0 3mm; break-inside:avoid; }
  .crib .who{ font-size:7.5pt; text-transform:uppercase; letter-spacing:.12em; color:var(--sage); }
  .crib ul{ margin:1mm 0 2mm; padding-left:4mm; }
  .say{ border-left:3px solid var(--gold); background:#FFFBF0; padding:1.5mm 2.5mm; margin:1.5mm 0; }
  .dont{ color:#3d5560; font-size:9pt; margin:0; }
  .variant{ break-inside:avoid; margin-bottom:4mm; }
  .vmeta{ font-size:8.5pt; color:#3d5560; margin:0 0 1.5mm; }
  dt{ font-weight:700; color:var(--brand); margin-top:2mm; }
  dd{ margin:0.5mm 0 0; }
  .foot{ margin-top:6mm; padding-top:2mm; border-top:1px solid var(--line);
         font-size:8pt; text-transform:uppercase; letter-spacing:.1em; color:var(--sage); }
  .page-break{ break-before:page; }
  @media screen{ body{ padding:10mm; background:#fff; } html{ background:#8b9a97; } }
</style>
</head>
<body>

<h1>Staff sheet</h1>
<div class="sub">${esc(programme.programme)} · ${esc(programme.strand)} · generated ${new Date().toISOString().slice(0, 10)}</div>

<div class="stop">
  <b>Paper only.</b> This sheet holds the staff codes and every answer. It is
  generated outside the repository on purpose and is not on the website — anything
  plaintext on a public site is one guessed address away from being circulated.
  Print it, keep it with you, and do not email it.
  <br><br>
  <b>The numbers in this programme are invented.</b> They are shaped like published
  Melbourne Water and BoM figures, and every data set carries a source line saying
  so. Only the measurements the girls take themselves are real, and Lesson 6 says
  that out loud on its last slide.
</div>

<h2>Staff codes</h2>
<p>One per room, the same for every student. They open a room without her code, and the site records that one was used.</p>
<table class="codes">
  <tr><th style="width:52mm">Room</th><th>Code</th></tr>
  ${Object.entries(key.rooms).map(([room, r]) =>
    `<tr><td>${esc(ROOM_NAMES[room] ?? room)}</td><td class="code">${esc(r.bypass)}</td></tr>`).join('')}
</table>
<p style="font-size:9pt;color:#3d5560;">
  Lesson 2 is never locked, so its code is only needed if you want to mark it opened.
  Enter codes on the supervisor page: <code>staff.html</code>.
</p>

<h2>What each badge needs</h2>
<table>
  <tr><th style="width:26mm">Badge</th><th style="width:26mm">Room</th><th>Needs</th></tr>
  ${BADGE_RULES.map(([b, r, n]) =>
    `<tr><td><b>${esc(b)}</b></td><td>${esc(r)}</td><td>${esc(n)}</td></tr>`).join('')}
</table>

<h2>What each room is asking for</h2>
${CRIBS.map((c) => `
  <div class="crib">
    <div class="who">${esc(c.room)} · ${esc(c.badge ? `${c.badge} badge` : 'no badge')}</div>
    <h3>${esc(c.name)}</h3>
    <p>${esc(c.asking)}</p>
    <p><b>To finish:</b> ${esc(c.deliverable)}</p>
    <b style="font-size:8pt;text-transform:uppercase;letter-spacing:.1em;color:var(--brand);">Good enough when</b>
    <ul>${c.goodEnough.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
    <div class="say"><b>If she is stuck, say:</b> ${esc(c.sayThis)}</div>
    <p class="dont"><b>Do not worry about:</b> ${esc(c.dontWorry)}</p>
  </div>`).join('')}

<h2>When it goes wrong</h2>
<dl>
  ${TROUBLE.map((t) => `<dt>${esc(t.when)}</dt><dd>${esc(t.do)}</dd>`).join('')}
</dl>

<div class="page-break"></div>
<h2>The answers</h2>
<p>
  Each girl gets one data set of six, worked out from her school ID. The hub tells
  her which — it says <b>Data set N of 6</b> at the bottom of the page. Find that
  number first, then read the table for it.
</p>
<p style="font-size:9pt;color:#3d5560;">
  Numeric answers show the value the site treats as canonical, and any others it
  also accepts. A girl who is one step out on a reading is marked correct.
</p>
${variantTables}

<div class="foot">
  <span>${esc(programme.school)} · staff sheet · confidential</span>
</div>

</body>
</html>
`;

writeFileSync(resolve(ROOT, 'private/staff-sheet.html'), html);
console.log('wrote: private/staff-sheet.html   (git-ignored — print it, do not commit it)');
console.log(`       ${data.sets.length} data sets, ${ids.length} questions each, ${Object.keys(key.rooms).length} staff codes`);
