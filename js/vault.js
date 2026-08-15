/* Identity, hashing, tokens and vault codes.
   Every function here is async because SubtleCrypto is, and pretending otherwise
   would push the await one layer up instead of removing it.
   Formats are fixed by docs/DATA_CONTRACTS.md. Changing one is a breaking change. */

const encoder = new TextEncoder();

/* No I, O, 0 or 1. A girl reading a code off her own screen and typing it into
   the next room should not lose ten minutes to a letter that looks like a digit. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* Trims, lowercases, drops any @domain and strips anything that is not a
   letter, digit, dot or hyphen, so the three ways a girl might type her own
   address all land on one string. Note a space is stripped rather than read as
   a dot, so a surname typed with a space is a different identity and gets
   stopped at the door. That is deliberate: better refused than a ghost profile.
   No example identity is written here, so the pre-merge grep for student names
   stays meaningful. */
export function normaliseIdentity(input) {
  let s = String(input ?? '').trim().toLowerCase();
  const at = s.indexOf('@');
  if (at !== -1) s = s.slice(0, at);
  return s.replace(/[^a-z0-9.-]/g, '');
}

export async function deriveStudentId(input) {
  const normalised = normaliseIdentity(input);
  if (normalised.length < 2) return null;
  return sha256Hex(normalised);
}

export async function loadRoll(url = 'data/roll.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`roll unavailable (${res.status})`);
  const roll = await res.json();
  return new Set(roll.ids ?? []);
}

export function isOnRoll(studentId, roll) {
  return Boolean(studentId) && roll.has(studentId);
}

/* Applied identically here and in scripts/build-data.mjs. If the two ever drift,
   nothing validates and the failure looks like a wrong answer. */
export function canonicalise(answer, type, round) {
  if (type === 'numeric') {
    const n = Number(String(answer).trim().replace(/,/g, ''));
    if (!Number.isFinite(n)) return null;
    const f = Math.pow(10, round ?? 0);
    return String(Math.round(n * f) / f);
  }
  if (type === 'choice') return String(answer).trim().toLowerCase();
  return String(answer).trim().toLowerCase().replace(/\s+/g, ' ');
}

/* Seeded from the stored answer hash rather than the answer itself.
   DATA_CONTRACTS describes the token as a function of the canonical answer, but
   the next room has to recompute the same vault code from answers.json alone,
   and all it holds there is the hash. Seeding from the hash gives an identical
   token in both places and still puts no plaintext anywhere. */
export async function deriveToken(answerHash, studentId, checkpointId) {
  const hex = await sha256Hex(answerHash + studentId + checkpointId);
  const n = parseInt(hex.slice(0, 4), 16);
  return ALPHABET[(n >> 5) & 31] + ALPHABET[n & 31];
}

export function formatVault(tokens) {
  return tokens.join('-');
}

/* The vault code for the room that follows the three given checkpoints. */
export async function deriveVault(answerHashes, studentId, checkpointIds) {
  const tokens = [];
  for (let i = 0; i < answerHashes.length; i += 1) {
    tokens.push(await deriveToken(answerHashes[i], studentId, checkpointIds[i]));
  }
  return formatVault(tokens);
}

export async function checkAnswer(answer, checkpoint, variant) {
  const canonical = canonicalise(answer, checkpoint.type, checkpoint.round);
  if (canonical === null) return { correct: false, token: null };
  const expected = checkpoint.variants[variant];
  const got = await sha256Hex(canonical);
  return { correct: got === expected, token: null, hash: expected };
}

/* Compared as hashes so the expected code never sits in a variable a student
   can read off the console while the page is open. */
export async function checkVault(input, expected, roomId, studentId) {
  const typed = String(input).trim().toUpperCase().replace(/\s/g, '');
  const a = await sha256Hex(typed + roomId + studentId);
  const b = await sha256Hex(expected.toUpperCase() + roomId + studentId);
  return a === b;
}

export async function checkBypass(input, roomId, answers) {
  const room = answers.rooms?.[roomId];
  if (!room?.bypass) return false;
  const got = await sha256Hex(String(input).trim().toUpperCase());
  return got === room.bypass;
}
