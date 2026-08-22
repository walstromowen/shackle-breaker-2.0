// src/world/generators/CaveGenerator.js

import { CONFIG } from '../../shared/data/constants.js';
import { biomeFactory } from '../systems/factories/biomeFactory.js';

export class CaveGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;

        // Parse unique ID to guarantee this specific cave is always the same
        let uniqueCaveModifier = 0;
        if (interiorId) {
            uniqueCaveModifier = interiorId.split('_')
                .reduce((acc, val) => {
                    const parsed = parseInt(val);
                    return acc + (isNaN(parsed) ? 0 : parsed);
                }, 0);
        }

        this.seed = seed + uniqueCaveModifier;
        
        // Define the size of the cave (31x31 total tiles)
        this.bounds = { minC: -15, maxC: 15, minR: -15, maxR: 15 };
        
        // Generate the cave layout immediately
        this.caveData = this._generateCave(this.seed);
    }

    _getFaceDepth(tileName) {
        if (tileName === 'LAYER_3') return 2;
        if (tileName === 'LAYER_4' || tileName === 'LAYER_5') return 1;
        return 0;
    }

    _generateCave(seed) {
        let s = seed;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        const width = this.bounds.maxC - this.bounds.minC + 1;
        const height = this.bounds.maxR - this.bounds.minR + 1;

        let grid = Array(width).fill(null).map(() => Array(height).fill(0));

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    grid[x][y] = 1;
                } else {
                    grid[x][y] = rand() < (this.config.roughness || 0.45) ? 1 : 0;
                }
            }
        }

        const iterations = 4;
        for (let i = 0; i < iterations; i++) {
            let newGrid = Array(width).fill(null).map(() => Array(height).fill(0));
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const neighborWalls = this._getSurroundingWallCount(grid, x, y, width, height);
                    if (neighborWalls > 4) {
                        newGrid[x][y] = 1; 
                    } else if (neighborWalls < 4) {
                        newGrid[x][y] = 0; 
                    } else {
                        newGrid[x][y] = grid[x][y]; 
                    }
                }
            }
            grid = newGrid;
        }

        const spawnX = 0 - this.bounds.minC;
        const spawnY = this.bounds.maxR - this.bounds.minR;

        for (let x = spawnX - 2; x <= spawnX + 2; x++) {
            for (let y = spawnY - 3; y <= spawnY; y++) {
                if (x > 0 && x < width && y > 0 && y < height) {
                    grid[x][y] = 0;
                }
            }
        }

        for (let x = 0; x < width; x++) grid[x][height - 1] = 1;

        // --- NEW: Face-depth aware object scattering ---
        const objects = new Map();
        const faceDepth = this._getFaceDepth(this.config.wallTile);

        for (let x = 1; x < width - 1; x++) {
            for (let y = 1; y < height - 1; y++) {
                if (grid[x][y] === 0) {
                    
                    // Check if this floor tile is visually obscured by a north wall
                    let isObscured = false;
                    for (let dy = 1; dy <= faceDepth; dy++) {
                        if (y - dy >= 0 && grid[x][y - dy] === 1) {
                            isObscured = true;
                            break;
                        }
                    }

                    if (!isObscured && rand() < 0.02) {
                        const realC = x + this.bounds.minC;
                        const realR = y + this.bounds.minR;

                        if (realC !== 0 || realR !== this.bounds.maxR - 1) {
                            objects.set(`${realC},${realR}`, this.config.lootObject);
                        }
                    }
                }
            }
        }

        return { grid, objects };
    }

    _getSurroundingWallCount(grid, x, y, width, height) {
        let wallCount = 0;
        for (let nx = x - 1; nx <= x + 1; nx++) {
            for (let ny = y - 1; ny <= y + 1; ny++) {
                if (nx === x && ny === y) continue;
                // Out of bounds counts as a wall (encourages solid borders)
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                    wallCount++;
                } else if (grid[nx][ny] === 1) {
                    wallCount++;
                }
            }
        }
        return wallCount;
    }

    getBiomeAt(col, row) {
        return biomeFactory.getBiome(this.type) || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        // 1. Hard out of bounds
        if (col < this.bounds.minC - 1 || col > this.bounds.maxC + 1 || 
            row < this.bounds.minR - 1 || row > this.bounds.maxR + 1) {
            return this.TILES.LAYER_0;
        }

        // 2. Buffer ring
        if (col === this.bounds.minC - 1 || col === this.bounds.maxC + 1 || 
            row === this.bounds.minR - 1 || row === this.bounds.maxR + 1) {
            return this.TILES[this.config.wallTile];
        }

        // 3. Inside Cave Data
        const localX = col - this.bounds.minC;
        const localY = row - this.bounds.minR;
        
        const isWall = this.caveData.grid[localX][localY] === 1;
        
        // Special case: force floor right under the door just in case
        if (col === 0 && row === this.bounds.maxR) {
            return this.TILES[this.config.floorTile];
        }
        
        return isWall ? this.TILES[this.config.wallTile] : this.TILES[this.config.floorTile];
    }

    getObjectIdAt(col, row) {
        // Ensure bounds
        if (col < this.bounds.minC || col > this.bounds.maxC || 
            row < this.bounds.minR || row > this.bounds.maxR) {
            return null;
        }

        // 1. Place the Exit Door
        if (col === 0 && row === this.bounds.maxR) {
            return this.config.doorObject;
        }

        // 2. Return scattered objects (rocks/loot)
        const key = `${col},${row}`;
        return this.caveData.objects.get(key) || null;
    }

    getEntrySpawnPoint() {
        // Spawn one tile above the exit door
        return { col: 0, row: this.bounds.maxR - 1 };
    }

    invalidateTile(key) {
        // Unused for pre-generated interiors
    }
}