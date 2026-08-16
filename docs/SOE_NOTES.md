# SOE notes

**H₂O — Towards 2040 · Mathematics strand**

What the school laptops actually do, as opposed to what they are assumed to do.
One heading per thing tested, each with a date and a result. Fill these in on a real
SOE laptop, signed in as a student would be.

---

## Storage durability — stage 0

**Status: NOT YET RUN ON THE SOE.** Required by `docs/STORAGE_AMENDMENT.md` §2, which
moved it ahead of stage 1. The build has reached stage 6 without it, so it is overdue
rather than pending.

The whole progress model rests on this one answer, which is why the amendment pulled it
to the front.

### How to run it

**<https://iggs-tlelacheur.github.io/Y8EOYP2026/docs/soe-probe.html>**

Open it on a school SOE laptop in Edge and follow the four steps on the page. It writes to `h2o.probe` only, never to
`h2o.v1.*`, so it is safe to run on a laptop with a girl's real work on it. It reports
a verdict, and produces a block to paste into the table below.

Doing it by hand instead: `localStorage.setItem('h2o.probe', Date.now())` plus a write
to an IndexedDB store, close Edge, reopen, read both back, repeat after a reboot.

**Close Edge normally — do not End Task.** A browser that is killed rather than closed
can lose data it had not yet flushed to disk. That looks exactly like the failure this
probe is testing for and is not one; it was hit while building the probe, and it
produced a convincing false Outcome B.

Then check `edge://policy` for `ClearBrowsingDataOnExit`,
`ClearCachedImagesAndFilesOnExit`, and any Site Data deletion policy. No page can read
that list, so it is by eye.

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

### What has been verified, and where

The **probe page itself** was tested on the dev machine (Linux, Edge 148 headless) on
16/08/2026, driving a real browser: profile written, Edge closed and relaunched twice
against a persistent profile, then the storage wiped behind the page's back. All
fourteen checks passed — it reports Outcome A correctly, falls back correctly when the
store is empty, and lets a tester record a loss when the record it would have written
to is the thing that went missing.

**That says the page works. It says nothing about the school fleet.** A dev laptop with
no management policy is the easy case. The answer that matters can only come from a
school SOE laptop with the school's Edge policy applied, and that has not been done.

### The deployment, checked 16/08/2026

GitHub Pages went live the same day. Verified against
`https://iggs-tlelacheur.github.io/Y8EOYP2026/` by driving a real Edge:

- Every page, module, asset and data file returns 200; no absolute paths, so the project
  subpath does not break anything.
- Secure context is true, so SubtleCrypto and the File System Access API both work.
- Sign in as a test ID → hub, variant assigned, Lesson 2's chart drawing all 18 points,
  three checkpoints, Reader badge, and the code it minted opening Lesson 3.
- The vault code was identical to the one the same ID produces locally, which is the
  design: it is a function of her `studentId`, not of where the site is served from.
- The probe page itself ran on the live origin through two real browser restarts.

---

## Persistent storage grant

`navigator.storage.persist()` is requested once at login and the last answer is kept in
`h2o.v1.persisted`. Nothing is gated on it and no student ever sees it.

Measured 16/08/2026, Edge 148:

| Origin | `persist()` | Quota |
|---|---|---|
| `http://127.0.0.1` (dev) | **true**, in 2–5 ms | 10 GB |
| `https://iggs-tlelacheur.github.io` (live, first visit) | **false** | — |

**The live origin says no on a first visit, and that is normal.** Chromium decides on
engagement heuristics, so the same laptop can answer false today and true after the girl
has used the site a few times. It is the reason nothing may ever be gated on the result,
and the reason the call is bounded: a student who gets `false` must still reach the hub,
which she does. Worth re-reading on the SOE, because a managed profile may differ again.

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
