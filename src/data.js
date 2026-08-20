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

/** Roles are listed by discipline so a treatment can transform them. */
export const WORKS = [
  {
    id: 'hamlet',
    title: 'Hamlet',
    cost: 40,
    appeal: { crowd: 2, society: 4, critics: 5 },
    volatility: 1,
    roles: ['Tragedian', 'Ingénue', 'Ghost', 'Comic'],
    note: 'Long, famous, and nobody can object to it.',
  },
  {
    id: 'faust',
    title: 'Faust',
    cost: 45,
    appeal: { crowd: 4, society: 4, critics: 4 },
    volatility: 2,
    roles: ['Tragedian', 'Ingénue', 'Villain', 'Chorus'],
    note: 'Damnation sells, and the trapdoor is already built.',
  },
  {
    id: 'cherry',
    title: 'The Cherry Orchard',
    cost: 30,
    appeal: { crowd: 0, society: 3, critics: 6 },
    volatility: 0,
    roles: ['Grande Dame', 'Ingénue', 'Character Man', 'Comic'],
    note: 'Nothing happens, exquisitely.',
  },
  {
    id: 'carmen',
    title: 'Carmen',
    cost: 50,
    appeal: { crowd: 5, society: 5, critics: 3 },
    volatility: 2,
    roles: ['Diva', 'Tenor', 'Villain', 'Chorus'],
    note: 'The tunes do half the work.',
  },
  {
    id: 'macbeth',
    title: 'Macbeth',
    cost: 38,
    appeal: { crowd: 3, society: 3, critics: 5 },
    volatility: 2,
    roles: ['Tragedian', 'Grande Dame', 'Villain', 'Chorus'],
    note: 'Short, bloody, and unlucky to name aloud.',
  },
  {
    id: 'barber',
    title: 'The Barber of Seville',
    cost: 42,
    appeal: { crowd: 5, society: 3, critics: 3 },
    volatility: 1,
    roles: ['Comic', 'Diva', 'Tenor', 'Character Man'],
    note: 'Reliable laughter. No one has ever been ruined by it.',
  },
  {
    id: 'medea',
    title: 'Medea',
    cost: 32,
    appeal: { crowd: 1, society: 2, critics: 7 },
    volatility: 3,
    roles: ['Grande Dame', 'Chorus', 'Character Man'],
    note: 'The critics will be thrilled. Nobody else will come.',
  },
  {
    id: 'unknown',
    title: 'A New Piece by an Unknown Hand',
    cost: 18,
    appeal: { crowd: 0, society: 0, critics: 0 },
    volatility: 5,
    roles: ['Tragedian', 'Ingénue', 'Character Man', 'Comic'],
    note: 'It might be the making of you. You have not finished reading it.',
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
    discipline: null,
    note: 'As it has always been done, which is a kind of safety.',
  },
  {
    id: 'opera',
    name: 'As a Grand Opera',
    billing: 'as a Grand Opera',
    costMult: 1.8,
    appeal: { crowd: 2, society: 4, critics: 1 },
    volatility: 2,
    discipline: 'Singer',
    note: 'Everything costs more the moment there is an orchestra.',
  },
  {
    id: 'ballet',
    name: 'As a Ballet',
    billing: 'as a Ballet',
    costMult: 1.6,
    appeal: { crowd: 1, society: 4, critics: 2 },
    volatility: 2,
    discipline: 'Dancer',
    note: 'Nobody speaks, so nobody can forget a line.',
  },
  {
    id: 'farce',
    name: 'As a Farce',
    billing: 'as a Farce',
    costMult: 0.8,
    appeal: { crowd: 5, society: -3, critics: -2 },
    volatility: 1,
    discipline: null,
    note: 'Add doors. The boxes will be appalled; the gallery will not.',
  },
  {
    id: 'melodrama',
    name: 'As a Melodrama',
    billing: 'as a Melodrama',
    costMult: 0.9,
    appeal: { crowd: 4, society: -1, critics: -3 },
    volatility: 0,
    discipline: null,
    note: 'Hiss the villain. It has never once failed to pay the rent.',
  },
  {
    id: 'modern',
    name: 'In Modern Dress',
    billing: 'in Modern Dress',
    costMult: 0.7,
    appeal: { crowd: 0, society: -2, critics: 5 },
    volatility: 3,
    discipline: null,
    note: 'Cheap, and either the future of the theatre or an insult to it.',
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
  { work: 'hamlet', treatment: 'ballet', text: 'Four hours of indecision, performed on the toes.' },
  { work: 'medea', treatment: 'farce', text: 'This will be talked about for years, one way or the other.' },
  { work: 'cherry', hook: 'machine', text: 'Sixty feet of hydraulics, for a play about a garden.' },
  { work: 'carmen', hook: 'horse', text: 'Historically, this has gone well roughly half the time.' },
  { work: 'macbeth', hook: 'water', text: 'Blood, and now also a flood.' },
  { work: 'unknown', treatment: 'opera', text: 'An unread piece, fully orchestrated. Bold.' },
  { work: 'cherry', treatment: 'melodrama', text: 'Chekhov, hissed at. The critics are sharpening something.' },
];

/**
 * The people. A performer is a bundle of talent, fame, price and trouble, and
 * the four rarely arrive together — the ones who can actually do it are vain,
 * drunk, or both, and the steady ones are nobody the public has heard of.
 *
 * `roles` is affinity, not restriction. Anyone may be cast as anything, and
 * casting a comic as a tragedian is allowed precisely because it might work.
 *
 * `temperament` is where opening night comes from. Steady performers plant
 * nothing; the rest plant seeds that the last phase will grow.
 */
export const PERFORMERS = [
  {
    id: 'vestris', name: 'Mme. Vestris', discipline: 'Singer',
    talent: 5, fame: 5, salary: 45, temperament: 'vain',
    roles: ['Diva', 'Grande Dame'],
    note: 'Magnificent, and will not be billed second to anyone living.',
  },
  {
    id: 'kean', name: 'Edmund Kean', discipline: 'Actor',
    talent: 5, fame: 4, salary: 38, temperament: 'drunk',
    roles: ['Tragedian', 'Villain'],
    note: 'Extraordinary on three nights in five. Nobody knows which three.',
  },
  {
    id: 'fenwick', name: 'Lily Fenwick', discipline: 'Actor',
    talent: 3, fame: 2, salary: 14, temperament: 'steady',
    roles: ['Ingénue'],
    note: 'Word perfect, every night, and never once late.',
  },
  {
    id: 'bellini', name: 'Signor Bellini', discipline: 'Singer',
    talent: 4, fame: 3, salary: 32, temperament: 'temperamental',
    roles: ['Tenor', 'Villain'],
    note: 'The voice is real. So is the walking out.',
  },
  {
    id: 'grimaldi', name: 'Old Grimaldi', discipline: 'Actor',
    talent: 4, fame: 3, salary: 20, temperament: 'steady',
    roles: ['Comic', 'Character Man'],
    note: 'Has made a room laugh every night for thirty years.',
  },
  {
    id: 'crow', name: 'Miss Ada Crow', discipline: 'Dancer',
    talent: 4, fame: 2, salary: 22, temperament: 'steady',
    roles: ['Ingénue', 'Chorus'],
    note: 'Trained in Milan. Says little about it.',
  },
  {
    id: 'vane', name: 'Hector Vane', discipline: 'Actor',
    talent: 3, fame: 2, salary: 16, temperament: 'vain',
    roles: ['Villain', 'Ghost'],
    note: 'Believes himself wasted in everything he is given.',
  },
  {
    id: 'siddons', name: 'Mrs. Siddons-Blake', discipline: 'Actor',
    talent: 5, fame: 4, salary: 40, temperament: 'temperamental',
    roles: ['Grande Dame', 'Diva'],
    note: 'The finest in England, and she is aware of it hourly.',
  },
  {
    id: 'marr', name: 'Josephine Marr', discipline: 'Dancer',
    talent: 5, fame: 4, salary: 42, temperament: 'vain',
    roles: ['Diva', 'Ingénue', 'Chorus'],
    note: 'The town would queue in rain to watch her cross a stage.',
  },
  {
    id: 'pike', name: 'Tom Pike', discipline: 'Actor',
    talent: 3, fame: 1, salary: 11, temperament: 'steady',
    roles: ['Character Man', 'Comic', 'Ghost'],
    note: 'Can play anything adequately and nothing memorably.',
  },
  {
    id: 'bone', name: 'Silas Bone', discipline: 'Actor',
    talent: 4, fame: 1, salary: 9, temperament: 'drunk',
    roles: ['Ghost', 'Character Man'],
    note: 'Cheap, and on his night the best thing in the house.',
  },
  {
    id: 'chorus', name: 'The Alhambra Chorus', discipline: 'Singer',
    talent: 2, fame: 0, salary: 18, temperament: 'steady',
    roles: ['Chorus'],
    note: 'Twelve of them. They come as one item.',
  },
  {
    id: 'wexford', name: 'The Wexford Boy', discipline: 'Actor',
    talent: 2, fame: 0, salary: 4, temperament: 'green',
    roles: ['Ingénue', 'Comic', 'Chorus'],
    note: 'Nineteen, and nobody has ever given him anything to do.',
  },
  // Specialists. A treatment that demands dancers demands four of them, and the
  // first draft of this roster held two — which made ballet and opera uncastable
  // and turned two of the six treatments into traps sprung on a choice made
  // blind. Scarcity of the right bodies is real and worth keeping, but it has to
  // be a money problem rather than an impossibility, so the specialists exist
  // and they are dear.
  {
    id: 'ivanov', name: 'Anton Ivanov', discipline: 'Dancer',
    talent: 4, fame: 3, salary: 36, temperament: 'temperamental',
    roles: ['Tragedian', 'Villain', 'Tenor'],
    note: 'Brought over at ruinous expense, and worth it about half the time.',
  },
  {
    id: 'lascelles', name: 'Claude Lascelles', discipline: 'Dancer',
    talent: 3, fame: 1, salary: 18, temperament: 'steady',
    roles: ['Character Man', 'Ghost', 'Villain', 'Comic'],
    note: 'Will learn anything in a week and complain about none of it.',
  },
  {
    id: 'corps', name: 'The Corps de Ballet', discipline: 'Dancer',
    talent: 2, fame: 0, salary: 24, temperament: 'steady',
    roles: ['Chorus'],
    note: 'Sixteen of them, and they must all be fed.',
  },
  {
    id: 'donati', name: 'Herr Donati', discipline: 'Singer',
    talent: 4, fame: 2, salary: 26, temperament: 'steady',
    roles: ['Tragedian', 'Character Man', 'Ghost'],
    note: 'A serious musician who has never once caused anybody trouble.',
  },
  {
    id: 'ruthven', name: 'Ruthven', discipline: 'Singer',
    talent: 3, fame: 1, salary: 15, temperament: 'drunk',
    roles: ['Villain', 'Comic', 'Ghost', 'Tenor'],
    note: 'Sings beautifully until about the interval.',
  },
  {
    id: 'niece', name: "Kaufmann's Niece", discipline: 'Actor',
    talent: 1, fame: 0, salary: 0, temperament: 'green',
    roles: [],
    note: 'She is very willing. That is the whole of it.',
    imposed: 'kaufmann',
  },
];
