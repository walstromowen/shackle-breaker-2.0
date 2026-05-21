import { CONFIG } from '../data/constants.js';
import { gameState } from '../state/gameState.js';
import { biomeFactory } from './factories/biomeFactory.js';

export class TerrainGenerator {
    constructor(seed) {
        this.seed = seed;
        
        // Keep offsets within safe ranges to prevent noise tearing
        this.offsetX = (this.seed % 10000) * 13.7;
        this.offsetY = (this.seed % 10000) * 19.3;
        
        this.TILES = CONFIG.TILE_TYPES;
        
        this.GLOBAL_ELEVATION_MAP = [
            { threshold: -0.30, tile: this.TILES.LAYER_0 },
            { threshold: -0.15, tile: this.TILES.LAYER_1 },
            { threshold: 0.25,  tile: this.TILES.LAYER_2 },
            { threshold: 0.50,  tile: this.TILES.LAYER_3 },
            { threshold: 0.75,  tile: this.TILES.LAYER_4 },
            { threshold: 1.0,   tile: this.TILES.LAYER_5 }
        ];

        this._tileCache = new Map();
        this._biomeCache = new Map();
        this._rawElevCache = new Map();

        this.elevationNoise = new PerlinNoise(this.seed);
        this.temperatureNoise = new PerlinNoise(this.seed + 12345);
        this.moistureNoise = new PerlinNoise(this.seed + 54321);
    }

    _s(col, row) {
        return `${col},${row}`;
    }

    clearCacheForKeys(keys) {
        for (const key of keys) {
            this._tileCache.delete(key);
            this._biomeCache.delete(key);
            this._rawElevCache.delete(key);
        }
    }

    getBiomeAt(col, row) {
        const key = this._s(col, row);
        if (this._biomeCache.has(key)) return this._biomeCache.get(key);
        
        const BIOME_FREQ = 0.005;
        const rawTemp = this.temperatureNoise.get((col * BIOME_FREQ) + this.offsetX, (row * BIOME_FREQ) + this.offsetY);
        const rawMoist = this.moistureNoise.get((col * BIOME_FREQ) + this.offsetX, (row * BIOME_FREQ) + this.offsetY);
        
        const tempVal = Math.min(1, Math.max(0, (rawTemp + 0.5)));
        const moistVal = Math.min(1, Math.max(0, (rawMoist + 0.5)));
        
        const biome = biomeFactory.determineBiome(tempVal, moistVal);
        this._biomeCache.set(key, biome);
        
        return biome;
    }

    getBlendedElevationNoise(col, row) {
        const rawNoise = this.elevationNoise.get((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
        const centerBiome = this.getBiomeAt(col, row);
        
        const CHECK_RADIUS = 6;
        const DIRT_RADIUS = 3;
        const TARGET_DIRT_NOISE = -0.20;

        if (
            this.getBiomeAt(col, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col, row + CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row + CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row + CHECK_RADIUS) === centerBiome
        ) {
            return centerBiome.shapeElevation(rawNoise);
        }

        let minDistanceToBorder = CHECK_RADIUS + 1;
        for (let d = 1; d <= CHECK_RADIUS; d++) {
            let foundBorder = false;
            for (let i = -d; i <= d; i++) {
                if (
                    this.getBiomeAt(col + i, row - d) !== centerBiome ||
                    this.getBiomeAt(col + i, row + d) !== centerBiome ||
                    this.getBiomeAt(col - d, row + i) !== centerBiome ||
                    this.getBiomeAt(col + d, row + i) !== centerBiome
                ) {
                    foundBorder = true;
                    break;
                }
            }
            if (foundBorder) {
                minDistanceToBorder = d;
                break;
            }
        }

        const naturalNoise = centerBiome.shapeElevation(rawNoise);

        if (minDistanceToBorder <= DIRT_RADIUS) {
            return Math.min(naturalNoise, TARGET_DIRT_NOISE);
        } else if (minDistanceToBorder <= CHECK_RADIUS) {
            const t = (minDistanceToBorder - DIRT_RADIUS) / (CHECK_RADIUS - DIRT_RADIUS + 1);
            const dampenedNoise = TARGET_DIRT_NOISE + (naturalNoise - TARGET_DIRT_NOISE) * t;
            return Math.min(naturalNoise, dampenedNoise);
        }

        return naturalNoise;
    }

    _getRawElevationLevel(col, row) {
        const key = this._s(col, row);
        
        if (gameState.world.terrainOverrides[key] !== undefined) {
            return gameState.world.terrainOverrides[key];
        }
        
        if (this._rawElevCache.has(key)) return this._rawElevCache.get(key);

        const finalNoise = this.getBlendedElevationNoise(col, row);
        let level = this.GLOBAL_ELEVATION_MAP.length - 1;
        
        for (let i = 0; i < this.GLOBAL_ELEVATION_MAP.length; i++) {
            if (finalNoise < this.GLOBAL_ELEVATION_MAP[i].threshold) {
                level = i;
                break;
            }
        }

        if (level === 2 && finalNoise < 0.00) {
            const WATER_THRESHOLD = -0.30;
            const offsets = [
                {c: -1, r: 0}, {c: 1, r: 0}, {c: 0, r: -1}, {c: 0, r: 1},
                {c: -2, r: 0}, {c: 2, r: 0}, {c: 0, r: -2}, {c: 0, r: 2},
                {c: -1, r: -1}, {c: 1, r: -1}, {c: -1, r: 1}, {c: 1, r: 1}
            ];
            
            for (const off of offsets) {
                if (this.getBlendedElevationNoise(col + off.c, row + off.r) < WATER_THRESHOLD) {
                    level = 1;
                    break;
                }
            }
        }

        this._rawElevCache.set(key, level);
        return level;
    }

    getTileAt(col, row) {
        const key = this._s(col, row);
        if (this._tileCache.has(key)) return this._tileCache.get(key);

        let finalLevel = this._getRawElevationLevel(col, row);
        const biome = this.getBiomeAt(col, row);

        if (finalLevel > 2) {
            const PLATEAU_WIDTH = 2;
            const MAX_SEARCH_RADIUS = (finalLevel - 2) * PLATEAU_WIDTH;
            
            for (let d = 1; d <= MAX_SEARCH_RADIUS; d++) {
                let minBaseLevelAtD = 999;
                for (let c = -d; c <= d; c++) {
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + c, row - d));
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + c, row + d));
                }
                for (let r = -d + 1; r < d; r++) {
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col - d, row + r));
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + d, row + r));
                }
                const maxAllowedLevel = minBaseLevelAtD + Math.floor((d - 1) / PLATEAU_WIDTH) + 1;
                finalLevel = Math.min(finalLevel, maxAllowedLevel);
            }
        }

        const tile = this.GLOBAL_ELEVATION_MAP[finalLevel].tile;
        this._tileCache.set(key, tile);
        return tile;
    }

    invalidateTile(key) {
        this._tileCache.delete(key);
        this._rawElevCache.delete(key);
    }
}

class PerlinNoise {
    constructor(seed) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.perm[i] = i;
        
        let s = seed;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        
        for (let i = 0; i < 256; i++) {
            const r = rand();
            const j = Math.floor(r * 256);
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }
        
        for (let i = 0; i < 512; i++) this.p[i] = this.perm[i & 255];
    }
    
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    
    lerp(t, a, b) { return a + t * (b - a); }
    
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    get(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }
}