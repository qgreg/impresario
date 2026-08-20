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
src/company.js    pure — fit, feuds, salaries, and the backer's imposed string
src/production.js pure — staging and rehearsal folded over the cast's seeds
src/app.js        state, painting, and the step machine for The Bill and casting

spotlight.html    the follow-spot toy, standalone, depends on no other phase
src/follow.js     pure — lamp physics, the performer's business, the grade
src/spotlight.js  canvas, clock and pointer for the toy. Owns nothing else

test/bill.test.js    unit tests, bare Node, no framework
test/company.test.js the same, for casting
test/production.test.js  the same, for staging and rehearsal
test/follow.test.js  the same, for the spotlight
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
scoring *is* a pure function from a recorded path of samples to a grade, and so
are the lamp's motion and the performer's business. Only the thumb is untestable.

**Tune from measurement, not from theory.** `JERK_BUDGET` was first set to a
round guess of 26; simulating operators from a metronome to a panicking beginner
showed the real range was 0.22 to 1.65, so everybody scored 0.99 and grace was
decoration. The test file now asserts the *property* that catches that class of
mistake: operators of visibly different quality must not all receive the same
verdict. Keep that check green when the scene or the lamp changes.

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

**Spoken theatre only.** No opera, no ballet, no chorus, no orchestra. An
earlier draft had treatments that demanded singers or dancers; the game is
narrower now and better for it. Do not reintroduce a musical or danced
treatment, a singing role, or a performer whose skill is anything but acting.

**Casting runs on lines of business, not ability.** `Leading`, `Juvenile`,
`Heavy`, `Comedian`, `Character`, `Utility` — the lines a stock company actually
engaged actors in. `ROLE_LINES` maps a part to the line entitled to play it and
`ADJACENT` says which lines stretch to cover which, as a professional courtesy.
Casting out of line is never blocked, only priced, and the price is resentment
as much as money. `Utility` reaches every line and is ideal for none, which is
what makes a bill always fillable.

**Assert that a choice is never a dead end.** `company.test.js` checks every
work can be cast under every treatment without anyone going out of their line.
The earlier version of this caught opera and ballet being uncastable — two of
six treatments were traps sprung on a choice made blind in phase one. Keep that
check green whenever the roster or the works change.

**Trouble is named, never summarised.** A cast plants *seeds* — typed troubles
(`miscast`, `green`, `drink`, `feud`) each carrying the sentence that describes
it. The production phase folds over those seeds and marks each one `covered`,
`exposed`, or `open`. A staging must therefore say which of *this* cast's
troubles it touches, on the card, before the player pays: compensation the
player cannot see coming is not a decision, it is a die roll. Never replace a
named seed with a numeric risk score.

**Every seed kind must be coverable by something.** `production.test.js` asserts
it. A trouble with no answer anywhere on the shelf is a punishment, not a
choice.

**Reopening a phase reopens everything downstream.** Taking a part back clears
the production, because a staging was chosen to cover that particular cast and
it is no longer that cast.

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

`billing` is the fragment that appears on the poster (`as a Melodrama`, `with a
Live Horse`). A hook with `billing: null` adds nothing to the line, which is how
"No Hook" stays free and silent.

## Git workflow

Commit subjects in the imperative, sentence case, no prefix or ticket tag. A
wrapped prose body explaining the problem, why the previous behaviour was wrong,
and what the change trades away. Bullet lists of touched files are not the style
here.
