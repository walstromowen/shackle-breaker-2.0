import { CONFIG } from '../../../../shared/core/constants.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { BlobTerrainRenderer } from './blobTerrainRenderer.js';
import { fenceFrame } from '../../../../shared/world/fenceConnections.js';
import { PartyFollowers } from './partyFollowers.js';
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
        /* A biome with `ambientLight` (a cave) is dark whatever the clock says: blended into the day / night colour before the lighting pass. */
        ambientData = this.naturalAmbient(worldManager, interpCamX, interpCamY, ambientData, totalTime);
        /* Who is on the map: the party's first three members who are on their feet. The first is the player, the next two follow (PartyFollowers). */
        this.lineup = PartyFollowers.lineup(gameState.party && gameState.party.members, (key) => !!this.loader.get(key));
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
            lightingRenderer.render(this.ctx, ambientData, renderCamera, entities, lightObjects, worldManager, interpolationFactor);
        }
    }
    /* Natural darkness. The biome under the camera may carry `ambientLight: { r, g, b, a }` (biomeDefinitions.js). The result is the darker of that and the
       day / night colour (alpha = the larger of the two, colour = the two weighted by their alphas), so a cave is as dark as night by day and no darker than the
       night outside by night. The strength fades in and out over FADE seconds (walking from one biome into a darker one, or a new map); a new world manager
       starts at full strength at once. `ambientData` may be null (full day): the result is then the natural darkness alone, or null if there is none. */
    naturalAmbient(worldManager, camX, camY, ambientData, totalTime) {
        const FADE = 0.6;
        const T = this.config.TILE_SIZE;
        const biome = worldManager && worldManager.getBiomeAt ? worldManager.getBiomeAt(Math.floor((camX + T / 2) / T), Math.floor((camY + T / 2) / T)) : null;
        const want = biome && biome.ambientLight ? biome.ambientLight : null;
        let st = this._natural;
        if (!st || st.wm !== worldManager) {
            st = this._natural = { wm: worldManager, t: totalTime, r: want ? want.r : 0, g: want ? want.g : 0, b: want ? want.b : 0, a: want ? want.a : 0 };
        }
        const dt = Math.max(0, Math.min(0.25, totalTime - st.t));
        st.t = totalTime;
        const k = Math.min(1, dt / FADE);
        if (want) {                                        // colour follows the biome; strength moves towards it
            st.r += (want.r - st.r) * k; st.g += (want.g - st.g) * k; st.b += (want.b - st.b) * k;
            st.a += (want.a - st.a) * k;
        } else {                                           // no darkness here: fade out, keeping the last colour so it does not shift while fading
            st.a = Math.max(0, st.a - k * Math.max(st.a, 0.5));
        }
        if (st.a < 0.002) return ambientData;
        if (!ambientData || !(ambientData.a > 0)) return { r: st.r, g: st.g, b: st.b, a: st.a };
        const w = Math.min(1, st.a / ambientData.a);       // the darker one gives the colour; below that the two mix
        return {
            r: ambientData.r + (st.r - ambientData.r) * w,
            g: ambientData.g + (st.g - ambientData.g) * w,
            b: ambientData.b + (st.b - ambientData.b) * w,
            a: Math.max(st.a, ambientData.a),
        };
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
                if (obj.connects) obj.currentFrame = this.connectedFrame(obj, worldManager);
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
    /* The frame for an object that joins up with its neighbours (the wooden fence): one post, with rails towards every neighbouring fence. */
    connectedFrame(obj, worldManager) {
        if (!this._joinsWith) this._joinsWith = (c, r) => { const o = this._joinWorld.getObject(c, r); return !!o && o.connects === this._joinKind; };
        this._joinWorld = worldManager; // read by _joinsWith: one function for every fence piece, so nothing is allocated per frame
        this._joinKind = obj.connects;
        return fenceFrame(obj.col, obj.row, this._joinsWith);
    }
    /* ==========================================  4. DRAWING PRIMITIVES  ========================================== */
    drawObject(obj, dx, dy, totalTime = 0) {
        const imageSource = obj.sheet ? this.loader.get(obj.sheet) : null;
        if (!imageSource) return;
        if (obj.character) return this.drawCharacterObject(obj, imageSource, dx, dy, totalTime);
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
    /* A map object that is a person or an animal (an NPC standing in the world): it is drawn straight from a character sheet, with one of that sheet's
       idle rows, the same way drawEntity draws the party leader. definition.character = { entity, sheet, facing, row } (see npcBody in mapObjectDefinitions.js), facing being South / East / North / West
       as 'DOWN' / 'RIGHT' / 'UP' / 'LEFT' (default 'DOWN'). The frame is centred on the tile and stands on the bottom edge of it, so the sheet's shadow
       sits exactly where the shadow of every other character sits. */
    drawCharacterObject(obj, sprite, dx, dy, totalTime = 0) {
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const fr = obj.character.frame || this.config.CHARACTER_FRAME || {};
        const FW = fr.w || TILE_SIZE, FH = fr.h || TILE_SIZE;
        const shiftX = fr.shiftX || 0;
        let feetPad = fr.feetPad;
        if (typeof feetPad !== 'number') feetPad = this.characterFeetPad(sprite, FH) ?? 0;
        const A = this.charAnim;
        const dirIndex = Number.isInteger(obj.character.row) ? obj.character.row : Math.max(0, A.directionOrder.indexOf(obj.character.facing || 'DOWN')); // the row the definition names, else by facing
        const phase = Math.abs((obj.col || 0) * 7 + (obj.row || 0) * 13) % A.frames; // two of them side by side do not breathe in step
        const frame = (Math.floor(totalTime * A.idleFps) + phase) % A.frames;
        const sx = frame * FW;
        const sy = (A.firstRow.idle + dirIndex) * FH;
        const offX = Math.floor(((FW - TILE_SIZE) / 2 - shiftX) * scale);
        const dW = Math.ceil(FW * scale), dH = Math.ceil(FH * scale);
        const tileBottom = dy + Math.ceil(TILE_SIZE * scale);
        const prevAlpha = this.ctx.globalAlpha;
        if (obj.alpha !== undefined) this.ctx.globalAlpha = Math.max(0, Math.min(1, obj.alpha));
        this.ctx.drawImage(sprite, sx, sy, FW, FH, dx - offX, tileBottom - dH + Math.floor(feetPad * dH / FH), dW, dH);
        if (obj.alpha !== undefined) this.ctx.globalAlpha = prevAlpha;
    }
    /* Number of empty rows between the lowest drawn pixel and the bottom of a character frame, read from the sheet's own pixels: the lowest opaque row
       of any frame in the sheet (so a lifted foot does not drag the ground line up). Found once per sheet and remembered. Returns null when the pixels
       cannot be read (no document, a sheet from another origin, ...), and the caller then falls back to the configured number. */
    characterFeetPad(sprite, FH) {
        if (!this._feetPads) this._feetPads = new WeakMap();
        if (this._feetPads.has(sprite)) return this._feetPads.get(sprite);
        let pad = null;
        try {
            const w = sprite.naturalWidth || sprite.width, h = sprite.naturalHeight || sprite.height;
            if (w > 0 && h > 0 && typeof document !== 'undefined') {
                const cv = document.createElement('canvas');
                cv.width = w;
                cv.height = h;
                const cx = cv.getContext('2d', { willReadFrequently: true });
                cx.drawImage(sprite, 0, 0);
                const px = cx.getImageData(0, 0, w, h).data;
                let lowest = -1;
                for (let y = 0; y < h; y++) {
                    const row = y % FH; // the row inside its frame
                    if (row <= lowest) continue; // cannot raise the maximum
                    for (let x = 0; x < w; x++) {
                        if (px[(y * w + x) * 4 + 3] > 0) { lowest = row; break; }
                    }
                }
                if (lowest >= 0) pad = FH - 1 - lowest;
            }
        } catch (e) {
            pad = null;
        }
        this._feetPads.set(sprite, pad); // a failure is remembered too, so the sheet is not scanned again every frame
        return pad;
    }
    drawEntity(entity, camera, interpolationFactor = 1) {
        // The party leader walks the map: the first member on their feet who has a sheet (this.lineup, worked out once a frame). A recruited creature has no walking sheet
        // (the snow leopard and wolf point at a sheet that does not exist), so it is skipped and the next member is drawn instead of the player vanishing. The two after the leader are the followers.
        const lineup = this.lineup || PartyFollowers.lineup(gameState.party.members, (key) => !!this.loader.get(key));
        const walker = lineup[entity.followerSlot || 0];
        const sprite = walker ? this.loader.get(walker.spriteOverworld) : null;
        if (!sprite) return;
        const { TILE_SIZE, GAME_SCALE } = this.config;
        const scale = GAME_SCALE * this.resScale;
        const renderX = entity.prevX !== undefined ? entity.prevX + (entity.x - entity.prevX) * interpolationFactor : entity.x;
        const renderY = entity.prevY !== undefined ? entity.prevY + (entity.y - entity.prevY) * interpolationFactor : entity.y;
        const dx = Math.floor((renderX - camera.x) * scale);
        const dy = Math.floor((renderY - camera.y) * scale);
        /* A character frame can be bigger than a tile (e.g. 64 x 64). entity.x / y stay the tile the character stands on, so collision, the hitbox and
           the depth sort do not change; the frame is only DRAWN around that tile: centred sideways, with the lowest drawn pixel of the sprite on the
           bottom edge of the tile (exactly the line the bottom of a 1-tile map object sits on, see drawObject), so nothing is drawn over the tile
           below. A 64 x 64 frame with its feet on the last row rises 32 px above the tile.
           CONFIG.CHARACTER_FRAME = { w, h, feetPad, shiftX } (an entity may carry its own `frame`):
             w, h     size of one frame in the sheet (default: one tile, the old behaviour)
             feetPad  'auto' (default): the empty rows under the feet are read from the sheet's pixels, so the feet are flush whatever the art
                      looks like. A number overrides that: the empty rows between the feet and the bottom of the frame (0 = feet on the last row)
             shiftX   pixels to move the frame sideways when the figure is not centred in it (positive = right) */
        const fr = entity.frame || this.config.CHARACTER_FRAME || {};
        const FW = fr.w || TILE_SIZE, FH = fr.h || TILE_SIZE;
        const shiftX = fr.shiftX || 0;
        let feetPad = fr.feetPad;
        if (typeof feetPad !== 'number') feetPad = this.characterFeetPad(sprite, FH) ?? 0; // 'auto' or not set
        const A = this.charAnim;
        const state = A.firstRow[entity.animState] !== undefined ? entity.animState : 'idle'; // an entity without an animState shows its idle pose
        const dirIndex = Math.max(0, A.directionOrder.indexOf(entity.direction));
        const frame = state === 'idle'
            ? Math.floor((entity.idleTimer || 0) * A.idleFps) % A.frames
            : Math.floor((entity.animPhase || 0) * A.frames) % A.frames;
        const sx = frame * FW;
        const sy = (A.firstRow[state] + dirIndex) * FH;
        const offX = Math.floor(((FW - TILE_SIZE) / 2 - shiftX) * scale);
        const dW = Math.ceil(FW * scale), dH = Math.ceil(FH * scale);
        const tileBottom = dy + Math.ceil(TILE_SIZE * scale); // the same screen line drawObject puts the bottom of a 1-tile object on, at any scale
        this.ctx.drawImage(sprite, sx, sy, FW, FH, dx - offX, tileBottom - dH + Math.floor(feetPad * dH / FH), dW, dH);
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
