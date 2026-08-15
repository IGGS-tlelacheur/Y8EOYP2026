# H₂O: Towards 2040 — Mathematics strand

Year 8 end-of-year programme, Ivanhoe Girls' Grammar School.
Six lessons on bivariate data, delivered as a self-directed website.

Students learn to read charts, plan a data collection, plot univariate and bivariate
data, fit a line by eye and predict forward to 2040. They earn four badges — **Reader,
Collector, Plotter, Predictor** — and produce a crew-owned **Data Evidence Card** that
also appears in their documentary at the programme's film festival.

Lessons 1 and 6 open with a whole-cohort lecture. **Lessons 2 to 5 run without a
mathematics specialist in the room.** That constraint drives most of the design.

## Quick start

```bash
git clone <repo>
cd <repo>
python3 -m http.server 8000
```

Open `http://localhost:8000`. There is no build step and no dependency install.

To regenerate the hashed roll and answer key you need Node and the git-ignored sources
in `private/`:

```bash
node scripts/build-data.mjs
```

## Read these first

| File | What it is |
|---|---|
| `CLAUDE.md` | Constraints, locked decisions, conventions. Read before writing code |
| `docs/PLAYBOOK.md` | Build order, verification per stage, deploy rules |
| `docs/DATA_CONTRACTS.md` | Every file format and storage shape |
| `docs/BUILD_PLAN.md` | Full pedagogical and technical specification |
| `docs/reference-data-evidence-card.html` | The printed Card the site must match |

## Structure

```
index.html            login
hub.html              badge rack, room list, export
l1.html … l6.html     the six lesson rooms
extension.html        side quests
card.html             Data Evidence Card webform
deck-1.html           Lesson 1 opening deck
deck-6.html           Lesson 6 closing deck
staff.html            supervisor tools (unlinked)
tools/                bi, uni, table, mislead
js/                   store, vault, variants, chart, ui
data/                 datasets.json (written), roll.json + answers.json (generated)
scripts/              author-time only, never runs in a browser
```

## Non-negotiables

No framework. No build step. No runtime dependencies. No backend. Nothing about a
student leaves her laptop. No plaintext answers or unlock codes anywhere in the repo.

Full reasoning in `CLAUDE.md`.

## Deploying

GitHub Pages serves `main`. A push is a deploy and there is no staging environment, so
**never push to `main` during a lesson week.** Branch, verify, merge deliberately.

## Privacy

Student names, work and progress live in the browser and in the crew's own OneDrive
folder. Nothing is transmitted anywhere. `data/roll.json` contains SHA-256 hashes of
student IDs and no personal data; the plaintext roll is git-ignored and stays that way.
