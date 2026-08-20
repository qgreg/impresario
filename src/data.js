/**
 * The content the bill is assembled from.
 *
 * Three axes multiply freely: any work may be given any treatment and any hook.
 * Most combinations are merely odd; a few are catastrophic and a few are
 * accidentally brilliant, and the player is never told which in advance. That
 * freedom is the point — "Hamlet as a farce, with a live horse" is a thing the
 * player made rather than a thing chosen off a shelf, and it is the sentence
 * they will repeat to someone afterwards.
 *
 * Every entry carries the same three numbers, because there is no such thing as
 * a good show here — only a show aimed at somebody:
 *
 *   crowd    fills the seats. Wants spectacle, laughs, a horse.
 *   society  pays for the boxes. Wants prestige and a name.
 *   critics  pay for nothing and decide your reputation.
 *
 * `volatility` is how many things go wrong on opening night. It is deliberately
 * correlated with everything exciting: the thrilling bill is the dangerous one,
 * and the player must be able to watch themselves overreach while they do it.
 */

/** Roles name a dramatic function; ROLE_LINES below says who is entitled to play it. */
export const WORKS = [
  {
    id: 'hamlet', title: 'Hamlet', author: 'Shakespeare',
    cost: 40, prestige: 4,
    appeal: { crowd: 1, society: 3, critics: 3 },
    volatility: 1,
    roles: ['Tragedian', 'Ingénue', 'Ghost', 'Comic'],
    note: 'Four hours of indecision. Everybody claims to have seen it.',
  },
  {
    id: 'faust', title: 'Faust', author: 'Goethe',
    cost: 46, prestige: 4,
    appeal: { crowd: 2, society: 3, critics: 2 },
    volatility: 2,
    roles: ['Tragedian', 'Ingénue', 'Villain', 'Character Man'],
    note: 'A man sells his soul, and the pit comes for the devil.',
  },
  {
    id: 'cherry', title: 'The Cherry Orchard', author: 'Chekhov',
    cost: 30, prestige: 3,
    appeal: { crowd: -1, society: 2, critics: 4 },
    volatility: 0,
    roles: ['Grande Dame', 'Ingénue', 'Character Man', 'Comic'],
    note: 'Nothing happens, beautifully. The gallery will want its money.',
  },
  {
    id: 'macbeth', title: 'Macbeth', author: 'Shakespeare',
    cost: 38, prestige: 4,
    appeal: { crowd: 3, society: 2, critics: 3 },
    volatility: 3,
    roles: ['Tragedian', 'Grande Dame', 'Villain', 'Character Man'],
    note: 'Never say the name in the house. Somebody always does.',
  },
  {
    id: 'medea', title: 'Medea', author: 'Euripides',
    cost: 26, prestige: 5,
    appeal: { crowd: -2, society: 2, critics: 5 },
    volatility: 2,
    roles: ['Grande Dame', 'Character Woman', 'Character Man'],
    note: 'Two thousand years old and still the hardest evening in the theatre.',
  },
  {
    id: 'rivals', title: 'The Rivals', author: 'Sheridan',
    cost: 28, prestige: 2,
    appeal: { crowd: 4, society: 2, critics: 1 },
    volatility: 0,
    roles: ['Comic', 'Ingénue', 'Juvenile', 'Character Woman'],
    note: 'Mrs Malaprop alone has sold more tickets than most tragedies.',
  },
  {
    id: 'malfi', title: 'The Duchess of Malfi', author: 'Webster',
    cost: 34, prestige: 4,
    appeal: { crowd: 2, society: 1, critics: 4 },
    volatility: 3,
    roles: ['Grande Dame', 'Villain', 'Character Man', 'Juvenile'],
    note: 'A great many corpses, and one of the finest parts ever written.',
  },
  {
    id: 'unknown', title: 'A New Play', author: 'nobody has heard of him',
    cost: 18, prestige: 1,
    appeal: { crowd: 0, society: -1, critics: 2 },
    volatility: 4,
    roles: ['Tragedian', 'Ingénue', 'Character Man', 'Comic'],
    note: 'It might be the making of you. It is probably not.',
  },
];

/**
 * Treatments multiply cost rather than adding to it, so an ambitious treatment
 * on an expensive work compounds — which is exactly how a season is lost.
 */
export const TREATMENTS = [
  {
    id: 'grand-manner',
    name: 'In the Grand Manner',
    billing: 'in the Grand Manner',
    costMult: 1.0,
    appeal: { crowd: 0, society: 2, critics: 1 },
    volatility: 0,
    note: 'As it has always been done, which is a kind of safety.',
  },
  {
    id: 'farce',
    name: 'As a Farce',
    billing: 'as a Farce',
    costMult: 0.8,
    appeal: { crowd: 5, society: -3, critics: -2 },
    volatility: 1,
    adds: 'Comic',
    note: 'Add doors, and a second comic to go through them.',
  },
  {
    id: 'melodrama',
    name: 'As a Melodrama',
    billing: 'as a Melodrama',
    costMult: 0.9,
    appeal: { crowd: 4, society: -1, critics: -3 },
    volatility: 0,
    adds: 'Villain',
    note: 'Hiss the villain. It has never once failed to pay the rent.',
  },
  {
    id: 'modern',
    name: 'In Modern Dress',
    billing: 'in Modern Dress',
    costMult: 0.7,
    appeal: { crowd: 0, society: -2, critics: 5 },
    volatility: 3,
    note: 'Cheap, and either the future of the theatre or an insult to it.',
  },
  {
    id: 'cut',
    name: 'Cut to Ninety Minutes',
    billing: 'Cut to Ninety Minutes',
    costMult: 0.65,
    appeal: { crowd: 4, society: 0, critics: -4 },
    volatility: -1,
    cuts: 1,
    note: 'A whole part goes. The gallery can catch the last omnibus.',
  },
  {
    id: 'verse',
    name: 'Restored to the Full Text',
    billing: 'Restored to the Full Text',
    costMult: 1.4,
    appeal: { crowd: -3, society: 3, critics: 5 },
    volatility: 1,
    adds: 'Character Man',
    note: 'Every line the author wrote, including the ones cut for good reason.',
  },
];

/**
 * The hook is the thing that sells the ticket to somebody who was not going to
 * come. It is always the most volatile choice on the screen, and "no hook" is
 * always free and always available — a player must be allowed to be sensible.
 */
export const HOOKS = [
  {
    id: 'none',
    name: 'No Hook',
    billing: null,
    cost: 0,
    appeal: { crowd: 0, society: 0, critics: 0 },
    volatility: 0,
    note: 'Let the work speak. It rarely speaks loudly enough.',
  },
  {
    id: 'horse',
    name: 'A Live Horse',
    billing: 'with a Live Horse',
    cost: 15,
    appeal: { crowd: 5, society: 0, critics: -2 },
    volatility: 3,
    note: 'It has done this before. That is not the same as being trained.',
  },
  {
    id: 'scandal',
    name: 'A Scandalous Star',
    billing: 'featuring a Scandalous Star',
    cost: 30,
    appeal: { crowd: 4, society: 3, critics: 0 },
    volatility: 3,
    note: 'Everyone disapproves, and everyone buys a ticket.',
  },
  {
    id: 'machine',
    name: 'The Great Machine',
    billing: 'with the Great Machine',
    cost: 35,
    appeal: { crowd: 6, society: 1, critics: -1 },
    volatility: 3,
    note: 'Sixty feet of hydraulics. It works perfectly in rehearsal.',
  },
  {
    id: 'water',
    name: 'Real Water on Stage',
    billing: 'with Real Water on Stage',
    cost: 25,
    appeal: { crowd: 5, society: -1, critics: 0 },
    volatility: 4,
    note: 'Four tons of it, above the heads of the front stalls.',
  },
  {
    id: 'feud',
    name: 'A Famous Feud, Made Public',
    billing: 'and a Famous Feud',
    cost: 5,
    appeal: { crowd: 4, society: -2, critics: 1 },
    volatility: 2,
    note: 'Cheapest publicity there is. They will not share a curtain call.',
  },
  {
    id: 'prodigy',
    name: 'A Child Prodigy',
    billing: 'introducing a Child Prodigy',
    cost: 20,
    appeal: { crowd: 3, society: 4, critics: 0 },
    volatility: 2,
    note: 'Nine years old. The mother comes too, and she has opinions.',
  },
];

/**
 * Backers are how an overreaching bill gets mounted anyway. Every one of them
 * wants something that will cost more than the money did — which is the whole
 * push-your-luck of the phase, folded into the commitment rather than sitting
 * in a phase of its own.
 */
export const BACKERS = [
  {
    id: 'kaufmann',
    name: 'Herr Kaufmann',
    offers: 40,
    string: 'His niece plays the Ingénue.',
  },
  {
    id: 'widow',
    name: 'The Widow Ashcombe',
    offers: 60,
    string: 'She takes six-tenths of the house.',
  },
  {
    id: 'syndicate',
    name: 'The Syndicate',
    offers: 100,
    string: 'Repayable in full on the Saturday, whatever the notices say.',
  },
];

/**
 * Authored reactions to combinations worth remarking on. Free multiplication
 * gives the player the absurd pairings; these give the game an opinion about a
 * handful of them, which is what makes the freedom feel noticed rather than
 * merely permitted. Anything not listed here simply passes without comment.
 */
export const REMARKS = [
  { work: 'hamlet', treatment: 'farce', text: 'The Prince of Denmark, with doors.' },
  { work: 'hamlet', treatment: 'cut', text: 'Ninety minutes of indecision. A kind of mercy.' },
  { work: 'medea', treatment: 'farce', text: 'This will be talked about for years, one way or the other.' },
  { work: 'medea', treatment: 'modern', text: 'Euripides in a lounge suit. Somebody will faint.' },
  { work: 'cherry', hook: 'machine', text: 'Sixty feet of hydraulics, for a play about a garden.' },
  { work: 'cherry', treatment: 'melodrama', text: 'Chekhov, hissed at. The critics are sharpening something.' },
  { work: 'macbeth', hook: 'water', text: 'Blood, and now also a flood.' },
  { work: 'macbeth', treatment: 'verse', text: 'Every witch restored. It will be a long evening.' },
  { work: 'rivals', treatment: 'grand-manner', text: 'Sheridan, played as though it were Sophocles.' },
  { work: 'malfi', hook: 'horse', text: 'Webster has corpses enough without adding livestock.' },
  { work: 'unknown', treatment: 'verse', text: 'An unread play, uncut. Bold is one word for it.' },
];

/**
 * The people. A performer is a bundle of talent, fame, price and trouble, and
 * the four rarely arrive together — the ones who can actually do it are vain,
 * drunk, or both, and the steady ones are nobody the public has heard of.
 *
 * `line` is the line of business they are engaged in — see LINES below. It is a
 * matter of contract and pride rather than ability, so casting out of line is
 * always permitted and always resented.
 *
 * `temperament` is where opening night comes from. Steady performers plant
 * nothing; the rest plant seeds that the last phase will grow.
 */
export const PERFORMERS = [
  // --- the leading line ------------------------------------------------------
  {
    id: 'vestris', name: 'Mme. Vestris', line: 'Leading',
    talent: 5, fame: 5, salary: 45, temperament: 'vain',
    note: 'Magnificent, and will not be billed second to anyone living.',
  },
  {
    id: 'kean', name: 'Edmund Kean', line: 'Leading',
    talent: 5, fame: 4, salary: 38, temperament: 'drunk',
    note: 'Extraordinary on three nights in five. Nobody knows which three.',
  },
  {
    id: 'siddons', name: 'Mrs. Siddons-Blake', line: 'Leading',
    talent: 5, fame: 4, salary: 40, temperament: 'temperamental',
    note: 'The finest in England, and she is aware of it hourly.',
  },
  {
    id: 'crewe', name: 'Barnaby Crewe', line: 'Leading',
    talent: 3, fame: 3, salary: 28, temperament: 'vain',
    note: 'A magnificent profile attached to an ordinary actor.',
  },

  // --- the juvenile line -----------------------------------------------------
  {
    id: 'fenwick', name: 'Lily Fenwick', line: 'Juvenile',
    talent: 3, fame: 2, salary: 14, temperament: 'steady',
    note: 'Word perfect, every night, and never once late.',
  },
  {
    id: 'marsh', name: 'Kitty Marsh', line: 'Juvenile',
    talent: 4, fame: 2, salary: 20, temperament: 'steady',
    note: 'Better than the parts she is given, and everyone knows it but her.',
  },
  {
    id: 'wexford', name: 'The Wexford Boy', line: 'Juvenile',
    talent: 2, fame: 0, salary: 4, temperament: 'green',
    note: 'Nineteen, and nobody has ever given him anything to do.',
  },

  // --- the heavies -----------------------------------------------------------
  {
    id: 'vane', name: 'Hector Vane', line: 'Heavy',
    talent: 3, fame: 2, salary: 16, temperament: 'vain',
    note: 'Believes himself wasted in everything he is given.',
  },
  {
    id: 'flint', name: 'Josiah Flint', line: 'Heavy',
    talent: 4, fame: 2, salary: 24, temperament: 'temperamental',
    note: 'Genuinely frightening, and difficult about it in rehearsal.',
  },

  // --- the comedians ---------------------------------------------------------
  {
    id: 'grimaldi', name: 'Old Grimaldi', line: 'Comedian',
    talent: 4, fame: 3, salary: 20, temperament: 'steady',
    note: 'Has made a room laugh every night for thirty years.',
  },
  {
    id: 'tunley', name: 'Sam Tunley', line: 'Comedian',
    talent: 3, fame: 1, salary: 12, temperament: 'drunk',
    note: 'Very funny, and funnier still by the second interval.',
  },

  // --- the character line ----------------------------------------------------
  {
    id: 'pike', name: 'Tom Pike', line: 'Character',
    talent: 3, fame: 1, salary: 11, temperament: 'steady',
    note: 'Can play anything adequately and nothing memorably.',
  },
  {
    id: 'bone', name: 'Silas Bone', line: 'Character',
    talent: 4, fame: 1, salary: 9, temperament: 'drunk',
    note: 'Cheap, and on his night the best thing in the house.',
  },
  {
    id: 'enderby', name: 'Mrs. Enderby', line: 'Character',
    talent: 4, fame: 2, salary: 22, temperament: 'steady',
    note: 'Thirty years of aunts, landladies and nurses, every one of them true.',
  },

  // --- utility ---------------------------------------------------------------
  // The safety valve. A utility player is never ideal and never out of their
  // line, because doing anything adequately *is* the line — which means a bill
  // can always be filled, however badly the casting has gone.
  {
    id: 'rowe', name: 'Jack Rowe', line: 'Utility',
    talent: 2, fame: 0, salary: 6, temperament: 'steady',
    note: 'Has been in everything and been noticed in nothing.',
  },
  {
    id: 'niece', name: "Kaufmann's Niece", line: 'Utility',
    talent: 1, fame: 0, salary: 0, temperament: 'green',
    note: 'She is very willing. That is the whole of it.',
    imposed: 'kaufmann',
  },
];

/**
 * The lines of business.
 *
 * A nineteenth-century company engaged an actor in a *line* — leading, juvenile,
 * heavy, low comedy, character — and an actor asked to play outside it would
 * refuse, and be within their rights to. It was a matter of contract and of
 * professional dignity, not of ability.
 *
 * That is the constraint casting runs on. It replaced a cruder one: disciplines,
 * where a treatment could demand singers or dancers. Narrowing the game to
 * spoken theatre took that away, and lines are the better mechanic anyway —
 * they are about pride rather than physical impossibility, which is the kind of
 * problem an impresario actually has.
 */
export const LINES = ['Leading', 'Juvenile', 'Heavy', 'Comedian', 'Character', 'Utility'];

/** Which line a part belongs to. */
export const ROLE_LINES = {
  'Tragedian': 'Leading',
  'Grande Dame': 'Leading',
  'Ingénue': 'Juvenile',
  'Juvenile': 'Juvenile',
  'Villain': 'Heavy',
  'Comic': 'Comedian',
  'Character Man': 'Character',
  'Character Woman': 'Character',
  'Ghost': 'Character',
};

/**
 * Which lines will stretch to cover which. Adjacency is a professional
 * courtesy — a heavy will take a lead at a push, and a leading man will
 * condescend to a heavy. Nobody in the leading line will play low comedy.
 *
 * Utility reaches everything, which is what makes it utility.
 */
export const ADJACENT = {
  Leading: ['Juvenile', 'Heavy'],
  Juvenile: ['Leading', 'Comedian'],
  Heavy: ['Leading', 'Character'],
  Comedian: ['Juvenile', 'Character'],
  Character: ['Heavy', 'Comedian'],
  Utility: ['Leading', 'Juvenile', 'Heavy', 'Comedian', 'Character'],
};

/**
 * The staging: what the audience is actually looking at.
 *
 * This is the first choice the player makes with real information. The bill was
 * committed to blind and the cast is whoever would take the parts — by now the
 * niece cannot act, the Ghost is a drunk who may be extraordinary, and two of
 * them are not speaking. Staging is the chance to do something about it.
 *
 * `covers` names the kinds of trouble this staging hides. `exposes` names the
 * kinds it makes worse. A spectacle keeps the audience's eye off a weak
 * performer; bare boards and one lamp put every fault directly in front of
 * them, and every virtue too.
 */
export const STAGINGS = [
  {
    id: 'store',
    name: 'Flats from the Store',
    cost: 6,
    appeal: { crowd: -1, society: -1, critics: 0 },
    volatility: 0,
    covers: [],
    exposes: [],
    note: 'The same forest we used in March. Nobody will remember.',
  },
  {
    id: 'built',
    name: 'A Set Built for It',
    cost: 22,
    appeal: { crowd: 2, society: 2, critics: 1 },
    volatility: 0,
    covers: [],
    exposes: [],
    note: 'Solid, handsome, and it will not fall over.',
  },
  {
    id: 'machine',
    name: 'A Spectacle Machine',
    cost: 46,
    appeal: { crowd: 6, society: 0, critics: -2 },
    volatility: 2,
    covers: ['miscast', 'green'],
    exposes: [],
    note: 'Sixty feet of hydraulics. Nobody will be watching the acting.',
  },
  {
    id: 'stark',
    name: 'Bare Boards and One Lamp',
    cost: 2,
    appeal: { crowd: -3, society: 0, critics: 5 },
    volatility: -1,
    covers: [],
    exposes: ['miscast', 'green'],
    note: 'Nothing to hide behind. Everything rests on the acting.',
  },
  {
    id: 'painter',
    name: 'A Famous Painter Designs It',
    cost: 52,
    appeal: { crowd: 1, society: 6, critics: 3 },
    volatility: 1,
    covers: [],
    exposes: [],
    note: 'The boxes will come to see the curtain. This has bankrupted better men.',
  },
];

/**
 * The preparation: how ready the thing actually is.
 *
 * Rehearsal is the other half of compensation, and the half that works on
 * people rather than on scenery. Time settles a green performer; a firm hand in
 * the wings settles the ones who quarrel and the ones who drink.
 *
 * Opening cold is always available and always free, because a player who has
 * spent everything must still be allowed to open.
 */
export const PREPARATIONS = [
  {
    id: 'cold',
    name: 'Open Cold',
    cost: 0,
    appeal: { crowd: 0, society: 0, critics: -1 },
    volatility: 3,
    covers: [],
    note: 'They have read it. Most of them.',
  },
  {
    id: 'week',
    name: 'A Week of Rehearsal',
    cost: 14,
    appeal: { crowd: 0, society: 0, critics: 1 },
    volatility: -2,
    covers: ['green'],
    note: 'Enough to get the moves right and the nerves down.',
  },
  {
    id: 'month',
    name: 'A Month of Rehearsal',
    cost: 38,
    appeal: { crowd: 1, society: 1, critics: 3 },
    volatility: -4,
    covers: ['green', 'miscast'],
    note: 'Long enough that even the wrong casting starts to look deliberate.',
  },
  {
    id: 'manager',
    name: 'Engage a Stage Manager',
    cost: 20,
    appeal: { crowd: 0, society: 0, critics: 0 },
    volatility: -1,
    covers: ['feud', 'drink'],
    note: 'Somebody in the wings who is not frightened of any of them.',
  },
];

/**
 * Who you are.
 *
 * A difficulty selector that does not announce itself as one. Each of these is
 * a different amount of money and a different problem, and the problem is the
 * interesting half: the heir has a purse and no standing, the actor-manager has
 * standing and no purse, and the absconder has neither and only one friend left
 * in London.
 *
 * `backers` narrows who in town will still take a meeting. Omitted means all of
 * them.
 */
export const IMPRESARIOS = [
  {
    id: 'clerk',
    name: 'The Clerk',
    epithet: 'eleven years at the Board of Trade',
    capital: 120,
    reputation: 0,
    blurb: 'A drawer of plays nobody has read and a savings book you have just emptied. Nobody in the theatre has heard of you, which is at least a clean sheet.',
  },
  {
    id: 'heir',
    name: 'The Soap Heir',
    epithet: 'money, and no notion what to do with it',
    capital: 210,
    reputation: -2,
    blurb: 'Your father made a fortune in soap and you intend to lose it in the theatre. The profession knows exactly what you are and has already decided.',
  },
  {
    id: 'player',
    name: 'The Actor-Manager',
    epithet: 'thirty years of magnificent notices',
    capital: 85,
    reputation: 5,
    blurb: 'You have played Hamlet in every town with a gas supply. The reviews were superb and the accounts were somebody else’s problem, until now.',
  },
  {
    id: 'absconder',
    name: 'The Absconder',
    epithet: 'three seasons, three countries',
    capital: 55,
    reputation: -4,
    backers: ['syndicate'],
    blurb: 'You have done this before. Twice it ended in court and once it ended at a quayside. Only the Syndicate will still take your call, and they are not sentimental.',
  },
];

/**
 * How it ends.
 *
 * Ruin was one card that said the same thing every time, which made losing feel
 * like a wall rather than an ending. These are chosen by *how* the season went
 * wherever the circumstances say something — a celebrated pauper and a notorious
 * one deserve different obituaries — and drawn from the general pool otherwise.
 *
 * `when` is a predicate over the season. The first match wins, so the specific
 * ones are listed first.
 */
// The player's gender is never established and never guessed at — see the
// impresarios above, who are a Clerk and an Heir rather than a man or a woman.
// A test greps this table for pronouns.
export const FATES = [
  {
    id: 'quayside',
    when: ({ impresario }) => impresario === 'absconder',
    headline: 'A fourth country',
    text: 'You have heard Lisbon is pleasant, and that they do not get the English papers there until Thursday.',
  },
  {
    id: 'soap',
    when: ({ impresario }) => impresario === 'heir',
    headline: 'Your father’s soap',
    text: 'It took eleven years to make and rather less than one to spend. There is talk of putting you back in the works.',
  },
  {
    id: 'boards',
    when: ({ impresario }) => impresario === 'player',
    headline: 'Back to the boards',
    text: 'There is always work for somebody who can still do the soliloquy. Rather less for one who tried to do the accounts.',
  },
  {
    id: 'syndicate',
    when: ({ backersSpent }) => backersSpent.includes('syndicate'),
    headline: 'The Syndicate has sent somebody',
    text: 'They are waiting in the alley by the scene dock. They have not read the notices and do not intend to.',
  },
  {
    id: 'celebrated',
    when: ({ standing }) => standing >= 9,
    headline: 'Celebrated, and penniless',
    text: 'The critics will mourn you at length on Thursday. You will read it in a room you cannot pay for.',
  },
  {
    id: 'notorious',
    when: ({ standing }) => standing <= -4,
    headline: 'Notorious, and penniless',
    text: 'Nobody will say your name aloud any more, which saves the trouble of a farewell.',
  },
  {
    id: 'brief',
    when: ({ weeks }) => weeks <= 1,
    headline: 'A record, of a kind',
    text: 'One week. The Alhambra has stood dark longer than that between pantomimes.',
  },
  {
    id: 'longrun',
    when: ({ weeks }) => weeks >= 8,
    headline: 'A good long run',
    text: 'Eight weeks is more than most manage. The Alhambra has swallowed better in three.',
  },

  // The general pool. Nothing in the season points anywhere in particular, so
  // the town simply closes over you.
  {
    id: 'warehouse',
    headline: 'The Alhambra is to be a furniture warehouse',
    text: 'The new tenant says the acoustics are wasted on wardrobes, and takes it anyway.',
  },
  {
    id: 'glasses',
    headline: 'Opera glasses, tuppence the pair',
    text: 'You are last seen selling them on the pavement outside a theatre you used to own.',
  },
  {
    id: 'wolverhampton',
    headline: 'There is a position going in Wolverhampton',
    text: 'A circus wants somebody who can handle temperamental performers. They have heard you are qualified.',
  },
  {
    id: 'mailcoach',
    headline: 'The northern mail leaves at six',
    text: 'You are on it, with one trunk and a promptbook, and are not heard of in London again.',
  },
];
