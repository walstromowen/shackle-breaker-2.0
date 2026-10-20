import { gameState } from '../state/gameState.js'; 
import { biomeFactory } from '../systems/factories/biomeFactory.js';
import { WeatherFactory } from '../systems/factories/weatherFactory.js';
import { events } from '../../frontend/src/core/eventBus.js'; // NEW: Import event bus
import { WeatherDefinitions } from '../data/weatherDefinitions.js'; // NEW: Needed to look up the audio effect string
import { ActSystem } from './actSystem.js';

/* How likely each weather is when a new one is rolled in a biome. Only the weather a biome lists in its `allowedWeather` (biomeDefinitions.js) can ever be
   rolled there, whatever this table says, so the two can no longer disagree. A biome that is not listed here gets CLEAR 60 and 20 for every weather it allows;
   a biome that allows nothing (a house, a cave) is always CLEAR. */
const WEATHER_WEIGHTS = {
    PLAINS:          { CLEAR: 60, RAIN: 25, FOG: 15 },
    DESERT:          { CLEAR: 80, SANDSTORM: 20 },
    SNOWY_MOUNTAINS: { CLEAR: 55, FOG: 20, BLIZZARD: 25 },
};

export class TimeSystem {
    constructor() {
        // --- CONFIGURATION (Static, doesn't need saving) ---
        this.GAME_MINUTES_PER_REAL_SEC = 2; 
        this.MAX_TIME = 24 * 60; 

        // 2. SYNC ON LOAD
        // If the state is 0 (New Game), set the default starting time (6:00 AM).
        // If we loaded a save file, this line skips, preserving the saved time.
        if (gameState.world.time === 0) {
            gameState.world.time = 12 * 60; 
        }

        // --- COLOR PALETTE ---
        this.palette = {
            NIGHT:   { r: 15,  g: 15,  b: 20,  a: 1.0 }, 
            DAWN:    { r: 80,  g: 70,  b: 90,  a: 0.50 }, 
            DAY:     { r: 255, g: 255, b: 255, a: 0.00 }, 
            GOLDEN:  { r: 255, g: 190, b: 60,  a: 0.05 },
            DUSK:    { r: 200, g: 80,  b: 40,  a: 0.05 }  
        };

        this.keyframes = this.buildKeyframes(this.palette);
        this._keyframeAct = 1;
    }

    /** The clock's colours over the day for a palette (NIGHT, DAWN, DAY, GOLDEN, DUSK). */
    buildKeyframes(palette) {
        return [
            { time: 0,   color: palette.NIGHT },
            { time: 5,   color: palette.NIGHT },
            { time: 6,   color: palette.DAWN  },
            { time: 9,   color: palette.DAY   },
            { time: 16,  color: palette.DAY   },
            { time: 17.5, color: palette.GOLDEN },
            { time: 18.5, color: palette.DUSK   },
            { time: 20,  color: palette.NIGHT  },
            { time: 24,  color: palette.NIGHT }
        ];
    }

    /** The keyframes of the current act: act 2 swaps the black night for the red sky of the blood moon (data/actDefinitions.js `lighting`). Rebuilt only when the act changes. */
    getKeyframes() {
        const act = ActSystem.getAct();
        if (act !== this._keyframeAct) {
            const L = ActSystem.getLighting();
            this._keyframeAct = act;
            this.keyframes = this.buildKeyframes({
                NIGHT:  L.night  || this.palette.NIGHT,
                DAWN:   L.dawn   || this.palette.DAWN,
                DAY:    this.palette.DAY,
                GOLDEN: L.golden || this.palette.GOLDEN,
                DUSK:   L.dusk   || this.palette.DUSK
            });
        }
        return this.keyframes;
    }

    update(dt) {
        // Calculate the game minutes that passed this frame
        const addedMinutes = dt * this.GAME_MINUTES_PER_REAL_SEC;
        gameState.world.time += addedMinutes;

        // --- WEATHER LIFECYCLE MANAGEMENT ---
        
        // 1. Initialize weather if none exists at all
        if (!gameState.world.currentWeather) {
            this.generateNewWeather(); 
        } 
        
        // 2. Process active weather (ALL weather, including CLEAR, needs to tick down!)
        if (gameState.world.currentWeather) {
            // Decrement the weather timer (converting minutes to hours)
            gameState.world.currentWeather.timeRemaining -= (addedMinutes / 60);
            
            // Update the fade intensity! (0.5 = 30 in-game minutes of fading)
            if (typeof gameState.world.currentWeather.updateIntensity === 'function') {
                gameState.world.currentWeather.updateIntensity(0.5);
            }
        }
        
        // 3. Weather the player's biome does not allow (rain in a desert, anything in a house) is cleared at once, not only when a step ends
        TimeSystem.syncBiomeWeather();

        // 4. Roll for new weather when the timer runs out
        if (gameState.world.currentWeather && gameState.world.currentWeather.timeRemaining <= 0) {
            this.generateNewWeather();
        }
        // -----------------------------------------
        
        // If we pass 24 hours (1440 minutes)
        if (gameState.world.time >= this.MAX_TIME) {
            gameState.world.time -= this.MAX_TIME;
            gameState.world.day++; 
        }
    }

    getCurrentColorData() {
        const hour = gameState.world.time / 60;
        const keyframes = this.getKeyframes();

        let startFrame = keyframes[0];
        let endFrame = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (hour >= keyframes[i].time && hour < keyframes[i + 1].time) {
                startFrame = keyframes[i];
                endFrame = keyframes[i + 1];
                break;
            }
        }

        const duration = endFrame.time - startFrame.time;
        const progress = (hour - startFrame.time) / duration;

        return {
            r: Math.floor(this.lerp(startFrame.color.r, endFrame.color.r, progress)),
            g: Math.floor(this.lerp(startFrame.color.g, endFrame.color.g, progress)),
            b: Math.floor(this.lerp(startFrame.color.b, endFrame.color.b, progress)),
            a: this.lerp(startFrame.color.a, endFrame.color.a, progress)
        };
    }

    getFormattedTime() {
        const h = Math.floor(gameState.world.time / 60);
        const m = Math.floor(gameState.world.time % 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const mStr = m < 10 ? `0${m}` : m;
        return `${h12}:${mStr} ${ampm}`;
    }

    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * The weather ids (upper case, always including CLEAR) that the biome allows. Read from the biome's `allowedWeather`, the same list the
     * overworld uses to clear weather, so rolling and clearing agree. An unknown biome id counts as "CLEAR only".
     */
    static allowedWeatherFor(biomeId) {
        const allowed = new Set(['CLEAR']);
        if (!biomeId) return allowed;
        const biome = biomeFactory.getBiome(biomeId);
        for (const w of (biome && biome.allowedWeather) || []) {
            const key = String(w).toUpperCase();
            if (WeatherDefinitions[key]) allowed.add(key);
        }
        return allowed;
    }

    /**
     * Replace the current weather with a new one AND tell the audio about it. Every change of weather goes through here, so the rain / fog / sand loop
     * always matches the weather (before, only a freshly rolled weather touched the audio: a weather cleared because the biome changed left its loop playing,
     * and "no sound" was sent as PLAY_AMBIENCE 'none', which is not a sound).
     */
    static setWeather(weatherKey) {
        const key = String(weatherKey).toUpperCase();
        gameState.world.currentWeather = WeatherFactory.createWeather(key);
        const def = WeatherDefinitions[key];
        const audioAssetId = def && def.audioEffect ? def.audioEffect : 'none';
        if (audioAssetId === 'none') events.emit('STOP_AMBIENCE', { fadeTime: 2.0 });
        else events.emit('PLAY_AMBIENCE', { id: audioAssetId, fadeTime: 3.0 });
    }

    /**
     * Make the weather fit the biome the player is in: if the current weather is not one the biome allows, it becomes CLEAR (with the sound stopped).
     * Pass the biome id when it just changed (a step, a warp); without it the last known one (gameState.world.currentBiome) is used.
     * Returns true when it cleared the weather. Called every update by the TimeSystem and by the OverworldController (every frame, and after every warp).
     */
    static syncBiomeWeather(biomeId) {
        if (biomeId) gameState.world.currentBiome = biomeId;
        const weather = gameState.world.currentWeather;
        if (!weather) return false;
        const id = String(weather.id).toUpperCase();
        if (id === 'CLEAR') return false;
        if (TimeSystem.allowedWeatherFor(gameState.world.currentBiome).has(id)) return false;
        console.log(`[Weather] Clearing skies. ${id} invalid in ${gameState.world.currentBiome || 'an unknown biome'}.`);
        TimeSystem.setWeather('CLEAR');
        return true;
    }

    /**
     * Determines new weather based on the player's current biome
     */
    generateNewWeather() {
        const biomeId = gameState.world.currentBiome; // kept up to date by the OverworldController; unknown (first frame) = CLEAR only

        // 1. Identify the weather we are currently experiencing
        const activeWeatherId = gameState.world.currentWeather ? String(gameState.world.currentWeather.id).toUpperCase() : null;

        // 2. The pool: only weather this biome allows, weighted by WEATHER_WEIGHTS
        const table = WEATHER_WEIGHTS[biomeId];
        let pool = [];
        for (const key of TimeSystem.allowedWeatherFor(biomeId)) {
            const weight = table ? (table[key] || 0) : (key === 'CLEAR' ? 60 : 20);
            if (weight > 0) pool.push({ id: key, weight });
        }
        if (pool.length === 0) pool.push({ id: 'CLEAR', weight: 1 });

        // 3. Filter out the active weather to prevent repeats (unless it is the only option, e.g. CLEAR in a house)
        if (activeWeatherId) {
            const filteredPool = pool.filter(item => item.id !== activeWeatherId);
            if (filteredPool.length > 0) pool = filteredPool;
        }

        // 4. Weighted roll
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        let selectedWeatherId = pool[pool.length - 1].id;
        for (const item of pool) {
            roll -= item.weight;
            if (roll <= 0) {
                selectedWeatherId = item.id;
                break;
            }
        }

        // 5. Same weather again (only possible when it is the sole option): a fresh timer, but no new sound event
        if (selectedWeatherId === activeWeatherId) {
            gameState.world.currentWeather = WeatherFactory.createWeather(selectedWeatherId);
            return;
        }

        // 6. New weather: saves it and syncs the audio (the AudioManager crossfades)
        TimeSystem.setWeather(selectedWeatherId);
    }
}