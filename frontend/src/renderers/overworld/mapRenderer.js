import { CONFIG } from '../../../../shared/data/constants.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { BlobTerrainRenderer } from './blobTerrainRenderer.js';
export class MapRenderer {
    constructor(canvas, loader, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.loader = loader;
        this.config = config || CONFIG;
        this.ctx.imageSmoothingEnabled = false;
        this.baseWidth = 800;
        this.resScale = this.canvas.width / this.baseWidth;
        this.renderList = [];
        this._cachedBounds = {};
        this.blobTerrain = new BlobTerrainRenderer(this.loader, this.config);
        /* Character sheet layout: 8 frames across, 12 rows down in three sets of four (idle rows 0-3, walk rows 4-7, run rows 8-11); inside a set the rows
           are South, East, North, West. CONFIG.CHARACTER_ANIM can override any of it. The controller only says WHICH animation plays (entity.animState) and
           how far through it the entity is (entity.animPhase while walking / running, entity.idleTimer while idle); the frame is worked out here. */
        const ca = this.config.CHARACTER_ANIM || {};
        this.charAnim = {
            frames: 8,
            directionOrder: ['DOWN', 'RIGHT', 'UP', 'LEFT'], // South, East, North, West
            idleFps: 6,
            ...ca,
            firstRow: { idle: 0, walk: 4, run: 8, ...(ca.firstRow || {}) },
        };
    }
    /* ==========================================  1. MAIN RENDER PIPELINE  ========================================== */
    renderMap(
        worldManager,
        camera,
        entities = [],
        interpolationFactor = 1,
        totalTime = 0,
        lightingRenderer = null,
        ambientData = null,
        weatherRenderer = null,
    ) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const { GAME_SCALE, TILE_SIZE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const centerOffsetX = this.canvas.width / 2 / scale - TILE_SIZE / 2;
        const centerOffsetY = this.canvas.height / 2 / scale - TILE_SIZE / 2;
        const interpCamX = camera.prevX !== undefined ? camera.prevX + (camera.x - camera.prevX) * interpolationFactor : camera.x;
        const interpCamY = camera.prevY !== undefined ? camera.prevY + (camera.y - camera.prevY) * interpolationFactor : camera.y;
        const renderCamera = { x: interpCamX - centerOffsetX, y: interpCamY - centerOffsetY };
        const bounds = this.updateViewBounds(renderCamera);
        /* Pass 1: Flat Terrain & Ground Objects */
        this.renderTerrainPass(worldManager, renderCamera, bounds, totalTime);
        /* Pass 2: Vertical/Sorted Elements (Entities, Trees, Walls) */
        this.renderSortedPass(worldManager, renderCamera, bounds, entities, totalTime, interpolationFactor);
        /* ==========================================  Pass 2.5: WEATHER (Rendered before lighting so it gets tinted!)  ========================================== */
        if (weatherRenderer) {
            weatherRenderer.render(this.ctx, renderCamera, totalTime);
        }
        /* ==========================================  Pass 3: LIGHTING  ========================================== */
        if (lightingRenderer && ambientData) {
            const lightObjects = worldManager.getLightObjects(camera, this.canvas.width, this.canvas.height);
            lightingRenderer.render(this.ctx, ambientData, renderCamera, entities, lightObjects);
        }
    }
    /* ==========================================  2. PASS: TERRAIN (Unsorted / Flat)  ========================================== */
    renderTerrainPass(worldManager, camera, bounds, totalTime) {
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const camX = camera.x;
        const camY = camera.y;
        /* Ground, water, cliff levels and their faces are drawn from the biome's generated tilesets (see blobTerrainRenderer.js). */
        this.blobTerrain.render(this.ctx, worldManager, bounds, camX, camY, scale, totalTime);
        /* Ground objects (flowers, grass tufts, stairs...) go on top of the terrain. */
        const groundObjectsQueue = [];
        for (let row = bounds.startRow; row < bounds.endRow; row++) {
            for (let col = bounds.startCol; col < bounds.endCol; col++) {
                const tileData = worldManager.getTileData(col, row);
                if (tileData.object && tileData.object.isGround) {
                    const dx = Math.floor((col * TILE_SIZE - camX) * scale);
                    const dy = Math.floor((row * TILE_SIZE - camY) * scale);
                    groundObjectsQueue.push({ obj: tileData.object, dx: dx, dy: dy, sheetId: tileData.objectSheetId });
                }
            }
        }
        for (let i = 0; i < groundObjectsQueue.length; i++) {
            const item = groundObjectsQueue[i];
            this.drawObject(item.obj, item.dx, item.dy, totalTime, item.sheetId);
        }
    }
    /* ==========================================  3. PASS: SORTED (Vertical Elements)  ========================================== */
    renderSortedPass(worldManager, camera, bounds, entities, totalTime, interpolationFactor) {
        let renderIdx = 0;
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const camX = camera.x;
        const camY = camera.y;
        const objects = worldManager.getActiveObjects ? worldManager.getActiveObjects() : [];
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (obj.isGround || !obj.isAnchor) continue;
            if (this.isInBounds(obj.col, obj.row, bounds)) {
                const tileData = worldManager.getTileData(obj.col, obj.row);
                const visualBottomOffset = 1;
                if (!this.renderList[renderIdx]) this.renderList[renderIdx] = {};
                const item = this.renderList[renderIdx++];
                item.y = (obj.row + visualBottomOffset) * TILE_SIZE * scale + 0.1;
                item.type = 'OBJECT';
                item.data = obj;
                item.x = Math.floor((obj.col * TILE_SIZE - camX) * scale);
                item.dy = Math.floor((obj.row * TILE_SIZE - camY) * scale);
                item.objectSheetId = tileData.objectSheetId;
            }
        }
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            const renderY = entity.prevY !== undefined ? entity.prevY + (entity.y - entity.prevY) * interpolationFactor : entity.y;
            let entityHitboxBottom = 1;
            if (entity.hitbox) {
                const yOff = entity.hitbox.yOffset !== undefined ? entity.hitbox.yOffset : entity.hitbox.y || 0;
                entityHitboxBottom = yOff + (entity.hitbox.h || 1);
            }
            if (!this.renderList[renderIdx]) this.renderList[renderIdx] = {};
            const item = this.renderList[renderIdx++];
            item.y = (renderY + entityHitboxBottom * TILE_SIZE) * scale;
            item.type = 'ENTITY';
            item.data = entity;
        }
        this.renderList.length = renderIdx;
        this.renderList.sort((a, b) => a.y - b.y);
        for (let i = 0; i < renderIdx; i++) {
            const item = this.renderList[i];
            if (item.type === 'OBJECT') {
                this.drawObject(item.data, item.x, item.dy, totalTime, item.objectSheetId);
            } else if (item.type === 'ENTITY') {
                this.drawEntity(item.data, camera, interpolationFactor);
            }
        }
    }
    /* ==========================================  4. DRAWING PRIMITIVES  ========================================== */
    drawObject(obj, dx, dy, totalTime = 0) {
        const imageSource = obj.sheet ? this.loader.get(obj.sheet) : null;
        if (!imageSource) return;
        const { OBJECT_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const wTiles = obj.w || 1;
        const hTiles = obj.h || 1;
        const dW = Math.ceil(wTiles * OBJECT_SIZE * scale);
        const dH = Math.ceil(hTiles * OBJECT_SIZE * scale);
        const drawY = Math.floor(dy - (hTiles - 1) * OBJECT_SIZE * scale);

        let frameOffset = 0;
        if (obj.frames > 1) {
            if (obj.currentFrame !== undefined) {
                frameOffset = obj.currentFrame;
            } else if (obj.interaction?.type === 'WARP') {
                frameOffset = 0;
            } else {
                const speed = obj.speed || 0.2;
                frameOffset = ((totalTime / speed) | 0) % obj.frames;
            }
        }
        // frames sit side by side in the object's own image, one object width apart
        const sx = frameOffset * wTiles * OBJECT_SIZE;

        const prevAlpha = this.ctx.globalAlpha;
        if (obj.alpha !== undefined) {
            this.ctx.globalAlpha = Math.max(0, Math.min(1, obj.alpha));
        }
        this.ctx.drawImage(imageSource, sx, 0, wTiles * OBJECT_SIZE, hTiles * OBJECT_SIZE, dx, drawY, dW, dH);
        if (obj.alpha !== undefined) {
            this.ctx.globalAlpha = prevAlpha;
        }
    }
    drawEntity(entity, camera, interpolationFactor = 1) {
        const sprite = this.loader.get(gameState.party.members[0].spriteOverworld);
        if (!sprite) return;
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const renderX = entity.prevX !== undefined ? entity.prevX + (entity.x - entity.prevX) * interpolationFactor : entity.x;
        const renderY = entity.prevY !== undefined ? entity.prevY + (entity.y - entity.prevY) * interpolationFactor : entity.y;
        const dx = Math.floor((renderX - camera.x) * scale);
        const dy = Math.floor((renderY - camera.y) * scale);
        /* A character frame can be bigger than a tile (e.g. 64 x 64). entity.x / y stay the tile the character stands on, so collision, the hitbox and
           the depth sort do not change; the frame is only DRAWN around that tile.
           CONFIG.CHARACTER_FRAME = { w, h, feetPad, shiftX } (an entity may carry its own `frame`):
             w, h     size of one frame in the sheet (default: one tile, the old behaviour)
             feetPad  how far the frame is moved down below the tile's bottom edge. (h - tile) / 2 centres the frame on the tile (64 x 64: 16);
                      0 puts the bottom of the frame on the tile's bottom edge, so the frame rises above the tile
             shiftX   pixels to move the frame sideways when the figure is not centred in it (positive = right) */
        const fr = entity.frame || this.config.CHARACTER_FRAME || {};
        const FW = fr.w || TILE_SIZE, FH = fr.h || TILE_SIZE;
        const feetPad = fr.feetPad || 0, shiftX = fr.shiftX || 0;
        const A = this.charAnim;
        const state = A.firstRow[entity.animState] !== undefined ? entity.animState : 'idle'; // an entity without an animState shows its idle pose
        const dirIndex = Math.max(0, A.directionOrder.indexOf(entity.direction));
        const frame = state === 'idle'
            ? Math.floor((entity.idleTimer || 0) * A.idleFps) % A.frames
            : Math.floor((entity.animPhase || 0) * A.frames) % A.frames;
        const sx = frame * FW;
        const sy = (A.firstRow[state] + dirIndex) * FH;
        const offX = Math.floor(((FW - TILE_SIZE) / 2 - shiftX) * scale);
        const offY = Math.floor((FH - TILE_SIZE - feetPad) * scale);
        this.ctx.drawImage(sprite, sx, sy, FW, FH, dx - offX, dy - offY, Math.ceil(FW * scale), Math.ceil(FH * scale));
    }
    updateViewBounds(camera) {
        const { TILE_SIZE, GAME_SCALE, WALL_HEIGHT } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const drawSize = TILE_SIZE * scale;
        const VIEW_PAD = 2;
        const OBJ_PAD = 8;
        const h = WALL_HEIGHT || 2;
        const tilesX = Math.ceil(this.canvas.width / drawSize) + VIEW_PAD * 2;
        const tilesY = Math.ceil(this.canvas.height / drawSize) + VIEW_PAD * 2 + h;
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
        return col >= bounds.objStartCol && col <= bounds.objEndCol && row >= bounds.objStartRow && row <= bounds.objEndRow;
    }
}