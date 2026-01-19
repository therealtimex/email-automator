/**
 * Sound and Haptic Manager for Email Automator
 * Uses Web Audio API to synthesize sounds without external assets.
 */

class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = false;

    constructor() {
        // Default to enabled if not explicitly set to 'false'
        const stored = localStorage.getItem('ea_sounds_enabled');
        this.enabled = stored !== 'false';
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        localStorage.setItem('ea_sounds_enabled', enabled ? 'true' : 'false');
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    private initCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Browsers require a user gesture to resume AudioContext
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    /**
     * Subtle haptic feedback for supported devices
     */
    haptic(pattern: number | number[] = 10) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Soft chime for new emails
     */
    playNotify() {
        if (!this.enabled) return;
        const ctx = this.initCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        this.haptic(10);
    }

    /**
     * Distinct tone for High Priority emails
     */
    playAlert() {
        if (!this.enabled) return;
        const ctx = this.initCtx();
        
        const playTone = (freq: number, start: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + 0.4);
        };

        playTone(660, 0); // E5
        playTone(880, 0.1); // A5
        this.haptic([20, 50, 20]);
    }

    /**
     * Soft success sound for completed actions
     */
    playSuccess() {
        if (!this.enabled) return;
        const ctx = this.initCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        this.haptic(15);
    }
}

export const sounds = new SoundManager();
