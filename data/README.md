# data/

`roll.json` and `answers.json` in this directory are **generated**. Do not edit them by
hand and do not write plaintext into them.

Sources live in `private/`, which is git-ignored:

- `private/bypass.json` — the four staff room codes. Copy
  `private/bypass.example.json` and put real codes in it. **Never in the repo:** the
  first set was hardcoded in `make-datasets.mjs`, reached the public repository, and
  had to be retired rather than re-hidden.

- `private/roll.csv` — `ID,Staff_Student,Password`, one line per person, students and
  staff alike. Export it from the school system, drop it in, never commit it. Only
  hashes are published. The salt and the iteration count in `data/roll.json` must never
  change once the roll is live — either invalidates every password on it. ID length is
  not validated: some staff IDs are genuinely three or four digits.
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

`datasets.json` IS committed and holds no answers, only the six variants of each
dataset. It is **generated**, together with `private/answers.json`, from one set of
definitions:

```
node scripts/make-datasets.mjs     rebuild both from the definitions
node scripts/check-datasets.mjs    verify the data agrees with the key
node scripts/build-data.mjs        hash the key into data/answers.json
```

Run all three in that order after any content change. Do not hand-edit either output:
the whole point is that the number a chart draws and the number the key accepts come
from the same line of source. Format in `docs/DATA_CONTRACTS.md`.
