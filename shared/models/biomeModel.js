import { CONFIG } from '../data/constants.js';

export class BiomeModel {
    constructor(definition) {
        this.id = definition.id;
        this.sheetId = definition.sheetId; 
        this.objectSheetId = definition.objectSheetId; 
        
        // --- NEW: Pull allowed weather from definition ---
        this.allowedWeather = definition.allowedWeather || [];
        
        this.elevationMap = definition.elevationMap;
        this.mapObjects = definition.mapObjects;
        this.battles = definition.battles;
    }

    /**
     * Determines the correct Tile ID based on the raw elevation noise
     */
    getTileId(elevationNoise) {
        for (const layer of this.elevationMap) {
            if (elevationNoise < layer.threshold) {
                return layer.tile;
            }
        }
        // Fallback to the highest tier if noise exceeds all thresholds
        return this.elevationMap[this.elevationMap.length - 1].tile;
    }

    /**
     * Returns a potential object ID to spawn, or null
     */
    getSpawnId(tileId, rngValue, isWall = false) {
        // Determine which rule set to use based on the tile (or if it's a wall)
        const rules = isWall ? this.mapObjects._WALLS : this.mapObjects[tileId];
        
        if (!rules) return null;

        for (const rule of rules) {
            // Check if RNG falls within the valid range (e.g., 0.10 to 0.20)
            if (rule.rangeStart && rngValue < rule.rangeStart) continue;
            
            // Check if RNG triggers the spawn chance
            if (rngValue < rule.chance) {
                let spawnId = rule.id;
                
                // If it's a pool, randomly select one item from the pool
                if (rule.pool) {
                    spawnId = rule.pool[Math.floor(rngValue * 1000) % rule.pool.length];
                }
                
                return {
                    id: spawnId,
                    footprint: rule.footprint || null
                };
            }
        }
        
        return null;
    }
    
    getBattle() {
        // 1. If this biome has no battles (safe zone), return null
        if (!this.battles) return null;

        // 2. Roll against the biome's battle rate (e.g., 5% chance per step)
        if (Math.random() > this.battles.rate) return null;

        // 3. If a battle triggered, roll to see WHICH enemy group spawns
        const roll = Math.random();
        let cumulativeChance = 0;

        for (const pool of this.battles.pools) {
            cumulativeChance += pool.chance;
            if (roll <= cumulativeChance) {
                // Return the array of enemy IDs
                return { enemies: pool.enemies }; 
            }
        }

        // Fallback
        return { enemies: this.battles.pools[0].enemies };
    }
}