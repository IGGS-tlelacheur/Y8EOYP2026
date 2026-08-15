# CLAUDE.md

Working rules for this repository. Read this before writing anything.

**What this is:** the mathematics strand of *H₂O: Towards 2040*, a Year 8 end-of-year
transdisciplinary programme at Ivanhoe Girls' Grammar School. Six lessons on bivariate
data, delivered as a self-directed website. Students are 13, have never seen a
scatterplot, and will be supervised for four of the six lessons by teachers who are not
mathematicians.

Full specification: `docs/BUILD_PLAN.md`. Working procedure: `docs/PLAYBOOK.md`.
File formats: `docs/DATA_CONTRACTS.md`.

---

## Hard constraints

Do not violate these. Do not propose alternatives to these.

- **No framework.** No React, no Vue, no Svelte, no jQuery. Vanilla ES modules.
- **No build step.** No bundler, no transpiler, no TypeScript, no PostCSS. What is in
  the repo is what the browser loads. `git push` is the deploy.
- **No runtime dependencies.** No npm packages shipped to the browser, no CDN scripts,
  no Google Fonts request. Everything self-hosted in this repo.
- **No backend.** No server, no database, no API calls, no telemetry, no analytics.
  Nothing about a student leaves her laptop.
- **No plaintext answers or unlock codes anywhere in the repo.** Hashes only. See
  `docs/DATA_CONTRACTS.md`.
- **No browser storage APIs beyond localStorage and IndexedDB.** No cookies.

Node is used at author time only, for `scripts/build-data.mjs`. It never runs in a browser.

## Environment

- **Hosting:** GitHub Pages, HTTPS, project site. Confirmed reachable from school.
- **Clients:** one laptop model, Windows, touchscreen, Edge (Chromium). Assume nothing
  else, but do not deliberately break Firefox.
- **Secure context is required** — SubtleCrypto and the File System Access API both
  need it. A `file://` copy will not work. Never suggest one as a workaround.

## Locked decisions

These were settled with the client. Treat them as closed. If you think one is wrong,
say so once, in a sentence, and then follow it anyway.

| Decision | Settled as |
|---|---|
| Lesson sequence | L1 intro (no badge), L2 Reader, L3 Collector, L4 Plotter, L5 Predictor, L6 synthesis |
| Toolchain | Bespoke tools only. CODAP and Excel are out. Do not reintroduce them |
| Identity | School email or student ID, normalised and hashed, checked against a hashed roll |
| Crew and display name | Held separately from identity, never part of the hash |
| Unlock codes | Derived from the student's own correct answers, never random, never stored in plaintext |
| Dataset variants | Six, assigned deterministically from the student ID |
| Card ownership | Crew-owned file in the crew's OneDrive/Teams folder, File System Access API |
| Badges and personal progress | Individual, local to the browser |
| Absentee catch-up | No separate build. Rooms are self-directed; students catch up in their own time |
| Film requirement | Programme deliverable, not a maths criterion. Supply exports, do not assess |
| Charts in film | 1920×1080 export provided; whether it is used is the film crew's problem |

## Conventions

- **Pointer Events, never mouse events.** Every drag, every handle. Touch is the primary
  input on this fleet. Minimum 44 px hit targets. Every drag also has a keyboard path.
- **ES modules**, one concern per file, named exports, no default exports.
- **Two-space indent, single quotes, semicolons.** No trailing commas in function args.
- **British/Australian spelling in all student-facing text.** Metric units. Litres, not
  liters. 24-hour clock. Dates as dd/mm/yyyy.
- **Async everywhere the crypto or storage layer is touched.** SubtleCrypto is
  promise-based; do not wrap it in something that pretends otherwise.
- **No `innerHTML` with anything a student typed.** Use `textContent`.
- **Comment the why, not the what.** The unlock code derivation needs a comment. A
  `for` loop does not.

## Visual language

Match the existing Data Evidence Card, which the students will already have seen.

```
--ink:       #06232B    deep teal, body text
--teal:      #3E6570    headings, table headers, rules
--teal-mid:  #4A6A70
--sage:      #7E9793    secondary text
--sage-pale: #DCE6E3    fills
--line:      #B7C8C4    borders
--paper:     #FBFBF9    background
--gold:      #F2B705    highlights, badges earned
--gold-dark: #B98A05
```

- **Headings and student-facing display text:** Patrick Hand. Self-host the woff2.
- **Body and UI:** a clean humanist sans, self-hosted. Card print styles already assume
  TeX Gyre Heros Cn / Carlito.
- **Charts:** colourblind-safe. Never carry meaning in colour alone — pair it with shape,
  label or position.
- **Print:** A4, and it must work. The Card prints at any stage of completion.

## Tone in student-facing copy

Plain, short, unpatronising. These are capable 13-year-olds, not small children.

- Define every term on first use, then use it consistently. Never introduce a synonym
  for a term already taught.
- No exclamation marks in instructions. Save them for badge awards, if at all.
- Never say "simply", "just", "obviously", or "easy". If it were easy they would not
  need the room.
- Hints escalate, they do not repeat. Rung four gives the answer. That is intended.
- Error messages say what to do next, not what went wrong.

## Things that will be suggested and must be refused

- A framework, "for maintainability".
- A build step, "for a better developer experience".
- A charting library. The tools are pedagogical, not decorative; students must see the
  axes being constructed, which is exactly what a library hides.
- localStorage for chart images. It will not fit. IndexedDB.
- Random unlock codes. They cannot be regenerated after a cache clear.
- Storing the answer key in the repo "encrypted". It is a public repo. Hashes only.
- Making the escape-room gating stronger. A student who reads the source finds hashes.
  That is sufficient. Effort goes into the hint ladder instead.

## Definition of done, per file

1. Works in Edge with touch, and with a keyboard alone.
2. Prints, or is explicitly not printable and says so.
3. Survives a cleared cache without data loss beyond what export/import covers.
4. Contains no plaintext answers, codes or student data.
5. Readable by a Year 8 girl working alone, unassisted, in a room with no maths teacher.

Criterion 5 is the one that gets forgotten. It is the one that matters.
