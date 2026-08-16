/* Their data set, and the words that go with it.

   data/datasets.json holds six of everything. This file picks the right one and turns
   it into the tokens a room substitutes into its question wording, so that one
   authored stem serves all six variants rather than six stems drifting apart.

   Nothing here knows an answer. The answers are hashes in data/answers.json and
   are never in this file or the one it loads. */

export async function loadDatasets(url = 'data/datasets.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`datasets unavailable (${res.status})`);
  return res.json();
}

/* Throws rather than falling back to set 1. A missing variant is a data bug, and
   quietly handing six students the same numbers would hide it until their vault
   codes clashed. */
export function setFor(data, variant) {
  const chosen = data?.sets?.[variant];
  if (!chosen) throw new Error(`no data set for variant ${variant}`);
  return chosen;
}

const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* One flat map of everything a stem, an option or a hint might need to name. */
export function tokensFor(set) {
  const [a, b] = set.marked;
  return {
    theme: set.theme,
    EV: set.ev,
    ev: lower(set.ev),
    evUnit: set.evUnit,
    evShort: set.evShort,
    RV: set.rv,
    rv: lower(set.rv),
    rvUnit: set.rvUnit,
    rvShort: set.rvShort,
    chose: set.chose,
    px: set.p[0],
    py: set.p[1],
    ax: a[0], ay: a[1],
    bx: b[0], by: b[1],
    readAt: set.readAt,
    beyondAt: set.beyondAt,
    readRound: set.readRound,
    dataMin: set.dataRange.xMin,
    dataMax: set.dataRange.xMax,
    targetDay: set.week.targetDay,
    gridGap: set.week.ticks[1] - set.week.ticks[0],
    gridBelow: Math.floor(set.week.bars.find((x) => x.label === set.week.targetDay).value
      / (set.week.ticks[1] - set.week.ticks[0])) * (set.week.ticks[1] - set.week.ticks[0]),
    rows: set.sheet.rows.length
  };
}

/* {token} substitution. An unknown token is left as it was written rather than
   replaced with "undefined", so a typo in a stem shows up on screen as the typo
   it is instead of as a hole. */
export function fill(text, tokens) {
  return String(text).replace(/\{(\w+)\}/g, (whole, name) =>
    (name in tokens ? String(tokens[name]) : whole));
}

/* Options arrive as { role: text }. The data set says which slot each role sits
   in, so the right answer is not always in the same place on the page. */
export function optionsFor(set, checkpointId, byRole, tokens) {
  const roles = set.roles?.[checkpointId];
  const keys = ['opt_a', 'opt_b', 'opt_c', 'opt_d'];
  if (!roles) {
    return keys
      .filter((k) => byRole[k] !== undefined)
      .map((k) => ({ key: k, label: fill(byRole[k], tokens) }));
  }
  return keys
    .filter((k) => roles[k] !== undefined)
    .map((k) => ({ key: k, label: fill(byRole[roles[k]], tokens) }));
}
