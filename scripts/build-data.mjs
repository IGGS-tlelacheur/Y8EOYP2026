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
//     "l2.cp1": { "type": "numeric", "round": 1, "variants": [3.5, 4.2, 1.8, 2.9, 5.1, 3.3] }
//   },
//   "rooms": { "l3": { "bypass": "OPENSESAME" } }
// }

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

function canonical(answer, type, round) {
  if (type === 'numeric') {
    const n = Number(answer);
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

for (const [id, cp] of Object.entries(src.checkpoints ?? {})) {
  if (!Array.isArray(cp.variants) || cp.variants.length !== 6) {
    console.error(`${id}: expected exactly 6 variants, found ${cp.variants?.length ?? 0}`);
    process.exit(1);
  }
  checkpoints[id] = {
    type: cp.type,
    ...(cp.round !== undefined && { round: cp.round }),
    ...(cp.tolerance !== undefined && { tolerance: cp.tolerance }),
    variants: cp.variants.map((a) => sha256(canonical(a, cp.type, cp.round)))
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
  for (const a of cp.variants) {
    if (written.includes(String(a)) && String(a).length > 3) {
      console.error(`LEAK: plaintext answer "${a}" appears in the output`);
      process.exit(1);
    }
  }
}

if (!CHECK) console.log('done. do not commit anything under private/.');
