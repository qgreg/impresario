/**
 * The house sound: a synthesised orchestra pit and a stage manager on the cans.
 *
 * Everything here is generated. There are no audio files in this project for the
 * same reason there are no images — a sound effect is one more thing to fetch on
 * a phone signal, and a fanfare is four oscillators and an envelope.
 *
 * The stage manager is `speechSynthesis`, which every browser already carries.
 * A voice calling "stand by, and — go" over a cue is the thing that makes the
 * follow spot feel like a job rather than a minigame, and it costs nothing to
 * ship.
 *
 * **Nothing is ever signalled by sound alone.** Most phone play is silent, in
 * public, so every cue is on the screen first and the audio only agrees with it.
 * Muting this loses atmosphere and no information whatever.
 */

const STORAGE_KEY = 'impresario.sound';

let ctx = null;
let master = null;
let enabled = readPreference();

/**
 * Never schedule an event at exactly `currentTime`.
 *
 * A context that has only just been resumed can report a clock a few
 * milliseconds behind where it will be by the time the event is due, and an
 * event scheduled in the past is silently dropped rather than played late.
 */
const LOOKAHEAD = 0.04;

/** Browsers refuse audio until a gesture, so the context is built on first use. */
function audio() {
  if (!enabled) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.28;   // a pit, not a rock concert
      master.connect(ctx.destination);
      claimTheSpeaker();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Tell iOS this page is playing back audio, not ringing a bell.
 *
 * Web Audio on an iPhone obeys the physical mute switch unless the page has
 * declared a playback session, and phones live on silent. Without this the
 * entire pit is inaudible on the device most of this will be played on, with no
 * error and nothing to see — which is exactly how it went unnoticed here.
 *
 * `navigator.audioSession` is iOS 16.4 and later, and absent everywhere else,
 * so this is best-effort by design.
 */
function claimTheSpeaker() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* older iOS, and every other platform, simply do not need it */ }
}

/**
 * Called from the first real gesture — the curtain button — to unlock audio.
 *
 * Resuming is asynchronous, and a suspended context reports a frozen clock: any
 * note scheduled between the gesture and the resume lands in the past and is
 * dropped. So this hands back a promise, and the first sound waits for it.
 */
export function wake() {
  const c = audio();
  if (!c) return Promise.resolve(false);
  primeTheStageManager();
  if (c.state === 'running') return Promise.resolve(true);
  return c.resume().then(() => true).catch(() => false);
}

/**
 * Speech has its own lock, and it is not the same lock.
 *
 * iOS will only speak if `speak()` has been called once inside a user gesture.
 * The stage manager's first real cue arrives in the middle of a performance,
 * which is not a gesture — so on an iPhone he would never have said a word. One
 * silent utterance from the curtain button buys him a voice for the session.
 */
let primed = false;
function primeTheStageManager() {
  if (primed || !('speechSynthesis' in window)) return;
  primed = true;
  try {
    const silence = new SpeechSynthesisUtterance('');
    silence.volume = 0;
    window.speechSynthesis.speak(silence);
  } catch { /* a silent stage manager is still a stage manager */ }
}

function readPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    // Private browsing and locked-down settings both throw on access rather
    // than returning null, and a silent game is a worse failure than a loud one.
    return true;
  }
}

export function isEnabled() {
  return enabled;
}

export function setEnabled(on) {
  enabled = !!on;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch { /* the preference simply will not persist */ }
  if (!enabled) {
    stopTalking();
    if (ctx) master.gain.value = 0;
  } else if (ctx) {
    master.gain.value = 0.28;
  } else {
    audio();
  }
  return enabled;
}

// ------------------------------------------------------------------ the pit

/** One note. `slide` bends the pitch, which is most of a trombone. */
function note(freq, at, length, { type = 'triangle', gain = 0.5, slide = null } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + LOOKAHEAD + at;

  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + length);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

  osc.connect(amp).connect(master);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

/** Filtered noise, which is what applause and a curtain rumble both are. */
function noise(at, length, { frequency = 1200, q = 0.7, gain = 0.4 } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + LOOKAHEAD + at;

  const frames = Math.floor(c.sampleRate * length);
  const buffer = c.createBuffer(1, Math.max(1, frames), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;

  const amp = c.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + length * 0.2);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

  source.connect(filter).connect(amp).connect(master);
  source.start(t0);
}

/** Brass, more or less: a sawtooth is close enough with a short envelope. */
const BRASS = { type: 'sawtooth', gain: 0.32 };

export const sfx = {
  /** The velvet going up. */
  curtain() {
    noise(0, 1.4, { frequency: 180, q: 0.4, gain: 0.22 });
    note(146.8, 0.15, 1.2, { ...BRASS, gain: 0.14 });
  },

  /** A card taken. Quiet enough to hear five hundred times. */
  tap() {
    note(760, 0, 0.05, { type: 'square', gain: 0.06 });
  },

  /** The stage manager's cue light, before a crisis. */
  cue() {
    note(1318, 0, 0.14, { type: 'sine', gain: 0.22 });
    note(1046, 0.11, 0.24, { type: 'sine', gain: 0.18 });
  },

  /** Caught it. */
  caught() {
    note(660, 0, 0.1, { type: 'triangle', gain: 0.16 });
    note(990, 0.07, 0.16, { type: 'triangle', gain: 0.14 });
  },

  /** Did not. A single flat thud, not a buzzer — nobody is being told off. */
  missed() {
    note(180, 0, 0.34, { type: 'sine', gain: 0.2, slide: 120 });
  },

  /** A triumph. Three up and a held chord. */
  fanfare() {
    note(392, 0.00, 0.18, BRASS);
    note(523, 0.16, 0.18, BRASS);
    note(659, 0.32, 0.22, BRASS);
    note(784, 0.52, 0.9, BRASS);
    note(523, 0.52, 0.9, { ...BRASS, gain: 0.2 });
    note(392, 0.52, 0.9, { ...BRASS, gain: 0.18 });
    noise(0.5, 1.6, { frequency: 2600, q: 0.5, gain: 0.14 });
  },

  /** The sad trombone. Four notes down, each one bending as it goes. */
  trombone() {
    const slides = [[311, 294], [277, 262], [247, 233], [220, 155]];
    slides.forEach(([from, to], i) => {
      note(from, i * 0.26, i === 3 ? 0.85 : 0.24, {
        type: 'sawtooth',
        gain: 0.3,
        slide: to,
      });
    });
  },

  /** A house that liked it. */
  applause(warmth = 1) {
    const length = 1.2 + warmth * 1.4;
    noise(0, length, { frequency: 1500, q: 0.4, gain: 0.1 + warmth * 0.16 });
    noise(0.08, length * 0.8, { frequency: 3200, q: 0.6, gain: 0.06 + warmth * 0.1 });
  },

  /** A house that did not. Thin, scattered, and mercifully short. */
  scattered() {
    noise(0, 0.7, { frequency: 1400, q: 1.4, gain: 0.07 });
  },
};

// ------------------------------------------------------- the stage manager

let voice = null;
let voiceChecked = false;

/**
 * The calmest voice available, because a stage manager is never flustered.
 * Voice lists load asynchronously in some browsers and are empty in others, so
 * this is best-effort and its absence is never an error.
 */
function pickVoice() {
  if (voiceChecked && voice) return voice;
  if (!('speechSynthesis' in window)) return null;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return null;
  voiceChecked = true;
  const english = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const preferred = english.find((v) => /daniel|serena|karen|google uk/i.test(v.name));
  voice = preferred ?? english[0] ?? all[0];
  return voice;
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { voiceChecked = false; pickVoice(); });
}

export function stopTalking() {
  try { window.speechSynthesis?.cancel(); } catch { /* not fatal */ }
}

/**
 * Call a cue.
 *
 * Cues are time-boxed and overlapping speech is worse than none, so a new call
 * cancels whatever is still being said. Rate is a little brisk: a stage manager
 * calling a show is not making conversation.
 */
export function call(text) {
  if (!enabled || !text) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const chosen = pickVoice();
    if (chosen) utterance.voice = chosen;
    utterance.rate = 1.12;
    utterance.pitch = 0.95;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch { /* a silent stage manager is still a stage manager */ }
}

// ------------------------------------------------------------- what to play
// Pure, so the choosing is testable even though the playing is not.

/**
 * What the house does when the notices come in.
 *
 * Money and reputation can disagree — a vulgar hit pays and shames you — so the
 * sound follows the *audience*, which is who is actually in the room making a
 * noise. The books are read out separately.
 */
export function receptionFor({ profit, mishaps, lit }) {
  if (mishaps === 0 && profit > 0) return 'fanfare';
  if (profit > 0) return 'applause';
  if (lit >= 0.6 && profit <= 0) return 'scattered';
  return 'trombone';
}

/** How warm the applause is, from 0 to 1. */
export function warmthFor({ crowd, society }) {
  const felt = Math.max(0, crowd) + Math.max(0, society);
  return Math.max(0, Math.min(1, felt / 40));
}
