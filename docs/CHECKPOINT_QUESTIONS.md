# Checkpoint questions and hint ladders

**H₂O — Towards 2040 · Mathematics strand · draft for review**

Twelve stems and thirty-six authored rungs, written against
`docs/CHECKPOINT_CONTRACT.md`. Rung 4 is not here: it is recovered at run time,
never authored.

**Numbers in `[brackets]` are variant placeholders.** They are shown here filled in
with variant 1 (shower length against water used) so the questions can be read as a
student meets them. The other five variants land at stage 7 and must preserve
parity: same type, same accepted-value count, same reading load.

**Variant 5 is the negative one** (household size against water used per person).
Every stem and every rung below has been read back with variant 5 substituted.
Nothing presumes a rising relationship.

---

## Room L2 — Reader

### Terms this room introduces

Defined in the room body, before any checkpoint:

> Bivariate data is two measurements taken from the same thing at the same time.
>
> The **explanatory variable (EV)** is the one you choose or change. The
> **response variable (RV)** is the one you measure. Your worksheets sometimes
> call these the independent and dependent variable. They mean the same thing.
>
> The EV always goes on the horizontal axis. The RV goes on the vertical axis.

---

### `cp2.1` — which axis the EV belongs on · Type B

**Rewritten 16/08/2026**, on your instruction. It was *read the label off the
horizontal axis*, which failed the rung-3 test: the method **is** reading the
label, so there was no operation left to stop one step short of. This version has
a reason behind it, which gives the ladder something to walk down.

**Artefact.** Chart 1: a supplied scatterplot of their variant, ten to fourteen
points, both axes labelled with a unit, no line drawn.

**Stem**

> Crew 7 chose how long each shower ran, then measured the water it used. They
> are drawing Chart 1. Which variable belongs on the horizontal axis, and why?
> Choose one.

**Options**

| key | label |
|---|---|
| `opt_a` | Shower length, because it is the one they chose ✅ |
| `opt_b` | Water used, because it is the one they measured |
| `opt_c` | Shower length, because minutes are smaller numbers than litres |
| `opt_d` | Either one, as long as both axes are labelled |

Every option carries a reason, so the right answer cannot be picked off the
variable name alone. `opt_c` names the correct variable for a wrong reason and is
the one to watch: a student who picks it has the rule but not the idea. `opt_b`
has the EV and RV the wrong way round. `opt_d` is the "it doesn't matter"
misconception.

**Rung 1** (17 words)

> One of the two variables was chosen by the crew. The other was measured
> afterwards, once the shower had run.

**Rung 2**

> A crew set a tap to 1, 2, 3 and 4 turns open and measured the water that came
> out each time. They chose the number of turns. The water was the answer they
> got back. Turns went along the bottom, water went up the side.

**Rung 3**

> The EV is the one you choose or change, and it goes along the bottom. Decide
> which of Crew 7's two variables they chose rather than measured. Two options
> name that one. Only one of those two gives the real reason.

---

### `cp2.2` — what one point means · Type B

**Artefact.** Chart 1 again, with one point circled and marked **P**. P sits at
`[7 minutes, 68 litres]` and is not the largest or smallest point on either axis.

**Stem**

> On Chart 1 one point is circled and marked P. What does P tell you?
> Choose one.

**Options**

| key | label |
|---|---|
| `opt_a` | One shower that lasted 7 minutes and used 68 litres ✅ |
| `opt_b` | One shower that lasted 68 minutes and used 7 litres |
| `opt_c` | Seven showers that used 68 litres altogether |
| `opt_d` | The longest shower the crew recorded |

`opt_b` is the axes swapped. `opt_c` reads a point as a total. `opt_d` reads a
point as an extreme, which is why P must not be an extreme.

**Rung 1** (17 words)

> Point P sits above one number on the bottom axis. It sits level with one on
> the side axis.

**Rung 2**

> On a chart of cars, point Q sits above 4 on the bottom axis. It is level with
> 12 on the side axis. The bottom axis is *Age, in years*. The side axis is *Price,
> in thousands of dollars*. So Q is one car, 4 years old, costing 12 thousand
> dollars. One point is one car, not a total.

**Rung 3**

> Trace straight down from P to the bottom axis and read the number there. Trace
> straight across from P to the side axis and read that one. Two options use both
> of your numbers. In one of them the numbers are the wrong way round.

---

### `cp2.3` — match the description to the plot · Type B

**Artefact.** Four scatterplots A, B, C, D, on identical axes with identical
labels, differing only in their points. Per variant: one strong positive, one
strong negative, one weak, one showing no relationship. **Which of the four is
correct rotates between variants**, so a shared answer is worth nothing.

**Stem**

> Four crews plotted the same two variables. One crew's chart shows a strong
> negative relationship. Which chart is theirs? Choose one.

Strength and direction are both defined in the room body, above:

> **Direction** is which way the points travel as you read left to right.
> **Strength** is how closely they follow a straight line.

**Options** — `opt_a` Chart A · `opt_b` Chart B ✅ · `opt_c` Chart C · `opt_d` Chart D

**Rung 1** (16 words)

> Read each chart from left to right. Ask which way the points travel, and how
> tidily.

**Rung 2**

> On four other charts, one showed a weak positive relationship. Its points
> travelled upwards from left to right, so the direction was positive. They were
> scattered widely rather than sitting near a line, so the strength was weak.
> Direction and strength are two separate questions about the same chart.

**Rung 3**

> Two of the four charts travel downwards from left to right. Rule out the other
> two now. Look only at the two that are left. In one of them the points sit
> close to a straight line. In the other they are scattered.

---

### Not gated in L2

The ice creams and drinking fountains item. It is an ordinary reading task, it
records to `h2o.v1.responses`, and it has **no hint ladder and no token**. It must
look exactly like the practice items around it.

---

## Room L3 — Collector

Checkpoints critique a **supplied** sheet, never their own plan. Their own plan is Card
work and is never gated.

**Artefact — “Crew 7's recording sheet”.** One printed sheet per variant, same
shape in all six:

| Row | Date | Measured by | `[Shower length, in minutes]` | `[Water used, in litres]` | Notes |
|---|---|---|---|---|---|
| 1–12 | … | one of **three** names | some cells blank | some cells blank | one row per method |

Fixed across all six variants:

- **three** different names in *Measured by*
- **twelve** planned rows
- **four** blank measurement cells, spread over at least three rows
- exactly **two** rows whose *Notes* describe a different method from all the rest

Only the context, the names and the numbers change between variants.

---

### `cp3.1` — how many people measured · Type A

**Stem**

> Crew 7's sheet is on the left. Look at the column headed *Measured by*.
> How many different people took the measurements? Type the number.

**Accepted** — `accept[0] = 3`. One value only.

**Rung 1** (14 words)

> Look down the column that says who did the measuring. Read every row of it.

**Rung 2**

> On another crew's sheet the *Measured by* column read: Nadia, Tom, Nadia,
> Nadia, Tom. That is five rows. But only two different people did the measuring,
> because Nadia's name appears three times. Count people, not rows.

**Rung 3**

> Write down the first name in the column. Go down the column. Each time you meet
> a name you have not written, add it to your list. Ignore any name already on
> it. Your list is now complete. Count what is on it.

---

### `cp3.2` — the two rows that cannot be compared · Type B

**Stem**

> A fair comparison needs both measurements taken the same way. Two rows on Crew
> 7's sheet were not. Which two? Choose one.

**Options** — four pairs of row numbers, one correct. The three wrong pairs each
contain **one** of the two odd rows, so no pair can be dismissed at a glance.

| key | label |
|---|---|
| `opt_a` | Rows 2 and 9 |
| `opt_b` | Rows 4 and 9 ✅ |
| `opt_c` | Rows 4 and 11 |
| `opt_d` | Rows 6 and 9 |

> **Corrected 16/08/2026.** `opt_d` read *Rows 6 and 11*, which contains neither
> odd row and so breaks the rule stated directly above it: a student who has found
> either one of the two can drop that option without looking. Now every wrong
> pair contains exactly one of rows 4 and 9.

**Rung 1** (15 words)

> The *Notes* column says how each measurement was taken. Read it from top to
> bottom.

**Rung 2**

> On another sheet, ten rows said *measured with the jug*. One said *guessed*.
> One said *asked my sister*. Those two cannot be fairly compared with the rest,
> or with each other, because neither used the jug.

**Rung 3**

> Read the *Notes* column all the way down. Most rows describe the same method.
> Two rows describe something else. Note the row number of each. One option names
> both of them. The other three name only one.

---

### `cp3.3` — how many measurements are missing · Type A

The room body defines this before the checkpoint:

> A **measurement** is one number written in one of the two measurement columns.
> A blank cell is a measurement that was never taken.

**Stem**

> Crew 7 planned twelve rows. Some measurement cells were left blank. How many
> measurements are missing? Type the number.

**Accepted** — `accept[0] = 4`. One value only.

**Rung 1** (13 words)

> An empty cell is a measurement nobody took. Look for the empty ones.

**Rung 2**

> Another sheet had eight rows and two measurement columns, so sixteen cells in
> all. Three of those cells were blank. Two were in the same row. That is still
> three missing measurements, because each blank cell is one measurement.

**Rung 3**

> Go along row 1 and count the blank cells in the two measurement columns only.
> Do not count the *Notes* column, and do not count a whole row. Do the same for
> every row down to row 12. One addition is left.

---

## Room L4 — Plotter

### `cp4.1` — which display suits the data · Type B

**Stem**

> A crew timed forty showers, each to the nearest tenth of a minute. They want
> one display that shows how those forty times are spread. Which display should
> they use? Choose one.

**Options**

| key | label |
|---|---|
| `opt_a` | A histogram ✅ |
| `opt_b` | A dot plot |
| `opt_c` | A pie chart |
| `opt_d` | A box plot |

`opt_b` is the one worth having: with times to a tenth of a minute, almost every
value is different, so a dot plot would be forty single dots and show nothing.
That is the distinction 11.02 Q17e is already teaching. All four are displays
`tools/uni.html` can actually produce.

**Rung 1** (17 words)

> Two things decide this. How many measurements are there, and how many of them
> repeat exactly?

**Rung 2**

> A crew counted how many people were in each of thirty houses. The answers were
> whole numbers from 1 to 6, so many repeated. A dot plot suited that: one dot
> per house, stacked over each number. Repeats are what make a dot plot work.

**Rung 3**

> Times to the nearest tenth of a minute rarely repeat. So one option would draw
> forty separate dots in a row. Rule that one out. Of the three left, one shows
> every measurement grouped into equal intervals. The other two do not show the
> spread of all forty.

---

### `cp4.2` — read a value off the axis · Type A

**Artefact.** Chart 4, a column graph of their variant with a labelled vertical axis,
gridlines every `[50]` units, starting at zero. The target column stops **halfway**
between two gridlines, so the reading takes one step rather than none. A second
column is halfway between two gridlines as well, so the one being asked about is
not the only one on the chart that looks like that.

**Stem**

> Chart 4 shows the water used on each day of one week. Read the value for
> Thursday. Type the number, in litres, to the nearest 5 litres.

**Accepted** — `accept[0] = 175`, plus `170` and `180`. Three values.

**Rung 1** (15 words)

> Find Thursday along the bottom of Chart 4. Follow its column upwards to the
> top.

**Rung 2**

> On another chart the gridlines were 20 apart, at 40, 60 and 80. A column
> stopped halfway between 60 and 80. Half of 20 is 10. So the column was worth
> 70.

**Rung 3**

> Thursday's column stops between two gridlines. The gridline below it is 150.
> The gridlines on Chart 4 are 50 apart. The column stops halfway between them.
> One addition is left.

> **Corrected 16/08/2026.** The artefact said gridlines every 25 and the rung
> said 25 apart, which makes the answer 162.5 — but `accept[0]` is 175, and
> "to the nearest 5 litres" cannot resolve 162.5 anyway. The gridlines are 50
> apart. Half of 50 is 25, and 150 + 25 = 175, which is what the answer key has
> always said and what the rung-2 parallel example already models.

---

### `cp4.3` — which scale is honest · Type B

**Artefact.** Charts A, B and C: the same six measurements drawn three ways.
**A** starts its vertical axis at zero with equal steps. **B** starts above zero.
**C** starts at zero but its steps are unequal. Which letter is honest rotates
between variants.

**Stem**

> Charts A, B and C show the same six measurements. One of them shows the size of
> the change honestly. Which one? Choose one.

**Options**

| key | label |
|---|---|
| `opt_a` | Chart A ✅ |
| `opt_b` | Chart B |
| `opt_c` | Chart C |
| `opt_d` | All three, because they use the same numbers |

`opt_d` is the misconception this checkpoint exists to catch, and a student who holds
it will pick it. It must never be dropped for a fourth chart.

**Rung 1** (16 words)

> Look at where each vertical axis begins. Then look at the gaps between the
> numbers on it.

**Rung 2**

> Two charts showed the same two columns, 82 and 84. The first axis ran from 81
> to 85, and the taller column looked about three times the other. The second ran
> from 0 to 100, and the two columns looked almost the same. Both used the same
> numbers. Only one showed the size of the change honestly.

**Rung 3**

> One of the three charts has a vertical axis that begins above zero. Rule it
> out. One of the charts has gaps between its numbers that are not all the same
> size. Rule that one out too. One chart and one other option are left. Only one
> of them can be right.

---

## Room L5 — Predictor

### Terms this room introduces

> A **line of best fit** is a straight line drawn through a scatterplot. It passes
> as close as it can to all the points. Your worksheets call this the line of good fit. It is the same
> line.
>
> The **gradient** tells you how much the RV changes for every one unit the EV
> goes up.
>
> **Interpolation** is reading the line inside the measurements you have.
> **Extrapolation** is reading it beyond them.

---

### `cp5.1` — the gradient of the line · Type A

**Artefact.** Chart 5: their variant's scatterplot with a line of best fit drawn on
it, and two points **on the line** marked and labelled with their coordinates. The
two points are chosen so the gradient is exact to one decimal place.

**The line has to actually fit.** Every variant's points must be chosen so that
the drawn line is also their least squares line, to two decimal places in the
gradient. A line that sits visibly above or below most of the points is not a
line of best fit, and a room that calls it one teaches the opposite of the
lesson. Variant 1's points give m = 9.00, c = 16.03 against a drawn y = 9x + 16.

**Stem**

> Chart 5 has a line of best fit drawn on it. Two points on that line are marked:
> (2, 34) and (10, 106). Find the gradient of the line. Type the number, to one
> decimal place.

**Accepted** — `accept[0] = 9`. One value. A student typing `9.0` is canonicalised to
the same string, so it costs no accepted slot.

**Rung 1** (13 words)

> Gradient compares the change in the RV with the change in the EV.

**Rung 2**

> A line passed through (1, 20) and (5, 8). The RV went from 20 down to 8, a
> change of −12. The EV went from 1 up to 5, a change of 4. The gradient is −12
> divided by 4, which is −3. A gradient can be negative.

The parallel example is deliberately negative, so that the two crews on variant 5
are not the only ones who meet a negative gradient, and the other four meet one
somewhere safe.

**Rung 3**

> The RV goes from 34 to 106. That is a change of 72. The EV goes from 2 to 10.
> That is a change of 8. One division is left.

---

### `cp5.2` — reading inside the data · Type A

**Stem**

> Use the line of best fit on Chart 5. Read the line at 6 minutes. What does it
> give for the water used? Type the number, in litres, to the nearest 10 litres.

**Accepted** — `accept[0] = 70`, plus `60` and `80`. Three values. The band is
stated in the stem, and it is wide because this is read by eye off a printed
chart.

**Rung 1** (14 words)

> Find 6 on the bottom axis of Chart 5. Go straight up from there.

**Rung 2**

> On another chart the line was read at 3 hours. Going up from 3 met the line
> level with 45 on the side axis. So the line gives 45 at 3 hours. The point read
> does not have to be one of the measured points.

**Rung 3**

> Go up from 6 until you meet the line, not a point. Now go straight across to
> the side axis. You land between two gridlines. One reading is left.

---

### `cp5.3` — reading beyond the data · Type A

**Stem**

> Crew 7 measured showers from 2 minutes to 11 minutes. Use the line of best fit
> on Chart 6 to predict the water used for a 15 minute shower. Type the number,
> in litres, to the nearest 10 litres.

The room draws this on a **second chart**. Chart 5 stops at the data and is what
`cp5.1` and `cp5.2` are read off; Chart 6 is the same points and the same line
with the bottom axis carried past the last measurement, the region beyond it
hatched, and the line dashed and fading across it. One chart cannot do both jobs:
the fade that makes the point about extrapolation is heavy enough at 15 to make
the reading a fight, unless the axis runs well past the value being asked for.

**Accepted** — `accept[0] = 150`, plus `140` and `160`. Three values.

The Card's *Reading past our data (extrapolation)* field is where they write what
this prediction is worth. That is Card work and is never gated.

**Rung 1** (16 words)

> The line does not stop at the last point. It carries on. So can your reading.

**Rung 2**

> A crew measured from 1 to 8 weeks and read their line at 12 weeks. Twelve is
> past everything they measured. They still read it the same way: up from 12, and
> across to the side axis. Reading it takes the same two steps. Trusting it is a
> different question.

**Rung 3**

> Find 15 on the bottom axis, past the last point on the chart. Go up to the
> line, then across to the side axis. One reading is left.

---

## Acceptance tests

Run per `docs/CHECKPOINT_CONTRACT.md` §7 against every stem and every rung above.

| Test | Result |
|---|---|
| 1. Read-aloud | Pass. Longest stem 24 words over two sentences; longest single sentence 18. |
| 2. Coach test | Pass. Crib lines still to be written for `staff.html` at stage 10. |
| 3. Variant parity | **Cannot pass yet.** Written against variant 1 only; the other five land at stage 7. Answer types and accepted-value counts are fixed above, so parity is checkable then. |
| 4. Direction parity | Pass. Every stem and rung read back with variant 5 substituted. `cp5.1` rung 2 is deliberately negative. |
| 5. Rung 3 test | Pass on all twelve. `cp2.1` was the weak one and was rewritten on 16/08/2026 — see below. |

### `cp2.1` — resolved 16/08/2026

It used to read a label off an axis, and its rung 3 could not be written properly
because the method *was* reading the label: there was no operation to stop one
step short of. Your call was to make it the harder question — which axis the EV
belongs on — and it is rewritten above. Rung 3 now narrows to the two options
naming the right variable and leaves them to choose between two reasons, which is
a decision rather than a lookup.

The answer key moved with it. `opt_a` is still the correct key, so no student's
vault code changes.

---

## Marked, 16/08/2026

You asked me to decide these rather than hold them. Here is what I changed and
what I left, so you can overrule any of it in one line.

**Approved as written: eight of twelve.** `cp2.2`, `cp2.3`, `cp3.1`, `cp3.2`,
`cp3.3`, `cp4.3`, `cp5.2`, `cp5.3`. They pass every acceptance test in the
contract and they read the same in all six variants.

**Four changed.**

| Checkpoint | Change | Why |
|---|---|---|
| `cp2.1` | Rewritten as *which axis the EV belongs on* | Your call. The old one could not carry a rung 3. |
| `cp2.1` reason | *"because {rv} depends on it"*, not *"because it is the one they chose"* | Two of the six data sets are observational — nobody chooses the rainfall. "Depends on" is true of all six and is the actual definition. The room's wording of EV and RV moved with it. |
| `cp4.1` | Two scenarios, one per group of three variants | The answer was a histogram in all six, which is a shared answer. Three variants now meet readings to a tenth that rarely repeat, three meet whole numbers that do. Same idea, tested from both sides. |
| `cp5.1` rung 3 | States both changes, does not do either subtraction | It used to hand over "a change of 72" for variant 3. That is the working, not a hint. |

**One contract change.** §  The L3 sheet was fixed at *three different names in
Measured by* for all six variants. Three across six variants is a shared answer,
and a shared answer is the one thing six data sets exist to prevent. Name counts
now vary from three to five. The reading load is unchanged.

**Where the answers can still coincide.** `cp4.1` has two possible answers by
construction and `cp3.1` has three. Both are checked by
`scripts/check-datasets.mjs`, which fails the build if any checkpoint ever
collapses to one answer across all six.

**What I did not touch.** Every parallel example in a rung 2 — the cars, the tap,
the jug, the thirty houses — is deliberately from a different context than their own
data. A worked example in their own context is a worked answer.
