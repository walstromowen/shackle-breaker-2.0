import { CONFIG } from '../../../../shared/data/constants.js';
import { SPRITES } from '../../../../shared/data/sprites.js';

export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config || CONFIG; 
        this.ctx.imageSmoothingEnabled = false;

        this.tilesetImage = this.loader.get('tileset'); 
        this.objectImage = this.loader.get('mapObjects') || this.loader.get('spritesheet');
        this.shadowImage = this.loader.get('shadows'); 

        this.blobMap = new Map();
        this.shadowOverrides = new Map();
        
        // Bitmask constants for Autotiling
        this.BITS = { 
            TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
            BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
        };
        
        // Standard Blob Lookup Table
        const TILE_LOOKUP = {
            0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 
            65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38, 7: 21, 28: 5, 112: 7, 193: 23, 
            31: 13, 124: 6, 241: 15, 199: 22, 255: 14, 23: 25, 29: 33, 71: 18, 87: 27, 
            92: 10, 93: 19, 95: 39, 113: 34, 116: 9, 117: 20, 119: 36, 121: 46, 125: 46, 
            127: 47, 197: 17, 209: 26, 213: 28, 215: 30, 221: 35, 223: 31, 245: 37, 
            247: 29, 251: 15, 253: 45, 254: 31
        };

        // 1. STANDARD BLOB MAP
        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;   
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;   
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;  
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128; 
            this.blobMap.set(i, TILE_LOOKUP[cleanMask] ?? 14);
        }

        // 2. SHADOW OVERRIDES
        this.shadowOverrides.set(2, 26);   
        this.shadowOverrides.set(8, 29);   
        this.shadowOverrides.set(32, 28);  
        this.shadowOverrides.set(128, 27); 
        this.shadowOverrides.set(10, 29);  
        this.shadowOverrides.set(40, 29);  
        this.shadowOverrides.set(160, 28); 
        this.shadowOverrides.set(130, 27); 
        this.shadowOverrides.set(170, 26); 
    }

    getFaceIndex(mask, isFoot) {
        const hasLeft = !!(mask & this.BITS.LEFT);
        const hasRight = !!(mask & this.BITS.RIGHT);
        
        const rowStart = isFoot ? 56 : 48; 
        
        if (hasLeft && hasRight) return rowStart + 1; 
        if (!hasLeft && hasRight) return rowStart + 0; 
        if (hasLeft && !hasRight) return rowStart + 2; 
        return rowStart + 3; 
    }

    drawEntity(entity, camera) {
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const sprite = this.loader.get(entity.spriteKey);
        if (!sprite) return;

        const dx = Math.round((entity.x - camera.x) * GAME_SCALE);
        const dy = Math.round((entity.y - camera.y) * GAME_SCALE);
        const drawSize = TILE_SIZE * GAME_SCALE;

        const rowMap = { "UP": 0, "DOWN": 1, "LEFT": 2, "RIGHT": 3 };
        const sx = (entity.animFrame || 0) * TILE_SIZE;
        const sy = (rowMap[entity.direction] ?? 0) * TILE_SIZE;

        this.ctx.drawImage(sprite, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawObject(obj, dx, dy, totalTime = 0) {
        const sourceImage = this.objectImage; 
        const sprite = SPRITES[obj.spriteKey];
        if (!sourceImage || !sprite) return;

        const { OBJECT_SIZE, TILE_SIZE, GAME_SCALE } = this.config;

        let frameOffset = 0;
        if (sprite.frames && sprite.frames > 1) {
            const speed = sprite.speed || 0.2; 
            frameOffset = Math.floor(totalTime / speed) % sprite.frames;
        }

        const sx = (sprite.x + frameOffset) * OBJECT_SIZE;
        const sy = sprite.y * OBJECT_SIZE;
        const sW = sprite.w * OBJECT_SIZE;
        const sH = sprite.h * OBJECT_SIZE;

        const dW = sW * GAME_SCALE;
        const dH = sH * GAME_SCALE;
        const drawSize = TILE_SIZE * GAME_SCALE;

        const heightOffset = dH - drawSize;
        const widthOffset = 0; 

        this.ctx.drawImage(
            sourceImage, 
            sx, sy, 
            sW, sH, 
            Math.floor(dx - widthOffset), 
            Math.floor(dy - heightOffset), 
            dW, dH
        );
    }

    drawTile(typeId, index, dx, dy, imageKey = 'tileset') {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = this.config;
        
        let sourceImage = this.tilesetImage;
        if (imageKey === 'shadows') sourceImage = this.shadowImage;
        if (!sourceImage) return;

        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        let startRow = 0;
        if (imageKey === 'tileset' && typeId !== null && BLOB_OFFSETS && BLOB_OFFSETS[typeId] !== undefined) {
            startRow = BLOB_OFFSETS[typeId];
        }
        
        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(sourceImage, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
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

        const shadowIndex = this.shadowOverrides.get(mask) ?? this.blobMap.get(mask) ?? 14; 
        this.drawTile(null, shadowIndex, dx, dy, 'shadows');
    }

    // --- OPTIMIZED RENDER LOOP ---
    renderMap(worldManager, camera, entities = [], totalTime = 0) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH, WALL_HEIGHT, WATER_ANIMATION } = this.config;
        const drawSize = TILE_SIZE * GAME_SCALE;
        
        const VIEW_BUFFER = 2; 
        const OBJECT_BUFFER = 8; 
        const safeHeight = WALL_HEIGHT || 2; 

        // -- Bounds for Terrain --
        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight;
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        // -- Bounds for Objects --
        const objStartCol = Math.floor(camera.x / TILE_SIZE) - OBJECT_BUFFER;
        const objEndCol   = objStartCol + tilesX + (OBJECT_BUFFER * 2);
        const objStartRow = Math.floor(camera.y / TILE_SIZE) - OBJECT_BUFFER - safeHeight;
        const objEndRow   = objStartRow + tilesY + (OBJECT_BUFFER * 2);

        this.ctx.fillStyle = '#000000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ========================================================
        // (NOTE: Removed Pre-Calculated Water here for Sparkle Effect)
        // ========================================================

        // ========================================================
        // PASS 1: TERRAIN (Tight Loop - High Performance)
        // ========================================================
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const targetId = tileData.id;
                const depth = TILE_DEPTH[targetId] || 0;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // =======================================================
                // 1. Base Layer: WATER (Random Sparkle)
                // =======================================================
                let waterFrameIndex = 0;

                if (WATER_ANIMATION) {
                    const { SPEED, FRAMES } = WATER_ANIMATION;
                    
                    // RANDOM HASH: Generates a deterministic random offset based on position
                    // This makes (10,10) always sparkle at the same rate, but differently from (10,11)
                    const randomHash = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
                    
                    // Add hash to time to desync this specific tile
                    const adjustedTime = totalTime + randomHash;

                    // Calculate frame
                    const frameStep = Math.floor(adjustedTime / SPEED) % FRAMES.length;
                    
                    // Safety modulo for negative numbers (rare, but safe)
                    const safeIndex = (frameStep + FRAMES.length) % FRAMES.length;
                    
                    waterFrameIndex = FRAMES[safeIndex];
                }

                // Draw Water with the calculated frame for THIS tile
                this.drawTile(TILE_TYPES.LAYER_0, waterFrameIndex, dx, dy);
                // =======================================================

                // 2. Layer 1 (Dirt/Sand)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_2]) {
                    if (targetId === TILE_TYPES.LAYER_2) {
                        const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                        const sandIndex = this.blobMap.get(sandMask) ?? 14; 
                        this.drawTile(TILE_TYPES.LAYER_1, sandIndex, dx, dy);
                    } else {
                        this.drawTile(TILE_TYPES.LAYER_1, 14, dx, dy);
                    }
                }
                
                // 3. Stacking Layers
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_3]) this.drawTile(TILE_TYPES.LAYER_2, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_4]) this.drawTile(TILE_TYPES.LAYER_3, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_5]) this.drawTile(TILE_TYPES.LAYER_4, 14, dx, dy);

                // 4. Actual Tile (Grass, Walls, etc)
                // Note: We skip LAYER_0 here because we drew it manually above
                if (targetId !== TILE_TYPES.LAYER_0) {
                    const index = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(targetId, index, dx, dy);
                }

                // 5. Shadows
                this.drawShadows(worldManager, col, row, dx, dy, depth);

                // 6. Ground Objects (Rugs, Traps)
                if (tileData.object && tileData.object.isGround) {
                     this.drawObject(tileData.object, dx, dy, totalTime);
                }
            }
        }

        // ========================================================
        // PASS 2: SORTED RENDER LIST
        // ========================================================
        const renderList = [];

        // A. WALL FACES
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const tileData = worldManager.getTileData(col, row);
                if (!tileData.isWall) continue;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);
                const myDepth = TILE_DEPTH[tileData.id];
                
                for (let d = 1; d <= safeHeight; d++) {
                    const tileBelowId = worldManager.getTileAt(col, row + d);
                    const belowDepth = TILE_DEPTH[tileBelowId] || 0;

                    if (belowDepth >= myDepth) break;

                    const isHittingWallFloor = (belowDepth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                    const isFoot = (d === safeHeight) || isHittingWallFloor;
                    
                    const faceIdx = this.getFaceIndex(tileData.mask, isFoot);
                    const drawY = dy + (d * drawSize);
                    
                    renderList.push({
                        y: ((row + d + 1) * TILE_SIZE * GAME_SCALE) + 0.1, 
                        type: 'WALL_FACE',
                        draw: () => this.drawTile(tileData.id, faceIdx, dx, drawY)
                    });

                    if (isFoot) break;
                }
            }
        }

        // B. OBJECTS
        const mapObjects = worldManager.getActiveObjects ? worldManager.getActiveObjects() : [];
        for (const obj of mapObjects) {
            if (obj.isGround || obj.isAnchor === false) continue;

            if (obj.col >= objStartCol && obj.col <= objEndCol && 
                obj.row >= objStartRow && obj.row <= objEndRow) {
                
                const dx = Math.floor((obj.col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((obj.row * TILE_SIZE - camera.y) * GAME_SCALE);

                renderList.push({
                    y: ((obj.row + 1) * TILE_SIZE * GAME_SCALE) + 0.1,
                    type: 'OBJECT',
                    draw: () => this.drawObject(obj, dx, dy, totalTime)
                });
            }
        }

        // C. ENTITIES
        if (entities) {
            entities.forEach(entity => {
                const sortY = (entity.y + TILE_SIZE) * GAME_SCALE;
                renderList.push({
                    y: sortY, 
                    type: 'ENTITY',
                    draw: () => this.drawEntity(entity, camera)
                });
            });
        }

        // --- SORT BY Y AND DRAW ---
        renderList.sort((a, b) => a.y - b.y);
        for (const item of renderList) item.draw();
    }
}