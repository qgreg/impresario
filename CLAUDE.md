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
src/notices.js    pure — takings, standing, and the reviews
src/night.js      pure — the scene, the crises, and judging each one
src/openingnight.js  the live stage. A canvas, a clock, a thumb, nothing else
src/stagepaint.js    boards, figures and beam, shared by the toy and the night
src/sound.js      the pit and the stage manager. Synthesised; no audio files
src/app.js        state, painting, and the step machine for The Bill and casting

spotlight.html    the follow-spot toy, standalone, depends on no other phase
src/follow.js     pure — lamp physics, the performer's business, the grade
src/spotlight.js  canvas, clock and pointer for the toy. Owns nothing else

test/bill.test.js    unit tests, bare Node, no framework
test/company.test.js the same, for casting
test/production.test.js  the same, for staging and rehearsal
test/notices.test.js     the same, for the settlement
test/night.test.js       the same, for the crises and their judgement
test/sound.test.js       the same, for which reception a night earns
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

**The loop must be re-enterable, and it must be able to end.** Three phases that
only spend money left the game unplayable after one production — no income meant
no week two, which reads to a player as being stuck rather than as losing.
`notices.test.js` asserts both halves: a sensible production can turn a profit on
an ordinary night, and ruin is *recognised* rather than left as a screen of
bills nobody can afford.

**Distinguish what was hoped for from what was received.** Appeal is the house's
expectation; `receivedAppeal` is that figure less the night's wreckage, and the
three audiences forgive at different rates. Reviews, standing and the meters
after the curtain all read the received figure. Looking anything up from raw
appeal produced a show that lost ninety guineas amid nine disasters and was
still called the finest thing of the season.

**Standing is comparative, never absolute.** It moves on beating
`CRITIC_EXPECTATION`, not on approval. Scaled straight off the critics it made a
competent impresario the toast of London by week two and emptied the word.

**Clamp anything that carefulness can drive negative.** Volatility can legitimately
end up below zero; unclamped, a negative mishap count turned the damage fraction
into a multiplier and paid out above the gross — money minted from caution. The
same figure also reached the copy as "0 of the -2 things that could go wrong did".

**A covered trouble does not happen.** Not a milder crisis — no crisis. The
production phase buys the absence of an event, and if it could only soften one,
that phase would be a discount rather than a decision. `night.test.js` asserts
a fully covered cast produces zero crises.

**A number on the board is a promise the night has to keep.** The readout showed
raw volatility — "15 things will go wrong" — while crises came only from the
cast's named seeds, so the evening delivered two. `crisisCount` now decides both
the board and the night. If you add a source of risk, it must reach the night or
it must not reach the board.

**The impresario is chosen first, and sets the purse, the standing and who will
still lend.** `IMPRESARIOS` in data.js. A test asserts none of them begins a
season already ruined — a difficulty option that loses before it starts is a
trap, not a choice.

**Ruin has a range of endings, fixed once at the moment it happens.** `fateFor`
picks by how the season went; the first matching entry in `FATES` wins, so
ordering that table expresses the priority. Draw it in `ruin()`, never while
painting: the general pool is random, so a fate chosen during render reshuffles
on every repaint and the player watches their own obituary change its mind.

**Anything the app hides needs its own `[hidden]` guard in CSS.** An element with
`display: flex` of its own beats the user-agent `[hidden]` rule, so setting the
attribute silently does nothing. `.poster` and `.readout` carry the guard.

**Nothing is signalled by sound alone.** Most phone play is silent and in
public. Every cue is on the screen first; the audio only agrees with it. Muting
must lose atmosphere and no information. Keep it that way when adding feedback.

**Sound is synthesised, never fetched.** No audio files, for the same reason
there are no images. `sound.js` builds a fanfare from four oscillators and the
stage manager from `speechSynthesis`, which every browser already carries.

**Audio needs a gesture, and there is exactly one place to take it.** `wake()`
is called from the curtain button — the first press the page ever receives.
Building an `AudioContext` before that leaves it suspended.

**Play a one-shot from the transition, not from the paint.** `render` runs as
often as it likes. The trombone sounds from `ruin()`, the reception from
`applaud()` at the moment the night resolves, and the fate is drawn in `ruin()`
for the same reason — a repaint must never re-sound or re-decide anything.

This rule was written for the trombone and then quietly broken for the fanfare,
which lived in `paintOpen`: a bare repaint of the notices played it again from
the top, three repaints played it three times. Nothing in ordinary play repaints
that screen, so it never made a sound out loud — it was waiting for the next
control that called `render`. `window.__debug.repaint()` exists to catch exactly
this: force a repaint of any resolved screen and nothing should happen.

**Never guess anybody's gender.** The roster is half women and parts are cast
freely across it, so player-facing copy uses they/them for performers. Two
separate bugs have come from this — "his own line" on Mrs. Siddons-Blake, and
"The Wexford Boy has frozen. Stay with her." Two tests grep for this now — `night.test.js` over the crisis cues, and
`notices.test.js` over the fates and the impresario copy. It has been three
separate bugs. Keep both green.

**The landing page is a curtain, and it is CSS.** No images anywhere in this
project — a photograph is one more thing to fetch on a phone signal, and the
velvet is a repeating gradient. The parting is a transition with a `setTimeout`
fallback, because a transition that never fires (backgrounded tab, some
reduced-motion implementations) would leave an invisible full-screen element
lying over the board catching every tap.

**Copy on the curtain sits over mid-red velvet, so it needs its scrim.** Warm
ink on that ground is muddy at arm's length in daylight. The card carries a
radial dark scrim behind it; do not remove it to show more of the fold.

**Ruin is measured against a whole production, and the figure is computed.**
`cheapestProduction` searches the shelf for the least a complete evening can
cost — play, smallest cast, cheapest staging, no rehearsal. The first version
compared the purse to the cheapest *work* (18g against a real floor of 29g), so
an impresario with twenty-five guineas was told they were solvent, mounted a
bill they could afford, and then could not pay anybody: not ruined, not playing,
just stuck. Never hard-code this number; it re-derives from the data.

**Check ruin before a week begins, not only after a night.** Ruin found at the
notices is a verdict; ruin found three screens into a bill that cannot be paid
for is a dead end the player walked into on our invitation.

**Backers are finite, and that is what makes ruin reachable.** Each of the three
will advance money once per season. Left unlimited, the deepest pocket (100g)
against the floor (29g) meant the player could never lose — a bottomless backer
is a bottomless season and no losing condition at all.

**Money must be borrowable at the moment the shortfall appears.** Salaries are
the larger half of the outlay, so the gap that strands a player shows up at
casting, not at the bill. Backers are offered at the bill *and* at the last
screen before the house opens.

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
