import { CONFIG } from '../data/constants.js';
import { SpawnTableFactory } from '../systems/factories/spawnTableFactory.js';

export class BiomeModel {
    constructor(definition) {
        this.id = definition.id;
        this.sheetId = definition.sheetId;
        this.objectSheetId = definition.objectSheetId;
        this.allowedWeather = definition.allowedWeather || [];
        this.battleBackgrounds = definition.battleBackgrounds || { day: null, dusk: null, night: null };
        this.music = definition.music || { day: null, night: null, battle: null };
        this.shapeElevation = definition.shapeElevation || ((noise) => noise);
        this.plateauWidth = definition.plateauWidth !== undefined ? definition.plateauWidth : 2;
        
        this.mapObjects = definition.mapObjects;
        this.battles = definition.battles;
        this.encounters = definition.encounters;
        this.structures = definition.structures;
    }

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

    getBattle(difficulty = 'normal', currentHour = 12) {
        if (!this.battles || !this.battles.tables) return null;
        if (Math.random() > this.battles.rate) return null;

        const timeOfDay = this.getTimeOfDay(currentHour);
        const tableId = this.battles.tables[timeOfDay] || this.battles.tables.day;
        
        if (!tableId) return null;

        const spawnModel = SpawnTableFactory.generateBattle(tableId, difficulty);
        return spawnModel.hasEnemies() ? { enemies: spawnModel.enemies } : null;
    }

    getTimeOfDay(currentHour) {
        if (currentHour >= 20 || currentHour < 6) return 'night';
        if (currentHour >= 6 && currentHour < 17) return 'day';
        return 'dusk';
    }

    getEncounter(currentHour) {
        // Updated to read directly from the biome's inline encounter pools
        if (!this.encounters || !this.encounters.pools || this.encounters.pools.length === 0) return null;
        if (Math.random() > this.encounters.rate) return null;

        const timeOfDay = this.getTimeOfDay(currentHour);
        
        // Filter out encounters that don't match the current time
        const validPools = this.encounters.pools.filter(pool => 
            !pool.allowedTimes || pool.allowedTimes.includes(timeOfDay)
        );

        if (validPools.length === 0) return null;

        // Perform a weighted random roll
        const totalWeight = validPools.reduce((sum, pool) => sum + pool.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const pool of validPools) {
            if (roll < pool.weight) {
                return { id: pool.id };
            }
            roll -= pool.weight;
        }

        return null;
    }

    getBattleBackground(currentHour) {
        if (!this.battleBackgrounds) return null;
        const timeOfDay = this.getTimeOfDay(currentHour);
        return this.battleBackgrounds[timeOfDay];
    }

    getMusic(currentHour, isBattle = false) {
        if (!this.music) return null;
        if (isBattle) return this.music.battle;
        
        const timeOfDay = this.getTimeOfDay(currentHour);
        if (timeOfDay === 'night') {
            return this.music.night || this.music.day;
        }
        return this.music.day;
    }
}