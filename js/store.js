/* Storage. Everything a student does lives here and nowhere else - no server,
   no account, no upload.

   The fleet is 1:1 assigned laptops, one Windows profile per girl, so this
   storage persists unless something actively removes it. Recovery exists for
   device swaps and for the handful who lose site data, not as the expected
   path. docs/STORAGE_AMENDMENT.md §1.

   Two things here are not reconstructible if they go: the rows a crew measured
   by hand, and her Lesson 2 answer that Lesson 6 quotes back at her. Both are
   mirrored into the crew's card file as they are made - see js/cardfile.js.
   Everything else, progress and badges and vault codes alike, is a function of
   her studentId and her own answers, so losing it costs time and not work.

   localStorage  state, small and synchronous
   IndexedDB     chart images, because a single 1920px PNG would eat the
                 localStorage quota on its own
   .h2o bundle   both of the above in one file the student can carry

   Shapes are fixed by docs/DATA_CONTRACTS.md. */

export const SCHEMA = 1;
export const NS = 'h2o.v1.';

export const KEYS = {
  profile: `${NS}profile`,
  progress: `${NS}progress`,
  badges: `${NS}badges`,
  charts: `${NS}charts`,
  card: `${NS}card`,
  data: `${NS}data`,
  responses: `${NS}responses`,
  seen: `${NS}seen`,
  persisted: `${NS}persisted`
};

export const BADGES = ['reader', 'collector', 'plotter', 'predictor'];

const DB_NAME = 'h2o-charts';
const DB_STORE = 'charts';
/* A FileSystemFileHandle survives a structured clone, so the crew's card file
   is one click away next lesson instead of a fresh trip through the picker. */
const HANDLE_STORE = 'handles';
const DB_VERSION = 2;

/* ---- localStorage -------------------------------------------------------- */

/* A locked-down browser profile can throw on any access, not just on write.
   The site has to keep working well enough to print, so every read degrades. */
function safeRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readJson(key, fallback) {
  const raw = safeRead(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  return safeWrite(key, JSON.stringify({ schema: SCHEMA, ...value }));
}

export function storageWorks() {
  const probe = `${NS}probe`;
  if (!safeWrite(probe, '1')) return false;
  try {
    window.localStorage.removeItem(probe);
  } catch {
    /* nothing useful to do; the write already proved the point */
  }
  return true;
}

/* ---- profile ------------------------------------------------------------- */

export function getProfile() {
  const p = readJson(KEYS.profile, null);
  return p?.studentId ? p : null;
}

export function setProfile({ studentId, display, crew, variant }) {
  return writeJson(KEYS.profile, {
    studentId,
    display,
    crew,
    variant,
    created: new Date().toISOString()
  });
}

export function isSignedIn() {
  return getProfile() !== null;
}

/* ---- persistent storage -------------------------------------------------- */

/* Asks the browser to move this origin out of best-effort eviction. Chromium
   decides on engagement heuristics rather than a prompt, so it can answer false
   on a first visit and true a week later, which is why the last answer is kept
   rather than the first.

   Nothing may ever be gated on the result and no student may ever see it. It is
   a diagnostic for staff.html, for the girl whose work has vanished.
   docs/STORAGE_AMENDMENT.md §3. */
/* Measured at 5ms on a first call, which is the only call that does any work.
   Bounded anyway: this sits on the login path, and nothing downstream reads the
   result, so there is no version of "the browser did not answer" that should
   cost a girl the door. A repeat call on an already-granted origin has been seen
   to hang indefinitely under automation. If that ever happens on the fleet, she
   waits a second and a half and signs in regardless. */
const PERSIST_TIMEOUT_MS = 1500;

export async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try {
    const granted = await Promise.race([
      navigator.storage.persist(),
      new Promise((resolve) => setTimeout(() => resolve(null), PERSIST_TIMEOUT_MS))
    ]);
    if (granted === null) return null;

    const estimate = await Promise.race([
      navigator.storage.estimate?.().catch(() => null) ?? Promise.resolve(null),
      new Promise((resolve) => setTimeout(() => resolve(null), PERSIST_TIMEOUT_MS))
    ]);

    const record = {
      granted,
      at: new Date().toISOString(),
      quota: estimate?.quota ?? null,
      usage: estimate?.usage ?? null
    };
    writeJson(KEYS.persisted, record);
    return record;
  } catch {
    /* An origin that will not answer is an origin we carry on without. */
    return null;
  }
}

export function getPersistence() {
  return readJson(KEYS.persisted, null);
}

/* ---- one-time prompts ---------------------------------------------------- */

/* Whether a girl has already been shown something that is only worth showing
   once. Prompting at the end of every session teaches her to click past the
   prompt, which is worse than never prompting. docs/STORAGE_AMENDMENT.md §5. */
export function hasSeen(flag) {
  return Boolean(readJson(KEYS.seen, {})[flag]);
}

export function markSeen(flag) {
  const seen = readJson(KEYS.seen, {});
  seen[flag] = new Date().toISOString();
  writeJson(KEYS.seen, seen);
  return seen[flag];
}

/* ---- progress ------------------------------------------------------------ */

export function getProgress() {
  return readJson(KEYS.progress, { schema: SCHEMA, rooms: {} });
}

export function getRoom(roomId) {
  const progress = getProgress();
  return progress.rooms[roomId] ?? { checkpoints: {}, badge: null, bypassed: false };
}

/* `response` is her own words, kept so Lesson 6 can quote her Lesson 2 answer
   back at her. Nothing else reads it, and it never leaves the browser. */
export function recordCheckpoint(roomId, checkpointId, { done, assisted, response }) {
  const progress = getProgress();
  const room = progress.rooms[roomId] ?? { checkpoints: {}, badge: null, bypassed: false };
  const prior = room.checkpoints[checkpointId] ?? { done: false, attempts: 0, assisted: false };

  room.checkpoints[checkpointId] = {
    done: done ?? prior.done,
    attempts: prior.attempts + 1,
    assisted: assisted ?? prior.assisted,
    response: response ?? prior.response ?? ''
  };

  progress.rooms[roomId] = room;
  return writeJson(KEYS.progress, { rooms: progress.rooms });
}

/* The door, not an answer. Recorded so a girl who cleared the lock on Tuesday
   does not type the code again on Thursday. */
export function markOpened(roomId) {
  const progress = getProgress();
  const room = progress.rooms[roomId] ?? { checkpoints: {}, badge: null, bypassed: false };
  room.opened = true;
  progress.rooms[roomId] = room;
  return writeJson(KEYS.progress, { rooms: progress.rooms });
}

export function markBypassed(roomId) {
  const progress = getProgress();
  const room = progress.rooms[roomId] ?? { checkpoints: {}, badge: null, bypassed: false };
  room.bypassed = true;
  progress.rooms[roomId] = room;
  return writeJson(KEYS.progress, { rooms: progress.rooms });
}

/* ---- ungated answers ----------------------------------------------------- */

/* Her own words on the items that are never marked and never gated - the ice
   creams and drinking fountains reading in L2 above all. Lesson 6 quotes her
   Lesson 2 answer back at her, so this has to survive four lessons, and it is
   kept apart from `progress` because these are not checkpoints and must never
   be counted as any.

   If it is missing, Lesson 6 degrades to the generic wording. It never invents
   an answer she did not give. */
export function getResponses() {
  return readJson(KEYS.responses, { schema: SCHEMA, items: {} }).items ?? {};
}

export function recordResponse(id, value) {
  const items = getResponses();
  items[id] = { value, at: new Date().toISOString() };
  return writeJson(KEYS.responses, { items });
}

/* ---- badges -------------------------------------------------------------- */

export function getBadges() {
  const stored = readJson(KEYS.badges, {});
  const badges = {};
  for (const name of BADGES) badges[name] = stored[name] ?? null;
  return badges;
}

export function awardBadge(name) {
  if (!BADGES.includes(name)) throw new Error(`unknown badge: ${name}`);
  const badges = getBadges();
  if (badges[name]) return badges[name];
  badges[name] = new Date().toISOString();
  writeJson(KEYS.badges, badges);
  return badges[name];
}

/* ---- the Card ------------------------------------------------------------ */

/* Her own working copy, autosaved on every keystroke. The crew's shared file is
   a separate thing and lives on disk; this is what survives her closing the lid
   before anyone has saved to it. */
export function getCard() {
  return readJson(KEYS.card, { schema: SCHEMA, fields: {}, charts: {} });
}

export function setCard({ fields, charts }) {
  return writeJson(KEYS.card, { fields, charts });
}

/* ---- the crew's own collected data --------------------------------------- */

/* Written by tools/table.html at stage 4 and read by both chart tools, so a
   girl types her measurements once rather than once per chart. */
export function getTableData() {
  const data = readJson(KEYS.data, null);
  return data?.columns?.length ? data : null;
}

export function setTableData({ columns, rows }) {
  return writeJson(KEYS.data, { columns, rows });
}

/* ---- IndexedDB ----------------------------------------------------------- */

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* indexedDB.open can raise none of its three events at all. A second tab holding
   an open connection across a version change leaves it "blocked" indefinitely,
   and a wedged profile leaves it silent - observed here, with no success, no
   error and no blocked event ever arriving.

   An unsettled promise is worse than a rejected one: every caller awaiting it
   stops for good, and a button disabled for the duration of the await never
   comes back. So it rejects on a timer instead, and the callers deal with a
   failure they can see. */
const DB_OPEN_TIMEOUT_MS = 4000;

function openDb() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(
      () => done(reject, new Error('the browser storage did not open')),
      DB_OPEN_TIMEOUT_MS
    );

    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      return done(reject, err);
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    req.onsuccess = () => done(resolve, req.result);
    req.onerror = () => done(reject, req.error);
    req.onblocked = () => done(reject, new Error('another tab is holding the storage open'));
  });
}

async function withStore(mode, fn, storeName = DB_STORE) {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const result = await fn(tx.objectStore(storeName));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

export function getChartIndex() {
  return readJson(KEYS.charts, { schema: SCHEMA, index: [] }).index ?? [];
}

export async function putChart(record) {
  await withStore('readwrite', (store) => request(store.put(record)));

  const { blob, ...meta } = record;
  const index = getChartIndex().filter((c) => c.id !== record.id);
  index.push(meta);
  writeJson(KEYS.charts, { index });
  return record.id;
}

export function getChart(id) {
  return withStore('readonly', (store) => request(store.get(id)));
}

export function getAllCharts() {
  return withStore('readonly', (store) => request(store.getAll()));
}

export async function deleteChart(id) {
  await withStore('readwrite', (store) => request(store.delete(id)));
  writeJson(KEYS.charts, { index: getChartIndex().filter((c) => c.id !== id) });
}

/* ---- the crew's card file handle ----------------------------------------- */

export function rememberCardHandle(handle) {
  return withStore('readwrite', (store) => request(store.put(handle, 'card')), HANDLE_STORE);
}

export function recallCardHandle() {
  return withStore('readonly', (store) => request(store.get('card')), HANDLE_STORE);
}

export function forgetCardHandle() {
  return withStore('readwrite', (store) => request(store.delete('card')), HANDLE_STORE);
}

/* ---- export and import --------------------------------------------------- */

/* btoa on a whole megabyte-scale string blows the argument limit, so it goes
   through in chunks. */
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function exportBundle() {
  const local = {};
  for (const key of Object.values(KEYS)) {
    const raw = safeRead(key);
    if (raw !== null) local[key] = raw;
  }

  const charts = [];
  for (const record of await getAllCharts()) {
    const { blob, ...meta } = record;
    charts.push({
      ...meta,
      type: blob?.type ?? 'image/png',
      data: blob ? toBase64(await blob.arrayBuffer()) : null
    });
  }

  return {
    format: 'h2o',
    schema: SCHEMA,
    exported: new Date().toISOString(),
    local,
    charts
  };
}

export async function exportToFile() {
  const bundle = await exportBundle();
  const profile = getProfile();
  const stamp = new Date().toISOString().slice(0, 10);
  const who = (profile?.display ?? 'work').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();

  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `h2o-${who}-${stamp}.h2o`;
  document.body.append(a);
  a.click();
  a.remove();
  /* Revoked on the next tick so the download has taken its reference. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return blob.size;
}

export async function importBundle(file) {
  const text = await file.text();
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error('That file is not readable. Check you picked the .h2o file you exported.');
  }

  if (bundle.format !== 'h2o') {
    throw new Error('That is not an H2O file. Look for one ending in .h2o');
  }
  if (bundle.schema > SCHEMA) {
    throw new Error('That file was made by a newer version of the site. Ask your teacher.');
  }

  for (const [key, raw] of Object.entries(bundle.local ?? {})) {
    if (key.startsWith(NS)) safeWrite(key, raw);
  }

  for (const chart of bundle.charts ?? []) {
    const { data, type, ...meta } = chart;
    if (!data) continue;
    await withStore('readwrite', (store) =>
      request(store.put({ ...meta, blob: new Blob([fromBase64(data)], { type }) }))
    );
  }

  return { charts: (bundle.charts ?? []).length };
}

/* ---- reset --------------------------------------------------------------- */

export async function clearEverything() {
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* already unreachable; nothing to remove */
    }
  }
  await withStore('readwrite', (store) => request(store.clear()));
  /* The pointer to the crew's file goes too. Leaving it would hand the next
     girl on this laptop a one-click route into another crew's card. */
  await withStore('readwrite', (store) => request(store.clear()), HANDLE_STORE);
}
