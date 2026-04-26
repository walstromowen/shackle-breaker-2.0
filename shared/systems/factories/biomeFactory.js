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
    determineBiome(temperatureNoise, moistureNoise) {
        // Perlin noise creates a bell curve where most values cluster around 0.5.
        // Splitting right down the middle creates 4 equal 25% quadrants.
        
        const isHot = temperatureNoise > 0.5;
        const isDry = moistureNoise < 0.5;

        // Quadrant 1: Hot & Dry (25% of map)
        if (isHot && isDry) {
            return this.getBiome('DESERT');
        } 
        // Quadrant 2: Hot & Wet (25% of map)
        else if (isHot && !isDry) {
            return this.getBiome('DESERT'); // TODO: Replace with JUNGLE or SAVANNA later!
        } 
        // Quadrant 3: Cold & Dry (25% of map)
        else if (!isHot && isDry) {
            return this.getBiome('PLAINS'); // TODO: Replace with TUNDRA or SNOW later!
        } 
        // Quadrant 4: Cold & Wet (25% of map)
        else {
            return this.getBiome('PLAINS'); // TODO: Replace with FOREST later!
        }
    }
}

// Export as a singleton for easy access
export const biomeFactory = new BiomeFactory();