// src/world/generators/CraftingHouseGenerator.js
import { CONFIG } from '../../shared/data/constants.js';
import { biomeFactory } from '../systems/factories/biomeFactory.js';

export class CraftingHouseGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;
        
        // Ensure this specific house gets its own unique PRNG (even if we don't strictly need it for a static layout, it maintains pattern parity)
        let uniqueHouseModifier = 0;
        if (interiorId) {
            uniqueHouseModifier = interiorId.split('_')
                .reduce((acc, val) => {
                    const parsed = parseInt(val);
                    return acc + (isNaN(parsed) ? 0 : parsed);
                }, 0);
        }
        this.seed = seed + uniqueHouseModifier;
        
        // Define a small, symmetrical room (9 tiles wide, 7 tiles deep)
        this.bounds = { minC: -4, maxC: 4, minR: -7, maxR: 0 };
    }

    _getFaceDepth(tileName) {
        if (tileName === 'LAYER_3') return 2;
        if (tileName === 'LAYER_4' || tileName === 'LAYER_5') return 1;
        return 0;
    }

    getBiomeAt(col, row) {
        // Force all crafting houses to use the HOUSE_INTERIOR biome rules, sprite sheets, and music
        return biomeFactory.getBiome('HOUSE_INTERIOR') || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        // 1. Optimize out of bounds requests early
        if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) {
            return this.TILES.LAYER_0;
        }

        // 2. Exterior Main Door (Bottom Center)
        if (col === 0 && row === this.bounds.maxR) return this.TILES[this.config.floorTile];

        // 3. Floors (If strictly inside the room)
        if (col > this.bounds.minC && col < this.bounds.maxC && row > this.bounds.minR && row < this.bounds.maxR) {
            return this.TILES[this.config.floorTile];
        }

        // 4. Walls (If exactly on the border of the room)
        if (col === this.bounds.minC || col === this.bounds.maxC || row === this.bounds.minR || row === this.bounds.maxR) {
            return this.TILES[this.config.wallTile];
        }

        return this.TILES.LAYER_0;
    }

    getObjectIdAt(col, row) {
        if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) {
            return null;
        }

        // Place the Exit Door
        if (col === 0 && row === this.bounds.maxR) return this.config.doorObject;

        // Calculate safe row for the crafting station to ensure it isn't hidden by the north wall's visual depth
        const faceDepth = this._getFaceDepth(this.config.wallTile);
        const safeRow = this.bounds.minR + 1 + faceDepth;

        // Place the Crafting Station at the far center
        if (col === 0 && row === safeRow) return this.config.craftingStation;

        return null;
    }

    getEntrySpawnPoint() {
        return { col: 0, row: this.bounds.maxR - 1 };
    }

    invalidateTile(key) {
        // Not used for fixed layouts
    }
}