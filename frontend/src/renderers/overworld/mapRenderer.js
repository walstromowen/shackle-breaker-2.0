import { CONFIG } from '../../../../shared/data/constants.js';
import { SPRITES } from '../../../../shared/data/sprites.js';

export class MapRenderer {
    constructor(canvas, loader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.ctx.imageSmoothingEnabled = false;

        // 1. The Terrain Image (Grass, Walls, Water)
        this.tilesetImage = this.loader.get('tileset'); 
        
        // 2. The Object Image (Trees, Rocks)
        this.objectImage = this.loader.get('mapObjects') || this.loader.get('spritesheet'); 

        this.blobMap = new Map();
        
        // Setup Bitmasks
        this.BITS = { 
            TOP: 1, TOP_RIGHT: 2, RIGHT: 4, BOTTOM_RIGHT: 8,
            BOTTOM: 16, BOTTOM_LEFT: 32, LEFT: 64, TOP_LEFT: 128
        };
        
        // Setup Blob Lookup Table
        const TILE_LOOKUP = {
            0: 42, 1: 32, 4: 43, 16: 24, 64: 44, 17: 40, 68: 41, 5: 11, 20: 3, 80: 4, 
            65: 12, 21: 1, 84: 8, 81: 2, 69: 16, 85: 38, 7: 21, 28: 5, 112: 7, 193: 23, 
            31: 13, 124: 6, 241: 15, 199: 22, 255: 14, 23: 25, 29: 33, 71: 18, 87: 27, 
            92: 10, 93: 19, 95: 39, 113: 34, 116: 9, 117: 20, 119: 36, 121: 46, 125: 46, 
            127: 47, 197: 17, 209: 26, 213: 28, 215: 30, 221: 35, 223: 31, 245: 37, 
            247: 29, 251: 15, 253: 45, 254: 31
        };

        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128;
            this.blobMap.set(i, TILE_LOOKUP[cleanMask] ?? 14);
        }
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

        const heightOffset = dH - (TILE_SIZE * GAME_SCALE);
        const drawY = dy - heightOffset;

        this.ctx.drawImage(
            this.objectImage,
            sx, sy, sW, sH,   
            dx, drawY, dW, dH 
        );
    }

    drawTile(typeId, index, dx, dy) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = CONFIG;
        
        const tileset = this.tilesetImage; 
        if (!tileset) return;

        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        const startRow = BLOB_OFFSETS[typeId] !== undefined ? BLOB_OFFSETS[typeId] : 0;
        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(tileset, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    /**
     * Renders the map with Depth Sorting.
     * @param {WorldManager} worldManager 
     * @param {Object} camera - {x, y}
     * @param {Array} entities - List of entities (players, npcs) to sort into the scene
     */
    renderMap(worldManager, camera, entities = []) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH, WALL_HEIGHT } = CONFIG;
        const drawSize = TILE_SIZE * GAME_SCALE;
        const safeHeight = WALL_HEIGHT || 1; 
        const VIEW_BUFFER = 2; 

        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight;
        
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        this.ctx.fillStyle = '#000000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ========================================================
        // PASS 1: BACKGROUND / FLOORS
        // These are always flat and drawn first (no sorting needed)
        // ========================================================
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const targetId = tileData.id;
                const depth = TILE_DEPTH[targetId] || 0;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // Base Water (LAYER_0)
                this.drawTile(TILE_TYPES.LAYER_0, 14, dx, dy);

                // Layer: Dirt (LAYER_1) - drawn if current tile is Dirt or higher (Grass/Walls)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_2]) { // If Grass or higher
                    if (targetId === TILE_TYPES.LAYER_2) { // If strictly Grass
                        const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                        const sandIndex = this.blobMap.get(sandMask) ?? 14;
                        this.drawTile(TILE_TYPES.LAYER_1, sandIndex, dx, dy);
                    } else {
                        // If Wall, just draw full dirt underneath
                        this.drawTile(TILE_TYPES.LAYER_1, 14, dx, dy);
                    }
                }

                // Layer: Grass (LAYER_2) - drawn under Low Wall (LAYER_3)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_3]) {
                    this.drawTile(TILE_TYPES.LAYER_2, 14, dx, dy);
                }
                // Layer: Low Wall (LAYER_3) - drawn under Mid Wall (LAYER_4)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_4]) {
                    this.drawTile(TILE_TYPES.LAYER_3, 14, dx, dy);
                }
                // Layer: Mid Wall (LAYER_4) - drawn under High Wall (LAYER_5)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_5]) {
                    this.drawTile(TILE_TYPES.LAYER_4, 14, dx, dy);
                }

                // Main Tile (The actual surface top)
                if (targetId !== TILE_TYPES.LAYER_0) {
                    const index = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(targetId, index, dx, dy);
                }
            }
        }

        // ========================================================
        // PASS 2: THE RENDER LIST (Sorting Walls, Objects, & Entities)
        // ========================================================
        const renderList = [];

        // A. Add Map Items (Wall Faces & Objects) to List
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const tileData = worldManager.getTileData(col, row);
                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // 1. WALL FACES (Vertical Depth)
                if (tileData.isWall) {
                    const myDepth = TILE_DEPTH[tileData.id];
                    
                    for (let d = 1; d <= safeHeight; d++) {
                        const tileBelowId = worldManager.getTileAt(col, row + d);
                        const belowDepth = TILE_DEPTH[tileBelowId] || 0;

                        if (belowDepth >= myDepth) break;

                        // Check if we hit the floor level (anything below LAYER_3 / Low Wall is considered floor)
                        const isHittingWallFloor = (belowDepth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                        const isFoot = (d === safeHeight) || isHittingWallFloor;
                        
                        let faceIdx;
                        if (isFoot) {
                            if (d === 1) {
                                const hasLeft = !!(tileData.mask & this.BITS.LEFT);
                                const hasRight = !!(tileData.mask & this.BITS.RIGHT);
                                if (!hasLeft && hasRight) faceIdx = 61;      
                                else if (hasLeft && !hasRight) faceIdx = 63; 
                                else faceIdx = 62;                           
                            } else {
                                faceIdx = this.getFaceIndex(tileData.mask, true);
                            }
                        } else {
                            faceIdx = this.getFaceIndex(tileData.mask, false);
                        }

                        // Capture values for the closure
                        const drawY = dy + (d * drawSize);
                        
                        // Push to Sort List
                        // Sort Y: The bottom pixel of this specific wall segment
                        renderList.push({
                            y: (row + d + 1) * TILE_SIZE * GAME_SCALE, 
                            type: 'WALL_FACE',
                            draw: () => this.drawTile(tileData.id, faceIdx, dx, drawY)
                        });

                        if (isFoot) break;
                    }
                }

                // 2. OBJECTS (Trees, Rocks)
                if (tileData.object && tileData.object.isAnchor !== false) {
                    // Sort Y: The row below the object (Objects usually sit "on" the tile)
                    renderList.push({
                        y: (row + 1) * TILE_SIZE * GAME_SCALE,
                        type: 'OBJECT',
                        draw: () => this.drawObject(tileData.object, dx, dy)
                    });
                }
            }
        }

        // B. Add Entities to List
        entities.forEach(entity => {
            // Ensure entities have a 'y' and a 'draw' method
            if (entity && typeof entity.draw === 'function') {
                renderList.push({
                    y: entity.y * GAME_SCALE, // Scale Y to match render space
                    type: 'ENTITY',
                    draw: () => entity.draw(this.ctx, camera)
                });
            }
        });

        // ========================================================
        // PASS 3: SORT & DRAW
        // ========================================================
        
        // Sort items by Y position (lower Y draws first, higher Y draws last)
        renderList.sort((a, b) => a.y - b.y);

        // Execute Draw Calls
        for (const item of renderList) {
            item.draw();
        }
    }
}