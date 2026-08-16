# data/

`roll.json` and `answers.json` in this directory are **generated**. Do not edit them by
hand and do not write plaintext into them.

Sources live in `private/`, which is git-ignored:

- `private/roll.csv` — `ID,Staff_Student,Password`, one line per person, students and
  staff alike. Export it from the school system, drop it in, never commit it. Only
  hashes are published, and the salt in `data/roll.json` must never be regenerated once
  the roll is live.
- `private/answers.json` — the plaintext answer key. See `private/answers.example.json`
  for the shape.

Regenerate after any change:

```
node scripts/build-data.mjs
```

Verify the committed files match their sources (this runs before any merge to `main`):

```
node scripts/build-data.mjs --check
```

`datasets.json` is hand-written content and IS committed. It holds no answers, only the
six variants of each dataset. Format in `docs/DATA_CONTRACTS.md`.
