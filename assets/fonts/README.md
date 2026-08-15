# Fonts

## patrick-hand.woff

Patrick Hand, subset to Latin-1 plus the punctuation the site uses, ~27 KB.

Extracted at author time from the base64 TTF already embedded in
`docs/reference-data-evidence-card.html`, so the site and the Card use the same
outlines and no request ever leaves the laptop.

Regenerate with:

```
fonttools subset patrick-hand.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2018-201D,U+2013,U+2014,U+2026,U+2082,U+00D7,U+2212" \
  --layout-features="kern,liga" \
  --flavor=woff \
  --output-file=assets/fonts/patrick-hand.woff
```

Two things to know:

- **It is WOFF, not WOFF2.** `CLAUDE.md` asks for WOFF2 and it should be, but the
  conversion needs brotli, which was not installed at author time. WOFF2 would
  save roughly 8 KB. Swap the file and the one `src:` line in `css/site.css`
  when the tool is available; nothing else changes.
- **There is no subscript two in the font.** `H₂O` in Patrick Hand would fall
  back mid-word, so the programme name is composed instead — see the `.h2o`
  rule in `css/site.css` and use `<span class="h2o">H<sub>2</sub>O</span>`.

### Licence — outstanding

Patrick Hand is published under the SIL Open Font License 1.1. **The full OFL
text and the copyright line are not in this repository yet and need to be**, as
the licence requires them to travel with the font. Take both from the font's
Google Fonts listing and drop them in here as `OFL.txt`.

## Body face — outstanding

`CLAUDE.md` asks for a self-hosted humanist sans for body and UI. There is no
licensed woff2 in the repo, so `--font-body` in `css/site.css` currently falls
back to the fleet's system stack, headed by Segoe UI. That makes no network
request and is present on every laptop in the fleet, so it is safe to ship as
is — but it is a deviation from the brief, marked `TODO(asset)` at the
declaration.
