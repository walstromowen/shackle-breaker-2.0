import { CONFIG } from '../../../../shared/data/constants.js';
import { gameState } from '../../../../shared/state/gameState.js';
// SPRITES import successfully eradicated!

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
        
        // PERFORMANCE: Cached objects to prevent Garbage Collection allocations
        this.renderList = []; 
        this._cachedBounds = {}; 
        
        this.initBlobTables();
    }

    // ==========================================
    // 1. MAIN RENDER PIPELINE
    // ==========================================

    renderMap(worldManager, camera, entities = [], interpolationFactor = 1, totalTime = 0) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Interpolate the camera so the entire terrain pans smoothly!
        const interpCamX = camera.prevX !== undefined 
            ? camera.prevX + (camera.x - camera.prevX) * interpolationFactor 
            : camera.x;
            
        const interpCamY = camera.prevY !== undefined 
            ? camera.prevY + (camera.y - camera.prevY) * interpolationFactor 
            : camera.y;
            
        const renderCamera = { x: interpCamX, y: interpCamY };

        // Updates bounds directly onto a cached object to avoid allocations
        const bounds = this.updateViewBounds(renderCamera);

        // Pass the SMOOTH renderCamera down to the passes
        this.renderTerrainPass(worldManager, renderCamera, bounds, totalTime);
        this.renderSortedPass(worldManager, renderCamera, bounds, entities, totalTime, interpolationFactor);
    }

    // ==========================================
    // 2. PASS: TERRAIN (Unsorted / Flat)
    // ==========================================

    renderTerrainPass(worldManager, camera, bounds, totalTime) {
        const { TILE_TYPES, TILE_DEPTH, TILE_SIZE, GAME_SCALE } = this.config;

        const DEPTH_L0 = TILE_DEPTH[TILE_TYPES.LAYER_0] || 0;
        const DEPTH_L1 = TILE_DEPTH[TILE_TYPES.LAYER_1] || 1;
        const DEPTH_L2 = TILE_DEPTH[TILE_TYPES.LAYER_2] || 2;

        const camX = camera.x;
        const camY = camera.y;

        // --- NEW FIX: Queue ground objects to draw AFTER all terrain is rendered ---
        const groundObjectsQueue = [];

        for (let row = bounds.startRow; row < bounds.endRow; row++) {
            for (let col = bounds.startCol; col < bounds.endCol; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const depth = TILE_DEPTH[tileData.id] || 0;
                const sheetId = tileData.sheetId || 'tileset';

                const dx = Math.round((col * TILE_SIZE - camX) * GAME_SCALE);
                const dy = Math.round((row * TILE_SIZE - camY) * GAME_SCALE);

                // 1. Water Base Layer
                if (depth === DEPTH_L0 || depth === DEPTH_L1) {
                    const waterFrame = this.getWaterFrame(col, row, totalTime);
                    this.drawTile(TILE_TYPES.LAYER_0, waterFrame, dx, dy, sheetId);
                }

                // 2. Dirt Underlay for Grass & Cliffs
                if (depth >= DEPTH_L2) {
                    const dirtMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                    const dirtIdx = this.blobMap.get(dirtMask) ?? 14;
                    this.drawTile(TILE_TYPES.LAYER_1, dirtIdx, dx, dy, sheetId);
                }

                // 3. The Actual Tile Surface
                if (tileData.id !== TILE_TYPES.LAYER_0) {
                    const idx = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(tileData.id, idx, dx, dy, sheetId);
                }

                // 4. Shadows
                this.drawShadows(worldManager, col, row, dx, dy, depth);

                // 5. Reconstruct Cliff Faces under stairs
                const obj = tileData.object || tileData.occupyingObject;
                if (obj && obj.isGround && obj.isStairs) {
                    const h = this.config.WALL_HEIGHT || 2;
                    let foundWall = null;
                    let foundDist = 0;
                    
                    for (let d = 1; d <= h; d++) {
                        const aboveTileData = worldManager.getTileData(col, row - d);
                        if (aboveTileData && aboveTileData.isWall) {
                            foundWall = aboveTileData;
                            foundDist = d;
                            break; 
                        }
                    }

                    if (foundWall) {
                        const aboveDepth = TILE_DEPTH[foundWall.id] || 0;
                        if (aboveDepth > depth) {
                            for (let d = 1; d <= foundDist; d++) {
                                const faceDrawY = dy - ((foundDist - d) * TILE_SIZE * GAME_SCALE);
                                const isFoot = (d === foundDist) || (depth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                                const faceIdx = this.getFaceIndex(foundWall.mask, isFoot);
                                
                                this.drawTile(foundWall.id, faceIdx, dx, faceDrawY, foundWall.sheetId);
                            }
                        }
                    }
                }

                // --- NEW FIX: Push the object to the queue instead of drawing it immediately ---
                if (tileData.object && tileData.object.isGround) {
                    groundObjectsQueue.push({
                        obj: tileData.object,
                        dx: dx,
                        dy: dy,
                        sheetId: tileData.objectSheetId
                    });
                }
            }
        }

        // --- NEW FIX: Draw all queued ground objects on top of the finished terrain ---
        for (let i = 0; i < groundObjectsQueue.length; i++) {
            const item = groundObjectsQueue[i];
            this.drawObject(item.obj, item.dx, item.dy, totalTime, item.sheetId);
        }
    }

    // ==========================================
    // 3. PASS: SORTED (Vertical Elements)
    // ==========================================

    renderSortedPass(worldManager, camera, bounds, entities, totalTime, interpolationFactor) {
        let renderIdx = 0; // Tracks our position in the object pool
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const camX = camera.x;
        const camY = camera.y;

        // A. Collect Wall Faces
        renderIdx = this.collectWallFaces(worldManager, bounds, camera, renderIdx);

        // B. Collect Objects
        const objects = worldManager.getActiveObjects ? worldManager.getActiveObjects() : [];
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (obj.isGround || !obj.isAnchor) continue;
            
            if (this.isInBounds(obj.col, obj.row, bounds)) {
                const tileData = worldManager.getTileData(obj.col, obj.row);
                
                // FIX: Force the Y-sort anchor to the bottom of the single anchor tile.
                // Previously, obj.h caused tall objects to sort as if they were lower on the screen.
                const visualBottomOffset = 1; 
                
                // Object Pooling: Reuse existing object or create new one if needed
                if (!this.renderList[renderIdx]) this.renderList[renderIdx] = {};
                const item = this.renderList[renderIdx++];
                
                item.y = ((obj.row + visualBottomOffset) * TILE_SIZE * GAME_SCALE) + 0.1;
                item.type = 'OBJECT';
                item.data = obj;
                item.x = Math.round((obj.col * TILE_SIZE - camX) * GAME_SCALE);
                item.dy = Math.round((obj.row * TILE_SIZE - camY) * GAME_SCALE);
                item.objectSheetId = tileData.objectSheetId;
            }
        }

        // C. Collect Entities
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            let entityHitboxBottom = 1;
            if (entity.hitbox) {
                const yOff = entity.hitbox.yOffset !== undefined ? entity.hitbox.yOffset : (entity.hitbox.y || 0);
                entityHitboxBottom = yOff + (entity.hitbox.h || 1);
            }
            
            if (!this.renderList[renderIdx]) this.renderList[renderIdx] = {};
            const item = this.renderList[renderIdx++];
            
            item.y = (entity.y + (entityHitboxBottom * TILE_SIZE)) * GAME_SCALE;
            item.type = 'ENTITY';
            item.data = entity;
        }

        // D. Sort & Draw
        this.renderList.length = renderIdx;
        this.renderList.sort((a, b) => a.y - b.y);

        for (let i = 0; i < renderIdx; i++) {
            const item = this.renderList[i];
            if (item.type === 'WALL_FACE') {
                this.drawTile(item.data.id, item.data.idx, item.x, item.dy, item.sheetId);
            } else if (item.type === 'OBJECT') {
                this.drawObject(item.data, item.x, item.dy, totalTime, item.objectSheetId);
            } else if (item.type === 'ENTITY') {
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
        const sy = (((index / 8) | 0) + startRow) * slotSize + TILE_PADDING;

        this.ctx.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawObject(obj, dx, dy, totalTime = 0, objectSheetId = null) {
        const sheetToUse = obj.sheetId || objectSheetId;
        const imageSource = sheetToUse ? (this.loader.get(sheetToUse) || this.fallbackObjects) : this.fallbackObjects;
        
        const { OBJECT_SIZE, GAME_SCALE } = this.config;
        
        const wTiles = obj.w || 1;
        const hTiles = obj.h || 1;

        const dW = wTiles * OBJECT_SIZE * GAME_SCALE;
        const dH = hTiles * OBJECT_SIZE * GAME_SCALE;

        // Shift tall objects UP so they anchor at the bottom tile instead of hanging downward
        const drawY = dy - ((hTiles - 1) * OBJECT_SIZE * GAME_SCALE);

        if (!imageSource) return;

        let frameOffset = 0;

        if (obj.frames > 1) {
            const speed = obj.speed || 0.2;
            frameOffset = ((totalTime / speed) | 0) % obj.frames;
        }

        const sx = ((obj.spriteX || 0) + frameOffset) * OBJECT_SIZE;
        const sy = (obj.spriteY || 0) * OBJECT_SIZE;
        
        this.ctx.drawImage(imageSource, sx, sy, wTiles * OBJECT_SIZE, hTiles * OBJECT_SIZE, dx, drawY, dW, dH);
    }

    drawEntity(entity, camera, interpolationFactor = 1) {
        const sprite = this.loader.get(gameState.party.members[0].spriteOverworld);
        if (!sprite) return;

        const { TILE_SIZE, GAME_SCALE } = this.config;
        
        const renderX = entity.prevX !== undefined 
            ? entity.prevX + (entity.x - entity.prevX) * interpolationFactor 
            : entity.x;
            
        const renderY = entity.prevY !== undefined 
            ? entity.prevY + (entity.y - entity.prevY) * interpolationFactor 
            : entity.y;

        const dx = Math.round((renderX - camera.x) * GAME_SCALE);
        const dy = Math.round((renderY - camera.y) * GAME_SCALE);
        const drawSize = TILE_SIZE * GAME_SCALE;

        const rowMap = { "UP": 1, "DOWN": 0, "LEFT": 2, "RIGHT": 3 };
        const sx = (entity.animFrame || 0) * TILE_SIZE;
        const sy = (rowMap[entity.direction] ?? 0) * TILE_SIZE;

        this.ctx.drawImage(sprite, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    // ==========================================
    // 5. SHADOW LOGIC & HELPERS
    // ==========================================

    drawShadows(worldManager, col, row, dx, dy, currentDepth) {
        const { TILE_TYPES, TILE_DEPTH } = this.config;

        if (currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_0] || 
            currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_1]) return;

        const DEPTH_L3 = TILE_DEPTH[TILE_TYPES.LAYER_3]; 
        const DEPTH_L4 = TILE_DEPTH[TILE_TYPES.LAYER_4]; 
        const DEPTH_L5 = TILE_DEPTH[TILE_TYPES.LAYER_5]; 

        const nDepth1 = this._getDepth(worldManager, col, row - 1);
        const nDepth2 = this._getDepth(worldManager, col, row - 2);

        if (nDepth1 > currentDepth && (nDepth1 === DEPTH_L4 || nDepth1 === DEPTH_L5 || nDepth1 === DEPTH_L3)) return;
        if (nDepth2 > currentDepth && nDepth2 === DEPTH_L3) return;

        let mask = 0;
        const bits = this.BITS;

        if (this._castsShadow(worldManager, col, row - 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5))    mask |= bits.TOP;
        if (this._castsShadow(worldManager, col + 1, row - 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5)) mask |= bits.TOP_RIGHT;
        if (this._castsShadow(worldManager, col + 1, row, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5))    mask |= bits.RIGHT;
        if (this._castsShadow(worldManager, col + 1, row + 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5)) mask |= bits.BOTTOM_RIGHT;
        if (this._castsShadow(worldManager, col, row + 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5))    mask |= bits.BOTTOM;
        if (this._castsShadow(worldManager, col - 1, row + 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5)) mask |= bits.BOTTOM_LEFT;
        if (this._castsShadow(worldManager, col - 1, row, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5))    mask |= bits.LEFT;
        if (this._castsShadow(worldManager, col - 1, row - 1, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5)) mask |= bits.TOP_LEFT;

        if (mask === 0) return;

        const idx = this.shadowOverrides.get(mask) ?? this.blobMap.get(mask) ?? 14; 
        this.drawTile(null, idx, dx, dy, 'shadows');
    }

    _getDepth(worldManager, c, r) {
        const t = worldManager.getTileAt(c, r);
        return (t !== null && t !== undefined) ? (this.config.TILE_DEPTH[t] || 0) : 0;
    }

    _castsShadow(worldManager, tx, ty, currentDepth, DEPTH_L3, DEPTH_L4, DEPTH_L5) {
        const d0 = this._getDepth(worldManager, tx, ty);
        if (d0 > currentDepth) return true;
        const d1 = this._getDepth(worldManager, tx, ty - 1);
        if (d1 > currentDepth && (d1 === DEPTH_L4 || d1 === DEPTH_L5 || d1 === DEPTH_L3)) return true;
        const d2 = this._getDepth(worldManager, tx, ty - 2);
        if (d2 > currentDepth && d2 === DEPTH_L3) return true;
        return false;
    }

    updateViewBounds(camera) {
        const { TILE_SIZE, GAME_SCALE, WALL_HEIGHT } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const VIEW_PAD = 2;
        const OBJ_PAD = 8;
        const h = WALL_HEIGHT || 2;

        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_PAD * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_PAD * 2) + h;
        
        const startCol = ((camera.x / TILE_SIZE) | 0) - VIEW_PAD;
        const startRow = ((camera.y / TILE_SIZE) | 0) - VIEW_PAD - h;

        this._cachedBounds.startCol = startCol;
        this._cachedBounds.startRow = startRow;
        this._cachedBounds.endCol = startCol + tilesX;
        this._cachedBounds.endRow = startRow + tilesY;
        this._cachedBounds.objStartCol = startCol - (OBJ_PAD - VIEW_PAD);
        this._cachedBounds.objEndCol = startCol + tilesX + (OBJ_PAD - VIEW_PAD);
        this._cachedBounds.objStartRow = startRow - (OBJ_PAD - VIEW_PAD);
        this._cachedBounds.objEndRow = startRow + tilesY + (OBJ_PAD - VIEW_PAD);

        return this._cachedBounds;
    }

    isInBounds(col, row, bounds) {
        return col >= bounds.objStartCol && col <= bounds.objEndCol &&
               row >= bounds.objStartRow && row <= bounds.objEndRow;
    }

    getWaterFrame(col, row, totalTime) {
        const { WATER_ANIMATION } = this.config;
        if (!WATER_ANIMATION) return 0;
        
        const hash = Math.abs(Math.sin(col * 12.9898 + row * 78.233) * 43758.5453);
        const step = ((totalTime + hash) / WATER_ANIMATION.SPEED) | 0;
        
        const frames = WATER_ANIMATION.FRAMES;
        return frames[step % frames.length];
    }

    collectWallFaces(worldManager, bounds, camera, renderIdx) {
        const { TILE_TYPES, TILE_DEPTH, WALL_HEIGHT, TILE_SIZE, GAME_SCALE } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const camX = camera.x;
        const camY = camera.y;
        const h = WALL_HEIGHT || 2;

        for (let row = bounds.startRow; row < bounds.endRow; row++) {
            for (let col = bounds.startCol; col < bounds.endCol; col++) {
                const tileData = worldManager.getTileData(col, row);
                if (!tileData.isWall) continue;

                const myDepth = TILE_DEPTH[tileData.id];
                const dx = Math.round((col * TILE_SIZE - camX) * GAME_SCALE);
                const dy = Math.round((row * TILE_SIZE - camY) * GAME_SCALE);

                // --- NEW LOGIC: Pre-check if ANY tile below has stairs ---
                // If stairs exist anywhere on this wall, let the Terrain Pass handle it.
                let stairBlocksWall = false;
                for (let d = 1; d <= h; d++) {
                    const checkTile = worldManager.getTileData(col, row + d);
                    if (checkTile) {
                        const obj = checkTile.occupyingObject || checkTile.object;
                        if (obj && obj.isStairs) {
                            stairBlocksWall = true;
                            break;
                        }
                    }
                }

                if (stairBlocksWall) continue; // Skip rendering this entire wall in the sorted pass

                // Otherwise, process and sort faces normally
                for (let d = 1; d <= h; d++) {
                    const belowTileData = worldManager.getTileData(col, row + d);
                    if (!belowTileData) break;
                    
                    const belowDepth = TILE_DEPTH[belowTileData.id] || 0;
                    if (belowDepth >= myDepth) break;

                    const isFoot = (d === h) || (belowDepth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                    const faceIdx = this.getFaceIndex(tileData.mask, isFoot);

                    if (!this.renderList[renderIdx]) this.renderList[renderIdx] = {};
                    const item = this.renderList[renderIdx++];

                    item.y = ((row + d) * TILE_SIZE * GAME_SCALE); 
                    item.type = 'WALL_FACE';
                    item.data = { id: tileData.id, idx: faceIdx }; 
                    item.x = dx;
                    item.dy = dy + (d * drawSize);
                    item.sheetId = tileData.sheetId; 

                    if (isFoot) break;
                }
            }
        }
        return renderIdx;
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