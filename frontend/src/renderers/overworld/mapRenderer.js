import { CONFIG } from '../../../../shared/data/constants.js';
import { SPRITES } from '../../../../shared/data/sprites.js';

export class MapRenderer {
    constructor(canvas, loader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
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
        
        // Standard Blob Lookup Table (Mapping 8-bit mask to 47-tile ID)
        const TILE_LOOKUP = {
            0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 
            65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38, 7: 21, 28: 5, 112: 7, 193: 23, 
            31: 13, 124: 6, 241: 15, 199: 22, 255: 14, 23: 25, 29: 33, 71: 18, 87: 27, 
            92: 10, 93: 19, 95: 39, 113: 34, 116: 9, 117: 20, 119: 36, 121: 46, 125: 46, 
            127: 47, 197: 17, 209: 26, 213: 28, 215: 30, 221: 35, 223: 31, 245: 37, 
            247: 29, 251: 15, 253: 45, 254: 31
        };

        // 1. STANDARD BLOB MAP (Strict - Used for Terrain/Walls)
        // Removes diagonal corners if cardinal neighbors are missing to prevent bad wall geometry.
        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;   // Top-Right
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;   // Bottom-Right
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;  // Bottom-Left
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128; // Top-Left
            this.blobMap.set(i, TILE_LOOKUP[cleanMask] ?? 14);
        }

        // 2. SHADOW OVERRIDES (Loose - Used ONLY for Shadows)
        // Forces diagonal bits to resolve to corner tiles instead of falling back to Pillar (42).
        this.shadowOverrides.set(2, 26);   // Top-Right Only
        this.shadowOverrides.set(8, 29);   // Bottom-Right Only
        this.shadowOverrides.set(32, 28);  // Bottom-Left Only
        this.shadowOverrides.set(128, 27); // Top-Left Only
        
        this.shadowOverrides.set(10, 29);  // TR + BR
        this.shadowOverrides.set(40, 29);  // BR + BL
        this.shadowOverrides.set(160, 28); // BL + TL
        this.shadowOverrides.set(130, 27); // TL + TR
        this.shadowOverrides.set(170, 26); // 4-way Diagonal
    }

    /**
     * Determines which part of the wall (Face) to draw based on neighbors
     */
    getFaceIndex(mask, isFoot) {
        const hasLeft = !!(mask & this.BITS.LEFT);
        const hasRight = !!(mask & this.BITS.RIGHT);
        
        // Body starts at Row 6 (48), Foot starts at Row 7 (56) in the tileset logic
        const rowStart = isFoot ? 56 : 48; 
        
        if (hasLeft && hasRight) return rowStart + 1; // Middle
        if (!hasLeft && hasRight) return rowStart + 0; // Left End
        if (hasLeft && !hasRight) return rowStart + 2; // Right End
        return rowStart + 3; // Pillar/Lone
    }

    drawObject(obj, dx, dy) {
        if (!this.objectImage) return;
        const sprite = SPRITES[obj.spriteKey];
        if (!sprite) return;
        const { OBJECT_SIZE, TILE_SIZE, GAME_SCALE } = CONFIG;

        const sx = sprite.x * OBJECT_SIZE;
        const sy = sprite.y * OBJECT_SIZE;
        const sW = sprite.w * OBJECT_SIZE;
        const sH = sprite.h * OBJECT_SIZE;
        const dW = sW * GAME_SCALE;
        const dH = sH * GAME_SCALE;
        
        // Adjust Y so the object sits on the tile
        const heightOffset = dH - (TILE_SIZE * GAME_SCALE);
        
        this.ctx.drawImage(this.objectImage, sx, sy, sW, sH, dx, dy - heightOffset, dW, dH);
    }

    drawTile(typeId, index, dx, dy, imageKey = 'tileset') {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = CONFIG;
        
        // Select source image
        let sourceImage = this.tilesetImage;
        if (imageKey === 'shadows') sourceImage = this.shadowImage;
        if (!sourceImage) return;

        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        // Determine Row Offset
        let startRow = 0;
        if (imageKey === 'tileset' && typeId !== null && BLOB_OFFSETS[typeId] !== undefined) {
            startRow = BLOB_OFFSETS[typeId];
        }
        
        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(sourceImage, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawShadows(worldManager, col, row, dx, dy, currentDepth) {
        const { TILE_TYPES, TILE_DEPTH } = CONFIG;

        // 1. Exclusion: Water and Lowest Dirt layer don't receive shadows
        if (currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_0] || 
            currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_1]) {
            return;
        }

        const getDepth = (c, r) => {
            const t = worldManager.getTileAt(c, r);
            return (t !== null && t !== undefined) ? (TILE_DEPTH[t] || 0) : 0;
        };

        const DEPTH_L3 = TILE_DEPTH[TILE_TYPES.LAYER_3]; 
        const DEPTH_L4 = TILE_DEPTH[TILE_TYPES.LAYER_4]; 
        const DEPTH_L5 = TILE_DEPTH[TILE_TYPES.LAYER_5]; 

        // 2. Face Guard: Prevent shadows from drawing on top of vertical wall faces
        const nDepth1 = getDepth(col, row - 1);
        const nDepth2 = getDepth(col, row - 2);

        if (nDepth1 > currentDepth && (nDepth1 === DEPTH_L4 || nDepth1 === DEPTH_L5 || nDepth1 === DEPTH_L3)) return;
        if (nDepth2 > currentDepth && nDepth2 === DEPTH_L3) return;

        // 3. Obstruction Check
        const castsShadow = (tx, ty) => {
            const d0 = getDepth(tx, ty);
            if (d0 > currentDepth) return true;

            const d1 = getDepth(tx, ty - 1);
            if (d1 > currentDepth && (d1 === DEPTH_L4 || d1 === DEPTH_L5 || d1 === DEPTH_L3)) return true;
            
            const d2 = getDepth(tx, ty - 2);
            if (d2 > currentDepth && d2 === DEPTH_L3) return true;

            return false;
        };

        // 4. Build Bitmask
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

        // 5. Select Tile: Check Overrides (Loose) first, then BlobMap (Strict)
        const shadowIndex = this.shadowOverrides.get(mask) ?? this.blobMap.get(mask) ?? 14; 
        
        this.drawTile(null, shadowIndex, dx, dy, 'shadows');
    }

    renderMap(worldManager, camera, entities = []) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH, WALL_HEIGHT } = CONFIG;
        const drawSize = TILE_SIZE * GAME_SCALE;
        
        const VIEW_BUFFER = 2; 
        const safeHeight = WALL_HEIGHT || 2; 

        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight;
        
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        this.ctx.fillStyle = '#000000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ========================================================
        // PASS 1: FLOORS & SHADOWS
        // ========================================================
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const targetId = tileData.id;
                const depth = TILE_DEPTH[targetId] || 0;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // Draw Base Layer (Water)
                this.drawTile(TILE_TYPES.LAYER_0, 14, dx, dy);

                // Draw Sand/Layer 1 (Special Masking)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_2]) {
                    if (targetId === TILE_TYPES.LAYER_2) {
                        const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                        const sandIndex = this.blobMap.get(sandMask) ?? 14; // Strict map OK here
                        this.drawTile(TILE_TYPES.LAYER_1, sandIndex, dx, dy);
                    } else {
                        this.drawTile(TILE_TYPES.LAYER_1, 14, dx, dy);
                    }
                }
                
                // Draw Stacking Layers
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_3]) this.drawTile(TILE_TYPES.LAYER_2, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_4]) this.drawTile(TILE_TYPES.LAYER_3, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_5]) this.drawTile(TILE_TYPES.LAYER_4, 14, dx, dy);

                // Draw Actual Tile (Grass/Walls)
                if (targetId !== TILE_TYPES.LAYER_0) {
                    const index = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(targetId, index, dx, dy);
                }

                // Draw Shadows (On top of floor, but behind Pass 2)
                this.drawShadows(worldManager, col, row, dx, dy, depth);
            }
        }

        // ========================================================
        // PASS 2: SORTED RENDER LIST (Faces, Objects, Entities)
        // ========================================================
        const renderList = [];

        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const tileData = worldManager.getTileData(col, row);
                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // --- WALL FACES ---
                if (tileData.isWall) {
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
                            y: (row + d + 1) * TILE_SIZE * GAME_SCALE, 
                            type: 'WALL_FACE',
                            draw: () => this.drawTile(tileData.id, faceIdx, dx, drawY)
                        });

                        if (isFoot) break;
                    }
                }

                // --- MAP OBJECTS ---
                if (tileData.object && tileData.object.isAnchor !== false) {
                    renderList.push({
                        y: (row + 1) * TILE_SIZE * GAME_SCALE,
                        type: 'OBJECT',
                        draw: () => this.drawObject(tileData.object, dx, dy)
                    });
                }
            }
        }

        // --- ENTITIES (Players, NPCs) ---
        entities.forEach(entity => {
            if (entity && typeof entity.draw === 'function') {
                // Sort by FEET (Y + Height) to fix depth issues
                const entityHeight = entity.height || TILE_SIZE;
                const sortY = (entity.y + entityHeight) * GAME_SCALE;

                renderList.push({
                    y: sortY, 
                    type: 'ENTITY',
                    draw: () => entity.draw(this.ctx, camera)
                });
            }
        });

        // --- SORT BY Y AND DRAW ---
        renderList.sort((a, b) => a.y - b.y);
        for (const item of renderList) item.draw();
    }
}