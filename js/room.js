/* Room machinery: the lock on the door, the badge at the end, and the code for
   the next room.

   The gate is deliberately thin. A student who reads the source finds hashes,
   and CLAUDE.md settles that this is sufficient - effort goes into the hint
   ladder instead. What this file must get right is the opposite case: never
   locking out a girl who has done the work. */

import {
  checkVault, checkBypass, vaultFrom, formatVault
} from './vault.js';
import {
  getRoom, markOpened, markBypassed, awardBadge, getBadges, getTableData, getCard
} from './store.js';

export const ROOM_BADGE = { l2: 'reader', l3: 'collector', l4: 'plotter', l5: 'predictor' };

/* Which room's checkpoints mint the code for this one. L2 is first and is not
   locked: there is nothing before it to earn a code from. */
export const OPENS_WITH = {
  l3: ['l2.cp1', 'l2.cp2', 'l2.cp3'],
  l4: ['l3.cp1', 'l3.cp2', 'l3.cp3'],
  l5: ['l4.cp1', 'l4.cp2', 'l4.cp3']
};

export const MINTS = {
  l2: ['l2.cp1', 'l2.cp2', 'l2.cp3'],
  l3: ['l3.cp1', 'l3.cp2', 'l3.cp3'],
  l4: ['l4.cp1', 'l4.cp2', 'l4.cp3'],
  l5: ['l5.cp1', 'l5.cp2', 'l5.cp3']
};

/* ---- the deliverable ------------------------------------------------------ */

/* Three of three checkpoints earns the badge, and so does the room's own
   deliverable existing. Existence only - never quality, never a human reading
   it, so a Learning Coach can confirm any of these from the screen.
   Fixed by docs/CHECKPOINT_CONTRACT.md §5a. */
const DELIVERABLE = {
  reader: () => ({ ok: true }),

  collector: () => {
    const data = getTableData();
    const rows = data?.rows?.filter((r) => r.some((cell) => String(cell ?? '').trim() !== '')).length ?? 0;
    return {
      ok: rows >= 10,
      rows,
      todo: `Your table needs at least 10 rows of data. It has ${rows}. Add the rest in the collection table.`
    };
  },

  plotter: () => {
    const card = getCard();
    const filled = ['chart1', 'chart2'].filter((slot) => card.charts?.[slot]?.dataUrl).length;
    return {
      ok: filled === 2,
      todo: filled === 0
        ? 'Attach both charts to your crew\'s Card, then come back.'
        : 'One chart is on your crew\'s Card. Attach the other one, then come back.'
    };
  },

  predictor: () => {
    const card = getCard();
    const need = ['equation', 'interpolation', 'extrapolation'];
    const missing = need.filter((f) => !String(card.fields?.[f]?.value ?? '').trim());
    return {
      ok: missing.length === 0,
      todo: 'Fill in your line of best fit, your interpolation and your extrapolation on the Card, then come back.'
    };
  }
};

export function deliverableFor(badge) {
  return (DELIVERABLE[badge] ?? DELIVERABLE.reader)();
}

/* ---- the gate ------------------------------------------------------------- */

/* Returns true when the room is open. A room with no code before it is always
   open, and so is one already unlocked or bypassed - a girl who cleared the door
   on Tuesday does not type the code again on Thursday. */
export function isOpen(roomId) {
  if (!OPENS_WITH[roomId]) return true;
  const room = getRoom(roomId);
  return Boolean(room.opened || room.bypassed);
}

/* Wires the lock panel. `onOpen` runs once the door is through, by code, by
   bypass, or because it was already open. */
export async function mountLock(host, { roomId, answers, studentId, variant, onOpen }) {
  if (isOpen(roomId)) {
    host.hidden = true;
    onOpen();
    return;
  }

  const expected = await vaultFrom(answers, OPENS_WITH[roomId], studentId, variant);
  const input = host.querySelector('[data-vault]');
  const button = host.querySelector('[data-vault-go]');
  const msg = host.querySelector('[data-vault-msg]');

  function say(text, kind) {
    msg.className = `msg ${kind}`;
    msg.textContent = '';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = kind === 'good' ? '✓' : '!';
    const body = document.createElement('span');
    body.textContent = text;
    msg.append(mark, body);
    msg.hidden = false;
  }

  async function tryCode() {
    const typed = input.value.trim();
    if (!typed) return say('Type the code from the last room.', 'problem');

    if (await checkVault(typed, expected, roomId, studentId)) {
      markOpened(roomId);
      host.hidden = true;
      onOpen();
      return;
    }

    /* Staff code second, so a student's own code is never mistaken for one. */
    if (await checkBypass(typed, roomId, answers)) {
      markBypassed(roomId);
      markOpened(roomId);
      host.hidden = true;
      onOpen();
      return;
    }

    say('That code does not open this room. Check it against the last room, letter by letter.', 'problem');
  }

  button.addEventListener('click', tryCode);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      tryCode();
    }
  });
}

/* ---- the end of the room -------------------------------------------------- */

/* Called every time a checkpoint lands. Shows the code for the next room once
   all three are in, and awards the badge once the deliverable is there too.

   The code appears whether or not the deliverable does. Gating the code on Card
   work would strand a crew in the wrong room over something that is not a
   checkpoint. */
export async function mountFinish(host, { roomId, answers, studentId, variant, tokens, nextRoom }) {
  const badge = ROOM_BADGE[roomId];
  const ids = MINTS[roomId];
  const complete = ids.every((id) => tokens[id]);

  host.textContent = '';
  if (!complete) {
    host.hidden = true;
    return { complete: false, awarded: false };
  }
  host.hidden = false;

  const code = formatVault(ids.map((id) => tokens[id]));

  const h = document.createElement('h2');
  h.textContent = 'Your code';
  host.append(h);

  const p = document.createElement('p');
  p.textContent = nextRoom
    ? 'Write this down. It opens the next room, and it is yours alone.'
    : 'Write this down. It is yours alone.';
  host.append(p);

  const codeBox = document.createElement('div');
  codeBox.className = 'vault-code';
  codeBox.textContent = code;
  host.append(codeBox);

  /* The deliverable, said plainly, with what to do about it. */
  const check = deliverableFor(badge);
  const badges = getBadges();
  let awarded = Boolean(badges[badge]);

  if (check.ok && !awarded) {
    awardBadge(badge);
    awarded = true;
  }

  const note = document.createElement('div');
  if (awarded) {
    note.className = 'msg good';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = '✓';
    const body = document.createElement('span');
    body.textContent = `Badge earned: ${badge[0].toUpperCase()}${badge.slice(1)}.`;
    note.append(mark, body);
  } else {
    note.className = 'msg';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = '!';
    const body = document.createElement('span');
    body.textContent = `${check.todo} Your code above works either way.`;
    note.append(mark, body);
  }
  host.append(note);

  return { complete: true, awarded, code };
}

/* Kept for the staff page at stage 10: opens a room without a student code. */
export async function staffOpen(roomId, typed, answers) {
  if (!(await checkBypass(typed, roomId, answers))) return false;
  markBypassed(roomId);
  markOpened(roomId);
  return true;
}
