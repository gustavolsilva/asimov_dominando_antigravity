/**
 * Retro 8-bit Web Audio Synthesizer para Space Impact
 * Sons autênticos de buzzer / alto-falante Nokia
 */
class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isBgmPlaying = false;
    this.bgmTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.isBgmPlaying = false;
    }
    return !this.muted;
  }

  // Gera onda de pulso/quadrada clássica (Nokia buzzer)
  playTone(freq, duration, type = 'square', gainValue = 0.15) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // Disparo padrão
  shoot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // Disparo do laser especial
  laser() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Míssil perfurante
  missile() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Bomba de choque estelar
  bomb() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Síntese de ruído branco para explosão massiva
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {}
  }

  // Explosão de nave inimiga
  explosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {}
  }

  // Dano recebido pelo jogador
  hit() {
    if (this.muted) return;
    this.init();
    this.playTone(180, 0.1, 'square', 0.25);
  }

  // Coleta de item
  powerup() {
    if (this.muted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'square', 0.12);
      }, idx * 60);
    });
  }

  // Alerta de Chefe
  bossWarning() {
    if (this.muted) return;
    this.init();
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(400, 0.12, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(600, 0.15, 'sawtooth', 0.25), 130);
      }, i * 320);
    }
  }

  // Vitória na fase
  stageVictory() {
    if (this.muted) return;
    this.init();
    const fanfare = [
      { f: 523.25, d: 0.1 },
      { f: 659.25, d: 0.1 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.3 }
    ];
    let time = 0;
    fanfare.forEach(note => {
      setTimeout(() => {
        this.playTone(note.f, note.d, 'square', 0.2);
      }, time * 1000);
      time += note.d + 0.04;
    });
  }

  // Fim de Jogo
  gameOver() {
    if (this.muted) return;
    this.init();
    const notes = [440, 392, 349, 293];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.22, 'square', 0.18);
      }, idx * 180);
    });
  }

  // Toque lendário Nokia Tune (Gran Vals)
  playNokiaTune() {
    this.init();
    if (this.muted) return;

    // Notas e durações (ms) do toque clássico do Nokia 3310
    const tune = [
      { note: 1318.51, dur: 120 }, // E6
      { note: 1174.66, dur: 120 }, // D6
      { note: 739.99,  dur: 240 }, // F#5
      { note: 830.61,  dur: 240 }, // G#5
      { note: 1108.73, dur: 120 }, // C#6
      { note: 987.77,  dur: 120 }, // B5
      { note: 587.33,  dur: 240 }, // D5
      { note: 659.25,  dur: 240 }, // E5
      { note: 987.77,  dur: 120 }, // B5
      { note: 880.00,  dur: 120 }, // A5
      { note: 554.37,  dur: 240 }, // C#5
      { note: 659.25,  dur: 240 }, // E5
      { note: 880.00,  dur: 480 }  // A5
    ];

    let delay = 0;
    tune.forEach(step => {
      setTimeout(() => {
        if (!this.muted) {
          this.playTone(step.note, step.dur / 1000, 'square', 0.18);
        }
      }, delay);
      delay += step.dur + 40;
    });
  }
}

window.retroAudio = new RetroAudio();
