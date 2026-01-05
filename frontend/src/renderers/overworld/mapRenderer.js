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

        // --- SHADOW INDICES (Row 0 of Tileset) ---
        // 0: Top Strip (South Shadow)
        // 1: Left Strip (East Shadow)
        // 2: Top-Left Dot (Diagonal/Inner Corner)
        // 3: Inverted 'L' Shape (Merged Top + Left Strips)
        this.SHADOW_S = 0;
        this.SHADOW_E = 1;
        this.SHADOW_SE = 2;
        this.SHADOW_CORNER_L = 3;

        this.blobMap = new Map();
        
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

        // Initialize Blob Map
        for (let i = 0; i < 256; i++) {
            let cleanMask = i;
            // Remove corner bits if adjacent cardinal bits are missing
            if (!(i & 1) || !(i & 4))   cleanMask &= ~2;   // Top-Right
            if (!(i & 4) || !(i & 16))  cleanMask &= ~8;   // Bottom-Right
            if (!(i & 16) || !(i & 64)) cleanMask &= ~32;  // Bottom-Left
            if (!(i & 64) || !(i & 1))  cleanMask &= ~128; // Top-Left
            this.blobMap.set(i, TILE_LOOKUP[cleanMask] ?? 14);
        }
    }

    /**
     * Determines which part of the wall (Face) to draw based on neighbors
     */
    getFaceIndex(mask, isFoot) {
        const hasLeft = !!(mask & this.BITS.LEFT);
        const hasRight = !!(mask & this.BITS.RIGHT);
        
        // Body starts at Row 6 (48), Foot starts at Row 7 (56)
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

    drawTile(typeId, index, dx, dy) {
        const { TILE_SIZE, TILE_PADDING, GAME_SCALE, BLOB_OFFSETS } = CONFIG;
        const tileset = this.tilesetImage; 
        if (!tileset) return;

        const drawSize = TILE_SIZE * GAME_SCALE;
        const SLOT_SIZE = TILE_SIZE + (TILE_PADDING * 2);

        // Shadows use typeId=null, which defaults to Offset 0
        const startRow = (typeId !== null && BLOB_OFFSETS[typeId] !== undefined) ? BLOB_OFFSETS[typeId] : 0;
        
        const sx = ((index % 8) * SLOT_SIZE) + TILE_PADDING;
        const sy = ((Math.floor(index / 8) + startRow) * SLOT_SIZE) + TILE_PADDING;

        this.ctx.drawImage(tileset, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, drawSize, drawSize);
    }

    drawShadows(worldManager, col, row, dx, dy, currentDepth) {
        const { TILE_TYPES, TILE_DEPTH } = CONFIG;

        // 1. Water/Void never receives shadows
        if (currentDepth === TILE_DEPTH[TILE_TYPES.LAYER_0]) return;

        // Helper: Get depth safely
        const getDepth = (c, r) => {
            const t = worldManager.getTileAt(c, r);
            return (t !== null && t !== undefined) ? (TILE_DEPTH[t] || 0) : 0;
        };

        const DEPTH_L3 = TILE_DEPTH[TILE_TYPES.LAYER_3]; // 2 Faces Tall
        const DEPTH_L4 = TILE_DEPTH[TILE_TYPES.LAYER_4]; // 1 Face Tall
        const DEPTH_L5 = TILE_DEPTH[TILE_TYPES.LAYER_5]; // 1 Face Tall

        // --- 2. FACE GUARD (CRITICAL FIX) ---
        // If we are sitting on a tile that is visually occupied by a neighbor's "Face",
        // we must NOT draw shadows here. Shadows belong on the ground, not on walls.
        
        const nDepth1 = getDepth(col, row - 1); // Neighbor directly North
        const nDepth2 = getDepth(col, row - 2); // Neighbor 2 steps North

        // A. Are we the face of a 1-Tall Wall (L4 or L5) directly North?
        if (nDepth1 > currentDepth && (nDepth1 === DEPTH_L4 || nDepth1 === DEPTH_L5)) return;

        // B. Are we the Top Face of a 2-Tall Wall (L3) directly North?
        if (nDepth1 > currentDepth && nDepth1 === DEPTH_L3) return;

        // C. Are we the Bottom Face of a 2-Tall Wall (L3) two steps North?
        if (nDepth2 > currentDepth && nDepth2 === DEPTH_L3) return;


        // --- 3. SHADOW CASTING LOGIC ---
        // If we reached here, we are definitely a visible Floor.
        
        const isTall = (d) => (d > currentDepth) && (d >= DEPTH_L3);

        // --- CHECK WEST (East Shadow) ---
        let isWWall = false;
        
        // Is the tile to the West a Roof?
        if (isTall(getDepth(col - 1, row))) {
            isWWall = true;
        } 
        // Is the tile to the West a Face of a wall above it? (Check West's North neighbors)
        else {
            const wDepth1 = getDepth(col - 1, row - 1);
            const wDepth2 = getDepth(col - 1, row - 2);
            
            // Face of L4/L5 at y-1
            if (isTall(wDepth1) && (wDepth1 === DEPTH_L4 || wDepth1 === DEPTH_L5)) isWWall = true;
            // Top Face of L3 at y-1
            else if (isTall(wDepth1) && wDepth1 === DEPTH_L3) isWWall = true;
            // Bottom Face of L3 at y-2
            else if (isTall(wDepth2) && wDepth2 === DEPTH_L3) isWWall = true;
        }

        // --- CHECK NORTH (South Shadow) ---
        // We look "over" the faces to find the roof casting the shadow.
        let isNWall = false;

        // Check for 1-Tall Roof (L4/L5) at row-2
        if (isTall(nDepth2) && (nDepth2 === DEPTH_L4 || nDepth2 === DEPTH_L5)) {
            isNWall = true;
        }
        // Check for 2-Tall Roof (L3) at row-3
        const nDepth3 = getDepth(col, row - 3);
        if (!isNWall && isTall(nDepth3) && nDepth3 === DEPTH_L3) {
            isNWall = true;
        }

        // --- CHECK DIAGONAL (Inner Corner) ---
        let isNWWall = false;
        if (!isNWall && !isWWall) {
             // Check diagonal for 1-Tall (L4/L5)
            const nwDepth2 = getDepth(col - 1, row - 2);
            if (isTall(nwDepth2) && (nwDepth2 === DEPTH_L4 || nwDepth2 === DEPTH_L5)) {
                isNWWall = true;
            }
            // Check diagonal for 2-Tall (L3)
            const nwDepth3 = getDepth(col - 1, row - 3);
            if (!isNWWall && isTall(nwDepth3) && nwDepth3 === DEPTH_L3) {
                isNWWall = true;
            }
        }

        // --- DRAW ---
        if (isNWall && isWWall) {
            this.drawTile(null, this.SHADOW_CORNER_L, dx, dy);
        }
        else if (isNWall) {
            this.drawTile(null, this.SHADOW_S, dx, dy);
        }
        else if (isWWall) {
            this.drawTile(null, this.SHADOW_E, dx, dy);
        }
        else if (isNWWall) {
            this.drawTile(null, this.SHADOW_SE, dx, dy);
        }
    }

    renderMap(worldManager, camera, entities = []) {
        const { TILE_SIZE, GAME_SCALE, TILE_TYPES, TILE_DEPTH, WALL_HEIGHT } = CONFIG;
        const drawSize = TILE_SIZE * GAME_SCALE;
        
        // Render buffer to prevent popping at edges
        const VIEW_BUFFER = 2; 
        const safeHeight = WALL_HEIGHT || 2; 

        // Calculate viewport range
        const startCol = Math.floor(camera.x / TILE_SIZE) - VIEW_BUFFER;
        const startRow = Math.floor(camera.y / TILE_SIZE) - VIEW_BUFFER - safeHeight; // Scan higher for tall walls
        
        const tilesX = Math.ceil(this.canvas.width / drawSize) + (VIEW_BUFFER * 2);
        const tilesY = Math.ceil(this.canvas.height / drawSize) + (VIEW_BUFFER * 2) + safeHeight;

        // Clear Screen
        this.ctx.fillStyle = '#000000'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ========================================================
        // PASS 1: FLOORS & SHADOWS (Flat Layers)
        // ========================================================
        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                
                const tileData = worldManager.getTileData(col, row);
                const targetId = tileData.id;
                const depth = TILE_DEPTH[targetId] || 0;

                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // 1. Draw Water Base (Layer 0)
                this.drawTile(TILE_TYPES.LAYER_0, 14, dx, dy);

                // 2. Draw Sand (Layer 1) if needed
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_2]) {
                    if (targetId === TILE_TYPES.LAYER_2) {
                        // If we are Grass, we need transition tiles for the Sand underneath
                        const sandMask = worldManager.getSpecificMask(col, row, TILE_TYPES.LAYER_1);
                        const sandIndex = this.blobMap.get(sandMask) ?? 14;
                        this.drawTile(TILE_TYPES.LAYER_1, sandIndex, dx, dy);
                    } else {
                        // Otherwise just fill sand
                        this.drawTile(TILE_TYPES.LAYER_1, 14, dx, dy);
                    }
                }
                
                // 3. Layer Stacking Logic (Fill beneath higher layers)
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_3]) this.drawTile(TILE_TYPES.LAYER_2, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_4]) this.drawTile(TILE_TYPES.LAYER_3, 14, dx, dy);
                if (depth >= TILE_DEPTH[TILE_TYPES.LAYER_5]) this.drawTile(TILE_TYPES.LAYER_4, 14, dx, dy);

                // 4. Draw The Actual Tile (If not water)
                if (targetId !== TILE_TYPES.LAYER_0) {
                    const index = this.blobMap.get(tileData.mask) ?? 14;
                    this.drawTile(targetId, index, dx, dy);
                }

                // 5. Draw Shadows (Calculated dynamically)
                this.drawShadows(worldManager, col, row, dx, dy, depth);
            }
        }

        // ========================================================
        // PASS 2: SORTED RENDER LIST (Faces, Objects, Entities)
        // ========================================================
        // We collect everything that has height/depth and sort by Y position
        const renderList = [];

        for (let row = startRow; row < startRow + tilesY; row++) {
            for (let col = startCol; col < startCol + tilesX; col++) {
                const tileData = worldManager.getTileData(col, row);
                const dx = Math.floor((col * TILE_SIZE - camera.x) * GAME_SCALE);
                const dy = Math.floor((row * TILE_SIZE - camera.y) * GAME_SCALE);

                // --- WALL RENDERING ---
                if (tileData.isWall) {
                    const myDepth = TILE_DEPTH[tileData.id];
                    
                    // Loop downwards to draw the wall "Faces" (Front view)
                    for (let d = 1; d <= safeHeight; d++) {
                        const tileBelowId = worldManager.getTileAt(col, row + d);
                        const belowDepth = TILE_DEPTH[tileBelowId] || 0;

                        // Stop if we hit a wall of equal or greater height
                        if (belowDepth >= myDepth) break;

                        // Check if we hit the floor to decide if it's a "Foot" or "Body"
                        const isHittingWallFloor = (belowDepth >= TILE_DEPTH[TILE_TYPES.LAYER_3]);
                        const isFoot = (d === safeHeight) || isHittingWallFloor;
                        
                        const faceIdx = this.getFaceIndex(tileData.mask, isFoot);
                        const drawY = dy + (d * drawSize);
                        
                        // Add to render list sorted by the Y-coordinate of the BASE of the tile
                        renderList.push({
                            y: (row + d + 1) * TILE_SIZE * GAME_SCALE, 
                            type: 'WALL_FACE',
                            draw: () => this.drawTile(tileData.id, faceIdx, dx, drawY)
                        });

                        if (isFoot) break;
                    }
                }

                // --- OBJECT RENDERING ---
                if (tileData.object && tileData.object.isAnchor !== false) {
                    renderList.push({
                        y: (row + 1) * TILE_SIZE * GAME_SCALE,
                        type: 'OBJECT',
                        draw: () => this.drawObject(tileData.object, dx, dy)
                    });
                }
            }
        }

        // --- ENTITY RENDERING ---
        entities.forEach(entity => {
            if (entity && typeof entity.draw === 'function') {
                renderList.push({
                    y: entity.y * GAME_SCALE, 
                    type: 'ENTITY',
                    draw: () => entity.draw(this.ctx, camera)
                });
            }
        });

        // --- SORT AND EXECUTE ---
        renderList.sort((a, b) => a.y - b.y);
        for (const item of renderList) item.draw();
    }
}