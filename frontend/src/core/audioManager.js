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
        
        // State tracking
        this.currentMusicSource = null;
        this.currentTrackId = null; // Tracks what is currently playing
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

        // Default volumes
        this.masterGain.gain.value = 1.0;
        this.musicGain.gain.value = 0.5;
        this.sfxGain.gain.value = 0.8;

        // Connect nodes
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
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

    /**
     * Crossfades into a new music track.
     */
    playMusic(key, fadeTime = 1.0) {
        if (!this.isInitialized || !this.loader) return;

        // Prevent restarting the track if it's already playing
        if (this.currentTrackId === key) {
            return;
        }

        const buffer = this.loader.get(key);

        if (!buffer) {
            console.warn(`[AudioManager] Missing Music buffer: ${key}`);
            return;
        }

        // If we are already playing a track, fade it out
        if (this.currentMusicSource) {
            this.stopMusic(fadeTime);
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

        // Update state
        this.currentMusicSource = { source, gain: localGain };
        this.currentTrackId = key; 
    }

    stopMusic(fadeTime = 1.0) {
        if (!this.currentMusicSource) return;

        const { source, gain } = this.currentMusicSource;
        
        // Fade out
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);
        
        // Stop playback after fade completes
        source.stop(this.ctx.currentTime + fadeTime);
        
        // Clear state
        this.currentMusicSource = null;
        this.currentTrackId = null;
    }
}

// Export as a singleton
export const audioManager = new AudioManager();