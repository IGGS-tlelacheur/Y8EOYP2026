/* Checkpoints and hint ladders.

   One checkpoint is: a question about her own variant, an answer of one of three
   shapes, and a four-rung ladder that fires on wrong attempts. Rules are fixed by
   docs/CHECKPOINT_CONTRACT.md and the questions themselves live in the room, not
   here - this file knows how a checkpoint behaves, never what it asks.

   Nothing here marks anything. It compares hashes. */

import {
  checkAnswer, deriveToken, acceptedHash, revealFromOptions, revealFromBand
} from './vault.js';
import { recordCheckpoint, getRoom } from './store.js';

/* Rungs fire at 1, 2, 3 and 4 wrong attempts, and stay on screen once fired:
   rung 2 does not replace rung 1. She can see the whole ladder she has climbed,
   which is also the only way rung 3 makes sense - it refers back to rung 2. */
const RUNGS = 4;

/* ---- rendering ----------------------------------------------------------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  /* textContent, never innerHTML. Some of these strings are hers. */
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Type B and C both present a closed list; the difference is only that C's list
   is a bank of words. Type A is a text field. Every one of them says out loud
   what shape of answer it wants, because the stem promised it would. */
function buildInput(cp) {
  const wrap = el('div', 'cp-input');

  if (cp.type === 'numeric') {
    const field = el('input');
    field.type = 'text';
    field.inputMode = 'decimal';
    field.setAttribute('aria-label', 'Your answer');
    field.autocomplete = 'off';
    wrap.append(field);
    return { wrap, read: () => field.value, focus: () => field.focus(), field };
  }

  const list = el('div', 'cp-options');
  list.setAttribute('role', 'radiogroup');
  const name = `cp-${cp.id}`;

  for (const option of cp.options) {
    const label = el('label', 'cp-option');
    const radio = el('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = option.key;
    label.append(radio, el('span', null, option.label));
    list.append(label);
  }

  wrap.append(list);
  return {
    wrap,
    read: () => list.querySelector('input:checked')?.value ?? '',
    focus: () => list.querySelector('input')?.focus(),
    field: null
  };
}

/* ---- the ladder ---------------------------------------------------------- */

function rungNode(n, text) {
  const box = el('div', 'rung');
  box.append(el('span', 'rung-n', `Hint ${n}`), el('p', null, text));
  return box;
}

/* ---- one checkpoint ------------------------------------------------------ */

/* `cp` is authored in the room:
     { id, roomId, type, stem, options?, answerNote }
   `record` is the matching entry from data/answers.json.

   onDone fires once, the first time she gets it right or reaches rung four. */
export function mountCheckpoint(host, cp, record, { variant, studentId, onDone }) {
  const room = getRoom(cp.roomId);
  const prior = room.checkpoints?.[cp.id];
  let attempts = prior?.attempts ?? 0;
  let settled = Boolean(prior?.done);

  const box = el('section', 'cp');
  box.id = cp.id;

  const head = el('div', 'cp-head');
  head.append(el('h3', null, cp.title));
  box.append(head);
  box.append(el('p', 'cp-stem', cp.stem));

  const input = buildInput(cp);
  box.append(input.wrap);

  const actions = el('div', 'actions');
  const submit = el('button', 'btn', 'Check my answer');
  submit.type = 'button';

  /* Asking for help should not require pretending to answer. The contract fires
     rungs on wrong attempts, which leaves a girl who is stuck with guessing as
     her only route to a hint - a bad thing to teach and a worse thing to leave
     in a room with no teacher in it. Asking costs exactly what a wrong answer
     costs, so the ladder still ends at rung four either way.
     Proposed amendment to CHECKPOINT_CONTRACT.md §4. */
  const help = el('button', 'btn secondary', 'I need a hint');
  help.type = 'button';

  actions.append(submit, help);
  box.append(actions);

  const msg = el('div', 'msg');
  msg.hidden = true;
  box.append(msg);

  const ladder = el('div', 'ladder');
  box.append(ladder);

  const tokenBox = el('div', 'token');
  tokenBox.hidden = true;
  box.append(tokenBox);

  host.append(box);

  function say(text, kind) {
    msg.className = `msg ${kind}`;
    msg.textContent = '';
    msg.append(el('span', 'mark', kind === 'good' ? '✓' : '!'), el('span', null, text));
    msg.hidden = false;
  }

  async function award({ assisted, response }) {
    settled = true;
    const token = await deriveToken(acceptedHash(record, variant), studentId, cp.id);

    recordCheckpoint(cp.roomId, cp.id, { done: true, assisted, response });

    tokenBox.textContent = '';
    tokenBox.append(
      el('span', 'token-label', 'Your piece of the code'),
      el('strong', 'token-value', token)
    );
    tokenBox.hidden = false;

    submit.disabled = true;
    help.disabled = true;
    input.wrap.querySelectorAll('input').forEach((i) => { i.disabled = true; });
    onDone?.({ id: cp.id, token, assisted });
  }

  /* Rung four does not scold and does not explain. It says the answer, gives her
     the token, and lets her move. The badge is not withheld - `assisted` is
     recorded for staff, and the room never uses the word. */
  async function openRungFour() {
    const answer = cp.type === 'numeric'
      ? await revealFromBand(record, variant)
      : await revealFromOptions(record, variant, cp.options.map((o) => o.key));

    if (answer === null) {
      /* The page and the data disagree - a build error, not her mistake. */
      say('This one is not working. Tell your teacher, then move on to the next question.', 'problem');
      return;
    }

    const shown = cp.type === 'numeric'
      ? answer
      : cp.options.find((o) => o.key === answer)?.label ?? answer;

    ladder.append(rungNode(4, `The answer is ${shown}.`));

    if (cp.type === 'numeric') {
      if (input.field) input.field.value = answer;
    } else {
      const radio = input.wrap.querySelector(`input[value="${answer}"]`);
      if (radio) radio.checked = true;
    }

    await award({ assisted: true, response: String(shown) });
  }

  async function attempt() {
    if (settled) return;
    const typed = input.read().trim();

    if (!typed) {
      say(cp.type === 'numeric' ? 'Type your answer in the box first.' : 'Choose one of the answers first.', 'problem');
      return;
    }

    submit.disabled = true;
    try {
      const { correct } = await checkAnswer(typed, record, variant);

      if (correct) {
        say('That is right.', 'good');
        await award({ assisted: attempts > 0, response: typed });
        return;
      }

      attempts += 1;
      recordCheckpoint(cp.roomId, cp.id, { done: false, response: typed });

      if (attempts >= RUNGS) {
        say('Here is the answer, and your piece of the code.', 'problem');
        await openRungFour();
        return;
      }

      /* Error messages say what to do next, not what went wrong. */
      say(cp.retry ?? 'Not that one. Read the hint below, then try again.', 'problem');
      ladder.append(rungNode(attempts, cp.hints[attempts - 1]));
      submit.disabled = false;
    } catch (err) {
      say('That did not go through. Try pressing the button again.', 'problem');
      submit.disabled = false;
    }
  }

  /* One rung per press, and it counts as an attempt, so four presses reach the
     answer exactly as four wrong answers would. */
  async function askForHint() {
    if (settled) return;
    attempts += 1;
    recordCheckpoint(cp.roomId, cp.id, { done: false, assisted: true });

    if (attempts >= RUNGS) {
      help.disabled = true;
      say('Here is the answer, and your piece of the code.', 'problem');
      await openRungFour();
      return;
    }
    ladder.append(rungNode(attempts, cp.hints[attempts - 1]));
    if (attempts >= RUNGS - 1) help.textContent = 'Show me the answer';
  }

  submit.addEventListener('click', attempt);
  help.addEventListener('click', askForHint);

  /* Enter submits a typed answer, because she will press it whether or not we
     planned for her to. */
  if (input.field) {
    input.field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        attempt();
      }
    });
  }

  /* Coming back to a room she has already finished: show it done rather than
     inviting her to answer it again. Her token is regenerated, never stored. */
  if (settled) {
    say('You finished this one.', 'good');
    (async () => {
      const token = await deriveToken(acceptedHash(record, variant), studentId, cp.id);
      tokenBox.textContent = '';
      tokenBox.append(
        el('span', 'token-label', 'Your piece of the code'),
        el('strong', 'token-value', token)
      );
      tokenBox.hidden = false;
      submit.disabled = true;
      help.disabled = true;
      input.wrap.querySelectorAll('input').forEach((i) => { i.disabled = true; });
      onDone?.({ id: cp.id, token, assisted: Boolean(prior?.assisted), restored: true });
    })();
  }

  return { id: cp.id, done: () => settled };
}
