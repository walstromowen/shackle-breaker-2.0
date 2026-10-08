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
     * Determines which biome should exist based on temperature and moisture noise values (both 0..1).
     * Three biomes, each covering a third of the map: the temperature noise is cut at its 1/3 and 2/3 points
     * (about 0.39 and 0.61: Perlin noise piles up around 0.5, so cutting at 0.33 / 0.67 would make the middle biome far too big).
     * Moisture is not used for now; it is still passed in for the biomes you add later.
     */
    determineBiome(temperatureNoise, moistureNoise) {
        if (temperatureNoise < 0.39) return this.getBiome('SNOWY_MOUNTAINS'); // coldest third
        if (temperatureNoise < 0.61) return this.getBiome('PLAINS');          // middle third
        return this.getBiome('DESERT');                                       // hottest third
    }
}

// Export as a singleton for easy access
export const biomeFactory = new BiomeFactory();