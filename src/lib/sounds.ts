// Sound utility for check-in/check-out audio feedback

class SoundPlayer {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // Success sound for check-in (ascending tones)
  playCheckIn() {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Play ascending notes for a welcoming sound
    setTimeout(() => this.playTone(523.25, 0.15, 'sine', 0.3), 0);      // C5
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.3), 100);    // E5
    setTimeout(() => this.playTone(783.99, 0.25, 'sine', 0.4), 200);    // G5
  }

  // Exit sound for check-out (descending tones)
  playCheckOut() {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Play descending notes for a farewell sound
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 0);      // G5
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.3), 100);    // E5
    setTimeout(() => this.playTone(523.25, 0.25, 'sine', 0.4), 200);    // C5
  }

  // Error sound
  playError() {
    this.playTone(200, 0.3, 'square', 0.2);
  }
}

export const soundPlayer = new SoundPlayer();
