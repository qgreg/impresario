# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

A mobile web game about mounting a season of theatre you cannot afford. The
player is the impresario — the one who puts up the money, books the house,
hires the star, and watches from the back.

[README.md](README.md) carries the design: the three audiences, the phase
structure, and what each phase is *for*. Read it before changing behaviour, and
update it alongside any change that alters how the game plays.

## Hard constraints

- **No build step, ever.** Plain ES modules loaded straight from disk.
  `index.html` loads `./src/app.js` as `type="module"`. No bundler, no
  transpiler, no TypeScript, no runtime package fetch.
- **No runtime dependencies.** Nothing is vendored yet and nothing should be
  without a reason written down.
- **Portrait, one thumb.** Everything interactive lives in the bottom half of
  the screen and is at least 48px. The top half is for looking at.
- **It must work muted.** Sound decorates; it never carries information.
- **Deployed as a static site.** `.nojekyll` is present. Anything added must
  work served statically over HTTPS.

## Layout

```
index.html        the whole game's markup — one screen, repainted
styles.css        gaslight-and-velvet palette, portrait layout
src/data.js       the content tables: works, treatments, hooks, backers, remarks
src/bill.js       pure derivation — cost, appeal, volatility, roles, billing
src/app.js        state, painting, and the step machine. The only stateful module
test/bill.test.js unit tests, bare Node, no framework
```

`src/app.js` owns all state. Everything else is a pure function it calls.

## Running and testing

```sh
npm start   # python3 -m http.server 8080
npm test    # node test/bill.test.js
```

Tests are hand-rolled: a local `check(label, condition, detail)` that prints
`ok`/`FAIL`, collects failures, and exits non-zero. **Do not introduce a test
framework** — match the existing shape.

Tests run against fixed fixture data, not the real content tables, so that
tuning a work's cost never breaks a test about arithmetic. The exceptions are
the handful of checks at the bottom that assert *properties* of the real
tables — every entry scores all three audiences, ids are unique, and all 336
combinations derive cleanly.

## Conventions that are load-bearing

**Every phase but the spotlight is a pure function over plain data.** That is
the central bargain. `deriveBill`, and its successors for casting and
production, decide whether a season is won or lost, and none of them may need a
browser to be checked. When you add logic that decides an outcome, factor it
into `src/*.js` as a pure function and test it.

**The spotlight phase cannot be tested headlessly — so isolate what can.** Its
*scoring* must be a pure function from a recorded path of samples to a grade,
even though the input is a thumb.

**Comments explain *why*, at length.** Which alternative was tried and rejected,
what breaks without a guard, why a number is that number. Match that density;
do not strip explanatory comments to tidy up.

**British spelling. Period voice, dry rather than jokey.** Player-facing copy is
the voice of a theatre that has seen everything: *"Sixty feet of hydraulics. It
works perfectly in rehearsal."* Never scolding, never cute.

**Nothing is signalled by colour alone.** Each audience carries a glyph (● ◆ ▲)
and a name as well as a hue, and appeal is stated in words beside every bar.
Preserve that when adding any new readout.

**Free multiplication, authored reactions.** Any work may take any treatment and
any hook. The game does not curate combinations — it comments on notable ones
through `REMARKS` in `data.js`. Adding content means adding to a table, never
adding a special case to `bill.js`.

**Appeal is never clamped.** A bill can be genuinely repellent to an audience,
and a negative number is more honest and more useful than a floor at zero.

## The palette

| Token | Hex | |
|---|---|---|
| night (ground) | `#14100E` | near-black, not black |
| curtain | `#7A2231` | |
| brass / gold | `#C9973F` / `#E6BC63` | |
| cream (ink) | `#F2E4CB` | |
| ash (secondary) | `#9A8B76` | |
| crowd ● | `#E8A33D` | |
| society ◆ | `#C193D4` | |
| critics ▲ | `#6FB3A8` | |
| alarm | `#D97A5A` | shortfalls and risk only |

Defined as custom properties at the top of `styles.css`. Keep any hex literals
elsewhere in step with them.

## Adding content

Works, treatments, hooks and backers are plain objects in `src/data.js`. Every
one needs `appeal` for all three audiences and a `volatility`, and every work
needs at least three roles. A treatment's `costMult` multiplies; a hook's `cost`
is added afterwards, so an ambitious treatment on an expensive work compounds —
which is how a season is lost.

`billing` is the fragment that appears on the poster (`as a Ballet`, `with a
Live Horse`). A hook with `billing: null` adds nothing to the line, which is how
"No Hook" stays free and silent.

## Git workflow

Commit subjects in the imperative, sentence case, no prefix or ticket tag. A
wrapped prose body explaining the problem, why the previous behaviour was wrong,
and what the change trades away. Bullet lists of touched files are not the style
here.
