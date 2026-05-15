import { CONFIG } from '../data/constants.js';

export class BiomeModel {
    constructor(definition) {
        this.id = definition.id;
        this.sheetId = definition.sheetId;
        this.objectSheetId = definition.objectSheetId;
        this.allowedWeather = definition.allowedWeather || [];
        this.battleBackgrounds = definition.battleBackgrounds || { day: null, dusk: null, night: null };
        this.music = definition.music || { day: null, night: null, battle: null };
        this.shapeElevation = definition.shapeElevation || ((noise) => noise);
        this.plateauWidth = definition.plateauWidth !== undefined ? definition.plateauWidth : 2; // Default to 2
        
        this.mapObjects = definition.mapObjects;
        this.battles = definition.battles;
        this.encounters = definition.encounters;
        
        // NEW: Structures definitions
        this.structures = definition.structures;
    }

    // NEW: Phase 0 Structure Spawning Logic
    getStructureId(rngValue) {
        if (!this.structures) return null;
        if (rngValue > this.structures.rate) return null;

        const poolRng = rngValue / this.structures.rate; 
        let cumulativeChance = 0;
        
        for (const pool of this.structures.pools) {
            cumulativeChance += pool.chance;
            if (poolRng <= cumulativeChance) {
                return pool.id;
            }
        }
        return this.structures.pools[0].id;
    }

    getSpawnId(tileId, rngValue, isWall = false) {
        const rules = isWall ? this.mapObjects._WALLS : this.mapObjects[tileId];
        if (!rules) return null;

        for (const rule of rules) {
            if (rule.rangeStart && rngValue < rule.rangeStart) continue;
            if (rngValue < rule.chance) {
                let spawnId = rule.id;
                if (rule.pool) {
                    spawnId = rule.pool[Math.floor(rngValue * 1000) % rule.pool.length];
                }
                return { id: spawnId, footprint: rule.footprint || null };
            }
        }
        return null;
    }

    getBattle(difficulty = 'normal') {
        if (!this.battles) return null;
        if (Math.random() > this.battles.rate) return null;

        // Extract the specific array for the current difficulty level
        const currentPools = this.battles.pools[difficulty];

        // Failsafe in case the difficulty key is missing or empty
        if (!currentPools || !Array.isArray(currentPools) || currentPools.length === 0) {
            console.warn(`[BiomeModel] No battle pool found for difficulty: ${difficulty}`);
            return null;
        }

        const roll = Math.random();
        let cumulativeChance = 0;
        for (const pool of currentPools) {
            cumulativeChance += pool.chance;
            if (roll <= cumulativeChance) {
                return { enemies: pool.enemies };
            }
        }
        
        // Fallback to the first pool if the random roll fails to match (e.g., chances don't sum to 1.0)
        return { enemies: currentPools[0].enemies };
    }

    getTimeOfDay(currentHour) {
        if (currentHour >= 20 || currentHour < 6) return 'night';
        if (currentHour >= 6 && currentHour < 17) return 'day';
        return 'dusk';
    }

    getEncounter(currentHour) {
        if (!this.encounters) return null;
        if (Math.random() > this.encounters.rate) return null;

        const timeOfDay = this.getTimeOfDay(currentHour);
        const validPools = this.encounters.pools.filter(pool => 
            !pool.allowedTimes || pool.allowedTimes.includes(timeOfDay)
        );

        if (validPools.length === 0) return null;

        const roll = Math.random();
        let cumulativeChance = 0;
        for (const pool of validPools) {
            cumulativeChance += pool.chance;
            if (roll <= cumulativeChance) {
                return { id: pool.id };
            }
        }
        return { id: validPools[0].id };
    }

    getBattleBackground(currentHour) {
        if (!this.battleBackgrounds) return null;
        const timeOfDay = this.getTimeOfDay(currentHour);
        return this.battleBackgrounds[timeOfDay];
    }

    // --- NEW: Time & State Aware Music Logic ---
    getMusic(currentHour, isBattle = false) {
        if (!this.music) return null;
        if (isBattle) return this.music.battle;
        
        const timeOfDay = this.getTimeOfDay(currentHour);
        // If it's night, play night theme (fallback to day if missing).
        // If it's dusk, default to the day theme.
        if (timeOfDay === 'night') {
            return this.music.night || this.music.day;
        }
        return this.music.day;
    }
}