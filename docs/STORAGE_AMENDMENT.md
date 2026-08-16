# Amendment 01 — Storage durability and recovery

**H₂O — Towards 2040 · Mathematics strand · `docs/STORAGE_AMENDMENT.md`**

Amends `BUILD_PLAN.md` §3 (Recovery), §11a, §12 and `PLAYBOOK.md` stages 1 and 11.
Where this document and the build plan disagree, this document wins.

---

## 1. What changed

The build plan asserts that a cleared cache is "a certainty, not a risk", and sizes
the recovery machinery against that. That assertion was written for shared lab
machines with roaming profiles. The actual environment is **1:1 assigned Windows
laptops, single model, Edge, one Windows profile per student**. On that fleet
localStorage and IndexedDB persist indefinitely unless something actively removes
them.

The recovery machinery stays. Its **justification** and its **prominence** change.

---

## 2. New stage 0 — verify before building `store.js`

This test moves from stage 11 to **before stage 1**. It is the only unknown that can
invalidate the storage design, so it is not deferred.

On a school SOE laptop, in Edge, signed in as a student would be:

1. Load any page on the deployed origin (or a Pages test page on the same origin).
2. `localStorage.setItem('h2o.probe', Date.now())` in the console, and write a value
   to an IndexedDB store as well.
3. Close **every** Edge window. Confirm the process has exited.
4. Reopen Edge, reload, read both back.
5. Repeat after a reboot.
6. Check `edge://policy` for `ClearBrowsingDataOnExit` /
   `ClearCachedImagesAndFilesOnExit` and any Site Data deletion policy.

**Outcome A — the probe survives.** Proceed as specified. This is the expected result.

**Outcome B — the probe is gone.** Stop and report. The entire progress model must be
re-based on the `.h2ocard` file plus per-lesson export, and the badge design changes
with it. Do not attempt to work around it in code without a decision.

Record the outcome and the date in the repo, in `docs/SOE_NOTES.md`.

---

## 3. Request persistent storage at login

In `store.js`, on successful login only (it must follow a user gesture):

```js
if (navigator.storage?.persist) {
  const granted = await navigator.storage.persist();
  await store.set('h2o.v1.persisted', { granted, at: new Date().toISOString() });
}
```

Chromium grants this on engagement heuristics rather than a prompt, so it may return
`false` on first visit and `true` later. Call it once per session and record the last
result. Its only effect is to move the origin out of best-effort eviction under disk
pressure. **Never gate anything on the result** and never surface it to a student.

Surface it on `staff.html` only, alongside a `navigator.storage.estimate()` readout,
as a diagnostic for the girl whose work has vanished.

---

## 4. The two things that must not be lost

Everything else in `h2o.v1.*` is reconstructible. Vault codes are a function of
`studentId` and the canonical answer, so a girl who logs in again on any device and
redoes a checkpoint gets the identical token. Losing progress costs her time, not
work.

Two items are not reconstructible:

| Item | Why | Where it must also live |
|---|---|---|
| **L3 collected data rows** | Gathered by hand, once. Cannot be regenerated. | Crew `.h2ocard` |
| **The L2 Claim B answer** (canteen ice cream vs drinking fountain use) | Quoted back at her in L6. Four weeks of shelf life. The moment fails if it is gone. | Crew `.h2ocard` |

Mirror both into the `.h2ocard` at the moment they are produced, not at export time.

- Extend the `.h2ocard` schema in `DATA_CONTRACTS.md` with a `members[]` array keyed
  by `studentId`, each holding `rows[]` and `claimB` with the raw stored answer,
  timestamp and `checkpointId`.
- The card already syncs via OneDrive, so this costs no new mechanism.
- L6 reads Claim B from local storage first and falls back to the card. If both are
  missing, fall back to a neutral generic phrasing rather than a broken personalised
  one. Do not display an empty quote.

---

## 5. Export and print — reprioritised

The end-of-session export prompt fires on **Lesson 3 only**, immediately after the
data table is committed, and it is modal there. Prompting after every session trains
students to click past it, which is worse than not prompting at all.

- The export button stays permanently visible on the hub, unprompted, in all rooms.
- The Card still prints at any stage of completion.
- Import on the login page is unchanged.
- Remove the "export or print at the end of every session" line from the Lesson 1
  deck and the curriculum summary. Replace with the Lesson 3 prompt.

---

## 6. The File System Access API is not a backup

State this in `CLAUDE.md` so it does not get traded away under time pressure.

The crew-owned `.h2ocard` exists because **the Card is a shared artefact edited by
twelve to fifteen students and handed to a film crew**. That requirement is
independent of how durable browser storage turns out to be. Outcome A in §2 does not
reduce the scope of the card, the file handle persistence, the `lastEditedBy`
tracking or the soft lock.

---

## 7. Residual failure modes — accept, do not engineer around

Documented so nobody spends a day on them:

- **Device swap or reimage.** localStorage does not roam with Edge sync. Handled by
  `staff.html` import of a `.h2o` file, or by re-login and redo.
- **InPrivate window.** Everything is discarded at close. Detect it if cheap
  (`navigator.storage.estimate()` reports a small quota) and warn once at login;
  otherwise ignore.
- **A different browser on the same machine.** Same treatment as a device swap.
- **Helpdesk or student clearing site data.** Unavoidable. Re-login regenerates
  identity and codes.

Expected incidence across ~180 students over five weeks: single figures. Handle them
at the desk, not in the architecture.

---

## 8. Text to change in `BUILD_PLAN.md`

- §3 *Recovery*: strike "Non-negotiable, because a cleared cache in a school lab is a
  certainty, not a risk." Replace with "Recovery exists for device swaps and for the
  handful of girls who lose site data. Verified against the SOE at stage 0."
- §3: strike "Tell students at the end of every session: export or print." Replace per
  §5 above.
- §12 *Known weak points*: replace "Cache clearing wipes everything" with "Site data
  loss wipes personal progress. Collected rows and the Claim B answer are mirrored to
  the crew card; everything else regenerates on re-login."
- §11 *Build order*: add stage 0 per §2. The cache-clear test at stage 11 becomes a
  confirmation, not a discovery.
