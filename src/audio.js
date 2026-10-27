// src/audio.js
// Retro 16-bit Web Audio Synthesizer for Kingdom of the Winds + Shadow of War SFX

export class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, duration = 0.12, type = 'square', gainVal = 0.08, slideTo = null) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  sfxSlash() {
    this.playTone(340, 0.09, 'sawtooth', 0.07, 110);
  }

  sfxHit() {
    this.playTone(150, 0.08, 'square', 0.09, 55);
  }

  sfxHellfire() {
    // Classic 바람의 나라 헬파이어 벼락/화염 사운드!
    this.playTone(520, 0.25, 'sawtooth', 0.11, 65);
    setTimeout(() => this.playTone(180, 0.32, 'triangle', 0.12, 42), 70);
  }

  sfxShadowStrike() {
    this.playTone(280, 0.14, 'sine', 0.09, 880);
    setTimeout(() => this.playTone(620, 0.1, 'sawtooth', 0.08, 180), 80);
  }

  sfxFrostNova() {
    this.playTone(680, 0.22, 'triangle', 0.08, 220);
  }

  sfxNemesisHorn() {
    // Deep Mordor / War Horn when a Captain ambushes or introduces himself
    this.playTone(110, 0.55, 'sawtooth', 0.11, 98);
    setTimeout(() => this.playTone(146.8, 0.45, 'sawtooth', 0.09, 130.8), 140);
  }

  sfxDominate() {
    // Spectral Wraith Chime ("네 영혼은 나의 것이다!")
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', 0.08), idx * 65);
    });
  }

  sfxShame() {
    [587.33, 415.3, 293.66, 196].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.22, 'sawtooth', 0.09), idx * 75);
    });
  }

  sfxLevelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.18, 'square', 0.08), idx * 80);
    });
  }
}
