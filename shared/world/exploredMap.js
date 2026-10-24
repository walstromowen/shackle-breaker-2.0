import { gameState } from '../core/gameState.js';

/* ExploredMap - which part of the overworld the player has SEEN, for the world map (screens/worldMap).
 *
 * The world is cut into square BLOCKS of BLOCK x BLOCK tiles. Walking reveals every block whose middle lies inside an ellipse round the player (about what the
 * main view shows), so the revealed land grows in a ragged band along the road, never as a perfect disc, and unwalked land stays unknown. Only the overworld
 * reveals anything (the inside of a house or cave has its own seed and its own coordinates, see SceneManager's WARP handling).
 *
 * Saved in gameState.world.discoveredChunks (already carried by SaveManager): an array of "rx,ry,hex" strings, one per REGION of REGION x REGION blocks (64 x 64
 * tiles), `hex` being the REGION * REGION bits of that region, so a big world is a few dozen short strings. ExploredMap.of(world) wraps that array (a loaded save
 * brings a new array, which is read afresh) and keeps it up to date in place after every change, so a snapshot never needs a flush.
 */

export const BLOCK = 4;                       // tiles along one side of a revealed block
export const REGION = 16;                     // blocks along one side of a stored region
const BYTES = (REGION * REGION) / 8;          // 32 bytes (64 hex characters) a region
export const EXPLORE_HALF = { w: 13, h: 8 };  // tiles to the left / right and above / below the player that a step reveals (the view is about 25 x 14 tiles)

const cache = new WeakMap();
const floorDiv = (a, b) => Math.floor(a / b);
const mod = (a, b) => ((a % b) + b) % b;
const toHex = (bytes) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => {
    const out = new Uint8Array(BYTES);
    for (let i = 0; i < BYTES; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16) || 0;
    return out;
};

export class ExploredMap {
    constructor(list) {
        this.list = list;
        this.regions = new Map();   // "rx,ry" -> Uint8Array(BYTES)
        this.slot = new Map();      // "rx,ry" -> index in `list`
        this.version = 0;           // goes up whenever something new is revealed (the map screen repaints on it)
        list.forEach((entry, i) => {
            const parts = typeof entry === 'string' ? entry.split(',') : [];
            if (parts.length !== 3 || !Number.isFinite(+parts[0]) || !Number.isFinite(+parts[1])) return;
            const key = parts[0] + ',' + parts[1];
            this.regions.set(key, fromHex(parts[2]));
            this.slot.set(key, i);
        });
    }

    /* The map of a world object (default: the game's). Makes sure `discoveredChunks` is an array. */
    static of(world = gameState.world) {
        if (!Array.isArray(world.discoveredChunks)) world.discoveredChunks = [];
        let m = cache.get(world.discoveredChunks);
        if (!m) { m = new ExploredMap(world.discoveredChunks); cache.set(world.discoveredChunks, m); }
        return m;
    }

    _bit(bx, by) {
        const rx = floorDiv(bx, REGION), ry = floorDiv(by, REGION);
        const bits = this.regions.get(rx + ',' + ry);
        if (!bits) return false;
        const i = mod(by, REGION) * REGION + mod(bx, REGION);
        return (bits[i >> 3] & (1 << (i & 7))) !== 0;
    }

    /* Has the block (bx, by) been seen? */
    hasBlock(bx, by) { return this._bit(bx, by); }

    /* Has the tile (col, row) been seen? */
    has(col, row) { return this._bit(floorDiv(col, BLOCK), floorDiv(row, BLOCK)); }

    /* The bits of one region (a Uint8Array) or undefined: lets the renderer skip a whole region nobody has walked. */
    region(rx, ry) { return this.regions.get(rx + ',' + ry); }

    /* Reveal the blocks whose middle is inside the ellipse with half-width `halfW` and half-height `halfH` (tiles) round (col, row). Returns true when it revealed something new. */
    reveal(col, row, halfW = EXPLORE_HALF.w, halfH = EXPLORE_HALF.h) {
        const bx0 = floorDiv(col - halfW, BLOCK), bx1 = floorDiv(col + halfW, BLOCK);
        const by0 = floorDiv(row - halfH, BLOCK), by1 = floorDiv(row + halfH, BLOCK);
        const touched = new Set();
        let changed = false;
        for (let by = by0; by <= by1; by++) {
            for (let bx = bx0; bx <= bx1; bx++) {
                const dx = ((bx + 0.5) * BLOCK - (col + 0.5)) / halfW, dy = ((by + 0.5) * BLOCK - (row + 0.5)) / halfH;
                if (dx * dx + dy * dy > 1) continue;
                const rx = floorDiv(bx, REGION), ry = floorDiv(by, REGION), key = rx + ',' + ry;
                let bits = this.regions.get(key);
                if (!bits) { bits = new Uint8Array(BYTES); this.regions.set(key, bits); }
                const i = mod(by, REGION) * REGION + mod(bx, REGION);
                if (bits[i >> 3] & (1 << (i & 7))) continue;
                bits[i >> 3] |= 1 << (i & 7);
                touched.add(key);
                changed = true;
            }
        }
        for (const key of touched) {
            const entry = key + ',' + toHex(this.regions.get(key));
            if (this.slot.has(key)) this.list[this.slot.get(key)] = entry;
            else { this.slot.set(key, this.list.length); this.list.push(entry); }
        }
        if (changed) this.version++;
        return changed;
    }

    /* The smallest rectangle of tiles that holds everything seen: { minCol, minRow, maxCol, maxRow } (max is the last tile), or null when nothing has been seen. */
    bounds() {
        let b = null;
        for (const [key, bits] of this.regions) {
            const [rx, ry] = key.split(',').map(Number);
            for (let i = 0; i < REGION * REGION; i++) {
                if (!(bits[i >> 3] & (1 << (i & 7)))) continue;
                const bx = rx * REGION + (i % REGION), by = ry * REGION + Math.floor(i / REGION);
                if (!b) b = { minCol: bx * BLOCK, minRow: by * BLOCK, maxCol: bx * BLOCK + BLOCK - 1, maxRow: by * BLOCK + BLOCK - 1 };
                else {
                    b.minCol = Math.min(b.minCol, bx * BLOCK); b.minRow = Math.min(b.minRow, by * BLOCK);
                    b.maxCol = Math.max(b.maxCol, bx * BLOCK + BLOCK - 1); b.maxRow = Math.max(b.maxRow, by * BLOCK + BLOCK - 1);
                }
            }
        }
        return b;
    }

    /* How many blocks have been seen. */
    count() {
        let n = 0;
        for (const bits of this.regions.values()) for (let i = 0; i < BYTES; i++) { let v = bits[i]; while (v) { n += v & 1; v >>= 1; } }
        return n;
    }
}
