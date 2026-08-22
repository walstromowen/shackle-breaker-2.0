// src/world/generators/HouseGenerator.js
import { CONFIG } from '../../shared/data/constants.js';
import { biomeFactory } from '../systems/factories/biomeFactory.js';

export class HouseGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;

        // Ensure this specific house gets its own unique PRNG blueprint
        let uniqueHouseModifier = 0;
        if (interiorId) {
            uniqueHouseModifier = interiorId.split('_')
                .reduce((acc, val) => {
                    const parsed = parseInt(val);
                    return acc + (isNaN(parsed) ? 0 : parsed);
                }, 0);
        }

        this.seed = seed + uniqueHouseModifier;

        // Generate and store the blueprint immediately upon class creation
        this.layoutState = this._generateLayout(this.seed);
        this.bounds = this.layoutState.bounds;
    }

    _getFaceDepth(tileName) {
        if (tileName === 'LAYER_3') return 2;
        if (tileName === 'LAYER_4' || tileName === 'LAYER_5') return 1;
        return 0;
    }

    _generateLayout(seed) {
        let s = seed;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        // --- Room 1 (Main Entrance) ---
        // Width: 8 to 12 tiles
        // Height: 8 to 12 tiles
        const w1 = Math.floor(rand() * 3) + 4; 
        const h1 = Math.floor(rand() * 3) + 4; 
        const room1 = { minC: -w1, maxC: w1, minR: -h1, maxR: h1 };

        // --- Room 2 (Back Extension) ---
        // Width: 6 to 10 tiles
        // Height: 6 to 8 tiles
        const w2_half = Math.floor(rand() * 3) + 3; 
        const h2 = Math.floor(rand() * 3) + 6;      
        const r2offset = Math.floor(rand() * (w1 - 2)) * (rand() > 0.5 ? 1 : -1); 
        const room2 = { minC: r2offset - w2_half, maxC: r2offset + w2_half, minR: room1.minR - h2, maxR: room1.minR };

        // --- Room 3 (Side Extension) ---
        // Width: 6 to 8 tiles
        // Height: 6 to 10 tiles
        const isEast = rand() > 0.5;
        const w3 = Math.floor(rand() * 3) + 6;      
        const h3_half = Math.floor(rand() * 3) + 3; 
        const r3yOffset = Math.floor(rand() * (h1 - 2)) * (rand() > 0.5 ? 1 : -1);
        
        let room3;
        if (isEast) {
            room3 = { minC: room1.maxC, maxC: room1.maxC + w3, minR: r3yOffset - h3_half, maxR: r3yOffset + h3_half };
        } else {
            room3 = { minC: room1.minC - w3, maxC: room1.minC, minR: r3yOffset - h3_half, maxR: r3yOffset + h3_half };
        }

        const rooms = [room1, room2, room3];

        const internalDoors = [
            { col: r2offset, row: room1.minR },
            { col: isEast ? room1.maxC : room1.minC, row: r3yOffset }
        ];

        const bounds = {
            minC: Math.min(room1.minC, room2.minC, room3.minC),
            maxC: Math.max(room1.maxC, room2.maxC, room3.maxC),
            minR: Math.min(room1.minR, room2.minR, room3.minR),
            maxR: Math.max(room1.maxR, room2.maxR, room3.maxR)
        };

        const chestRoom = rand() > 0.5 ? room2 : room3;
        
        // Calculate safe row based on face depth
        const faceDepth = this._getFaceDepth(this.config.wallTile);
        let safeRow = chestRoom.minR + 1 + faceDepth;
        
        if (safeRow >= chestRoom.maxR) {
            safeRow = chestRoom.maxR - 1; 
        }

        const chestPos = {
            col: chestRoom.minC + 1 + Math.floor(rand() * (chestRoom.maxC - chestRoom.minC - 1)),
            row: safeRow
        };

        return { rooms, internalDoors, bounds, room1, chestPos };
    }

    getBiomeAt(col, row) {
        return biomeFactory.getBiome(this.type) || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        // 1. Optimize out of bounds requests early
        if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) {
            return this.TILES.LAYER_0;
        }

        const layout = this.layoutState;

        // 2. Exterior Main Door
        if (col === 0 && row === layout.room1.maxR) return this.TILES[this.config.floorTile];

        // 3. Internal Doors
        for (const door of layout.internalDoors) {
            if (col === door.col && row === door.row) return this.TILES[this.config.floorTile];
        }

        // 4. Floors (If strictly inside any room)
        for (const r of layout.rooms) {
            if (col > r.minC && col < r.maxC && row > r.minR && row < r.maxR) {
                return this.TILES[this.config.floorTile];
            }
        }

        // 5. Walls (If exactly on the border of any room)
        for (const r of layout.rooms) {
            if (col >= r.minC && col <= r.maxC && row >= r.minR && row <= r.maxR) {
                return this.TILES[this.config.wallTile];
            }
        }

        // 6. Outside (The void framing the house shape)
        return this.TILES.LAYER_0;
    }

    getObjectIdAt(col, row) {
        if (col < this.bounds.minC || col > this.bounds.maxC || row < this.bounds.minR || row > this.bounds.maxR) {
            return null;
        }

        const layout = this.layoutState;

        if (col === 0 && row === layout.room1.maxR) return this.config.doorObject;
        if (col === layout.chestPos.col && row === layout.chestPos.row) return this.config.lootObject;

        return null;
    }

    getEntrySpawnPoint() {
        return { col: 0, row: this.layoutState.room1.maxR - 1 };
    }

    invalidateTile(key) {
        // Not used for fixed layouts
    }
}