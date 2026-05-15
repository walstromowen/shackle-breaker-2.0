import { CONFIG, BITMASK } from '../data/constants.js';
import { MAP_OBJECTS_DEFINITIONS } from '../data/mapObjectDefinitions.js';
import { gameState } from '../state/gameState.js';
import { biomeFactory } from './factories/biomeFactory.js';
import { mapObjectFactory } from '../../shared/systems/factories/mapObjectsFactory.js';
import { WeatherFactory } from '../../shared/systems/factories/weatherFactory.js';
import { STRUCTURES } from '../data/structures.js';

const MASK_DIRECTIONS = [
  { c: 0,  r: -1, bit: BITMASK.TOP },
  { c: 1,  r: -1, bit: BITMASK.TOP_RIGHT },
  { c: 1,  r: 0,  bit: BITMASK.RIGHT },
  { c: 1,  r: 1,  bit: BITMASK.BOTTOM_RIGHT },
  { c: 0,  r: 1,  bit: BITMASK.BOTTOM },
  { c: -1, r: 1,  bit: BITMASK.BOTTOM_LEFT },
  { c: -1, r: 0,  bit: BITMASK.LEFT },
  { c: -1, r: -1, bit: BITMASK.TOP_LEFT }
];

export class WorldManager {
  constructor() {
    if (!gameState.seed) gameState.seed = Math.floor(Math.random() * 1000000);
    if (!gameState.world.changes) gameState.world.changes = {};
    
    // NEW: Initialize terrain overrides and generated structure tracking
    if (!gameState.world.terrainOverrides) gameState.world.terrainOverrides = {};
    if (!gameState.world.generatedStructures) gameState.world.generatedStructures = {};
    
    if (!gameState.world.currentWeather) {
      gameState.world.currentWeather = WeatherFactory.createWeather('CLEAR');
      gameState.world.currentWeather.intensity = 1.0;
    }
    
    this.seed = gameState.seed;
    console.log(`%c[WorldManager] Seed: ${this.seed} (Chunked Mode)`, 'color: #00ff00; font-weight: bold;');
    
    // FIX: Keep offsets within safe floating-point ranges to prevent noise tearing/stretching!
    this.offsetX = (this.seed % 10000) * 13.7;
    this.offsetY = (this.seed % 10000) * 19.3;
    
    this.TILES = CONFIG.TILE_TYPES;
    
    // --- GLOBAL STRUCTURAL MAP ---
    // Adopting the Plains map as the global standard so adjacent chunks never tear
    this.GLOBAL_ELEVATION_MAP = [
      { threshold: -0.30, tile: this.TILES.LAYER_0 },
      { threshold: -0.15, tile: this.TILES.LAYER_1 },
      { threshold: 0.25,  tile: this.TILES.LAYER_2 },
      { threshold: 0.50,  tile: this.TILES.LAYER_3 },
      { threshold: 0.75,  tile: this.TILES.LAYER_4 },
      { threshold: 1.0,   tile: this.TILES.LAYER_5 }
    ];

    // --- CHUNKING & MEMORY ---
    this.CHUNK_SIZE = 16;
    this.chunks = new Map();         // Stores active chunk metadata
    this._tileCache = new Map();     // Global fast-access tile cache
    this._biomeCache = new Map();    // Global fast-access biome cache
    this._rawElevCache = new Map();  // NEW: Caches raw noise evaluations for slope smoothing
    this.objects = new Map();        // Active global objects (by origin)
    this._collisionMap = new Map();  // O(1) Object hitboxes!
    
    // --- NOISE GENERATORS ---
    this.elevationNoise = new PerlinNoise(this.seed);
    this.temperatureNoise = new PerlinNoise(this.seed + 12345);
    this.moistureNoise = new PerlinNoise(this.seed + 54321);
  }

  _k(col, row) {
    return (col & 0xFFFF) << 16 | (row & 0xFFFF);
  }

  _s(col, row) {
    return `${col},${row}`;
  }

  // ==========================================
  // API: CHUNK GENERATOR
  // ==========================================
  ensureChunkLoaded(col, row) {
    const cx = Math.floor(col / this.CHUNK_SIZE);
    const cy = Math.floor(row / this.CHUNK_SIZE);
    const chunkKey = `${cx},${cy}`;
    if (this.chunks.has(chunkKey)) return;
    this.generateChunk(cx, cy, chunkKey);
  }

  generateChunk(cx, cy, chunkKey) {
    const startCol = cx * this.CHUNK_SIZE;
    const startRow = cy * this.CHUNK_SIZE;
    const endCol = startCol + this.CHUNK_SIZE;
    const endRow = startRow + this.CHUNK_SIZE;
    const chunk = { cx, cy, keys: [] };

    // --- NEW: PHASE 0 - PRE-STAMP STRUCTURES ---
    if (!gameState.world.generatedStructures[chunkKey]) {
      const centerCol = startCol + Math.floor(this.CHUNK_SIZE / 2);
      const centerRow = startRow + Math.floor(this.CHUNK_SIZE / 2);
      const centerBiome = this.getBiomeAt(centerCol, centerRow);
      const structRng = this.pseudoRandom(cx + 999, cy + 999);
      const structureId = centerBiome.getStructureId(structRng);
      
      if (structureId) {
        this.stampPrefab(centerCol, centerRow, structureId);
      }
      gameState.world.generatedStructures[chunkKey] = true;
    }

    // Phase 1: Pre-calculate all Tiles & Biomes (Optimized)
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const key = this._s(c, r);
        chunk.keys.push(key);
        this._biomeCache.set(key, this.getBiomeAt(c, r));
        this._tileCache.set(key, this.getTileAt(c, r));
      }
    }

    // Phase 2: Procedural Objects
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const key = this._s(c, r);
        if (this._collisionMap.has(key)) continue;
        
        const objId = this._getRawProceduralId(c, r);
        if (objId) {
          const newObj = this.createObjectInstance(c, r, objId);
          this.objects.set(key, newObj);
          
          const def = MAP_OBJECTS_DEFINITIONS[objId] || {};
          const hbX = newObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
          const hbY = newObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
          const hbW = newObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
          const hbH = newObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;
          
          for(let hr = 0; hr < hbH; hr++) {
            for(let hc = 0; hc < hbW; hc++) {
              this._collisionMap.set(this._s(c + hbX + hc, r + hbY + hr), newObj);
            }
          }
        }
      }
    }
    
    this.chunks.set(chunkKey, chunk);
  }

  stampPrefab(originCol, originRow, structureId) {
    const prefab = STRUCTURES[structureId];
    if (!prefab) return;

    const offsetX = Math.floor(prefab.width / 2);
    const offsetY = Math.floor(prefab.height / 2);

    if (prefab.terrain) {
        for (let r = 0; r < prefab.height; r++) {
            for (let c = 0; c < prefab.width; c++) {
                const worldCol = originCol - offsetX + c;
                const worldRow = originRow - offsetY + r;
                const key = this._s(worldCol, worldRow);
                
                // Stamp the override
                gameState.world.terrainOverrides[key] = prefab.terrain[r][c];

                // FIX: Invalidate caches! If a neighboring chunk pre-fetched 
                // this tile as a cliff, this forces it to recalculate and flatten.
                this._tileCache.delete(key);
                this._rawElevCache.delete(key);
            }
        }
    }

    if (prefab.objects) {
        for (const obj of prefab.objects) {
            const worldCol = originCol - offsetX + obj.c;
            const worldRow = originRow - offsetY + obj.r;
            const key = this._s(worldCol, worldRow);
            gameState.world.changes[key] = obj.id;
        }
    }
}

  // ==========================================
  // API: OVERWORLD CONTROLLER
  // ==========================================
  getBiomeAt(col, row) {
    const key = this._s(col, row);
    if (this._biomeCache.has(key)) return this._biomeCache.get(key);
    
    // FIX: Increased frequency from 0.003 to 0.015.
    // This shrinks the noise map, causing biomes to repeat more frequently like Minecraft.
    const BIOME_FREQ = 0.015;
    const rawTemp = this.temperatureNoise.get((col * BIOME_FREQ) + this.offsetX, (row * BIOME_FREQ) + this.offsetY);
    const rawMoist = this.moistureNoise.get((col * BIOME_FREQ) + this.offsetX, (row * BIOME_FREQ) + this.offsetY);
    
    const tempVal = Math.min(1, Math.max(0, (rawTemp + 0.5)));
    const moistVal = Math.min(1, Math.max(0, (rawMoist + 0.5)));
    
    return biomeFactory.determineBiome(tempVal, moistVal);
  }

  getBlendedElevationNoise(col, row) {
    const rawNoise = this.elevationNoise.get((col * 0.06) + this.offsetX, (row * 0.06) + this.offsetY);
    const centerBiome = this.getBiomeAt(col, row);
    
    // --- BORDER DAMPENING CONFIG ---
    const CHECK_RADIUS = 6;      // Total tiles affected by the border slope
    const DIRT_RADIUS = 3;       // The minimum guaranteed tiles of pure dirt
    const TARGET_DIRT_NOISE = -0.20; // Safe noise value that strictly equals LAYER_1
    
    // 1. FAST PATH: 8-Point Perimeter Check
    // Checks the cardinals and diagonals at the max radius. Because biomes are huge
    // (frequency 0.003), if all 8 points match, we are 100% safe inland.
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
    
    // 2. SLOW PATH: Find exact distance to the nearest border
    let minDistanceToBorder = CHECK_RADIUS + 1;
    for (let d = 1; d <= CHECK_RADIUS; d++) {
      let foundBorder = false;
      for (let i = -d; i <= d; i++) {
        // Check top, bottom, left, and right perimeter lines at distance 'd'
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
    
    // 3. APPLY DAMPENING MATH
    const naturalNoise = centerBiome.shapeElevation(rawNoise);
    
    if (minDistanceToBorder <= DIRT_RADIUS) {
      // Zone 1: The 3-Tile Dirt Buffer.
      // Math.min ensures we don't accidentally raise a deep water lake (-0.35) into dirt.
      return Math.min(naturalNoise, TARGET_DIRT_NOISE);
    } else if (minDistanceToBorder <= CHECK_RADIUS) {
      // Zone 2: The Transitional Slope.
      // Smoothly lerps from the dirt level back to the natural mountain height.
      const t = (minDistanceToBorder - DIRT_RADIUS) / (CHECK_RADIUS - DIRT_RADIUS + 1);
      const dampenedNoise = TARGET_DIRT_NOISE + (naturalNoise - TARGET_DIRT_NOISE) * t;
      return Math.min(naturalNoise, dampenedNoise);
    }
    
    return naturalNoise;
  }

  getTileAt(col, row) {
    const key = this._s(col, row);
    if (this._tileCache.has(key)) return this._tileCache.get(key);
    
    let finalLevel = this._getRawElevationLevel(col, row);
    // Fetch the biome to determine its unique plateau rules
    const biome = this.getBiomeAt(col, row);
    
    // Slope Enforcement: Prevent cliff overlap by forcing flat plateaus
    if (finalLevel > 2) {
      // Read from biome, falling back to 2 if not defined
      const PLATEAU_WIDTH = 2;
      const MAX_SEARCH_RADIUS = (finalLevel - 2) * PLATEAU_WIDTH;
      for (let d = 1; d <= MAX_SEARCH_RADIUS; d++) {
        let minBaseLevelAtD = 999;
        
        // Perimeter search at distance 'd'
        for (let c = -d; c <= d; c++) {
          minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + c, row - d));
          minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + c, row + d));
        }
        for (let r = -d + 1; r < d; r++) {
          minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col - d, row + r));
          minBaseLevelAtD = Math.min(minBaseLevelAtD, this._getRawElevationLevel(col + d, row + r));
        }
        
        // Cap the elevation based on distance to the lower terrain
        // If plateauWidth is 1, this immediately drops the level, creating steep cliffs
        const maxAllowedLevel = minBaseLevelAtD + Math.floor((d - 1) / PLATEAU_WIDTH) + 1;
        finalLevel = Math.min(finalLevel, maxAllowedLevel);
      }
    }
    
    return this.GLOBAL_ELEVATION_MAP[finalLevel].tile;
  }

  canMove(fromCol, fromRow, toCol, toRow, direction) {
    const fromElev = this.getElevation(fromCol, fromRow);
    const toElev = this.getElevation(toCol, toRow);

    if (toElev === -999) return false;

    const currentObj = this.getObjectAt(fromCol, fromRow);
    const targetObj = this.getObjectAt(toCol, toRow);

    const currentDef = currentObj ? MAP_OBJECTS_DEFINITIONS[currentObj.id] : null;
    const targetDef = targetObj ? MAP_OBJECTS_DEFINITIONS[targetObj.id] : null;

    const targetAllowsMove = targetDef?.isStairs && targetDef.allowedDirections.includes(direction);
    const currentAllowsMove = currentDef?.isStairs && currentDef.allowedDirections.includes(direction);

    // NEW: Allow free movement if shifting laterally across the same multi-tile stair object
    const isSameStair = (currentObj && targetObj && currentObj === targetObj && currentDef?.isStairs);

    if (targetAllowsMove || currentAllowsMove || isSameStair) {
        if (this.getSolidObjectAt(toCol, toRow)) return false;
        return true;
    }

    const depthL1 = CONFIG.TILE_DEPTH[this.TILES.LAYER_1] || 1;
    const depthL2 = CONFIG.TILE_DEPTH[this.TILES.LAYER_2] || 2;
    const isDirtToGrass = (fromElev === depthL1 && toElev === depthL2) || (fromElev === depthL2 && toElev === depthL1);

    if (fromElev !== toElev && !isDirtToGrass) return false;
    if (this.isBlockedByFace(toCol, toRow)) return false;
    if (this.getSolidObjectAt(toCol, toRow)) return false;

    return true;
}

  findSpawnPoint() {
    let radius = 0;
    while(radius < 500) {
      for (let r = -radius; r <= radius; r++) {
        for (let c = -radius; c <= radius; c++) {
          if (Math.abs(r) !== radius && Math.abs(c) !== radius) continue;
          if (this.isTileFree(c, r) && this.getElevation(c, r) === 1) return { col: c, row: r };
        }
      }
      radius++;
    }
    return { col: 0, row: 0 };
  }

  // ==========================================
  // API: MEMORY MANAGEMENT
  // ==========================================
  prune(cameraX, cameraY) {
    const TILE_SIZE = CONFIG.TILE_SIZE;
    const SAFE_DISTANCE = 2500;
    const distSq = SAFE_DISTANCE * SAFE_DISTANCE;
    
    for (const [chunkKey, chunk] of this.chunks) {
      const chunkPixelX = (chunk.cx * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
      const chunkPixelY = (chunk.cy * this.CHUNK_SIZE + (this.CHUNK_SIZE/2)) * TILE_SIZE;
      const dx = chunkPixelX - cameraX;
      const dy = chunkPixelY - cameraY;
      
      if ((dx * dx + dy * dy) > distSq) {
        for (const key of chunk.keys) {
          this._tileCache.delete(key);
          this._biomeCache.delete(key);
          this._rawElevCache.delete(key);
          if (this.objects.has(key)) {
            this.objects.delete(key);
          }
          if (this._collisionMap.has(key)) {
            this._collisionMap.delete(key);
          }
        }
        this.chunks.delete(chunkKey);
      }
    }
  }

  // ==========================================
  // API: MAP RENDERER
  // ==========================================
  getTileData(col, row) {
    this.ensureChunkLoaded(col, row);

    const tileId = this.getTileAt(col, row);
    const biome = this.getBiomeAt(col, row);
    const isBlob = CONFIG.BLOB_TILES?.includes(tileId);

    // FIX: Prevent the renderer from clipping hitbox areas under cliff walls.
    // Exception: Do not hide stairs, as they intentionally connect into the cliff face!
    let occupyingObject = this.getObjectAt(col, row);
    if (occupyingObject && !occupyingObject.isStairs && this.isBlockedByFace(col, row)) {
        occupyingObject = null;
    }

    return {
        id: tileId,
        mask: isBlob ? this.getSpecificMask(col, row, tileId) : 0,
        isBlob: isBlob,
        isWall: (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5),
        object: this.getObject(col, row),
        occupyingObject: occupyingObject, // Pass the sanitized object
        biomeId: biome.id,
        sheetId: biome.sheetId,
        objectSheetId: biome.objectSheetId
    };
}

  getSpecificMask(col, row, targetId) {
    let mask = 0;
    for (const d of MASK_DIRECTIONS) {
      const nCol = col + d.c;
      const nRow = row + d.r;
      const nId = this.getTileAt(nCol, nRow);
      
      const targetDepth = CONFIG.TILE_DEPTH[targetId] || 0;
      const neighborDepth = CONFIG.TILE_DEPTH[nId] || 0;
      const isStructuralLayer = (targetId !== this.TILES.LAYER_2);
      const isConnectingUpward = (neighborDepth > targetDepth);
      const isSameDepth = (neighborDepth === targetDepth);
      
      if (isStructuralLayer || isSameDepth || isConnectingUpward) {
        if (targetId === nId || neighborDepth >= targetDepth) mask |= d.bit;
      }
    }
    return mask;
  }

  getActiveObjects() {
    return Array.from(this.objects.values());
  }

  getVisibleObjects(camera, canvasWidth, canvasHeight) {
    const TILE_SIZE = CONFIG.TILE_SIZE;
    const scale = CONFIG.GAME_SCALE || 1;
    const startCol = Math.floor((camera.x) / TILE_SIZE) - 2;
    const endCol = startCol + Math.ceil((canvasWidth / scale) / TILE_SIZE) + 4;
    const startRow = Math.floor((camera.y) / TILE_SIZE) - 2;
    const endRow = startRow + Math.ceil((canvasHeight / scale) / TILE_SIZE) + 4;
    
    const visible = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const obj = this.getObject(c, r);
        if (obj) visible.push(obj);
      }
    }
    return visible;
  }

  // ==========================================
  // LOGIC: OBJECTS & SPAWNING
  // ==========================================
  getObject(col, row) {
    const key = this._s(col, row);
    return this.objects.get(key) || null;
  }

  _getRawProceduralId(col, row) {
    const forcedObjId = gameState.world.changes?.[this._s(col, row)];

    // 1. Handle objects forced by Structures / World Changes
    if (forcedObjId !== undefined) {
        if (forcedObjId === null) return null; // Handle explicit removals

        const def = MAP_OBJECTS_DEFINITIONS[forcedObjId] || {};

        // Block non-stair objects from spawning inside visual cliff boundaries
        if (!def.isStairs && this.isBlockedByFace(col, row)) {
            return null;
        }

        return forcedObjId;
    }

    // 2. Handle standard Procedural Generation
    const myTileId = this.getTileAt(col, row);
    const tileAboveId = this.getTileAt(col, row - 1);
    const tileTwoAboveId = this.getTileAt(col, row - 2);

    const myElev = this.getElevation(col, row);
    const elevAbove = this.getElevation(col, row - 1);
    const elevTwoAbove = this.getElevation(col, row - 2);

    if (elevAbove > myElev) {
        if (tileAboveId === this.TILES.LAYER_4 || tileAboveId === this.TILES.LAYER_5) {
            if (this.pseudoRandom(col, row) < 0.1) {
                return 'STAIRS_VERTICAL_1';
            }
        }
    }

    if (elevTwoAbove > myElev && tileTwoAboveId === this.TILES.LAYER_3 && tileAboveId !== this.TILES.LAYER_3) {
        const rightMyElev = this.getElevation(col + 1, row);
        const rightElevTwoAbove = this.getElevation(col + 1, row - 2);
        const rightTileTwoAboveId = this.getTileAt(col + 1, row - 2);
        const rightTileAboveId = this.getTileAt(col + 1, row - 1);

        const isRightSideValid = (
            rightElevTwoAbove > rightMyElev && 
            rightTileTwoAboveId === this.TILES.LAYER_3 && 
            rightTileAboveId !== this.TILES.LAYER_3
        );

        if (isRightSideValid) {
            if (this.pseudoRandom(col, row - 1) < 0.1) {
                return 'STAIRS_LARGE_VERTICAL';
            }
        }
    }

    if (this.isBlockedByFace(col, row) || this.isCliffFace(col, row) || this.isBiomeEdge(col, row)) {
        return null;
    }

    // ==========================================
    // NEW FIX: Prevent objects floating on blended edges
    // ==========================================
    const tileMask = this.getSpecificMask(col, row, myTileId);
    if (tileMask !== 255) {
        return null;
    }

    const biome = this.getBiomeAt(col, row);
    const objRng = this.pseudoRandom(col + 100, row + 100);

    let spawnCategory = myTileId;
    if (myTileId >= this.TILES.LAYER_3 && myTileId <= this.TILES.LAYER_5) {
        spawnCategory = '_WALLS';
    }

    const spawnData = biome.getSpawnId(spawnCategory, objRng, false);
    if (!spawnData) return null;

    const def = MAP_OBJECTS_DEFINITIONS[spawnData.id] || {};
    const w = def.w || def.width || 1;
    const h = def.h || def.height || 1;

    if (!this.isFootprintValid(col, row, w, h)) return null;

    return spawnData.id;
}

  _getRawElevationLevel(col, row) {
    const key = this._s(col, row);
    
    // --- NEW: Check for stamped terrains first! ---
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
    
    // Enforce 2-tile dirt buffer around water
    if (level === 2 && finalNoise < 0.00) {
      const WATER_THRESHOLD = -0.30;
      const offsets = [
        {c: -1, r: 0}, {c: 1, r: 0}, {c: 0, r: -1}, {c: 0, r: 1},
        {c: -2, r: 0}, {c: 2, r: 0}, {c: 0, r: -2}, {c: 0, r: 2},
        {c: -1, r: -1}, {c: 1, r: -1}, {c: -1, r: 1}, {c: 1, r: 1}
      ];
      
      for (const off of offsets) {
        // We directly query the noise here to prevent recursive caching loops
        if (this.getBlendedElevationNoise(col + off.c, row + off.r) < WATER_THRESHOLD) {
          level = 1;
          break;
        }
      }
    }
    
    this._rawElevCache.set(key, level);
    return level;
  }

  createObjectInstance(col, row, id) {
    const biome = this.getBiomeAt(col, row);
    return mapObjectFactory.create(id, col, row, biome);
  }

  modifyWorld(col, row, newValue) {
    const key = this._s(col, row);
    gameState.world.changes[key] = newValue;
    
    if (this.objects.has(key)) {
      const oldObj = this.objects.get(key);
      const def = MAP_OBJECTS_DEFINITIONS[oldObj.id] || {};
      const hbX = oldObj.hitbox?.xOffset ?? def.hitbox?.xOffset ?? 0;
      const hbY = oldObj.hitbox?.yOffset ?? def.hitbox?.yOffset ?? 0;
      const hbW = oldObj.hitbox?.w ?? def.hitbox?.w ?? def.w ?? 1;
      const hbH = oldObj.hitbox?.h ?? def.hitbox?.h ?? def.h ?? 1;
      
      for(let hr = 0; hr < hbH; hr++) {
        for(let hc = 0; hc < hbW; hc++) {
          const targetKey = this._s(col + hbX + hc, row + hbY + hr);
          this._collisionMap.delete(targetKey);
        }
      }
      this.objects.delete(key);
    }
  }

  // ==========================================
  // LOGIC: PHYSICS & COLLISION
  // ==========================================
  getObjectAt(col, row) {
    this.ensureChunkLoaded(col, row);
    return this._collisionMap.get(this._s(col, row)) || null;
  }

  getSolidObjectAt(col, row) {
    const obj = this.getObjectAt(col, row);
    if (obj && obj.isSolid !== false) return obj;
    return null;
  }

  isTileFree(col, row) {
    const tileId = this.getTileAt(col, row);
    if (tileId === this.TILES.LAYER_0) return false;
    if (tileId >= this.TILES.LAYER_3 && tileId <= this.TILES.LAYER_5) return false;
    if (this.isBlockedByFace(col, row) || this.isBiomeEdge(col, row)) return false;
    if (this.getSolidObjectAt(col, row)) return false;
    return true;
  }

  isFootprintValid(col, row, w, h) {
    const elev = this.getElevation(col, row);
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (c === col && r === row) continue;
        if (this.getElevation(c, r) !== elev || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this.isBiomeEdge(c, r)) return false;
      }
    }
    return true;
  }

  getLightObjects(camera, canvasWidth, canvasHeight) {
    const TILE_SIZE = CONFIG.TILE_SIZE;
    const scale = CONFIG.GAME_SCALE || 1;
    const LIGHT_PAD = 15;
    const startCol = Math.floor(camera.x / TILE_SIZE) - LIGHT_PAD;
    const endCol = startCol + Math.ceil((canvasWidth / scale) / TILE_SIZE) + (LIGHT_PAD * 2);
    const startRow = Math.floor(camera.y / TILE_SIZE) - LIGHT_PAD;
    const endRow = startRow + Math.ceil((canvasHeight / scale) / TILE_SIZE) + (LIGHT_PAD * 2);
    
    const lightObjects = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const obj = this.getObject(c, r);
        if (obj && obj.light && obj.light.hasLight) {
          lightObjects.push(obj);
        }
      }
    }
    return lightObjects;
  }

  getElevation(col, row) {
    const id = this.getTileAt(col, row);
    if (id === this.TILES.LAYER_0) return -999;
    return CONFIG.TILE_DEPTH[id] || 0;
  }

  getWallFaceDepth(tileId) {
    if (tileId === this.TILES.LAYER_3) return 2;
    if (tileId === this.TILES.LAYER_4 || tileId === this.TILES.LAYER_5) return 1;
    return 0;
  }

  isBlockedByFace(col, row) {
    const myElev = this.getElevation(col, row);
    const check = (rOffset, depthReq) => {
      const nTile = this.getTileAt(col, row - rOffset);
      return (this.getElevation(col, row - rOffset) > myElev && this.getWallFaceDepth(nTile) >= depthReq);
    };
    return check(1, 1) || check(2, 2);
  }

  isCliffFace(col, row) {
    const elev = this.getElevation(col, row);
    if (elev <= 0) return false;
    const depth = this.getWallFaceDepth(this.getTileAt(col, row));
    for (let i = 1; i <= depth; i++) {
      if (this.getElevation(col, row + i) < elev) return true;
    }
    return false;
  }

  isBiomeEdge(col, row) {
    const myBiomeId = this.getBiomeAt(col, row).id;
    const myD = CONFIG.TILE_DEPTH[this.getTileAt(col, row)] || 0;
    const check = (c, r) => {
      return ((CONFIG.TILE_DEPTH[this.getTileAt(c, r)] || 0) < myD) || (this.getBiomeAt(c, r).id !== myBiomeId);
    };
    return check(col, row-1) || check(col+1, row) || check(col, row+1) || check(col-1, row);
  }

  pseudoRandom(col, row) {
    const dot = col * 12.9898 + row * 78.233 + this.seed;
    const sin = Math.sin(dot) * 43758.5453;
    return sin - Math.floor(sin);
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

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

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