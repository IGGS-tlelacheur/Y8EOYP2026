# Playbook

How this gets built, in what order, and how each stage is checked before moving on.
Read `CLAUDE.md` first for the constraints.

---

## Ground rules for a working session

1. **One stage per session.** Finish it, verify it against the checks below, commit it.
2. **Verify by running, not by reading.** `python3 -m http.server 8000` and open it.
   A file that has never been loaded in a browser is not finished.
3. **The author cannot see the screen.** Claude cannot see rendered output. Say what to
   look at, in specific terms: "the fit line handles should sit on the line, not above
   it". Do not report a visual result as confirmed.
4. **Ask before inventing content.** Checkpoint wording, dataset variants, deck scripts
   and rubric language are written by Lash. Placeholders are fine; invented pedagogy is
   not. Mark placeholders `TODO(content)` so they are greppable.
5. **Commit messages state what changed and why.** `git log` is the only record of the
   build that will survive.

---

## Build order

Bottom-up. The rooms are thin wrappers around the tools, so the tools come first.
The hardest thing is stage 2 and it is deliberately early — everything from Lesson 4
onwards depends on it, and if the charting engine is wrong, it is wrong six times.

### Stage 0 — Does the storage survive?
Twenty minutes on a school SOE laptop, in Edge. Open `docs/soe-probe.html` on the
deployed origin and follow the four steps on it; it writes to `h2o.probe` only, so it
is safe to run on a laptop with a girl's real work on it.

Results table: `docs/SOE_NOTES.md`. Rationale: `docs/STORAGE_AMENDMENT.md` §2.

**Close Edge normally, never End Task.** A killed browser loses data it had not
flushed, which fakes a failure convincingly.

This is the only unknown that can invalidate the storage design, which is why it sits
ahead of stage 1 rather than inside stage 11. **It has not been run, and the build has
reached stage 6 without it.** Outcome A (the probe survives) is expected and is what
everything built so far assumes. Outcome B means stopping and re-basing the progress
model on the `.h2ocard` plus per-lesson export, and the badge design changes with it.

**Verify:** the table in `docs/SOE_NOTES.md` is filled in, with a date.

### Stage 1 — Foundations
`js/store.js`, `js/vault.js`, `js/variants.js`, `index.html`, `hub.html`, `css/site.css`

- Storage layer: localStorage for state, IndexedDB for image blobs, one namespace
  `h2o.v1.*`, schema version present from day one.
- Identity: normalise, hash, check against `data/roll.json`, reject unknown IDs.
- Vault: token derivation, code validation, all via SubtleCrypto.
- Hub: badge rack, room list with lock states, export button.

**Verify:** log in as a test ID; confirm the same ID typed three different ways
(with and without spaces, in either case) produces one profile and one
variant. Confirm an ID not on the roll is refused. Clear site data, log in again, confirm
the variant is identical. Confirm no plaintext answer appears anywhere in `view-source`.

### Stage 2 — Charting engine and the bivariate tool
`js/chart.js`, `tools/bi.html`

Do the engine and the hardest consumer together, or the engine will be designed for the
easy case. Axes, scales, ticks, labels, title, SVG render, PNG export at 2×, 1920×1080
video export. Then scatterplot, draggable line of best fit, equation reveal, prediction
readout, shaded extrapolation region.

**Verify:** drag the fit line by finger and by arrow keys. Export a PNG and open it —
axis labels present, units present, nothing clipped. Confirm export is refused while
either axis label is empty. Enter an x beyond the data and confirm the readout is marked
as beyond the data. Resize the window and confirm the chart does not distort.

### Stage 3 — Univariate tool
`tools/uni.html`

Dot plot, column, pie, histogram with a live bin-width control, box plot with the
five-number summary shown as it builds.

**Verify:** the same dataset through all five chart types. Histogram bin slider updates
without a full re-render flash. Box plot summary matches a hand calculation — check
against a known five-number summary, do not trust the code.

### Stage 4 — Table builder
`tools/table.html`

Column definition, row entry, type validation, CSV in and out, printable blank
recording sheet, feeds both chart tools.

**Verify:** print the blank sheet and look at it on paper. Import a CSV with a blank
cell and a text value in a numeric column; confirm both are flagged and neither crashes.

### Stage 5 — The Card
`card.html`, crew file handling

Port `data-evidence-card.html`, wire to storage, chart attachment slots, autosave,
File System Access API open/save to the crew folder, soft concurrency lock, per-field
authorship, print CSS, 1920-wide PNG export.

**Verify:** two browser profiles open the same file, edit different fields, save in turn;
confirm the soft lock warns and that no field is silently lost. Print it. Compare against
the original card side by side.

### Stage 6 — Rooms L2 to L5
`l2.html` … `l5.html`

Checkpoints, hint ladders, vault entry, badge award, certificate.

**Verify:** work one room through as a student would, deliberately wrong four times, and
confirm the ladder escalates and rung four gives the answer. Confirm the badge writes,
the hub updates, and the Card tick appears.

### Stage 7 — Data
`data/datasets.json`, `data/answers.json`, `scripts/make-datasets.mjs`,
`scripts/check-datasets.mjs`, `js/dataset.js`

Six variants of every checkpoint, generated with the answers from one source so the
two cannot disagree. The rooms hold one authored stem each and fill it from her set.

```
node scripts/make-datasets.mjs && node scripts/check-datasets.mjs && node scripts/build-data.mjs
```

**Verify:** all three pass, and walk all six variants in a browser — every checkpoint
correct, no `{token}` left unfilled on screen, six different final codes.

### Stage 8 — L1, L6, extension, misleading-chart tool
`l1.html`, `l6.html`, `extension.html`, `tools/mislead.html`

Includes the two spurious claims: Claim A stated in the L1 deck, Claim B planted in L2
as an ordinary reading task and returned in L6 with the student's own earlier answer
quoted back at her. That quoting is a real feature — L6 reads her stored L2 response.

**Verify:** confirm L6 retrieves the actual stored L2 answer and does not fabricate one.
If no answer is stored, it must degrade gracefully and not accuse her of something she
did not say.

### Stage 9 — Decks
`deck-1.html`, `deck-6.html`

Keyboard-driven, 16:9, projector-legible, no build step, work offline once loaded.

**Verify:** run on the actual projector at the actual resolution. Minimum type size that
reads from the back of the room.

### Stage 10 — Staff
`staff.html`, certificates, printed staff sheet

Bypass codes, reset, re-link, export/import, plain-English crib notes per room.

**Verify:** hand `staff.html` to someone who does not teach maths and ask them to answer
"is this crew's work good enough?" using only what is on screen. If they hesitate, the
crib notes are not finished. This is the single most important test in the project.

### Stage 11 — Lab test
On the real hardware, on the school network, with real accounts.

Cache clear mid-session — now a **confirmation of stage 0, not a discovery**. Two crew
members editing the Card. OneDrive sync lag, including a save that stalls: confirm no
button is left disabled. A student who mistypes her ID. A crew with no data using the
borrowed dataset. Print from the actual printer.

---

## Deploy

GitHub Pages, project site, `main` branch, root or `/docs`, whichever is set. There is no
build step, so a push is a deploy and there is no staging environment.

Consequence: **never push directly to `main` during a lesson week.** Work on a branch,
merge deliberately. A broken push during Lesson 3 is a broken Lesson 3 for 180 students.

Before any merge to `main`:

- `node scripts/build-data.mjs --check` passes.
- `grep -ri` for plaintext answers, codes and student names returns nothing.
- Every page loads over HTTPS with no console errors.
- Hard refresh with cache disabled, confirm no stale module.

---

## When stuck

- **The bivariate tool feels wrong on touch.** It probably is. Nothing else in the build
  is as sensitive to it. Fix it there rather than working around it in five places.
- **A checkpoint has no clean single answer.** That is a content problem, not a code
  problem. Stop and ask, do not loosen the validation to accept a range that also accepts
  a misconception.
- **Something needs a dependency.** It does not. Re-read the constraints in `CLAUDE.md`
  and solve it in about forty lines of vanilla JavaScript.
- **The design is drifting from the Card.** Open `data-evidence-card.html` and compare.
  Students meet the Card first and the site second; the site matches the Card, not the
  other way round.
