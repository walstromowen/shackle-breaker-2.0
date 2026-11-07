/**
 * engine/audioManager.js
 * Manages all game audio playback, routing, and volume control.
 * Asset loading and decoding are handled externally by AssetLoader.js.
 */
import { events } from '../../../shared/core/eventBus.js';

// ---------------------------------------------------------------------------------------------------------------------------
// VOLUME SETTINGS (the Settings screen) -- each channel has a slider from 0 to 1, kept in localStorage (per browser, not per account).
// The channel's real gain is slider * max. The defaults are chosen so the mix sounds like the game always did before there were sliders.
// ---------------------------------------------------------------------------------------------------------------------------
const SETTINGS_KEY = 'shackle-breaker:audio';
export const AUDIO_CHANNELS = {
    master:  { label: 'Master',   max: 1.0, default: 1.0 },
    music:   { label: 'Music',    max: 1.0, default: 0.5 },   // 0.5 gain
    sfx:     { label: 'Effects',  max: 1.6, default: 0.5 },   // 0.8 gain (battle cries, attacks, interface sounds)
    ambient: { label: 'Ambience', max: 0.8, default: 0.5 },   // 0.4 gain (weather and nature loops)
    voice:   { label: 'Voices',   max: 1.4, default: 0.6 }    // 0.84 gain (the recorded encounter lines: assets/audio/voice, tools/voice)
};
const VOICE_DIR = './assets/audio/voice/';
const VOICE_DUCK = 0.55;   // the music while someone speaks (a share of its own level)

// ---------------------------------------------------------------------------------------------------------------------------
// LOUDNESS MATCHING for sound effects. The sound files were recorded at very different levels (a Panzerkamfer cry is 18 dB louder than a
// Cave Spider's, and most effects peak above full scale), so every effect is measured once, when it is first played, and turned to
// the same loudness: SFX_TARGET_RMS (the average level of its audible part, as a fraction of full scale). The turn-up is limited so a
// quiet sound (a hover tick) stays quiet, and no sound is made to clip.
// ---------------------------------------------------------------------------------------------------------------------------
const SFX_TARGET_RMS = 0.18;        // about -15 dBFS: a little above the music (music sits near -13 dBFS before its own, lower, gain)
const SFX_MAX_BOOST = 1.5;
const SFX_MAX_BOOST_CRY = 3.0;      // a quiet battle cry may be turned up further: they are the sounds that must sit evenly in a fight
const SFX_MAX_CUT = 0.2;
const SFX_PEAK_CEILING = 0.95;

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

        this.settings = this._loadSettings();
        this._sfxNormalization = new WeakMap();   // AudioBuffer -> its loudness-matching gain

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

        // Volumes: from the Settings screen's sliders (the defaults reproduce the original mix)
        this._applySettings(false);

        // Connect nodes
        this.voiceGain = this.ctx.createGain();
        this.musicDuck = this.ctx.createGain();   // the music dips under a voice (playVoice), on top of its own slider
        this.musicGain.connect(this.musicDuck);
        this.musicDuck.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.ambientGain.connect(this.masterGain); // NEW
        this.masterGain.connect(this.ctx.destination);

        this.isInitialized = true;
        console.log("%c[AudioManager] Web Audio API Initialized", "color: #ffaa00");
        this.voiceManifest();   // the recorded lines' index, ready before the first encounter

        // Cleanup unlock listeners once triggered
        window.removeEventListener('mousedown', this._unlockAudioContext);
        window.removeEventListener('keydown', this._unlockAudioContext);
    }

    _setupEventListeners() {
        // Wait for user interaction to start audio engine (no window outside a browser: the tests load the screens that use this)
        if (typeof window === 'undefined') return;
        window.addEventListener('mousedown', this._unlockAudioContext);
        window.addEventListener('keydown', this._unlockAudioContext);

        // Listen for global game events to trigger audio via EventBus
        events.on('PLAY_SFX', (data) => this.playSFX(data.id, data.volume, data.pitch));
        events.on('PLAY_MUSIC', (data) => this.playMusic(data.id, data.fadeTime));
        events.on('STOP_MUSIC', (data) => this.stopMusic(data.fadeTime));

        // NEW: Event listeners for environmental audio
        events.on('PLAY_AMBIENCE', (data) => this.playAmbience(data.id, data.fadeTime, data.volume));
        events.on('STOP_AMBIENCE', (data) => this.stopAmbience(data.fadeTime));
    }

    // ========================================================
    // VOLUME SETTINGS
    // ========================================================
    _loadSettings() {
        const settings = {};
        for (const [channel, def] of Object.entries(AUDIO_CHANNELS)) settings[channel] = def.default;
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (saved && typeof saved === 'object') {
                for (const channel of Object.keys(settings)) {
                    const v = Number(saved[channel]);
                    if (Number.isFinite(v)) settings[channel] = Math.max(0, Math.min(1, v));
                }
            }
        } catch (e) { /* no storage, or damaged: the defaults it is */ }
        return settings;
    }

    _saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* storage blocked: the change lasts until the page closes */ }
    }

    /** The channel's slider, 0 to 1. */
    getVolume(channel) {
        return this.settings[channel] ?? 0;
    }

    /** Moves a channel's slider (0 to 1). Takes effect at once, even for the music that is already playing, and is remembered. */
    setVolume(channel, value) {
        if (!AUDIO_CHANNELS[channel]) return;
        this.settings[channel] = Math.max(0, Math.min(1, Number(value) || 0));
        this._applySettings(true);
        this._saveSettings();
    }

    resetVolumes() {
        for (const [channel, def] of Object.entries(AUDIO_CHANNELS)) this.settings[channel] = def.default;
        this._applySettings(true);
        this._saveSettings();
    }

    _applySettings(smooth) {
        if (!this.ctx) return;
        const nodes = { master: this.masterGain, music: this.musicGain, sfx: this.sfxGain, ambient: this.ambientGain, voice: this.voiceGain };
        const now = this.ctx.currentTime;
        for (const [channel, node] of Object.entries(nodes)) {
            if (!node) continue;
            const target = this.settings[channel] * AUDIO_CHANNELS[channel].max;
            node.gain.cancelScheduledValues(now);
            if (smooth) {                       // a short ramp: no click when a slider is dragged
                node.gain.setValueAtTime(node.gain.value, now);
                node.gain.linearRampToValueAtTime(target, now + 0.05);
            } else {
                node.gain.value = target;
            }
        }
    }

    /** The gain that brings this effect to the common loudness (measured once per sound, then remembered). */
    _sfxNormalizationFor(buffer, id = '') {
        let gain = this._sfxNormalization.get(buffer);
        if (gain !== undefined) return gain;

        gain = 1;
        try {
            let sumSquares = 0, counted = 0, peak = 0;
            for (let c = 0; c < buffer.numberOfChannels; c++) {
                const data = buffer.getChannelData(c);
                for (let i = 0; i < data.length; i++) {
                    const a = Math.abs(data[i]);
                    if (a > peak) peak = a;
                    if (c === 0 && a > 0.02) { sumSquares += a * a; counted++; }   // the audible part only: silence would drag the average down
                }
            }
            if (counted > 0) {
                const rms = Math.sqrt(sumSquares / counted);
                gain = Math.max(SFX_MAX_CUT, Math.min(/Cry$/.test(id) ? SFX_MAX_BOOST_CRY : SFX_MAX_BOOST, SFX_TARGET_RMS / rms));
                if (peak > 0) gain = Math.min(gain, SFX_PEAK_CEILING / peak);
            }
        } catch (e) { gain = 1; }

        this._sfxNormalization.set(buffer, gain);
        return gain;
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
        localGain.gain.value = volume * this._sfxNormalizationFor(buffer, key);

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
    /* volume: 0..1 of the ambience bus (default 1). Asking again for the track that is already playing only eases it to the new volume. */
    playAmbience(key, fadeTime = 2.0, volume = 1.0) { // Longer default fade for weather
        if (!this.isInitialized || !this.loader) return;
        const vol = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1.0;
        if (this.currentAmbientId === key) {
            if (this.currentAmbientSource && this.currentAmbientVolume !== vol) {
                const g = this.currentAmbientSource.gain.gain;
                g.setValueAtTime(g.value, this.ctx.currentTime);
                g.linearRampToValueAtTime(vol, this.ctx.currentTime + Math.max(0.05, fadeTime));
                this.currentAmbientVolume = vol;
            }
            return;
        }

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
        localGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + fadeTime);

        this.currentAmbientSource = { source, gain: localGain };
        this.currentAmbientId = key;
        this.currentAmbientVolume = vol;
    }

    // ========================================================
    // VOICE (recorded encounter lines)
    // ========================================================
    /** The voice manifest (line key -> clip file), loaded once; {} until it arrives or when there is none. */
    voiceManifest() {
        if (!this._voiceManifestPromise) {
            this._voiceManifest = {};
            this._voiceManifestPromise = fetch(VOICE_DIR + 'manifest.json')
                .then(r => (r.ok ? r.json() : {}))
                .then(m => { this._voiceManifest = m || {}; return this._voiceManifest; })
                .catch(() => this._voiceManifest);
        }
        return this._voiceManifest;
    }

    async _voiceBuffer(file) {
        if (!this._voiceBuffers) this._voiceBuffers = new Map();
        if (!this._voiceBuffers.has(file)) {
            this._voiceBuffers.set(file, fetch(VOICE_DIR + file).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).catch(() => null));
        }
        return this._voiceBuffers.get(file);
    }

    /** Loads clips ahead of time (an encounter's lines when it starts), so the first words are not late. */
    preloadVoice(files) {
        if (!this.isInitialized) return;
        for (const f of files) this._voiceBuffer(f);
    }

    /** Plays one stage's lines in order: items are { file } (a clip) or { pause: seconds }. Stops whatever voice was playing first. */
    async playVoice(items) {
        this.stopVoice();
        if (!this.isInitialized || !items || !items.length) return;
        const token = this._voiceToken = (this._voiceToken || 0) + 1;
        this._duck(true);
        try {
            for (const item of items) {
                if (token !== this._voiceToken) return;
                if (item.pause) { await new Promise(r => setTimeout(r, item.pause * 1000)); continue; }
                const buffer = await this._voiceBuffer(item.file);
                if (!buffer || token !== this._voiceToken) continue;
                await new Promise((resolve) => {
                    const src = this.ctx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(this.voiceGain);
                    src.onended = resolve;
                    this._voiceSource = src;
                    src.start();
                });
            }
        } finally {
            if (token === this._voiceToken) { this._voiceSource = null; this._duck(false); }
        }
    }

    /** Stops the voice at once (the stage changed, the encounter ended). */
    stopVoice() {
        this._voiceToken = (this._voiceToken || 0) + 1;
        if (this._voiceSource) { try { this._voiceSource.stop(); } catch (e) { /* already done */ } this._voiceSource = null; }
        this._duck(false);
    }

    _duck(on) {
        if (!this.musicDuck) return;
        const now = this.ctx.currentTime;
        this.musicDuck.gain.cancelScheduledValues(now);
        this.musicDuck.gain.setValueAtTime(this.musicDuck.gain.value, now);
        this.musicDuck.gain.linearRampToValueAtTime(on ? VOICE_DUCK : 1, now + (on ? 0.25 : 0.8));
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