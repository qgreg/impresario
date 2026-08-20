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

> **Macbeth, as a Melodrama, with a Live Horse**

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

## Starting

The page opens on a closed curtain: two halves of velvet, the title between
them, and one button. Pressing **Take the Alhambra** parts them, and the board
is already behind it — nothing loads and nothing waits.

The curtain is drawn entirely in CSS. A photograph would be one more thing to
fetch on a phone signal, and a repeating gradient makes a better velvet fold
than a JPEG at that size. Anyone who has asked their phone for less motion gets
the house without the flourish.

## The phases

A production is one sitting, about four minutes. Each phase asks a question
none of the others do — otherwise it is a menu, and menus are where mobile
games go to die.

| Phase | The question | Texture | Status |
|---|---|---|---|
| **The Bill** | What are we doing, and dare we? | Commitment, made blind | **playable** |
| **The Company** | Who can actually carry this? | Combination, fit, ego | **playable** |
| **The Production** | How do I cover what I've got? | Compensation, made informed | not built |
| **Opening Night** | It is going wrong — what now? | Improvisation, live | **playable** |
| *The Notices* | Was that hubris or genius? | *Epilogue, not a phase* | not built |

### The company

Casting asks one question the bill cannot: *who can carry **this**?*

A nineteenth-century company engaged an actor in a **line of business** —
leading, juvenile, heavy, low comedy, character — and an actor asked to play
outside it would refuse, and be within their rights to. It was a matter of
contract and of professional dignity, not of ability.

That is what casting runs on. Adjacent lines stretch to cover one another as a
courtesy: a heavy will take a lead at a push. Nobody in the leading line will
play low comedy, and asking is an insult. None of it is forbidden — it is
priced, and the price is resentment as well as money.

Utility is the safety valve. A utility player is never ideal and never out of
their line, because doing anything adequately *is* the line — so a bill can
always be filled, however badly the casting has gone.

The people who can actually do it are vain, drunk, or both, and the steady ones
are nobody the public has heard of. **Fame and talent are separate currencies**:
fame sells tickets to people who have not read a review, talent is what the
critics are counting. A famous mediocrity and an unknown genius pull the three
audiences in different directions.

Two proud performers on one bill will not share a curtain call. Three of them is
three quarrels, not one and a half. Everything a cast plants is shown plainly
while you are casting, and grows two phases later on opening night.

If a backer covered your shortfall, his string is a person: his niece is in the
company whether she can act or not, and the show cannot open until she has a
part.

### The production

The first phase you enter knowing something. The bill was committed to blind
and the cast is whoever would take the parts — by now the boy has never done
this before, the Ghost is a drunk, and two of them are not speaking.

So staging is not a quality slider. Every choice **names the kinds of trouble it
hides and the kinds it makes worse**, against the specific troubles this cast
planted, and says so on the card before you pay:

> **A Spectacle Machine** — 46g
> *Sixty feet of hydraulics. Nobody will be watching the acting.*
> Hides: The Wexford Boy has never done this before.

> **Bare Boards and One Lamp** — 2g
> *Nothing to hide behind. Everything rests on the acting.*
> Puts on show: The Wexford Boy has never done this before.

Same two problems, opposite decisions, twenty-two times the price. Exposure
costs more than the trouble was worth on its own, so bare boards on a weak cast
is a genuine gamble — and on a cast with nothing wrong with it, the same staging
is simply cheap and the critics love it.

Rehearsal is the other half, and the half that works on people rather than
scenery. A week settles the green performer; a month makes even bad casting look
deliberate; a stage manager in the wings settles the ones who quarrel and the
ones who drink. Opening cold is always free, because a player who has spent
everything must still be allowed to open.

### Opening night

The only part of the game that runs on a clock, and the part everything else
was building towards. The curtain goes up, your company is on the boards in the
dark, and you have the follow spot.

It is a shooter with the intent inverted: you aim, but you must *sustain*, and
the target is your own star. There is no miss counter because there does not
need to be one — losing somebody leaves them working in the dark where the whole
house can see it. The lamp has mass, so a snatched correction overshoots
visibly, and learning to lead gently is something the screen teaches rather than
something the score asserts.

Crises ask for one of two opposite things, which keeps the whole phase on one
thumb:

> **The Wexford Boy has frozen. Stay with them.**
> **Hector Vane is dying out there. Take the light off him.**

**A covered trouble does not happen at all.** That is what the production phase
bought — the absence of an event, not a gentler version of it. Buy the spectacle
machine and the boy who has never done this before simply never freezes. Choose
bare boards instead and he freezes with less time to save him.

The evening's own troubles are here too — the horse stopping dead centre, the
machinery jamming, a flat swinging loose — so a reckless *bill* is as dangerous
as a reckless cast, and a live horse costs something to run.

What the night hands the settlement is a count of what actually went wrong. The
dice are gone; nothing else about the settlement changed.

`/spotlight.html` is still there: the same instrument with one performer and no
consequences, for getting the feel of it.

### The notices

The epilogue, and the piece that makes the rest a game rather than a
demonstration. Without it money only ever leaves the account, an impresario who
mounts one show is broke for ever, and week two is unreachable — which reads to
a player not as losing but as being stuck.

What went wrong is what you failed to catch on the night. The board's number is
a promise the evening keeps: if it says six things will go wrong, six crises
arrive.

**The reviews describe the night that happened, not the night you planned.**
Appeal is what the house came hoping for; what it saw is that figure less the
wreckage, and the three audiences forgive at different rates — the gallery came
for a night out and will take a shambles in good part, the boxes are embarrassed
to be seen at one, the critics are paid to notice. The meters flip from the
hoped-for reading to the received one when the curtain comes down, so you watch
your expectations collapse.

**Standing is comparative.** It moves on whether you beat what a competent
production is simply expected to receive, not on absolute approval. A
respectable notice leaves it exactly where it was.

A show can make money and cost you your reputation, and a critical triumph can
still ruin you. That tension is the reason there are three audiences rather than
one score.

If you cannot afford the cheapest work on the shelf, the season ends. A broke
impresario tapping through bills they can never mount is not a loss, it is a
hang.

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
