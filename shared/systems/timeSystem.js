import { gameState } from '../state/gameState.js'; 
import { biomeFactory } from '../systems/factories/biomeFactory.js';
import { WeatherFactory } from '../systems/factories/weatherFactory.js';

export class TimeSystem {
    constructor() {
        // --- CONFIGURATION (Static, doesn't need saving) ---
        this.GAME_MINUTES_PER_REAL_SEC = 20; 
        this.MAX_TIME = 24 * 60; 

        // 2. SYNC ON LOAD
        // If the state is 0 (New Game), set the default starting time (6:00 AM).
        // If we loaded a save file, this line skips, preserving the saved time.
        if (gameState.world.time === 0) {
            gameState.world.time = 6 * 60; 
        }

        // --- COLOR PALETTE ---
        this.palette = {
            NIGHT:   { r: 15,  g: 15,  b: 20,  a: 1.0 }, 
            DAWN:    { r: 80,  g: 70,  b: 90,  a: 0.50 }, 
            DAY:     { r: 255, g: 255, b: 255, a: 0.00 }, 
            GOLDEN:  { r: 255, g: 190, b: 60,  a: 0.05 },
            DUSK:    { r: 200, g: 80,  b: 40,  a: 0.05 }  
        };

        this.keyframes = [
            { time: 0,   color: this.palette.NIGHT }, 
            { time: 5,   color: this.palette.NIGHT }, 
            { time: 6,   color: this.palette.DAWN  }, 
            { time: 9,   color: this.palette.DAY   }, 
            { time: 16,  color: this.palette.DAY   }, 
            { time: 17.5, color: this.palette.GOLDEN }, 
            { time: 18.5, color: this.palette.DUSK   }, 
            { time: 20,  color: this.palette.NIGHT  }, 
            { time: 24,  color: this.palette.NIGHT }  
        ];
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
        
        // 3. Roll for new weather when the timer runs out
        if (gameState.world.currentWeather && gameState.world.currentWeather.timeRemaining <= 0) {
            this.generateNewWeather();
        }
        // -----------------------------------------
        
        // If we pass 24 hours (1440 minutes)
        if (gameState.world.time >= this.MAX_TIME) {
            gameState.world.time -= this.MAX_TIME;
            gameState.world.day++; 
            console.log(`🌞 A new day dawns. Day ${gameState.world.day}`);
        }
    }

    getCurrentColorData() {
        const hour = gameState.world.time / 60;

        let startFrame = this.keyframes[0];
        let endFrame = this.keyframes[this.keyframes.length - 1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (hour >= this.keyframes[i].time && hour < this.keyframes[i + 1].time) {
                startFrame = this.keyframes[i];
                endFrame = this.keyframes[i + 1];
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
     * Determines new weather based on the player's current biome
     */
    generateNewWeather() {
        // Default to PLAINS if the player's biome isn't set yet
        const currentBiomeId = gameState.world.currentBiome || 'PLAINS';
        const biome = biomeFactory.getBiome(currentBiomeId);

        // 1. Identify the weather we are currently experiencing
        const activeWeatherId = gameState.world.currentWeather ? gameState.world.currentWeather.id.toUpperCase() : null;

        // Define valid weather pools per biome
        const weatherPools = {
            'PLAINS': [
                { id: 'CLEAR', weight: 60 },
                { id: 'RAIN',  weight: 25 },
                { id: 'FOG',   weight: 15 }
            ],
            'DESERT': [
                { id: 'CLEAR',     weight: 80 },
                { id: 'SANDSTORM', weight: 20 }
            ]
        };

        // Get the pool for the current biome, fallback to PLAINS if missing
        let pool = weatherPools[biome.id] || weatherPools['PLAINS'];

        // 2. Filter out the active weather to prevent repeats
        if (activeWeatherId) {
            const filteredPool = pool.filter(item => item.id !== activeWeatherId);
            
            // Safety check: Only use the filtered pool if there are actually options left!
            // (e.g., prevents infinite loops if a biome only has 1 valid weather type)
            if (filteredPool.length > 0) {
                pool = filteredPool;
            }
        }

        // Calculate total weight for random roll based on the *filtered* pool
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        
        let selectedWeatherId = 'CLEAR';

        // Select weather based on weights
        for (const item of pool) {
            roll -= item.weight;
            if (roll <= 0) {
                selectedWeatherId = item.id;
                break;
            }
        }

        // Instantiate the new weather model and save it to the state
        gameState.world.currentWeather = WeatherFactory.createWeather(selectedWeatherId);
        console.log(`[TimeSystem] Weather changed to: ${gameState.world.currentWeather.name} for the next ${gameState.world.currentWeather.timeRemaining} hours.`);
    }
}