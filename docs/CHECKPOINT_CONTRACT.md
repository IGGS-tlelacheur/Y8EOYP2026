# Checkpoint & Hint Authoring Contract

**H₂O — Towards 2040 · Mathematics strand · `docs/CHECKPOINT_CONTRACT.md`**

Binding on all twelve checkpoints and all thirty-six authored hint rungs across
rooms L2–L5. Approve this before any question is written. Anything not permitted
here is forbidden, including where it would be pedagogically nicer.

---

## 1. The binding constraint: answer format

A checkpoint answer is hashed at deploy time and compared client-side. Nothing is
marked. Therefore **every gated answer is one of exactly three types.**

| Type | Form | Canonicalisation before hashing |
|---|---|---|
| **A — Number** | A single numeric value, entered in a text field | Trim, strip spaces, strip units, strip thousands separators, strip leading zeros, normalise `,` to `.`, no trailing zeros |
| **B — Selection** | One option from a visible closed list (radio or dropdown) | Hash the **option key** (`opt_c`), never the label |
| **C — Word** | One word chosen from a visible word bank | Trim, casefold, strip punctuation |

**Forbidden:** free text, multi-select, ordering, matching, drag-to-place, "explain
your answer", anything requiring a human to read it. If a question can only be asked
in a forbidden format, it is not a checkpoint. It goes on the Card, ungated.

### Tolerance

Type A answers may accept a band, but a band is not a numeric comparison — only
hashes exist client-side. Every accepted value is hashed individually by
`build-data.mjs`.

- Maximum **five** accepted values per checkpoint.
- The band must be stated in the question stem: *"to one decimal place"*,
  *"to the nearest 10 litres"*.
- Type B keys are hashed from the key, so option wording can be edited after hashes
  are generated. Option **order** may not change if keys are positional; use
  explicit keys.
- **`accept[0]` is the canonical answer. The rest are tolerated.** The list is
  order-significant and `build-data.mjs` preserves it. *(Amended 16/08/2026: the
  token is seeded from the stored answer hash, so five accepted values would
  otherwise mint five different tokens and four different vault codes — three of
  them wrong. Two girls both correct, one locked out of the next room, and only
  visible when someone types 6.4 instead of 6.5. The token now always seeds from
  `accept[0]`, whichever accepted value she actually typed.)*

### Token alphabet

`token = SHA-256(accept[0] + studentId + checkpointId)` → 2 chars.

Map to a 30-character alphabet with confusables removed: **no `O`, `0`, `I`, `1`,
`S`, `5`.** A Year 8 typing a vault code off a screen into another screen will
otherwise generate support traffic that no one is present to answer.

Thirty is not a power of two, so the two characters are taken by modulo rather than
by masking five bits. `js/vault.js` and `docs/DATA_CONTRACTS.md` §4 both carried a
32-character alphabet and bit-masking; both are amended to match this document.

---

## 2. Reading level

Written to be read alone, once, by a thirteen-year-old, with no adult who can
rephrase it.

- Sentences **≤ 18 words**. No sentence carries the task in a subordinate clause.
- **One instruction per sentence.** Two things to do is two sentences.
- **No negated stems.** Never *"which of these is not…"*. Ask the positive form.
- Any term not already defined in an earlier room is defined **on the line it first
  appears**, in brackets, in plain words.
- Units written in words on first appearance in a room, then abbreviated.
  *litres (L)*, then *L*.
- No rhetorical framing, no "have a think about", no exclamation marks. She is
  working, not being entertained.
- The stem states the **answer format** explicitly: *"Type the number."*
  *"Choose one."* *"Pick one word from the list."*

---

## 3. Question rules

- Every checkpoint refers only to **her own variant dataset**, or to a supplied
  artefact that exists in all six variants.
- **Direction-agnostic wording.** At least one variant (household size against
  per-person use) is a *negative* relationship. No stem, distractor or hint may
  presume a positive one. Phrases like *"as one goes up…"* are banned in stems.
- **Variant parity.** All six variants of a checkpoint share the same answer type,
  the same number of accepted values, and the same reading load. Difficulty is
  varied by context, never by arithmetic.
- No question may be answerable by elimination alone. Type B needs four plausible
  options, not one answer and three jokes.
- No question depends on a chart being read to a precision the SVG does not support.

---

## 4. Hint ladder contract

Four rungs, fired at 1, 2, 3 and 4 wrong attempts. Rungs 1–3 are authored. Rung 4 is
generated.

| Rung | Contains | Must not contain |
|---|---|---|
| **1** | A nudge at *where to look*. ≤ 20 words. | Any maths. Any number from her dataset. Any hint at direction. |
| **2** | A fully worked parallel example, same structure, **different numbers**. | Any number appearing in her own dataset. |
| **3** | The method applied to *her own numbers*, step by step, **stopping one step short of the answer**. | The final value. The final selection. |
| **4** | The answer. Not authored — recovered at run time. Awards the token and records `assisted:true`. | Any apology or commentary. |

**How rung 4 knows the answer.** `answers.json` holds hashes, and a hash cannot be
turned back into an answer — so rung 4 as first written was unbuildable. It is
recovered rather than stored *(settled 16/08/2026)*:

- **Type B and C**: the answer is one of a closed list the room is already
  displaying. The room hashes each visible option and reveals the one that matches.
  Exact, and nothing plaintext is stored.
- **Type A**: there is no list, but the stem states the band and the precision. The
  room searches that band at that precision and reveals the value that matches.
  Each checkpoint therefore declares a `search` range and step in `answers.json`,
  which is public and harmless: the question already implies it.
  **Measured 16/08/2026: 1201 candidates in 9 ms** in Edge, not the second I
  guessed. The generator refuses a band over 20 000 candidates, and refuses one
  that does not contain its own answer.

This does not weaken anything. Rung 4 hands over the answer by design, and
`CLAUDE.md` already holds that a student who reads the source finds hashes and that
this is sufficient.

Rung 3 is the rung that matters and the one that will be written lazily. It must
leave exactly one operation for her to perform. If she can read rung 3 and type the
answer without doing anything, rung 3 has failed and is really rung 4.

Rungs are **cumulative on screen** — rung 2 does not replace rung 1. She can see the
whole ladder she has climbed.

### She may also just ask

*(Settled 17/08/2026 — kept.)* Every checkpoint carries an **I need a hint**
button beside the answer button. It fires the next rung and **counts as an
attempt**, so four presses reach the answer exactly as four wrong answers would.

Without it the only route to a hint is a wrong answer, which teaches a girl to
guess at a question she knows she cannot do — a bad habit to build, and a worse
one to build in a room with no teacher in it to notice. Asking for help should
not require pretending to answer.

`assisted:true` does not withhold the badge. It is recorded for you, not against her,
and the room never uses the word.

---

## 5. Checkpoint inventory

Twelve gated checkpoints. Three per room, all Type A/B/C, all hashable.

**L2 — Reader** (given charts)

| ID | Asks | Type |
|---|---|---|
| `cp2.1` | Name the variable and units on a named axis | B |
| `cp2.2` | What a single identified point represents | B |
| `cp2.3` | Match a described relationship to one of four plots | B |

**L3 — Collector** (critique of a supplied bad protocol; *not* her own plan)

| ID | Asks | Type |
|---|---|---|
| `cp3.1` | How many different people took the measurements | A |
| `cp3.2` | Which two rows cannot be fairly compared | B |
| `cp3.3` | How many observations the sheet is missing | A |

**L4 — Plotter** (given data)

| ID | Asks | Type |
|---|---|---|
| `cp4.1` | Which chart type suits a described dataset | B |
| `cp4.2` | Read a value off a correctly scaled axis | A |
| `cp4.3` | Which of three scalings of the same data is honest | B |

**L5 — Predictor** (given data)

| ID | Asks | Type |
|---|---|---|
| `cp5.1` | Gradient of a supplied line, to one decimal place | A |
| `cp5.2` | An interpolated reading | A |
| `cp5.3` | An extrapolated reading | A |

---

## 5a. What earns the badge

*(Settled 16/08/2026.)* Three of three checkpoints, **and** the room's deliverable
present. The deliverable test is machine-checkable and counts existence only — it
never judges quality, and a Learning Coach can confirm it from the screen.

| Badge | Checkpoints | Deliverable also required |
|---|---|---|
| **Reader** | 3/3 in L2 | none |
| **Collector** | 3/3 in L3 | ≥ 10 rows in her table (`h2o.v1.data`) |
| **Plotter** | 3/3 in L4 | both chart slots filled on the Card |
| **Predictor** | 3/3 in L5 | equation, interpolation and extrapolation non-empty on the Card |

This keeps the badge criteria in `BUILD_PLAN` §5 without gating a checkpoint on
anything a human has to read. `assisted:true` never withholds a badge.

A crew that collected nothing uses the borrowed data set (`BUILD_PLAN` §13.3); the
row count is satisfied either way.

---

## 6. Never gated

Listed explicitly because each will look like a natural checkpoint to whoever
builds the room.

1. **The Claim B reading item in L2.** Recorded to `h2o.v1.responses`, never gated,
   never hinted. If it gates, the ladder eventually supplies *"strong positive"* with
   a worked explanation and the Lesson 6 quote-back is worth nothing.
2. **Her own charts, her own table, her own line of best fit.** Card deliverables.
3. **The Collector rubric self-check and the crew cross-check.** Recorded on the Card.
4. **Every sentence answer** — gradient in real units, the 2040 claim, why we might
   be wrong. Card, always.
5. **The Card itself.** Reachable from every page at all times, per the build plan.

---

## 7. Acceptance tests

A question is not finished until all five pass.

1. **Read-aloud.** Read the stem aloud at the pace of a thirteen-year-old. If you
   re-read a clause, rewrite it.
2. **Coach test.** A Learning Coach with no maths background reads the crib line and
   can say what the student should be doing on screen, in three seconds.
3. **Variant parity.** All six variants: same type, same accepted-value count,
   same reading load.
4. **Direction parity.** Substitute the negative-relationship variant into every
   stem and hint. Nothing reads wrongly.
5. **Rung 3 test.** Rung 3 leaves exactly one operation outstanding.

---

## 8. Handover to `build-data.mjs`

Each authored checkpoint yields, per variant:

```
checkpointId, variant, type, acceptedValues[], optionKeys[] (type B only)
```

Plaintext lives in the git-ignored source. The script emits `answers.json`
containing hashes only, plus the token map. No plaintext answer, option key or
vault code appears in any committed file.

---

## 9. House vocabulary

Taken from the Mathspace worksheets in `docs/reference_material/`, which is what
these girls have already been taught. `CLAUDE.md` forbids introducing a synonym for
a term already taught, so **these are the words, and no others.**

| Use | Not |
|---|---|
| line of best fit | line of good fit, trend line, regression line |
| explanatory variable (EV) / response variable (RV) | independent / dependent, x-variable / y-variable |
| scatterplot | scatter graph, scatter diagram |
| association, correlation | link, connection, trend |
| strong / weak, positive / negative, no relationship | high, low, up, down |
| linear / non-linear | straight, curved |
| outlier | anomaly, rogue point |
| interpolation / extrapolation | reading in / reading out |
| reliable | accurate, valid, trustworthy |
| gradient | slope, rate |
| numerical (discrete, continuous) / categorical (nominal, ordinal) | quantitative / qualitative |
| sample, census, bias, representative | fair, random |
| dot plot, column graph, histogram, box plot, pie chart | bar chart, bar graph |

**Both of the top two rows overrule the worksheets** *(settled 16/08/2026)*. Each
therefore gets one bridging sentence, on first use in the first room that needs it,
and never again — because a girl who met the other word last term needs to be told
once that it is the same thing, and `CLAUDE.md` requires every term defined on
first use.

1. **Line of best fit.** The worksheets say *line of good fit* throughout; the
   printed Card says *line of best fit*, and the Card wins. L5 bridges once:
   *"Your worksheets call this the line of good fit. It is the same line."*
2. **Explanatory and response variable.** Chapter 14 uses both this pair and
   independent/dependent, but only ever uses explanatory/response in its
   **categorical** sections — the numerical bivariate sections, which is all this
   programme touches, say independent/dependent. So for these girls EV and RV are
   effectively new. L2 bridges once, and defines both: *"The explanatory variable
   is the one you choose or change. The response variable is the one you measure.
   Your worksheets sometimes call these the independent and dependent variable."*

Full term on first appearance in a room, then the abbreviation — the same rule this
document already applies to units. The **EV goes on the horizontal axis**, and the
rooms say so, because the Card's own fields are *Variable 1* and *Variable 2* and
do not settle which is which.

### Displays

The stem-and-leaf plot is dropped entirely *(settled 16/08/2026)*. It is taught in
11.02, it is not in `tools/uni.html`, and it is not worth a distractor slot.

### Difficulty

The worksheets tier every exercise **Explorer / Adventurer / Trailblazer**. A
checkpoint gates a room, so **every checkpoint is pitched at Explorer** — the tier
every girl is expected to complete. Adventurer and Trailblazer material belongs in
`extension.html`, which is never required.

### Formats already met

Each checkpoint reuses a question shape from the worksheets rather than inventing
one, so the format is never the difficulty:

| Checkpoint | Already met as |
|---|---|
| `cp2.2` | 14.03 Q17 — *"Jack has 7 people in his family. How many trees are in his garden?"* |
| `cp2.3` | 14.04 Q21 — four scatterplots A–D on identical axes, chosen by description |
| `cp3.1`–`cp3.3` | 11.01 Q8–Q14, Q17, Q22 — bias, sample size, protocol critique |
| `cp4.1` | 11.02 Q17 — which display suits which data |
| `cp4.3` | 14.07 Q20, Q22 — the same data on two scales, and what each supports |
| `cp5.1` | 14.06 Q12a — *"Two points on the line are (3200, 300) and (5600, 450). Find the gradient."* |
| `cp5.2`, `cp5.3` | 14.06 Q8, Q10 — predict inside, then outside, the range of the data |

**`cp4.1` distractors must be displays `tools/uni.html` can actually produce** — dot
plot, column graph, pie chart, histogram, box plot. Four of those five, every time.

---

*Amended 16/08/2026 against the reference material. On approval: twelve questions
and thirty-six hint rungs written against this document.*
