import { BIOME_DEFINITIONS } from '../../data/biomeDefinitions.js';
import { BiomeModel } from '../../models/biomeModel.js';

class BiomeFactory {
    constructor() {
        this._biomeCache = new Map();
    }

    /**
     * Retrieves or creates a BiomeModel by its ID.
     */
    getBiome(biomeId) {
        if (this._biomeCache.has(biomeId)) {
            return this._biomeCache.get(biomeId);
        }

        const definition = BIOME_DEFINITIONS[biomeId];
        if (!definition) {
            console.error(`[BiomeFactory] Biome definition '${biomeId}' not found. Falling back to PLAINS.`);
            return this.getBiome('PLAINS');
        }

        const biomeModel = new BiomeModel(definition);
        this._biomeCache.set(biomeId, biomeModel);
        
        return biomeModel;
    }

    /**
     * Determines which biome should exist based on temperature and moisture noise values.
     * These values should be provided by the WorldManager's noise generators.
     */
    /**
     * Determines which biome should exist based on temperature and moisture noise values.
     * These values should be provided by the WorldManager's noise generators.
     */
    determineBiome(temperatureNoise, moistureNoise) {
        // Assuming values are now normalized between 0.0 and 1.0
        // 0.5 is "average"
        
        // Hot areas (Lowered from 0.7 to 0.6 to make hot biomes more common)
        if (temperatureNoise > 0.6) { 
            // Hot and Dry (Raised from 0.4 to 0.5 to make dry biomes more common)
            if (moistureNoise < 0.5) return this.getBiome('DESERT');
            
            return this.getBiome('PLAINS'); 
        } 
        
        // Cold areas (Raised from 0.3 to 0.4)
        if (temperatureNoise < 0.4) {
            return this.getBiome('PLAINS'); // Future: SNOW
        }

        // Default middle-ground (Temperate)
        return this.getBiome('PLAINS'); 
    }
}

// Export as a singleton for easy access
export const biomeFactory = new BiomeFactory();