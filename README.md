# Impresario

A mobile web game about mounting a season of theatre you cannot afford.

You are not an actor and you are not a director. You are the person who puts up
the money, books the house, hires the star, and stands at the back on opening
night watching it happen. Historically that person went bankrupt quite often.

No build step, no dependencies, no install. Open the page.

## The idea

The impresario's real genius was combinatorial — Diaghilev's contribution was
putting Nijinsky with Stravinsky with Picasso in one room. So the game is about
combination, not selection. You *assemble* a show:

> **Hamlet, as a Ballet, with a Live Horse**

Three axes multiply freely. Most pairings are merely odd, a few are
catastrophic, and a few are accidentally brilliant. Nobody tells you which in
advance, and the sentence you end up with is the one you repeat to someone
afterwards.

### There is no good show, only a show aimed at somebody

Three audiences want incompatible things, and every choice moves them
separately:

| | | Wants |
|---|---|---|
| ● | **The Crowd** | Fills the seats. Spectacle, laughs, a horse. |
| ◆ | **Society** | Pays for the boxes. Prestige, refinement, a name. |
| ▲ | **The Critics** | Pay for nothing. Decide your reputation. |

If the rent is due you may deliberately sell out to the Crowd and eat the
review. That is a legitimate way to survive a season.

### Volatility is the price of anything interesting

Every exciting choice raises the number of things that will go wrong once the
curtain is up. The thrilling bill is literally the dangerous one, and you watch
yourself overreach while you are doing it.

## The phases

A production is one sitting, about four minutes. Each phase asks a question
none of the others do — otherwise it is a menu, and menus are where mobile
games go to die.

| Phase | The question | Texture | Status |
|---|---|---|---|
| **The Bill** | What are we doing, and dare we? | Commitment, made blind | **playable** |
| **The Company** | Who can actually carry this? | Combination, fit, ego | not built |
| **The Production** | How do I cover what I've got? | Compensation, made informed | not built |
| **Opening Night** | It is going wrong — what now? | Improvisation, live | **toy playable** |
| *The Notices* | Was that hubris or genius? | *Epilogue, not a phase* | not built |

Being short of money never blocks you. It opens the drawer of people who will
lend it, and every one of them wants something that costs more than the money
did. That is the whole push-your-luck of the first phase, folded into the
commitment rather than sitting in a phase of its own.

### Opening night is a spotlight, not a menu

The last phase is the only real-time one, and it is a shooter with the intent
inverted: you aim, but you must *sustain* rather than hit, and the target is
your own star. Losing her leaves a circle of light on an empty patch of boards
while she acts in the dark, and everyone in the house sees it.

It scores **grace** as well as accuracy — a follow spot that technically stays
on target but jitters still looks amateur. The whole art form is about making
effort look effortless, so the light has to glide.

The spot is also an editorial decision. When two performers are lit by one beam
you choose who the audience looks at: the star who is paid for it, or the
newcomer who is, tonight, unexpectedly extraordinary.

## Running it

```sh
npm start     # python3 -m http.server 8080 — any static server works
npm test      # both suites
```

Then open `http://localhost:8080` and narrow the window to a phone's width.

`/spotlight.html` is the follow-spot toy: a bare stage, one performer, and
twenty-eight seconds of her business. It stands alone and depends on no other
phase, because it is the riskiest idea here and the only one that cannot be
settled by argument.

## Tests

Both suites run under bare Node with no dependencies.

`test/bill.test.js` checks the arithmetic of a bill, the billing line, the
backer drawer, and that all 336 legal combinations of work × treatment × hook
derive without crashing.

`test/follow.test.js` checks the lamp settles where it is sent and overshoots
when snatched, that the performer never leaves the stage or teleports, and that
the grade behaves: a jittery lamp on target as often as a calm one still grades
lower, a beautiful beam pointed at nobody grades badly, and simulated operators
of different quality receive different verdicts.

That last one earns its place. The jerk budget was first set by guess at 26; the
measured range for plausible operators turned out to be 0.22 to 1.65, so every
operator scored 0.99 and grace was decoration. The property test is what catches
that.

Only the thumb is untestable.

## Design notes

**Portrait, one thumb.** Everything tappable lives in the bottom half of the
screen. The top is for looking at.

**It works muted.** Most phone play is silent and in public. Sound decorates;
it never carries information.

**Nothing is signalled by colour alone.** Each audience has a glyph and a name
as well as a hue, and appeal is stated in words — *clamouring*, *keen*,
*curious*, *indifferent*, *cool*, *hostile* — beside every bar.

**Gaslight and velvet.** Near-black ground because a theatre is dark, and
because a dark page stays legible outdoors at full brightness, which is where
this will actually be played.

## License

MIT — see [LICENSE](LICENSE).
