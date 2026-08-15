# H₂O — Towards 2040 · Maths Strand
## Build plan for the student website, tools and resources

---

## 1. Scope

Six periods. Static site on GitHub Pages. No backend, no accounts, no server storage.
Everything client-side, everything printable, everything recoverable.

Deliverables:

| # | Item | Type |
|---|---|---|
| 1 | Lesson 1 slide deck (20 min, whole cohort) | HTML deck |
| 2 | Lesson 6 slide deck (20 min, whole cohort) | HTML deck |
| 3 | Student site: login, hub, 6 lesson pages, extension page | HTML/JS |
| 4 | Univariate chart tool | HTML/JS |
| 5 | Bivariate chart tool (fit line, predict, extrapolate) | HTML/JS |
| 6 | Data table builder / collection sheet | HTML/JS |
| 7 | Data Evidence Card webform + print | HTML/JS |
| 8 | Supervisor page + printed answer key | HTML + PDF |
| 9 | Misleading-chart demonstrator (Lesson 6) | HTML/JS |

---

## 2. Site architecture

```
/
├── index.html              login + name capture
├── hub.html                map of the six rooms, badge rack, progress
├── l1.html … l6.html       lesson rooms
├── extension.html          side quests
├── card.html               Data Evidence Card webform
├── deck-1.html             Lesson 1 opening deck
├── deck-6.html             Lesson 6 closing deck
├── staff.html              supervisor tools (bypass, reset, export)
├── tools/
│   ├── uni.html            dot / bar / pie / histogram / boxplot
│   ├── bi.html             scatterplot + line of best fit + prediction
│   ├── table.html          data collection table builder
│   └── mislead.html        same data, honest vs dishonest
├── js/
│   ├── store.js            storage layer (localStorage + IndexedDB)
│   ├── vault.js            codes, hashing, checkpoint logic
│   ├── variants.js         per-student dataset assignment
│   ├── chart.js            shared SVG rendering + PNG export
│   └── ui.js               shared components (checkpoint, hint ladder, badge)
├── data/
│   ├── datasets.json       6 variants × each task
│   └── answers.json        SHA-256 hashes only, never plaintext
└── css/site.css            one stylesheet, print rules included
```

One stylesheet, one component library, no framework, no build step. Vanilla ES modules.
Every page must work offline once loaded and must print sensibly.

---

## 3. Identity and storage

### Login
`index.html` asks for the student's **school email or student ID number**, plus a
**display name** and a **crew** chosen from a dropdown.

```
identity  = normalise(email or ID)
studentId = SHA-256(identity)
```

Normalisation, applied before hashing: trim, casefold to lowercase, strip the `@domain`
if a full email is typed, strip spaces and anything that is not alphanumeric, a dot or a
hyphen. So `L.Smith`, `l.smith` and `L.Smith@ivanhoegirls.vic.edu.au` all resolve to the
same student. Reject anything that does not match the expected pattern rather than
silently creating a ghost account.

Three deliberate separations:

- **Crew is not part of the identity.** A girl moved between crews keeps her badges.
- **Display name is not part of the identity.** It appears on certificates and nowhere
  else, so a typo there is cosmetic rather than fatal.
- **The identity is never displayed** after login. The hub greets her by display name.

**Ship a hashed allowlist.** Generate SHA-256 of every valid student ID in the cohort
(about 180 hashes) into `data/roll.json`. Login checks membership before creating a
profile, so a mistyped ID is caught at the door rather than three lessons later. No
personal data enters the repository — hashes only, and they cannot be reversed to an
email or an ID.

`staff.html` keeps a **re-link** tool anyway, for the girl who is on the roll under an ID
she does not know.

### Storage layer
Namespace every key `h2o.v1.*` with a schema version so migrations are possible.

```js
h2o.v1.profile  = { id, first, initial, crew, variant, created }
h2o.v1.progress = { l1:{checkpoints:[t,t,f], done:false}, ... }
h2o.v1.badges   = { reader:ISO, collector:ISO, plotter:ISO, predictor:ISO }
h2o.v1.card     = { question, var1, var2, n, method, chart1Id, chart2Id, ... }
h2o.v1.data     = { rows:[...], columns:[...] }
```

**Chart images go in IndexedDB, not localStorage.** localStorage is ~5 MB and a
single 1200 px PNG dataURL will eat a third of it. Store PNG blobs in an
IndexedDB object store keyed by `chartId`; keep only the id in the card record.

### Recovery
Non-negotiable, because a cleared cache in a school lab is a certainty, not a risk.

- **Export**: any page can dump the whole `h2o.v1.*` tree plus chart blobs to a single
  `.h2o` file (JSON, images base64). One button, on the hub.
- **Import**: drop the file on the login page, everything restores.
- **Print**: the Card prints at any stage of completion, complete or not.

Tell students at the end of every session: export or print. Build the prompt into the page.

### Crew ownership of the Card

Split the ownership. **Badges, checkpoints and personal charts stay individual, in the
browser. The Card is a single file, owned by the crew, living in the crew's Teams or
OneDrive folder.** Don't rebuild file sharing the school already has.

Mechanism: the **File System Access API** (`showSaveFilePicker` / `showOpenFilePicker`),
supported in Edge and Chrome on Windows, which is the whole fleet.

- First member to reach the Card creates `crew-04.h2ocard` in the crew's synced folder.
- Any member opens it from the site, edits their section, saves back to the same handle.
- The file handle persists in IndexedDB, so it is one click to reopen next session.
- OneDrive sync handles distribution. No server, no accounts, no upload.

Concurrency is a soft lock, not a hard one. The file carries `lastEditedBy` and
`lastEditedAt`; on open, if someone else saved within the last 20 minutes the site says
so and offers **Save as a copy** instead. Crews resolve it by talking to each other,
which is the correct level of technology for the problem.

Every field also records who last edited it. That gives the crew a working document and
gives you per-student evidence of contribution for free.

**Fallback** if the API proves awkward on the SOE: plain download and re-upload to the
same folder. Same file format, same workflow, two more clicks. Build the file format
first and the picker second, so the fallback costs nothing.

---

## 4. Unlock codes — revised scheme

Your instinct was randomise-on-load. Don't. Random codes stored in localStorage die
with the cache, cannot be regenerated, and leave a non-specialist supervisor with no
way to rescue a student. Use this instead:

### Codes come out of the maths

Each room has **three checkpoints**. Each checkpoint asks a question about
*that student's own dataset variant*. A correct answer reveals a **token**.
Three tokens concatenated form the **vault code** for the next room.

```
token = SHA-256(canonicalAnswer + studentId + checkpointId)
          → take 2 chars, map to [A-Z0-9], e.g. "K7"
vault  = token1 + token2 + token3        e.g. "K7-3M-Q2"
```

Validation compares `SHA-256(input + roomId + studentId)` against a stored hash.
**No plaintext answer or code exists anywhere in the source.** Dev tools yield a
list of hashes, which is useless to a Year 8 student and tedious for anyone else.

### Why this is better
- Codes are unique per student without being random — they are a *function* of
  identity, so they regenerate identically on any device after a re-login.
- Sharing a code is useless: your neighbour's dataset variant gives different tokens.
- The code is earned by doing the maths, not by clicking through.
- Self-checking, which is the whole point for unsupervised sessions.

### Dataset variants
`variants.js` assigns `variant = parseInt(studentId,16) % 6`. Six variants of every
checkpoint dataset, all water-themed, all with the same structure and difficulty:
rainfall, storage levels, shower length, tank size, household size, catchment area.
Build them once, in `datasets.json`, with the answer hashes generated by a small
Node script at deploy time.

### Getting unstuck — mandatory
Escape rooms are fun until a crew is locked out for 40 minutes and the supervising
Geography teacher can't help. Every checkpoint gets a **hint ladder**:

1. After 1 wrong attempt: a nudge ("check your units").
2. After 2: a worked example with different numbers.
3. After 3: the method, step by step, applied to their own numbers.
4. After 4: the answer, with a note that the token still counts but the badge
   records it as *assisted*.

Plus a **master bypass code per room**, fixed across all students, hashed in the
source, printed on the staff sheet. Staff type it, the room opens, progress records
`bypassed:true`.

**The Data Evidence Card is never gated.** `card.html` is reachable from every page
at all times. The rooms gate the *learning*, not the deliverable.

---

## 5. Badges

Four badges, four rooms, plain criteria a non-specialist can verify from the screen.

| Badge | Room | Earned by |
|---|---|---|
| **Reader** | L2 | 3/3 checkpoints on interpreting charts: name both variables and units, say what one point means, match a plot to a description |
| **Collector** | L3 | A completed data plan: question, two variables, units, method, sample size, plus a table with ≥ 10 rows built in the table tool |
| **Plotter** | L4 | Chart 1 (univariate) and Chart 2 (scatterplot) exported from the tools with axes labelled and units present, both attached to the Card |
| **Predictor** | L5 | Line of best fit placed, gradient interpreted in real units in a sentence, one interpolation and one extrapolation recorded |

Badge award writes a timestamp to `h2o.v1.badges`, renders on the hub, ticks the
corresponding box on the Card automatically, and unlocks a printable certificate
with the student's name on it. Certificates print four to an A4 sheet.

Keep the Lesson 1 / Lesson 6 rooms un-badged: they are the framing, not the assessment.

---

## 6. The tools

Shared engine: `chart.js` renders SVG, `exportPNG()` serialises the SVG to a canvas
at 2× scale and returns a blob. Same axis/label/title code for every chart type, so
students meet one interface, not five.

Every tool has: data in (paste, type, or pull from `h2o.v1.data`), chart out,
**Label your axes** enforced (export button disabled until both axis labels and units
are non-empty — this is the single highest-value bit of nagging in the whole build),
export PNG, and **Attach to Card**.

### 6.1 `tools/uni.html` — one variable
- Input: one column, numeric or categorical (auto-detected, overridable).
- Charts: dot plot, column/bar, pie, histogram (bin width slider, live), box plot.
- Box plot shows the five-number summary in a side panel as it is built — this is
  how they learn what a box plot *is*, not just what it looks like.
- Warn, don't block, when a pie chart is inappropriate (numeric data, >8 categories).

### 6.2 `tools/bi.html` — two variables
- Input: two columns.
- Scatterplot, axis controls (min, max, step, "start at zero" toggle).
- **Line of best fit by eye**: two draggable handles. Show nothing numerical until
  the line is placed, then reveal `y = mx + c` with m and c rounded sensibly.
- Least-squares toggle: *extension only*, off by default, labelled "the computer's line".
- **Prediction readout**: click or type an x, get a y, with the point marked.
  Inside the data range the readout is plain; outside it, the region is shaded and the
  readout carries the words *beyond our data*.
- Residual display: no. Stays out, per the pitch rule.

### 6.3 `tools/table.html` — collection sheet
- Define columns (name, units, numeric/categorical), then enter rows.
- Validates: consistent types, flags blanks and obvious outliers with a gentle prompt.
- Prints as a blank recording sheet for off-site collection.
- CSV import/export, and feeds both chart tools directly.

### 6.4 `tools/mislead.html` — Lesson 6
One dataset, two charts side by side, with sliders for: y-axis start, y-axis range,
date range shown, and 3-D pie toggle. Students drag until the "boring" story becomes
"alarming" and read the caption change. Ends with three real-world examples to critique.

---

## 7. Room-by-room content

### The two spurious claims

Two hooks, used differently. The first is yours; the second is theirs.

**Claim A — Netflix is drying out Melbourne.** Streaming subscriptions against Melbourne's
daily water use, roughly 2010–2025. Both climb steadily, so the correlation is real and
needs no fabricating. Made flatly in the Lesson 1 deck, with a cut-off y-axis to inflate
it further, and left hanging until Lesson 6. The hidden variable is time itself —
population growth drags both up — which is precisely the trap they will walk into with
their own 2040 extrapolation in Lesson 5.

**Claim B — canteen ice creams against litres through the school drinking fountains.**
This one is never claimed out loud. It appears in **Lesson 2 as an ordinary reading task**:
name the variables, describe the direction and strength. They will correctly answer
"strong positive", with no causal framing offered and none invited.

The same chart returns in **Lesson 6**: *in Lesson 2 you told me this was a strong positive
relationship, and you were right. So should we ban the ice creams?* They get caught by
their own earlier answer rather than by a worked example, which is the difference between
recognising the lesson and having learnt it.

Lesson 6 then resolves both: A is dismantled by you in the deck, twice over — the
correlation is spurious *and* the axis was cut. B is handed back to the crews to dismantle
themselves. Whichever crew names "hot weather" first gets the credit.

Note for the staff sheet: the fountain data is invented for the task. Say so there, since
Lesson 6 is a lesson about honesty with data.

### Lesson 1 — Whole cohort, then rooms
**Deck (20 min).** Open with Claim A, stated flatly, and invite them to prove you wrong.

Then: what bivariate data is (two measurements from the same thing at the same time),
what a point means, what the axes are. Define every word on the slide it first appears.

**Room `l1.html`.** No badge. A guided tour: what types of data exist (numerical vs
categorical, discrete vs continuous), which chart suits which data, a sorting activity
(drag chart → data type), and a first look at the tools. Ends with them choosing a
provisional research question and writing it into the Card.

### Lesson 2 — Reader
Read charts, don't make them. Sequence: identify variables and units → say what one
point represents → describe direction (positive, negative, none) → strength by eye →
match plot to description. All on their variant datasets.

Claim B sits in here as an unremarkable reading item. No flag, no hint, no causal
language. It must look like every other question on the page.

Three checkpoints, instant feedback, resubmittable. Badge: **Reader**.

### Lesson 3 — Collector
Types of data, samples, bias, consistency of method, repeats, sample size.
Worked example of a bad protocol and what went wrong with it — more effective than
a list of rules. They build their collection table in `tools/table.html`, print the
recording sheet, and commit the plan to the Card.

Checkpoints are plan-quality, not arithmetic: does the question have two measurable
variables? Are the units stated? Is the method repeatable by someone else? Self-check
against a rubric with worked examples, then a crew cross-check. Badge: **Collector**.

### Lesson 4 — Plotter
Given data first, own data second. Univariate: choose the right chart, set the scale,
label axes. Bivariate: plot the pairs, choose sensible axes.
Axis-scaling drill: the same data on three scales, "which is the most honest?".
Both charts attached to the Card. Badge: **Plotter**.

### Lesson 5 — Predictor
Line of best fit by eye, then `y = mx + c`. Gradient in real units, as a sentence
("for every extra person in the house, water use rises by about 40 litres a day").
Interpolation, then extrapolation, then a 2040 prediction with the uncertainty
acknowledged. Badge: **Predictor**.

### Lesson 6 — Whole cohort, then finish
**Deck (20 min).** Resolve Claim A, twice over: the correlation was spurious and the axis
was cut. Correlation vs causation, the hidden third variable, misleading charts, what your
prediction actually says and how confident you can be. Show two anonymised crew cards and
critique them live.

**Room `l6.html`.** No new content. Claim B is handed back to the crews with their own
Lesson 2 answer quoted at them. Then commentary sentence starters, the misleading-chart
tool, a peer-review checklist (crew swaps cards and signs off), then finish and print
the Card.

### `extension.html`
Available from every room, never required, framed as *side quests* rather than
"extra work for the fast finishers".

- Least-squares: what "best" actually means, using the tool's toggle.
- Find the equation by hand and compare to the software.
- Two-scale honesty argument, written up in 100 words.
- Find a published water chart and dismantle it.
- Reliability: measure the same thing twice, compare.
- Sketch the scatterplot you'd expect from a relationship described only in words.
- Identify the point furthest from the line and argue why it is there.

---

## 8. Data Evidence Card webform
Direct port of `data-evidence-card.html`, same fields, same one-page layout:

Crew · Members · Date · Our question · Variable 1 (and units) · Variable 2 (and units) ·
How many measurements · How we collected it · Chart 1 · The shape of it · Chart 2 ·
The relationship · Our line of best fit (y = _x + _) · What the gradient means ·
Interpolation · Extrapolation · Our claim for 2040 · Why we might be wrong ·
Where our data came from · four badge ticks.

Behaviour:
- Autosaves to `h2o.v1.card` on every keystroke, debounced.
- Chart slots accept an attachment from either tool, or a re-upload of a PNG.
- Badge ticks are read-only, driven by `h2o.v1.badges`.
- Character limits per field, with a live count, so it stays on one page.
- Print CSS reproduces the existing card exactly. Screen view is a form; print view is
  the card. Same file, two appearances.
- The three worked examples stay available as a reference panel.

### Required in the film — not marked by maths

**At least one of the crew's charts and their 2040 claim must appear in the finished
film, on screen or spoken.** This is a programme deliverable, not a mathematics
criterion. Maths states it on the Card and in the Lesson 6 room so no crew reaches the
edit unaware of it, then supplies exports that make it easy, and stops there. Whoever
owns the film rubric owns the checking.

### Video export

Every chart tool gets a second export alongside the PNG: **1920 × 1080, white background,
chart centred, title and one line of commentary baked in.** Cheap to add on top of the
existing SVG pipeline and it removes the failure mode where a crew drops a 400 px chart
into a 1080p timeline and it looks like a screenshot of a screenshot.

Constraints for that export specifically:

- Minimum 28 px type for axis labels and units. Anything smaller is unreadable when
  filmed off a screen or viewed on a phone.
- Safe margins: nothing important within 5% of any edge.
- High contrast, no thin hairlines, no colour-only distinctions.
- Filename carries the crew and chart number, so the editor knows what they have.

The Card also exports as a 1920-wide PNG, for crews that want the whole page on screen
rather than a single chart.

---

## 9. Supervisor page (`staff.html`)

Not secret, not password-protected in any meaningful sense — just unlinked, and paired
with a printed sheet the staff hold.

- Enter the room bypass code, open a room for a stuck crew.
- Reset a single room, or the whole profile.
- Export/import a student's `.h2o` file (for a swapped laptop).
- Check a badge state at a glance.
- A one-page "what this room is asking for" crib in plain English per room, so a
  non-maths supervisor can answer "is this good enough?" without guessing.

Printed staff sheet (PDF): the six bypass codes, the six variant answer keys, the
badge criteria, and the crib notes. **Keep the answer keys on paper only.** Anything
plaintext on a public Pages site is one URL guess away from being circulated.

---

## 10. Build order

Bottom-up. The rooms are thin wrappers around the tools, so the tools come first.

| Stage | Build | Rough effort |
|---|---|---|
| 1 | `store.js`, `vault.js`, `variants.js`, login, hub shell | 1 day |
| 2 | `chart.js` + `tools/bi.html` (hardest, do it first) | 1–2 days |
| 3 | `tools/uni.html` | 1 day |
| 4 | `tools/table.html` | half day |
| 5 | `card.html` (port + wire up) | half day |
| 6 | Rooms L2–L5 with checkpoints and hint ladders | 2 days |
| 7 | Datasets: 6 variants × all checkpoints, hash generation script | 1 day |
| 8 | Rooms L1, L6, `extension.html`, `tools/mislead.html` | 1 day |
| 9 | Decks 1 and 6 | 1 day |
| 10 | `staff.html`, certificates, staff PDF | half day |
| 11 | Lab test on the school SOE, print test, cache-clear test | half day |

Roughly 10–11 days of build. Stages 1–5 are the ones that must not slip: without the
tools there is no Lesson 4, and without the Card there is no deliverable.

---

## 11. Settled

- **Sequence locked** at the meeting of 13/08/2026: L1 intro (no badge), L2 Reader,
  L3 Collector, L4 Plotter, L5 Predictor, L6 synthesis. Badges are single awards,
  not split into parts. Curriculum summary reissued to match.
- **CODAP and Excel are out.** The site's own tools are the only toolchain students see.
- **Timing:** L1 and L6 are 20 min whole cohort + 30 min crew. L2–L5 are 50 min
  self-directed. 300 min timetabled in total.

## 11a. Blockers — resolved

1. **Card ownership:** crew-owned file in the crew's Teams/OneDrive folder, opened and
   saved via the File System Access API. Badges and personal work stay individual and
   local. See section 3.
2. **Network:** GitHub is reachable. Hosting on Pages confirmed.
3. **Devices:** single laptop model, touchscreen, Windows. Build every interaction on
   **Pointer Events**, not mouse events — one codepath covers stylus, touch and trackpad.
   Drag handles get a minimum 44 px hit target so they are usable with a finger.
   Test the line-of-best-fit tool by touch specifically; it is the only interaction where
   a fat finger obscures the thing being dragged. Offer arrow-key nudge as the
   accessible alternative and as the precise one.
4. **Secure context:** students always reach the site by URL. A `file://` copy from a USB
   stick breaks every unlock code. Say so on the staff sheet.

## 11b. Content I need from you

- The Lesson 1 spurious correlation and the absurd claim built on it. Everything in
  L1 and L6 hangs off this one choice, so it wants picking early.
- Six dataset variant themes, confirmed. Proposed: rainfall, storage levels, shower
  length, tank size, household size, catchment area. All need a plausible source.
- Rubric wording for Collector and for the L6 peer review, in language a non-specialist
  can apply without hesitating.
- Commentary sentence starters for L6.
- Branding assets. Build proceeds with CSS variables in `site.css` so the swap is a
  single-file edit whenever they arrive.
- Programme dates, for the certificates and the Card footer.

## 11c. Loose ends worth settling early

- **Privacy.** Names and work stay in the browser and are never transmitted. Worth
  stating in one line to whoever signs off on student data, before someone asks.
- **Repo visibility.** GitHub Pages on a free account means a public repo, so the answer
  hashes are public. That is fine. The staff answer key stays on paper regardless.
- **Accessibility.** Colourblind-safe palette throughout, no meaning carried by colour
  alone, keyboard alternative to every drag interaction.
- **Handover to the film crews.** The documentary will put the Card on screen. Export
  at 2× so it survives being filmed or dropped into an editing timeline, and decide
  whether they want the Card as a PNG as well as a print.

---

## 12. Known weak points

- **Cache clearing wipes everything.** Mitigated by export/import and print, not solved.
  Say it out loud to students in Lesson 1 and make the export button impossible to miss.
- **A determined student will read the source.** They will find hashes, not answers.
  That is sufficient. Do not spend effort making it stronger; spend it on the hint ladder.
- **Non-specialist supervision remains the real risk**, not the technology. The crib
  notes on `staff.html` matter more than any of the code.

## 13. Still to iron out

### 13.1 Identity — resolved
Login is by school email or student ID number, case-insensitive, checked against a hashed
roll. Crew and display name are held separately from the identity. See section 3.

### 13.2 Absentees — resolved
No separate catch-up build. A girl who misses a lesson works through that room faster in
her own time; the rooms are self-directed and the hint ladder already does the work a
re-teach would. The staff bypass stays, for the case where she is genuinely stuck rather
than genuinely behind.

### 13.3 The crew that collects nothing — borrowed dataset
Lessons 4 and 5 assume the crew's own data exists. Some crew will turn up with nine rows
of nonsense or none at all, and a non-specialist supervisor cannot rescue that on the day.
A crew on borrowed data still earns Plotter and Predictor and still finishes the Card,
with the source line reading *borrowed data*. They lose only Collector, which is the badge
they actually failed.

**Primary — Melbourne Water, water storage levels.**
https://www.melbournewater.com.au/water-and-environment/water-management/water-storage-levels

Monthly storage from 1948, plus catchment rainfall, inflows and per-person water use.
CSV download under each table. Two usable pairings from one source:

- **Year against storage (% full or GL).** Extrapolation to 2040 is direct, which is what
  the Card asks for. The Millennium Drought sits in the middle of it, so a straight line
  fitted to 1997–2009 predicts an empty city, and a line fitted to 2010–2025 predicts a
  full one. That is the best argument against naive extrapolation you will find anywhere,
  and it is local.
- **Catchment rainfall against inflow.** A genuine causal relationship, strong and
  positive, which is a useful contrast to the two spurious pairs.

Cut it to 20–30 rows before shipping. The full file is more than a Year 8 needs to meet.
The existing worked example on the Data Evidence Card already cites Melbourne Water, so
the source line is consistent with what they have already seen.

**Secondary — Our World in Data, clean water and sanitation.**
https://ourworldindata.org/clean-water-sanitation

Country-level: share using improved drinking water against GDP per capita, and death rate
from unsafe water against GDP per capita. CC-BY, CSV download, strong clear relationships,
and it broadens the programme past Melbourne. Cut to roughly 25 countries. No time axis,
so a crew using this one makes its 2040 claim from the relationship rather than from a
trend, which is worth knowing before you hand it out.

### 13.4 Film festival timing — resolved
Filming falls well after Lesson 6. The Card is finished before it is needed.

### 13.5 Pilot Lesson 2 before building Lessons 3–5
Two Year 8 girls, twenty minutes, the L2 room only, watched but not helped. The last
draft of this strand was pitched two years too high; this is the cheapest possible
insurance against repeating that, and it happens before the bulk of the content exists.

### 13.6 Minor
- Keep collected data non-identifying. Household water bills are household data, and a
  parent may reasonably ask. Suburb-level and unnamed is enough.
- Confirm who marks the finished Cards, and how many crews there are in total.
