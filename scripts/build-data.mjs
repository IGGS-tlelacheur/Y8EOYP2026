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
//   private/roll.csv       one student ID or email per line, header optional
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

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CHECK = process.argv.includes('--check');

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function normalise(input) {
  let s = String(input).trim().toLowerCase();
  const at = s.indexOf('@');
  if (at !== -1) s = s.slice(0, at);
  return s.replace(/[^a-z0-9.-]/g, '');
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

const rawIds = read('private/roll.csv')
  .split(/\r?\n/)
  .map((l) => l.split(',')[0])
  .map(normalise)
  .filter((s) => s.length > 1 && s !== 'id' && s !== 'email' && s !== 'studentid');

const unique = [...new Set(rawIds)];
if (unique.length !== rawIds.length) {
  console.warn(`note: ${rawIds.length - unique.length} duplicate ID(s) collapsed`);
}

const ids = unique.map(sha256).sort();

emit('data/roll.json', {
  version: 1,
  generated: new Date().toISOString().slice(0, 10),
  count: ids.length,
  ids
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

if (!CHECK) console.log('done. do not commit anything under private/.');
