// Starlight Drift — audio: every sound is synthesized live with WebAudio.
// No audio files are shipped; the game stays silent until the player first
// interacts, so screenshots and headless renders never need sound.

let audioContext = null;
let masterGain = null;
let muted = false;
let thrustNodes = null;

function ensureContext() {
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioContext = new Ctor();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.32;
  masterGain.connect(audioContext.destination);
  return audioContext;
}

// Call from any real user gesture (keydown / pointerdown) so the browser
// allows audio. Safe to call repeatedly; it unlocks once.
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function setMuted(value) {
  muted = Boolean(value);
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.32;
  if (muted) stopThrustHum();
}

export function isMuted() {
  return muted;
}

function tone({ frequency, endFrequency, duration, type, volume, delay = 0 }) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  const startAt = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startAt + duration);
  }
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function playPickup(comboMultiplier) {
  // Rising chime: higher combo, higher pitch — the player hears the streak.
  const base = 520 * Math.pow(1.059, Math.min(comboMultiplier, 5));
  tone({ frequency: base, endFrequency: base * 1.5, duration: 0.16, type: 'sine', volume: 0.5 });
  tone({ frequency: base * 2, duration: 0.1, type: 'triangle', volume: 0.18, delay: 0.02 });
}

export function playHit() {
  tone({ frequency: 180, endFrequency: 55, duration: 0.28, type: 'sawtooth', volume: 0.5 });
  tone({ frequency: 90, endFrequency: 40, duration: 0.22, type: 'square', volume: 0.25 });
}

export function playShield() {
  tone({ frequency: 420, endFrequency: 840, duration: 0.22, type: 'sine', volume: 0.4 });
}

export function playGateOpen() {
  tone({ frequency: 392, duration: 0.14, type: 'triangle', volume: 0.4 });
  tone({ frequency: 523, duration: 0.14, type: 'triangle', volume: 0.4, delay: 0.1 });
  tone({ frequency: 659, duration: 0.22, type: 'triangle', volume: 0.4, delay: 0.2 });
}

export function playLevelClear() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    tone({ frequency: freq, duration: 0.24, type: 'triangle', volume: 0.42, delay: i * 0.11 });
  });
}

export function playLevelStart() {
  // A short rising two-note cue when a new level begins.
  tone({ frequency: 440, duration: 0.12, type: 'triangle', volume: 0.35 });
  tone({ frequency: 660, duration: 0.18, type: 'triangle', volume: 0.35, delay: 0.1 });
}

export function playVictory() {
  [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => {
    tone({ frequency: freq, duration: 0.3, type: 'triangle', volume: 0.4, delay: i * 0.13 });
  });
}

export function playGameOver() {
  [392, 330, 262, 196].forEach((freq, i) => {
    tone({ frequency: freq, duration: 0.32, type: 'sine', volume: 0.38, delay: i * 0.16 });
  });
}

export function playClick() {
  tone({ frequency: 660, duration: 0.06, type: 'square', volume: 0.2 });
}

// A soft filtered-noise hum while thrusting. Started/stopped by the loop.
export function startThrustHum() {
  if (muted || thrustNodes) return;
  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.value = 62;
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  gain.gain.value = 0.0;
  gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.08);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  thrustNodes = { osc, gain };
}

export function stopThrustHum() {
  if (!thrustNodes) return;
  const { osc, gain } = thrustNodes;
  thrustNodes = null;
  try {
    gain.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 0.06);
    osc.stop(audioContext.currentTime + 0.1);
  } catch {
    // Context already closed; nothing to stop.
  }
}
