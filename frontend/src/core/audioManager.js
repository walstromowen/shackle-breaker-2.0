/**
 * core/audioManager.js
 * Manages all game audio playback, routing, and volume control.
 * Asset loading and decoding are handled externally by AssetLoader.js.
 */
import { events } from './eventBus.js';

class AudioManager {
    constructor() {
        this.ctx = null;
        this.loader = null; // Will hold the reference to AssetLoader

        // Routing Nodes
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientGain = null; // NEW: Channel for weather/nature loops

        // State tracking
        // Music voices: every music source that is still audible (the current one, plus any that are fading out). Each voice owns its own stop timer,
        // so an old fade-out can never switch off, or forget about, a newer voice of the same track.
        this.musicVoices = new Set();
        this.currentVoice = null;
        this.currentAmbientSource = null; // NEW: Tracks active weather audio
        this.currentAmbientId = null;      // NEW
        this.isInitialized = false;

        this._unlockAudioContext = this._unlockAudioContext.bind(this);
        this._setupEventListeners();
    }

    /**
     * Link the AudioManager to your central AssetLoader.
     * @param {AssetLoader} assetLoader
     */
    init(assetLoader) {
        this.loader = assetLoader;
    }

    /**
     * Browsers block audio until the user interacts with the page.
     * We listen for the first click or keypress to unlock the AudioContext.
     */
    _unlockAudioContext() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Create routing graph: Source -> Category Gain -> Master Gain -> Destination
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain(); // NEW

        // Default volumes
        this.masterGain.gain.value = 1.0;
        this.musicGain.gain.value = 0.5;
        this.sfxGain.gain.value = 0.8;
        this.ambientGain.gain.value = 0.4; // NEW: Ambience shouldn't overpower music

        // Connect nodes
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.ambientGain.connect(this.masterGain); // NEW
        this.masterGain.connect(this.ctx.destination);

        this.isInitialized = true;
        console.log("%c[AudioManager] Web Audio API Initialized", "color: #ffaa00");

        // Cleanup unlock listeners once triggered
        window.removeEventListener('mousedown', this._unlockAudioContext);
        window.removeEventListener('keydown', this._unlockAudioContext);
    }

    _setupEventListeners() {
        // Wait for user interaction to start audio engine
        window.addEventListener('mousedown', this._unlockAudioContext);
        window.addEventListener('keydown', this._unlockAudioContext);

        // Listen for global game events to trigger audio via EventBus
        events.on('PLAY_SFX', (data) => this.playSFX(data.id, data.volume, data.pitch));
        events.on('PLAY_MUSIC', (data) => this.playMusic(data.id, data.fadeTime));
        events.on('STOP_MUSIC', (data) => this.stopMusic(data.fadeTime));

        // NEW: Event listeners for environmental audio
        events.on('PLAY_AMBIENCE', (data) => this.playAmbience(data.id, data.fadeTime));
        events.on('STOP_AMBIENCE', (data) => this.stopAmbience(data.fadeTime));
    }

    /**
     * Plays a sound effect with optional pitch shifting.
     */
    playSFX(key, volume = 1.0, pitch = 1.0) {
        if (!this.isInitialized || !this.loader) return;

        // Fetch the decoded AudioBuffer from the central AssetLoader
        const buffer = this.loader.get(key);
        if (!buffer) {
            console.warn(`[AudioManager] Missing SFX buffer: ${key}`);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Local gain node for this specific sound
        const localGain = this.ctx.createGain();
        localGain.gain.value = volume;

        // Apply pitch shift if provided (e.g., 0.9 to 1.1 for variety)
        source.playbackRate.value = pitch;

        source.connect(localGain);
        localGain.connect(this.sfxGain);

        source.start(0);
    }

    // What is playing (or fading out as the latest track), kept under the old names for anything that reads them.
    get currentTrackId() { return this.currentVoice ? this.currentVoice.id : null; }
    get currentMusicSource() { return this.currentVoice; }

    /**
     * Crossfades into a new music track. Only ever one track is the current one: anything else that is still sounding is faded out and then stopped.
     * Asking for a track that is already playing does nothing; asking for one that is fading out brings that same voice back (no second copy).
     */
    playMusic(key, fadeTime = 1.0) {
        if (!this.isInitialized || !this.loader) return;

        // 1. The track already has a voice: leave it (playing), or bring it back (fading out). Never start a second copy of it.
        for (const voice of this.musicVoices) {
            if (voice.id !== key) continue;
            for (const other of this.musicVoices) {
                if (other !== voice && !other.stopping) this._fadeOutVoice(other, fadeTime);
            }
            if (voice.stopping) this._reviveVoice(voice, fadeTime);
            this.currentVoice = voice;
            return;
        }

        // 2. A different track: everything that is sounding fades out.
        for (const voice of this.musicVoices) {
            if (!voice.stopping) this._fadeOutVoice(voice, fadeTime);
        }
        this.currentVoice = null;

        const buffer = this.loader.get(key);
        if (!buffer) {
            console.warn(`[AudioManager] Missing Music buffer: ${key}`);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const localGain = this.ctx.createGain();
        localGain.gain.value = 0; // Start at 0 for fade in

        source.connect(localGain);
        localGain.connect(this.musicGain);
        source.start(0);

        // Fade in
        localGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + fadeTime);

        const voice = { id: key, source, gain: localGain, stopping: false, stopTimeout: null };
        this.musicVoices.add(voice);
        this.currentVoice = voice;
    }

    stopMusic(fadeTime = 1.0) {
        if (!this.currentVoice) return;
        this._fadeOutVoice(this.currentVoice, fadeTime);
        // The voice stays the current one until it has faded out, so playMusic can still bring the same track back.
    }

    _fadeOutVoice(voice, fadeTime) {
        if (voice.stopping) return;
        voice.stopping = true;

        const { gain } = voice;
        gain.gain.cancelScheduledValues(this.ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);

        // setTimeout (not source.stop(time)) so the stop can be cancelled if the track is asked for again while it fades out.
        voice.stopTimeout = setTimeout(() => this._finishVoice(voice), fadeTime * 1000 + 50);
    }

    _reviveVoice(voice, fadeTime) {
        if (voice.stopTimeout) {
            clearTimeout(voice.stopTimeout);
            voice.stopTimeout = null;
        }
        voice.stopping = false;

        const { gain } = voice;
        gain.gain.cancelScheduledValues(this.ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + fadeTime);
    }

    _finishVoice(voice) {
        try { voice.source.stop(); } catch (e) {}
        try { voice.gain.disconnect(); } catch (e) {}
        voice.stopTimeout = null;
        this.musicVoices.delete(voice);
        if (this.currentVoice === voice) this.currentVoice = null;
    }

    // =========================================================
    // NEW: Ambient Audio Methods
    // =========================================================
    playAmbience(key, fadeTime = 2.0) { // Longer default fade for weather
        if (!this.isInitialized || !this.loader) return;
        if (this.currentAmbientId === key) return;

        if (this.currentAmbientSource) {
            this.stopAmbience(fadeTime);
        }

        // If 'none' or missing key is passed, we just stop the current track (handled above)
        if (!key || key === 'none') return;

        const buffer = this.loader.get(key);
        if (!buffer) {
            console.warn(`[AudioManager] Missing Ambient buffer: ${key}`);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true; // Ambient tracks should loop

        const localGain = this.ctx.createGain();
        localGain.gain.value = 0; // Start silent

        source.connect(localGain);
        localGain.connect(this.ambientGain);

        source.start(0);

        // Fade in
        localGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + fadeTime);

        this.currentAmbientSource = { source, gain: localGain };
        this.currentAmbientId = key;
    }

    stopAmbience(fadeTime = 2.0) {
        if (!this.currentAmbientSource) return;

        const { source, gain } = this.currentAmbientSource;

        // Fade out
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);

        // We capture the source in a closure so it stops the correct node
        // even if a new ambient track starts playing before the fade finishes
        const sourceToStop = source;
        setTimeout(() => {
            try {
                sourceToStop.stop();
            } catch (e) {}
        }, fadeTime * 1000);

        this.currentAmbientSource = null;
        this.currentAmbientId = null;
    }
}

// Export as a singleton
export const audioManager = new AudioManager();