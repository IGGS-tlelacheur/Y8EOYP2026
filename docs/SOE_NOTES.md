# SOE notes

**H₂O — Towards 2040 · Mathematics strand**

What the school laptops actually do, as opposed to what they are assumed to do.
One heading per thing tested, each with a date and a result. Fill these in on a real
SOE laptop, signed in as a student would be.

---

## Storage durability — stage 0

**Status: NOT YET RUN.** Required by `docs/STORAGE_AMENDMENT.md` §2, which moved it
ahead of stage 1. The build has reached stage 6 without it, so it is overdue rather
than pending.

The whole progress model rests on this one answer, which is why the amendment pulled it
to the front.

Procedure, on a school SOE laptop in Edge, signed in as a student:

1. Load any page on the deployed origin.
2. In the console: `localStorage.setItem('h2o.probe', Date.now())`, and write a value to
   an IndexedDB store as well.
3. Close **every** Edge window. Confirm the process has exited in Task Manager.
4. Reopen Edge, reload, read both back.
5. Repeat after a reboot.
6. Check `edge://policy` for `ClearBrowsingDataOnExit`,
   `ClearCachedImagesAndFilesOnExit`, and any Site Data deletion policy.

| Step | Result | Date |
|---|---|---|
| localStorage after Edge restart | | |
| IndexedDB after Edge restart | | |
| localStorage after reboot | | |
| IndexedDB after reboot | | |
| `edge://policy` — any clear-on-exit policy? | | |

**Outcome A — the probe survives.** Proceed as specified. This is the expected result
and everything currently built assumes it.

**Outcome B — the probe is gone.** Stop and report. The progress model has to be
re-based on the `.h2ocard` file plus per-lesson export, and the badge design changes
with it. Do not work around it in code without a decision.

---

## Persistent storage grant

`navigator.storage.persist()` is requested once at login and the last answer is kept in
`h2o.v1.persisted`. Nothing is gated on it and no student ever sees it.

Measured on the dev machine, Chromium, 16/08/2026: **granted, in 2–5 ms**, reported
quota 10 GB. Worth re-reading on the SOE, because a managed profile may answer
differently.

The call is bounded at 1.5 s in `store.js`. It sits on the login path and nothing
downstream reads its result, so there is no version of "the browser did not answer"
that should cost a girl the door.

| Field | Result | Date |
|---|---|---|
| `granted` on the SOE | | |
| `estimate().quota` on the SOE | | |

---

## IndexedDB reliability

During stage 6 testing, `indexedDB.open` was observed raising **none** of its three
events — no `success`, no `error`, no `blocked` — leaving every awaiting caller stopped
for good and a Save button disabled with no way back.

`openDb` in `store.js` now rejects after 4 s rather than hanging, and callers re-enable
their controls in a `finally`. Worth knowing this failure mode exists if a girl reports
a dead button: a reload clears it.

| Check | Result | Date |
|---|---|---|
| Chart images survive a browser restart | | |
| Export produces a `.h2o` file containing chart blobs | | |

---

## Print

The Data Evidence Card is two A4 sheets. See the stage 7 checklist — this is the one
thing that has never been tested on the school's own printer, and the whole Card layout
rests on it.

| Check | Result | Date |
|---|---|---|
| Card prints as exactly two sheets | | |
| One chart on each sheet, nothing clipped | | |
| Blank Card prints at any stage of completion | | |
| `tools/table.html` recording sheet fits one page | | |
