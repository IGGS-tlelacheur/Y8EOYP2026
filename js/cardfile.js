/* Writing one student's slice into the crew's .h2ocard from outside card.html.

   Almost everything a student does here is reconstructible. Vault codes are a
   function of their studentId and the canonical answer, so they can log in on any
   laptop, redo a checkpoint and get the identical token back. Losing progress
   costs them time.

   Two things cost work instead:

     the rows their crew measured by hand, which happened once, in a bathroom
     their Lesson 2 answer about the ice creams, which Lesson 6 quotes back at
     them four weeks later and which fails as a moment if it is missing

   Both are mirrored into the crew file at the moment they are made rather than
   at export time, because export time is a thing they have to remember to do.
   docs/STORAGE_AMENDMENT.md §4.

   Nothing in here is allowed to fail loudly. A crew that has not opened its
   Card in this browser yet has no handle, and that is an ordinary Tuesday, not
   an error they caused. */

import { recallCardHandle } from './store.js';

export const MIRROR = {
  written: 'written',
  noHandle: 'no-handle',
  noPermission: 'no-permission',
  failed: 'failed'
};

/* The crew's card lives in a OneDrive folder, so every await in here is a await
   on a network-backed disk that can stall. Nothing about this mirror is worth a
   student watching a disabled button, so the whole of it is on a clock. */
const MIRROR_TIMEOUT_MS = 6000;

function withTimeout(promise, ms = MIRROR_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);
}

/* What to tell them, given what happened. The written case says the crew file by
   name because that is the reassurance; every other case says the one thing they
   could do about it, and none of them says anything went wrong, because from
   where they are sitting nothing has. */
export function mirrorMessage(result, { saved = 'Saved on this laptop' } = {}) {
  if (result === MIRROR.written) return `${saved}, and in your crew's Card.`;
  return `${saved}. Open your crew's Card and save it to keep a copy there too.`;
}

/* `patch` is merged into their own entry, never over anyone else's. */
export async function mirrorToCard(studentId, patch, { display = null } = {}) {
  if (!studentId || !patch) return MIRROR.failed;

  let handle;
  try {
    handle = await withTimeout(recallCardHandle());
  } catch {
    return MIRROR.failed;
  }
  if (!handle) return MIRROR.noHandle;

  /* queryPermission, never requestPermission. A permission prompt raised by a
     Save button in a maths room is a prompt about a file they were not thinking
     about, and "no" to it is not an answer to the question they were actually
     asked. If the crew has not opened the Card in this browser this session,
     the mirror quietly does not happen and they are told to open it. */
  try {
    const state = await withTimeout(
      handle.queryPermission?.({ mode: 'readwrite' }) ?? Promise.resolve('denied')
    );
    if (state !== 'granted') return MIRROR.noPermission;
  } catch {
    return MIRROR.noPermission;
  }

  try {
    const text = await withTimeout((await withTimeout(handle.getFile())).text());
    const data = text.trim() ? JSON.parse(text) : {};
    if (data.format && data.format !== 'h2ocard') return MIRROR.failed;

    /* Read, change one member, write back. The window between the read and the
       write is milliseconds; card.html re-reads before it saves for the same
       reason, from the other direction. */
    const members = (data.members && typeof data.members === 'object') ? data.members : {};
    const mine = members[studentId] ?? {};
    members[studentId] = {
      ...mine,
      ...patch,
      name: display ?? mine.name ?? null,
      at: new Date().toISOString()
    };

    data.members = members;
    data.format = data.format ?? 'h2ocard';
    data.schema = data.schema ?? 1;

    /* createWritable stages the whole write and only commits on close, so a
       failure part way through leaves the crew's file as it was. */
    const writable = await withTimeout(handle.createWritable());
    await withTimeout(writable.write(JSON.stringify(data, null, 2)));
    await withTimeout(writable.close());
    return MIRROR.written;
  } catch {
    return MIRROR.failed;
  }
}

/* Reading their slice back out, for Lesson 6.

   Their Lesson 2 answer normally comes straight from localStorage. This is the
   path for the student whose laptop was reimaged between Lesson 2 and Lesson 6, or
   who is sitting at a different machine: the crew file has a copy because
   l2.html put one there when they wrote it.

   Returns null for every kind of "not available", including no handle and no
   permission. Lesson 6 must never show an empty quote. */
export async function readMemberSlice(studentId) {
  if (!studentId) return null;
  try {
    const handle = await withTimeout(recallCardHandle());
    if (!handle) return null;
    const state = await withTimeout(
      handle.queryPermission?.({ mode: 'read' }) ?? Promise.resolve('denied')
    );
    if (state !== 'granted') return null;
    const text = await withTimeout((await withTimeout(handle.getFile())).text());
    if (!text.trim()) return null;
    const data = JSON.parse(text);
    return data?.members?.[studentId] ?? null;
  } catch {
    return null;
  }
}

/* The two callers. Named rather than left as raw patches so that what the crew
   file is allowed to hold from outside card.html is a list in one place. */

export function mirrorRows(studentId, { columns, rows }, options) {
  return mirrorToCard(studentId, {
    rows: { columns, rows, at: new Date().toISOString() }
  }, options);
}

export function mirrorClaimB(studentId, { checkpointId, value }, options) {
  return mirrorToCard(studentId, {
    claimB: { checkpointId, value, at: new Date().toISOString() }
  }, options);
}
