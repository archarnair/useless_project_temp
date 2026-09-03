/**
 * Audio Synthesizer for Head-Tilt Flappy Bird
 * Uses Web Audio API to synthesize 8-bit sound effects without external audio files.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.neckSnapEnabled = true;
    this.initialized = false;
    this.lastFlapTime = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Flap sound when bird ascends */
  playFlap(intensity = 1) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    // Throttle flap sounds so rapid frames don't distort
    if (now - this.lastFlapTime < 180) return;
    this.lastFlapTime = now;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const startFreq = 220 + intensity * 60;
    const endFreq = 480 + intensity * 80;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Bright double chime when passing a pipe */
  playScore() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    // Note 1: E5 (659Hz)
    this.playTone(659.25, 'sine', t, 0.08, 0.25);
    // Note 2: B5 (987Hz)
    this.playTone(987.77, 'sine', t + 0.08, 0.15, 0.25);
  }

  /** Collision sound when hitting a pipe or ground */
  playHit() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Comedic cartoon neck snap / pop sound */
  playNeckSnap() {
    if (!this.enabled || !this.neckSnapEnabled || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    // Quick wooden pop / snap click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);

    // Follow-up slight resonance pop 30ms later
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(600, t2);
      osc2.frequency.exponentialRampToValueAtTime(90, t2 + 0.04);
      gain2.gain.setValueAtTime(0.25, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.04);
    }, 30);
  }

  /** Game over defeat tune */
  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const notes = [440, 415, 392, 349]; // A4, Ab4, G4, F4
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', t + idx * 0.12, 0.14, 0.2);
    });
  }

  /** Generic tone helper */
  playTone(freq, type, startTime, duration, vol = 0.2) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

// Global sound manager instance
window.gameSound = new SoundEffects();
