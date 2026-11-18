// Procedural Web Audio API Synthesizer & Contextual Haptic Feedback Engine
// Zero external MP3/WAV dependencies — 100% deterministic synthesis.

class SoundAndHapticsEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private hapticsEnabled = true;
  private stepIdx = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public syncSettings(opts: { musicEnabled: boolean; sfxEnabled: boolean; hapticsEnabled: boolean }) {
    this.musicEnabled = opts.musicEnabled;
    this.sfxEnabled = opts.sfxEnabled;
    this.hapticsEnabled = opts.hapticsEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    }
  }

  public vibrate(pattern: number | number[]) {
    if (!this.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  public startAmbientMusic() {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    // Malawian kalimba/marimba pentatonic pattern (C major / warm F-G-Am-C progression)
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const pattern = [0, 2, 4, 5, 4, 3, 2, 1, 0, 3, 5, 7, 5, 4, 2, 3];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const noteFreq = scale[pattern[this.stepIdx % pattern.length]];
      this.stepIdx++;
      this.playTone(noteFreq, 0.22, 'triangle', 0.035);
      if (this.stepIdx % 4 === 0) {
        this.playTone(noteFreq * 0.5, 0.35, 'sine', 0.03);
      }
    }, 340);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    slideToFreq?: number,
  ) {
    if (!this.sfxEnabled && type !== 'triangle') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    this.playTone(540 + (Math.random() - 0.5) * 40, 0.06, 'sine', 0.08, 720);
    this.vibrate(10);
  }

  public playPickup() {
    if (!this.sfxEnabled) return;
    this.playTone(587.33, 0.08, 'triangle', 0.12, 880);
    window.setTimeout(() => this.playTone(1046.5, 0.12, 'sine', 0.1), 55);
    this.vibrate(15);
  }

  public playStir() {
    if (!this.sfxEnabled) return;
    this.playTone(190 + Math.random() * 45, 0.09, 'sine', 0.07, 260);
  }

  public playSizzle() {
    if (!this.sfxEnabled) return;
    this.playTone(320, 0.14, 'sawtooth', 0.04, 140);
  }

  public playBoost() {
    if (!this.sfxEnabled) return;
    this.playTone(180, 0.28, 'sawtooth', 0.1, 480);
    this.vibrate([20, 15, 35]);
  }

  public playHorn() {
    if (!this.sfxEnabled) return;
    this.playTone(349.23, 0.15, 'sawtooth', 0.08);
    this.playTone(440, 0.15, 'sawtooth', 0.07);
    this.vibrate(18);
  }

  public playHit(heavy = false) {
    if (!this.sfxEnabled) return;
    this.playTone(heavy ? 110 : 180, heavy ? 0.18 : 0.1, 'square', heavy ? 0.16 : 0.1, 45);
    this.vibrate(heavy ? [35, 20, 45] : 22);
  }

  public playBlock() {
    if (!this.sfxEnabled) return;
    this.playTone(420, 0.09, 'triangle', 0.1, 280);
    this.vibrate(14);
  }

  public playJump() {
    if (!this.sfxEnabled) return;
    this.playTone(240, 0.13, 'sine', 0.09, 510);
    this.vibrate(12);
  }

  public playVictory() {
    if (!this.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      window.setTimeout(() => this.playTone(n, 0.24, 'triangle', 0.14), idx * 95);
    });
    this.vibrate([30, 40, 60]);
  }

  public playDefeat() {
    if (!this.sfxEnabled) return;
    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((n, idx) => {
      window.setTimeout(() => this.playTone(n, 0.24, 'sawtooth', 0.08), idx * 110);
    });
    this.vibrate([60, 40, 80]);
  }
}

export const soundEngine = new SoundAndHapticsEngine();
