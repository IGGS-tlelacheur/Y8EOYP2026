#!/usr/bin/env node
// Author-time only. Never runs in a browser.
//
// Generates data/roll.json and data/answers.json from local source files that are
// NOT committed. Run from the repo root:
//
//   node scripts/build-data.mjs            build both outputs
//   node scripts/build-data.mjs --check    verify outputs are current, exit 1 if not
//
// Sources (git-ignored, see data/README.md):
//   private/roll.csv       ID,Staff_Student,Password with a header row. One line
//                          per person, students and staff alike. The ID drives
//                          their dataset variant and every vault code; the password
//                          only opens the door.
//   private/answers.json   plaintext answer key, shape documented below
//
// private/answers.json:
// {
//   "checkpoints": {
//     // Six variants, one per data set. Each is a LIST of accepted values, and
//     // accept[0] is canonical - every token and vault code derives from it, so
//     // reordering a list changes a student's code. Max five per variant, and
//     // every variant of a checkpoint must accept the same number of them.
//     "l4.cp2": {
//       "type": "numeric", "round": 0,
//       "search": { "min": 0, "max": 500, "step": 5 },
//       "variants": [[175, 170, 180], [90, 85, 95], ...]
//     },
//     "l2.cp1": { "type": "choice", "variants": [["opt_a"], ["opt_c"], ...] }
//   },
//   "rooms": { "l3": { "bypass": "OPENSESAME" } }
// }
//
// "search" is required on every numeric checkpoint: it is the band hint 4 walks
// to recover the answer, because the repo holds hashes and a hash does not
// invert. Publishing the band is harmless - the question implies it already.

import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CHECK = process.argv.includes('--check');

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// Must match normaliseId() and normalisePassword() in js/vault.js character for
// character. If either drifts, nobody can log in.
function normaliseId(input) {
  return String(input ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalisePassword(input) {
  return String(input ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

// Must match derivePasswordHash() in js/vault.js. PBKDF2-SHA256 over the
// password alone, salted with the published salt and their own studentId.
function passwordHash(studentId, password, salt, iterations) {
  return pbkdf2Sync(normalisePassword(password), `${salt}:${studentId}`, iterations, 32, 'sha256')
    .toString('hex');
}

// Must match canonicalise() in js/vault.js character for character. If the two
// ever drift, nothing validates and the failure looks like a wrong answer.
function canonical(answer, type, round) {
  if (type === 'numeric') {
    const cleaned = String(answer).trim().toLowerCase()
      .replace(/,/g, '')
      .replace(/[^0-9.-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') {
      throw new Error(`not a number: ${answer}`);
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n)) throw new Error(`not a number: ${answer}`);
    const f = Math.pow(10, round ?? 0);
    return String(Math.round(n * f) / f);
  }
  if (type === 'choice') return String(answer).trim().toLowerCase();
  return String(answer).trim().toLowerCase().replace(/\s+/g, ' ');
}

function read(path) {
  const p = resolve(ROOT, path);
  if (!existsSync(p)) {
    console.error(`missing source file: ${path}`);
    console.error('see data/README.md');
    process.exit(1);
  }
  return readFileSync(p, 'utf8');
}

function emit(path, obj) {
  const next = JSON.stringify(obj, null, 2) + '\n';
  const p = resolve(ROOT, path);
  if (CHECK) {
    const current = existsSync(p) ? readFileSync(p, 'utf8') : '';
    if (current !== next) {
      console.error(`STALE: ${path} does not match its source`);
      process.exitCode = 1;
    } else {
      console.log(`ok: ${path}`);
    }
    return;
  }
  writeFileSync(p, next);
  console.log(`wrote: ${path}`);
}

// ---- roll -----------------------------------------------------------------

// Measured at 16 ms for 150,000 in Edge on the target hardware, far cheaper than
// budgeted, so it buys more. 600,000 is the current OWASP figure for
// PBKDF2-SHA256 and costs a login about 65 ms - below the threshold where anyone
// notices a button. Raising this invalidates every password hash on the roll, so
// it changes only alongside a rebuild.
const ITERATIONS = 600000;

// private/roll.csv: ID,Staff_Student,Password with a header row. Excel writes a
// BOM, which would otherwise make the first column name "﻿ID".
function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const head = lines.shift().split(',').map((h) => h.trim().toLowerCase());
  const col = {
    id: head.indexOf('id'),
    role: head.findIndex((h) => h.includes('staff') || h === 'role'),
    password: head.indexOf('password')
  };
  if (col.id === -1 || col.password === -1) {
    console.error('private/roll.csv needs at least an "ID" and a "Password" column.');
    process.exit(1);
  }
  return lines.map((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      line: i + 2,
      id: cells[col.id] ?? '',
      role: (col.role === -1 ? '' : cells[col.role] ?? '').toLowerCase(),
      password: cells[col.password] ?? ''
    };
  });
}

// The salt is published in roll.json and must stay put: regenerating it would
// invalidate every credential on the roll. Reused when one already exists, which
// also keeps --check deterministic.
const priorRoll = existsSync(resolve(ROOT, 'data/roll.json'))
  ? JSON.parse(read('data/roll.json'))
  : null;
const salt = priorRoll?.salt ?? randomBytes(16).toString('hex');

const roster = parseCsv(read('private/roll.csv'));
const usable = [];
const skipped = [];

for (const p of roster) {
  const id = normaliseId(p.id);
  const password = normalisePassword(p.password);
  if (id.length < 2 || password.length < 2) {
    skipped.push(p.line);
    continue;
  }
  // Three- and four-digit IDs are real: staff who joined before the school moved
  // to five digits. Confirmed 16/08/2026, so their length is not a warning.
  usable.push({ id, password, role: p.role.startsWith('staff') ? 'staff' : 'student' });
}

const seen = new Map();
for (const p of usable) {
  if (seen.has(p.id)) {
    console.error(
      `LEAK RISK: the ID on line ${p.line ?? '?'} appears twice on the roll. Two people `
      + 'sharing an ID share a dataset variant and every vault code. Fix the CSV.'
    );
    process.exit(1);
  }
  seen.set(p.id, true);
}

// Spare passwords with no ID beside them: 200 were generated and the leftovers
// were never deleted. Confirmed 16/08/2026, so this is a count and not a warning.
if (skipped.length) {
  console.log(`  ${skipped.length} row(s) had a password but no ID and were skipped (lines ${skipped.join(', ')})`);
}

// `i` is their studentId, the same value the browser derives from their ID alone and
// the same one every vault token is built on. Sorted by it, so the published
// order carries nothing about class lists.
const people = usable
  .map((p) => {
    const studentId = sha256(p.id);
    return {
      i: studentId,
      p: passwordHash(studentId, p.password, salt, ITERATIONS),
      r: p.role
    };
  })
  .sort((a, b) => (a.i < b.i ? -1 : 1));

emit('data/roll.json', {
  version: 3,
  generated: new Date().toISOString().slice(0, 10),
  salt,
  iterations: ITERATIONS,
  count: people.length,
  people
});

// ---- answers --------------------------------------------------------------

const src = JSON.parse(read('private/answers.json'));
const checkpoints = {};

const MAX_ACCEPTED = 5;

for (const [id, cp] of Object.entries(src.checkpoints ?? {})) {
  if (!Array.isArray(cp.variants) || cp.variants.length !== 6) {
    console.error(`${id}: expected exactly 6 variants, found ${cp.variants?.length ?? 0}`);
    process.exit(1);
  }

  // Each variant is a list of accepted values. accept[0] is canonical: every
  // token and every vault code derives from it, so its ORDER IS LOAD-BEARING and
  // must survive to the output untouched. See CHECKPOINT_CONTRACT.md section 1.
  const variants = cp.variants.map((entry, i) => {
    const accepted = Array.isArray(entry) ? entry : [entry];
    if (accepted.length === 0 || accepted.length > MAX_ACCEPTED) {
      console.error(`${id} variant ${i}: expected 1 to ${MAX_ACCEPTED} accepted values, found ${accepted.length}`);
      process.exit(1);
    }
    const hashes = accepted.map((a) => sha256(canonical(a, cp.type, cp.round)));
    if (new Set(hashes).size !== hashes.length) {
      console.error(`${id} variant ${i}: two accepted values canonicalise the same`);
      process.exit(1);
    }
    return hashes;
  });

  // Parity: every variant of a checkpoint offers the same number of ways to be
  // right, or the six data sets are not the same question.
  const counts = new Set(variants.map((v) => v.length));
  if (counts.size !== 1) {
    console.error(`${id}: variants accept different numbers of values (${[...counts].join(', ')})`);
    process.exit(1);
  }

  // Type A needs a band for rung four to search. Without it the ladder cannot
  // reach its last rung, so this is an error rather than a warning.
  if (cp.type === 'numeric' && !cp.search) {
    console.error(`${id}: numeric checkpoints need a "search" range for hint 4`);
    process.exit(1);
  }
  if (cp.search) {
    const { min, max, step } = cp.search;
    if (![min, max, step].every(Number.isFinite) || step <= 0 || max <= min) {
      console.error(`${id}: search must be { min, max, step } with step > 0 and max > min`);
      process.exit(1);
    }
    const steps = Math.floor((max - min) / step) + 1;
    if (steps > 20000) {
      console.error(`${id}: search covers ${steps} values, too many to hash in the browser`);
      process.exit(1);
    }
    // Every canonical answer has to actually be ON the grid, or rung four
    // searches the whole band and finds nothing.
    for (const [i, entry] of cp.variants.entries()) {
      const first = Array.isArray(entry) ? entry[0] : entry;
      const target = canonical(first, cp.type, cp.round);
      let found = false;
      for (let k = 0; k < steps; k += 1) {
        if (canonical(min + k * step, cp.type, cp.round) === target) { found = true; break; }
      }
      if (!found) {
        console.error(`${id} variant ${i}: answer ${first} is not on the search grid`);
        process.exit(1);
      }
    }
  }

  checkpoints[id] = {
    type: cp.type,
    ...(cp.round !== undefined && { round: cp.round }),
    ...(cp.search !== undefined && { search: cp.search }),
    variants
  };
}

const rooms = {};
for (const [id, r] of Object.entries(src.rooms ?? {})) {
  rooms[id] = { bypass: sha256(String(r.bypass).trim().toUpperCase()) };
}

emit('data/answers.json', { version: 1, checkpoints, rooms });

// ---- guard ----------------------------------------------------------------
// Cheap insurance against a plaintext answer reaching the repo.

const written = JSON.stringify({ checkpoints, rooms });
for (const cp of Object.values(src.checkpoints ?? {})) {
  for (const entry of cp.variants) {
    for (const a of Array.isArray(entry) ? entry : [entry]) {
      if (written.includes(String(a)) && String(a).length > 3) {
        console.error(`LEAK: plaintext answer "${a}" appears in the output`);
        process.exit(1);
      }
    }
  }
}
for (const r of Object.values(src.rooms ?? {})) {
  if (written.includes(String(r.bypass))) {
    console.error('LEAK: a plaintext bypass code appears in the output');
    process.exit(1);
  }
}

// The roll is a list of real children, so this one is checked by shape rather
// than by search. Searching does not work here: an ID is five digits, a hash is
// hex, and digits are hex, so a given ID turns up inside 12,800 characters of
// hash about one time in eight. The first run of this guard fired on a hash.
//
// Proving there is nowhere for a plaintext to hide is stronger than looking for
// it. Every key is enumerated, every value is matched against the only shape it
// is allowed to have, and anything unrecognised fails.
const rollKeys = ['version', 'generated', 'salt', 'iterations', 'count', 'people'];
const rollOut = JSON.parse(read('data/roll.json'));

for (const key of Object.keys(rollOut)) {
  if (!rollKeys.includes(key)) {
    console.error(`LEAK: data/roll.json has an unexpected key "${key}"`);
    process.exit(1);
  }
}
if (!/^[0-9a-f]{32}$/.test(rollOut.salt)) {
  console.error('LEAK: the salt in data/roll.json is not 32 hex characters');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(rollOut.generated)) {
  console.error('LEAK: the generated date in data/roll.json is not a plain date');
  process.exit(1);
}
for (const entry of rollOut.people) {
  const keys = Object.keys(entry).sort().join(',');
  if (keys !== 'i,p,r') {
    console.error(`LEAK: a roll entry has keys "${keys}", expected "i,p,r"`);
    process.exit(1);
  }
  for (const field of ['i', 'p']) {
    if (!/^[0-9a-f]{64}$/.test(entry[field])) {
      console.error(`LEAK: a roll entry "${field}" is not 64 hex characters`);
      process.exit(1);
    }
  }
  if (entry.r !== 'student' && entry.r !== 'staff') {
    console.error(`LEAK: a roll entry role is "${entry.r}", expected student or staff`);
    process.exit(1);
  }
}

if (!CHECK) console.log('done. do not commit anything under private/.');
