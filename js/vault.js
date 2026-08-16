/* Identity, hashing, tokens and vault codes.
   Every function here is async because SubtleCrypto is, and pretending otherwise
   would push the await one layer up instead of removing it.
   Formats are fixed by docs/DATA_CONTRACTS.md. Changing one is a breaking change. */

const encoder = new TextEncoder();

/* No I, O, 0, 1, S or 5. A girl reading a code off her own screen and typing it
   into the next room should not lose ten minutes to a letter that looks like a
   digit. Fixed by docs/CHECKPOINT_CONTRACT.md §1; thirty characters, so the two
   are taken by modulo rather than by masking five bits. */
export const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

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
    /* She was asked for a number and told the unit, so half of them will type
       the unit anyway: "175 litres", "175L", "175 l". Strip everything that is
       not part of the number. A comma is a thousands separator here, not a
       decimal point - this is an Australian classroom. */
    const cleaned = String(answer).trim().toLowerCase()
      .replace(/,/g, '')
      .replace(/[^0-9.-]/g, '');

    /* Number('') is 0, so an answer of nothing but units would validate as
       zero and could even be right. Guard before converting, not after. */
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;

    const n = Number(cleaned);
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
   token in both places and still puts no plaintext anywhere.

   The hash passed in must always be accept[0], never whichever accepted value
   she happened to type. A checkpoint may accept five values; five hashes would
   mint five tokens and five vault codes, four of which open nothing. Two girls
   both right, one locked out of the next room. See acceptedHash below. */
export async function deriveToken(answerHash, studentId, checkpointId) {
  const hex = await sha256Hex(answerHash + studentId + checkpointId);
  /* Two independent 16-bit halves, so the second character does not vary with
     the first. Modulo 30 is very slightly biased; over a two-character code
     read by one student that is worth nothing. */
  const a = parseInt(hex.slice(0, 4), 16);
  const b = parseInt(hex.slice(4, 8), 16);
  return ALPHABET[a % ALPHABET.length] + ALPHABET[b % ALPHABET.length];
}

/* The canonical hash for a checkpoint, whatever else it tolerates. Every token
   and every vault code derives from this and only this. */
export function acceptedHash(checkpoint, variant) {
  const entry = checkpoint.variants[variant];
  return Array.isArray(entry) ? entry[0] : entry;
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

/* The same thing straight off answers.json, which is how every room actually
   wants it. Always accept[0], so a girl who used a tolerated value gets the same
   code as a girl who hit it exactly. */
export function vaultFrom(answers, checkpointIds, studentId, variant) {
  const hashes = checkpointIds.map((id) => acceptedHash(answers.checkpoints[id], variant));
  return deriveVault(hashes, studentId, checkpointIds);
}

/* A checkpoint holds up to five accepted hashes per variant. Any of them is
   right; only the first is canonical. `hash` therefore comes back as accept[0]
   whichever one matched, so the caller cannot accidentally seed a token from a
   tolerated value. */
export async function checkAnswer(answer, checkpoint, variant) {
  const canonical = canonicalise(answer, checkpoint.type, checkpoint.round);
  const hash = acceptedHash(checkpoint, variant);
  if (canonical === null) return { correct: false, hash };

  const entry = checkpoint.variants[variant];
  const accepted = Array.isArray(entry) ? entry : [entry];
  const got = await sha256Hex(canonical);
  return { correct: accepted.includes(got), hash };
}

/* ---- rung four ----------------------------------------------------------- */

/* The last rung of the ladder hands over the answer. The repo holds hashes, and
   a hash does not invert, so the answer is recovered rather than stored.

   For a closed list it is exact: the room is already displaying every option, so
   hash each one and see which matches. Nothing plaintext was ever written down.
   Returns the matching key, or null if the data and the page disagree - which
   means a build error, and the room must say so rather than guess. */
export async function revealFromOptions(checkpoint, variant, keys) {
  const entry = checkpoint.variants[variant];
  const accepted = Array.isArray(entry) ? entry : [entry];
  for (const key of keys) {
    const got = await sha256Hex(canonicalise(key, checkpoint.type, checkpoint.round));
    if (accepted.includes(got)) return key;
  }
  return null;
}

/* For a number there is no list, but the stem states the band and the precision,
   so the band is the list. A few thousand digests, fired in batches because
   awaiting them one at a time turns one second into thirty.

   Publishing the band costs nothing: the question implies it already, and
   CLAUDE.md settled that a student who reads the source finds hashes and that
   this is sufficient. */
export async function revealFromBand(checkpoint, variant) {
  const { min, max, step } = checkpoint.search ?? {};
  if (![min, max, step].every(Number.isFinite) || step <= 0) return null;

  const entry = checkpoint.variants[variant];
  const accepted = Array.isArray(entry) ? entry : [entry];
  const count = Math.floor((max - min) / step) + 1;
  const BATCH = 512;

  for (let start = 0; start < count; start += BATCH) {
    const values = [];
    for (let i = start; i < Math.min(start + BATCH, count); i += 1) {
      /* Rebuilt from the index each time rather than accumulated, so floating
         point drift cannot walk the candidates off the grid. */
      values.push(canonicalise(min + i * step, checkpoint.type, checkpoint.round));
    }
    const hashes = await Promise.all(values.map(sha256Hex));
    const hit = hashes.findIndex((h) => accepted.includes(h));
    if (hit !== -1) return values[hit];
  }
  return null;
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
