import { CONFIG } from '../../../../shared/data/constants.js';
import { SPRITES } from '../../../../shared/data/sprites.js';
import { gameState } from '../../../../shared/state/gameState.js';

export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config || CONFIG; 
        this.ctx.imageSmoothingEnabled = false;

        this.shadowImage = this.loader.get('shadows'); 
        this.fallbackTileset = this.loader.get('plains'); 
        
        this.fallbackObjects = this.loader.get('plainsMapObjects') || this.loader.get('spritesheet');

        this.blobMap = new Map();
        this.shadowOverrides = new Map();
        
        // PERFORMANCE: Cache the render array to prevent Garbage Collection stutter
        this.renderList = [];
        
        this.initBlobTables();
    }

    // ==========================================
    // 1. MAIN RENDER PIPELINE
    // ==========================================

    // ADDED: interpolationFactor passed down from GameLoop
    renderMap(worldManager, camera, entities = [], totalTime = 0, interpolationFactor = 1) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const bounds = this.getViewBounds(camera);

        this.renderTerrainPass(worldManager, camera, bounds, totalTime);
        this.renderSortedPass(worldManager, camera, bounds, entities, totalTime, interpolationFactor);
    }

    // ==========================================
    // 2. PASS: TERRAIN (Unsorted / Flat)
    // ==========================================

    renderTerrainPass(worldManager, camera, bounds, totalTime) {
        const { TILE_TYPES, TILE_DEPTH } = this.config;

        // Cache depths for cleaner logic
        const DEPTH_L0 = TILE_DEPTH[TILE_TYPES.LAYER_0] || 0;
        const DEPTH_L1 = TILE_DEPTH[TILE_TYPES.LAYER_1] || 1;
        const DEPTH_L2 = TILE_DEPTH[TILE_TYPES.LAYER_2] || 2;

        for (let row = bounds.startRow; row < bounds.endRow; row++) {
            for (let col = bounds.startCol; col < bounds.endCol; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const depth = TILE_DEPTH[tileData.id] || 0;
                const coords = this.getDrawCoords(col, row, camera);
                const sheetId = tileData.sheetId || 'tileset';

                // 1. Water Base Layer
                // We draw water if the tile is Water (0) OR Dirt (1) 
                // This ensures dirt coastlines have water underneath their transparent edges.
                if (depth === DEPTH_L0 || depth === DEPTH_L1) {
                    const waterFrame = this.getWaterFrame(col, row, totalTime);
                    this.drawTile(TILE_TYPES.LAYER_0, waterFrame, coords.x, coords.y, sheetId);
                }

                // 2. Dirt Underlay for Grass & Cliffs
                // If the tile is Grass (Layer 2) or higher, we MUST draw dirt underneath 
                // so the transparent grass edges blend into dirt, not black space.
                if (depth >= DEPTH_L2) {
                    const dirtMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                    const dirtIdx = this.blobMap.get(dirtMask) ?? 14;
                    this.drawTile(TILE_TYPES.LAYER_1, dirtIdx, coords.x, coords.y, sheetId);
                }

                // 3. The Actual Tile Surface
                // As long as the tile isn't Water (which we already drew in Step 1), draw it!
                // This will draw Dirt on Dirt tiles, Grass on Grass tiles, etc.
                if (tileData.id !== TILE_TYPES.LAYER_0) {
                    const idx = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(tileData.id, idx, coords.x, coords.y, sheetId);
                }

                // 4. Shadows & Ground Objects
                this.drawShadows(worldManager, col, row, coords.x, coords.y, depth);

                if (tileData.object && tileData.object.isGround) {
                    this.drawObject(tileData.object, coords.x, coords.y, totalTime, tileData.objectSheetId);
                }
            }
        }
    }

    // ==========================================
    // 3. PASS: SORTED (Vertical Elements)
    // ==========================================

    renderSortedPass(worldManager, camera, bounds, entities, totalTime, interpolationFactor) {
        // PERFORMANCE FIX: Empty the pre-allocated array instead of declaring a new one
        this.renderList.length = 0;
        
        const { TILE_SIZE, GAME_SCALE } = this.config;

        // A. Collect Wall Faces
        this.collectWallFaces(worldManager, bounds, camera, this.renderList);

        // B. Collect Objects
        const objects = worldManager.getActiveObjects ? worldManager.getActiveObjects() : [];
        for (const obj of objects) {
            if (obj.isGround || !obj.isAnchor) continue;
            if (this.isInBounds(obj.col, obj.row, bounds)) {
                const coords = this.getDrawCoords(obj.col, obj.row, camera);
                const tileData = worldManager.getTileData(obj.col, obj.row);
                
                const visualBottomOffset = obj.h || 1;
                
                this.renderList.push({
                    y: ((obj.row + visualBottomOffset) * TILE_SIZE * GAME_SCALE) + 0.1,
                    type: 'OBJECT',
                    data: obj,
                    x: coords.x,
                    dy: coords.y,
                    objectSheetId: tileData.objectSheetId 
                });
            }
        }

        // C. Collect Entities
        for (const entity of entities) {
            let entityHitboxBottom = 1;
            if (entity.hitbox) {
                const yOff = entity.hitbox.yOffset !== undefined ? entity.hitbox.yOffset : (entity.hitbox.y || 0);
                entityHitboxBottom = yOff + (entity.hitbox.h || 1);
            }
            
            this.renderList.push({
                y: (entity.y + (entityHitboxBottom * TILE_SIZE)) * GAME_SCALE,
                type: 'ENTITY',
                data: entity
            });
        }

        // D. Sort & Draw
        this.renderList.sort((a, b) => a.y - b.y);

        for (const item of this.renderList) {
            if (item.type === 'WALL_FACE') {
                this.drawTile(item.data.id, item.data.idx, item.x, item.dy, item.sheetId);
            } else if (item.type === 'OBJECT') {
                this.drawObject(item.data, item.x, item.dy, totalTime, item.objectSheetId);
            } else if (item.type === 'ENTITY') {
                // Pass interpolation down to the entity drawing
                this.drawEntity(item.data, camera, interpolationFactor);
            }
        }
    }

    // ==========================================
    // 4. DRAWING PRIMITIVES
    // ==========================================

    drawTile(typeId, index, dx, dy, sheetId) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        
        let source;
        if (sheetId === 'shadows') {
            source = this.shadowImage;
        } else {
            source = this.loader.get(sheetId) || this.fallbackTileset;
        }
        
        if (!source) return;

        const drawSize = TILE_SIZE * GAME_SCALE;
        const slotSize = TILE_SIZE + (TILE_PADDING * 2);

        let startRow = 0;
        if (sheetId !== 'shadows' && BLOB_OFFSETS?.[typeId] !== undefined) {
            startRow = BLOB_OFFSETS[typeId];
        }

        const sx = ((index % 8) * slotSize) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * slotSize) + TILE_PADDING;

        this.ctx.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawObject(obj, dx, dy, totalTime = 0, objectSheetId = null) {
        const spriteKey = obj.spriteKey || obj.type || obj.id;
        const sprite = SPRITES[spriteKey];
        
        if (!sprite) {
            console.warn(`[MapRenderer] Missing sprite definition for: ${spriteKey}`);
            return;
        }
        
        const sheetToUse = obj.sheetId || objectSheetId;
        const imageSource = sheetToUse ? (this.loader.get(sheetToUse) || this.fallbackObjects) : this.fallbackObjects;
        
        if (!imageSource) return;

        const { OBJECT_SIZE, GAME_SCALE } = this.config;
        let frameOffset = 0;

        if (sprite.frames > 1) {
            const speed = sprite.speed || 0.2;
            frameOffset = Math.floor(totalTime / speed) % sprite.frames;
        }

        const sx = (sprite.x + frameOffset) * OBJECT_SIZE;
        const sy = sprite.y * OBJECT_SIZE;
        const dW = sprite.w * OBJECT_SIZE * GAME_SCALE;
        const dH = sprite.h * OBJECT_SIZE * GAME_SCALE;
        
        this.ctx.drawImage(imageSource, sx, sy, sprite.w * OBJECT_SIZE, sprite.h * OBJECT_SIZE, 
                           Math.floor(dx), Math.floor(dy), dW, dH);
    }

    drawEntity(entity, camera, interpolationFactor = 1) {
        const sprite = this.loader.get(gameState.party.members[0].spriteOverworld);
        if (!sprite) return;

        const { TILE_SIZE, GAME_SCALE } = this.config;
        
        // INTERPOLATION: Smooth out entity movement based on physics fixed delta
        const renderX = entity.prevX !== undefined 
            ? entity.prevX + (entity.x - entity.prevX) * interpolationFactor 
            : entity.x;
            
        const renderY = entity.prevY !== undefined 
            ? entity.prevY + (entity.y - entity.prevY) * interpolationFactor 
            : entity.y;

        const camX = Math.floor(camera.x);
        const camY = Math.floor(camera.y);

        const dx = Math.floor((renderX - camX) * GAME_SCALE);
        const dy = Math.floor((renderY - camY) * GAME_SCALE);
        const drawSize = TILE_SIZE * GAME_SCALE;

        const rowMap = { 
            "UP": 1,
            "DOWN": 0,
            "LEFT": 2, 
            "RIGHT": 3 
        };
        
        const sx = (entity.animFrame || 0) * TILE_SIZE;
        const sy = (rowMap[entity.direction] ?? 0) * TILE_SIZE;

        this.ctx.drawImage(sprite, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawShadows(worldManager, col, row, dx, dy, currentDepth) {
        const { TILE_TYPES, TILE_DEPTH } = this.config;

        if (currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_0] || 
            currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_1]) return;

        const getDepth = (c, r) => {
            const t = worldManager.getTileAt(c, r);
            return (t !== null && t !== undefined) ? (TILE_DEPTH[t] || 0) : 0;
        };

        const DEPTH_L3 = TILE_DEPTH[TILE_TYPES.LAYER_3]; 
        const DEPTH_L4 = TILE_DEPTH[TILE_TYPES.LAYER_4]; 
        const DEPTH_L5 = TILE_DEPTH[TILE_TYPES.LAYER_5]; 

        const nDepth1 = getDepth(col, row - 1);
        const nDepth2 = getDepth(col, row - 2);

        if (nDepth1 > currentDepth && (nDepth1 === DEPTH_L4 || nDepth1 === DEPTH_L5 || nDepth1 === DEPTH_L3)) return;
        if (nDepth2 > currentDepth && nDepth2 === DEPTH_L3) return;

        const castsShadow = (tx, ty) => {
            const d0 = getDepth(tx, ty);
            if (d0 > currentDepth) return true;
            const d1 = getDepth(tx, ty - 1);
            if (d1 > currentDepth && (d1 === DEPTH_L4 || d1 === DEPTH_L5 || d1 === DEPTH_L3)) return true;
            const d2 = getDepth(tx, ty - 2);
            if (d2 > currentDepth && d2 === DEPTH_L3) return true;
            return false;
        };

        let mask = 0;
        const bits = this.BITS;

        if (castsShadow(col, row - 1))     mask |= bits.TOP;
        if (castsShadow(col + 1, row - 1)) mask |= bits.TOP_RIGHT;
        if (castsShadow(col + 1, row))     mask |= bits.RIGHT;
        if (castsShadow(col + 1, row + 1)) mask |= bits.BOTTOM_RIGHT;
        if (castsShadow(col, row + 1))     mask |= bits.BOTTOM;
        if (castsShadow(col - 1, row + 1)) mask |= bits.BOTTOM_LEFT;
        if (castsShadow(col - 1, row))     mask |= bits.LEFT;
        if (castsShadow(col - 1, row - 1)) mask |= bits.TOP_LEFT;

        if (mask === 0) return;

        const idx = this.shadowOverrides.get(mask) ?? this.blobMap.get(mask) ?? 14; 
        this.drawTile(null, idx, dx, dy, 'shadows');
    }

    // ==========================================
    // 5. HELPERS
    // ==========================================

    getViewBounds(camera) {
        const { TILE_SIZE, GAME_SCALE, WALL_HEIGHT } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const VIEW_PAD = 2;
        const OBJ_PAD = 8;
        const h = WALL_HEIGHT || 2;

        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_PAD * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_PAD * 2) + h;
        
        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_PAD;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_PAD - h;

        return {
            startCol, startRow,
            endCol: startCol + tilesX,
            endRow: startRow + tilesY,
            objStartCol: startCol - (OBJ_PAD - VIEW_PAD),
            objEndCol: startCol + tilesX + (OBJ_PAD - VIEW_PAD),
            objStartRow: startRow - (OBJ_PAD - VIEW_PAD),
            objEndRow: startRow + tilesY + (OBJ_PAD - VIEW_PAD)
        };
    }

    isInBounds(col, row, bounds) {
        return col >= bounds.objStartCol && col <= bounds.objEndCol &&
               row >= bounds.objStartRow && row <= bounds.objEndRow;
    }

    getDrawCoords(col, row, camera) {
        const { TILE_SIZE, GAME_SCALE } = this.config;
        
        // VISUAL FIX: Floor the camera coordinates first to prevent sub-pixel gaps/tearing
        const camX = Math.floor(camera.x);
        const camY = Math.floor(camera.y);
        
        return {
            x: Math.floor((col * TILE_SIZE - camX) * GAME_SCALE),
            y: Math.floor((row * TILE_SIZE - camY) * GAME_SCALE)
        };
    }

    getWaterFrame(col, row, totalTime) {
        const { WATER_ANIMATION } = this.config;
        if (!WATER_ANIMATION) return 0;
        
        const hash = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453);
        const adjustedTime = totalTime + hash;
        const step = Math.floor(adjustedTime / WATER_ANIMATION.SPEED);
        
        const frames = WATER_ANIMATION.FRAMES;
        return frames[step % frames.length];
    }

    collectWallFaces(worldManager, bounds, camera, list) {
        const { TILE_TYPES, TILE_DEPTH, WALL_HEIGHT, TILE_SIZE, GAME_SCALE } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;

        for (let row = bounds.startRow; row < bounds.endRow; row++) {
            for (let col = bounds.startCol; col < bounds.endCol; col++) {
                const tileData = worldManager.getTileData(col, row);
                if (!tileData.isWall) continue;

                const myDepth = TILE_DEPTH[tileData.id];
                const coords = this.getDrawCoords(col, row, camera);

                for (let d = 1; d <= (WALL_HEIGHT || 2); d++) {
                    const belowId = worldManager.getTileAt(col, row + d);
                    const belowDepth = TILE_DEPTH[belowId] || 0;

                    if (belowDepth >= myDepth) break;

                    const isFoot = (d === (WALL_HEIGHT || 2)) || (belowDepth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                    const faceIdx = this.getFaceIndex(tileData.mask, isFoot);

                    list.push({
                        y: ((row + d + 1) * TILE_SIZE * GAME_SCALE) + 0.1,
                        type: 'WALL_FACE',
                        data: { id: tileData.id, idx: faceIdx },
                        x: coords.x,
                        dy: coords.y + (d * drawSize),
                        sheetId: tileData.sheetId 
                    });

                    if (isFoot) break;
                }
            }
        }
    }

    getFaceIndex(mask, isFoot) {
        const { LEFT, RIGHT } = this.BITS;
        const rowStart = isFoot ? 56 : 48;
        const hasLeft = !!(mask & LEFT);
        const hasRight = !!(mask & RIGHT);

        if (hasLeft && hasRight) return rowStart + 1; 
        if (!hasLeft && hasRight) return rowStart + 0; 
        if (hasLeft && !hasRight) return rowStart + 2; 
        return rowStart + 3; 
    }

    initBlobTables() {
        this.BITS = { TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8, BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128 };
        const TILE_LOOKUP = { 0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38, 7: 21, 28: 5, 112: 7, 193: 23, 31: 13, 124: 6, 241: 15, 199: 22, 255: 14, 23: 25, 29: 33, 71: 18, 87: 27, 92: 10, 93: 19, 95: 39, 113: 34, 116: 9, 117: 20, 119: 36, 121: 46, 125: 46, 127: 47, 197: 17, 209: 26, 213: 28, 215: 30, 221: 35, 223: 31, 245: 37, 247: 29, 251: 15, 253: 45, 254: 31 };

        for (let i = 0; i < 256; i++) {
            let m = i;
            if (!(i & 1) || !(i & 4)) m &= ~2; 
            if (!(i & 4) || !(i & 16)) m &= ~8; 
            if (!(i & 16) || !(i & 64)) m &= ~32; 
            if (!(i & 64) || !(i & 1)) m &= ~128; 
            this.blobMap.set(i, TILE_LOOKUP[m] ?? 14);
        }

        const overrides = [[2,26],[8,29],[32,28],[128,27],[10,29],[40,29],[160,28],[130,27],[170,26]];
        overrides.forEach(([k, v]) => this.shadowOverrides.set(k, v));
    }
}