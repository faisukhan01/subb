/**
 * Procedural WebAudio engine — zero audio files shipped.
 * All SFX are synthesized (oscillators + noise buffers) and the background
 * loop is a scheduled 8-step pattern. Lazily creates the AudioContext on the
 * first user gesture so browser autoplay policies stay happy.
 */
import type { PowerUpType } from "./types";

const NOTE = (semiFromA4: number): number => 440 * Math.pow(2, semiFromA4 / 12);

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private muted = false;

  /** Must be called from a user-gesture handler (click/tap). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);

    // 1s of white noise reused by percussive/whoosh sounds
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
  }

  dispose(): void {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }

  // ---------------------------------------------------------------- SFX

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(env).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, filterFreq: number, when = 0, sweepTo?: number): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, t0);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(env).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  coin(pitchStep = 0): void {
    this.tone(NOTE(7 + pitchStep), 0.09, "sine", 0.35);
    this.tone(NOTE(14 + pitchStep), 0.14, "sine", 0.22, 0.03);
  }

  jump(): void {
    this.noise(0.18, 0.25, 500, 0, 2200);
    this.tone(180, 0.16, "sine", 0.2, 0, 340);
  }

  land(): void {
    this.noise(0.1, 0.2, 300, 0, 140);
  }

  roll(): void {
    this.noise(0.24, 0.22, 900, 0, 260);
  }

  swoosh(): void {
    this.noise(0.12, 0.18, 1400, 0, 600);
  }

  powerup(): void {
    const base = NOTE(0);
    [0, 4, 7, 12].forEach((s, i) => this.tone(base * Math.pow(2, s / 12), 0.16, "triangle", 0.3, i * 0.07));
  }

  mission(): void {
    [12, 16, 19, 24].forEach((s, i) => this.tone(NOTE(s), 0.2, "sine", 0.3, i * 0.09));
  }

  crash(): void {
    this.noise(0.5, 0.6, 2400, 0, 160);
    this.tone(160, 0.5, "sawtooth", 0.5, 0, 42);
    this.tone(82, 0.7, "sine", 0.5, 0.03, 36);
  }

  boardBreak(): void {
    this.noise(0.3, 0.4, 1800, 0, 320);
    this.tone(320, 0.25, "square", 0.25, 0, 90);
  }

  click(): void {
    this.tone(660, 0.06, "triangle", 0.25);
  }

  gameOver(): void {
    [8, 3, -1, -6].forEach((s, i) => this.tone(NOTE(s), 0.34, "triangle", 0.32, i * 0.22));
  }

  // ---------------------------------------------------------------- Music

  startMusic(): void {
    if (!this.ctx || this.schedulerId !== null) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.schedulerId = window.setInterval(() => this.scheduleAhead(), 30);
  }

  stopMusic(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  /** 132 BPM, 8 sixteenth-steps lookahead-scheduled chiptune groove. */
  private scheduleAhead(): void {
    if (!this.ctx || !this.musicGain) return;
    const stepDur = 60 / 132 / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }

  private playStep(step: number, when: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;

    // Kick on 0/4/8/12, extra push at 14
    if (step % 4 === 0 || step === 14) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(46, when + 0.12);
      env.gain.setValueAtTime(0.9, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
      osc.connect(env).connect(this.musicGain);
      osc.start(when);
      osc.stop(when + 0.2);
    }
    // Hat on odd steps
    if (step % 2 === 1 && this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 6500;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(step % 4 === 3 ? 0.28 : 0.14, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
      src.connect(filter).connect(env).connect(this.musicGain);
      src.start(when);
      src.stop(when + 0.08);
    }
    // Bass line — A minor pentatonic-ish walk
    const bassSteps = [0, -1, 0, -1, 3, -1, 0, 5, 0, -1, 3, -1, -2, -1, 5, 7];
    const semi = bassSteps[step];
    if (semi !== -1) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(NOTE(-24 + semi), when);
      env.gain.setValueAtTime(0.16, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + dur * 1.6);
      osc.connect(env).connect(this.musicGain);
      osc.start(when);
      osc.stop(when + dur * 2);
    }
    // Sparkle lead every so often
    if (step === 6 || step === 12) {
      const lead = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      lead.type = "triangle";
      lead.frequency.setValueAtTime(NOTE(step === 6 ? 12 : 19), when);
      env.gain.setValueAtTime(0.08, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
      lead.connect(env).connect(this.musicGain);
      lead.start(when);
      lead.stop(when + 0.35);
    }
  }

  /** Sound-flavored convenience for powerup pickup jingles. */
  powerupJingle(type: PowerUpType): void {
    this.powerup();
    if (type === "jetpack") this.noise(0.4, 0.3, 900, 0.1, 2600);
  }
}
