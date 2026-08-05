# Typing Trainer

A free typing tutor that runs entirely in the browser. Progressive lessons that
unlock as you improve, monkeytype-style speed tests, per-key statistics, and
English + Spanish throughout.

No accounts, no build step, no network requests, no tracking. Open `index.html`
and it works — online or off.

**Live:** https://fabricio333.github.io/typing-trainer/

---

## Running it

Either works:

```bash
# 1. Just open the file
xdg-open index.html          # or double-click it

# 2. Or serve it, if you prefer a real origin
python3 -m http.server 8000  # then visit http://localhost:8000
```

There is nothing to install and nothing to compile.

## Features

**Test modes**
- **time** — 15 / 30 / 60 / 120 seconds, with the word buffer topping itself up
- **words** — 10 / 25 / 50 / 100 words
- **quote** — real passages, short to long
- **patterns** — drills the highest-frequency letter pairs, triples and chunks,
  and can weight them adaptively toward the keys you actually miss
- **hardest words** — repetition drill over your own slowest words (see below)
- **zen** — untimed, no end

Plus punctuation and number toggles, and a word-difficulty setting that controls
how deep into the frequency list the tests draw from.

**Lessons** — 22 per language, home row through to full passages. Each has a
target speed and accuracy; clear it to earn stars and unlock the next.

**Editing that behaves like a real editor**
- `Ctrl`/`Alt`/`Cmd` + `Backspace` wipes the whole current word. Press it again on
  an empty word and it steps back and wipes the previous one, walking backwards.
- `Backspace` steps back into an earlier word so you can fix it — by default only
  when that word was wrong, or into any word with *free backspace* on.
- `Enter` commits a word, exactly like space.
- `Tab` restarts, `Esc` releases focus (both configurable).
- *Confidence mode* turns backspace off entirely.

**Per-word timing and the hardest-words drill** — every word you type in any mode
is timed and the history accumulates permanently. A word's time runs from the
previous word's commit to its own, so the hesitation *before* a hard word counts
towards it, which is where most of the difficulty actually lives.

Words are ranked by **milliseconds per character**, not raw time — ranking by raw
time would just surface the longest words rather than the hard ones.

The **hardest words** mode takes the slowest N (10–50) and drills them by
repetition, cycling the set so every word gets an equal share. The set is
deliberately **frozen for the session**: if it re-picked the slowest words after
every test, a word would drop out the moment you improved at it and the set would
churn under you, so you would never practise anything to completion. Each word
shows its live speed and is marked when you beat the speed it had when the set was
picked, so progress is visible while the set stays put. "Pick a new set" re-ranks
on demand.

**Statistics** — WPM, raw WPM, accuracy, consistency, a per-second chart, personal
bests per mode, a trend graph, a per-key heatmap showing which keys you miss, and
a slowest-words table.

**Spanish support** — Spanish word lists, quotes, lessons and patterns, plus a
Latin American keyboard layout. Accented characters typed with dead keys
(`´` then `a` → `á`) compose correctly, and the on-screen keyboard points at the
dead key first.

**Everything else** — eight themes, four caret styles, adjustable text size, blind
mode, stop-on-error, a synthesised keypress click, and JSON export/import of all
your data.

## How it is built

Plain HTML, CSS and JavaScript. No framework, no bundler, no dependencies, no
external assets — the charts are drawn on a canvas by hand, the keypress sound is
synthesised with WebAudio, and the fonts are whatever the system already has.

Scripts load as classic `<script>` tags rather than ES modules, which is what lets
the page run from `file://` — modules would be blocked by CORS and force a server.
Everything attaches to a single `TT` namespace, and `index.html` lists the tags in
dependency order.

```
index.html
css/     style.css  themes.css  keyboard.css
js/
  data/  words.{en,es}.js  quotes.{en,es}.js  patterns.js  layouts.js  lessons.js
  core/  storage.js  generator.js  engine.js  stats.js  wordstats.js  # DOM-free
  ui/    render.js  keyboard.js  chart.js  sound.js  results.js
         settings.js  lessons.js  statsview.js  router.js
  app.js                                                    # wiring, loaded last
tests/   run.js  browser.js  *.test.js
```

`engine.js`, `stats.js` and `generator.js` deliberately never touch the DOM, which
is what makes them testable with no browser and no test framework.

Two details worth knowing if you change things:

- **Typed text comes from the `input` event, never from `keydown`.** A dead-key
  sequence only resolves into a real character on `input`, so reading `keydown.key`
  would silently break every accented character.
- **Speed is measured from the final text; accuracy from the keystroke log.** That
  way a mistake you went back and corrected still counts against your accuracy,
  which is the honest answer.

## Tests

```bash
node tests/run.js        # 111 unit tests — no dependencies, no install
node tests/browser.js    # 53 end-to-end checks — needs puppeteer, skips without it
```

The unit tests cover the engine's backspace semantics, the statistics maths,
per-word timing and ranking, the generator, and the data files (duplicate words,
untypeable characters, lesson definitions that fail to generate, keys missing from
a layout).

The browser test drives the real page in headless Chrome over `file://` and checks
typing, caret position across a whole line, `Ctrl+Backspace` walking backwards,
Caps Lock warning, accented input, a full lesson unlock cycle, the drill set
staying frozen as speeds improve, persistence across reloads, and that nothing
logs to the console. Run it
with `SHOTS=1` to also write screenshots to `tests/screenshots/`.

Point it at a deployed site to verify a release — a broken script path only shows
up over HTTP, never on `file://`:

```bash
APP_URL=https://fabricio333.github.io/typing-trainer/ node tests/browser.js
```

## Deployment

GitHub Pages serves the `main` branch root directly, so every push is live. There
is no build step to run.

`.github/workflows/deploy.yml` is an optional upgrade that runs the unit tests
first and only then publishes. Pushing it needs the `workflow` OAuth scope:

```bash
gh auth refresh -s workflow
```

Then push the workflow and switch Pages over to it:

```bash
gh api -X PUT repos/Fabricio333/typing-trainer/pages -f build_type=workflow
```

## Licence

MIT.
