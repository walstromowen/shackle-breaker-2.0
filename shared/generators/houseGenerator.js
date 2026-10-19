// src/world/generators/HouseGenerator.js
import { CONFIG } from '../../shared/data/constants.js';
import { biomeFactory } from '../systems/factories/biomeFactory.js';

/* ===== Interior kit: shared helpers for the house and the workshop (CraftingHouseGenerator imports them from this file) ===== */
// Shared helpers for the house generators: a seeded random generator, the furniture catalogue and a "Furnisher" that places furniture
// without ever blocking a doorway or cutting a room in two.

/* a stable 32-bit hash of a string (an interior id like "h_3_4"), so two different houses never share a layout */
export function hashString(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

/* mulberry32: a small, well-mixed seeded generator (the old LCG repeated itself on near seeds) */
export function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    const rand = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rand.int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
    rand.pick = (arr) => arr[Math.floor(rand() * arr.length)];
    rand.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
    return rand;
}

/* What each map object needs from the layout. w = cells wide; h = cells of floor it occupies (counted up from its anchor, the bottom-left cell);
   wall = it stands against the north wall (its tall sprite overlaps the wall face); ground = a rug (nothing solid, drawn under everything). */
export const FURNITURE = {
    BARREL: { w: 1, h: 1 }, CRATE: { w: 1, h: 1 }, CRATE_SACK: { w: 1, h: 1 }, SACKS: { w: 1, h: 1 }, POTTED_PLANT: { w: 1, h: 1 },
    STOOL: { w: 1, h: 1 }, CHAIR: { w: 1, h: 1 }, SMALL_TABLE: { w: 1, h: 1 }, CANDELABRA: { w: 1, h: 1 },
    TABLE_LONG: { w: 2, h: 1 }, COUNTER: { w: 2, h: 1, wall: true },
    BED_RED: { w: 1, h: 2, wall: true }, BED_BLUE: { w: 1, h: 2, wall: true },
    BOOKSHELF: { w: 1, h: 1, wall: true }, WARDROBE: { w: 1, h: 1, wall: true }, FIREPLACE: { w: 2, h: 1, wall: true },
    RUG_SMALL: { w: 2, h: 2, ground: true }, RUG_GREEN: { w: 2, h: 2, ground: true }, RUG_LONG: { w: 3, h: 2, ground: true }, DOORMAT: { w: 1, h: 1, ground: true },
};
/* objects from the game's own list that have no entry above are treated as one solid cell */
const DEFAULT_FOOT = { w: 1, h: 1 };

const k = (c, r) => c + ',' + r;

export class Furnisher {
    /* kind(col,row) -> 'F' floor, 'D' doorway (floor in a wall line), 'W' wall, 'O' outside
       spawn = { col, row } where the player appears */
    constructor(kind, bounds, spawn) {
        this.kind = kind; this.bounds = bounds; this.spawn = spawn;
        this.solid = new Set(); this.ground = new Set(); this.reserved = new Set();
        this.items = new Map();        // 'col,row' (anchor) -> object id
        this.solidIds = [];            // placed solid items: { id, col, row }
        this.baseConnected = this._connected();
    }
    /* a cell the player can stand on: floor that is not the row under a wall's face (that row is blocked in the game); doorway cells are exempt */
    walk(c, r) {
        const t = this.kind(c, r);
        if (t === 'D') return true;
        if (t !== 'F') return false;
        const up = this.kind(c, r - 1);
        return up === 'F' || up === 'D';
    }
    free(c, r) { return this.kind(c, r) === 'F' && this.walk(c, r) && !this.solid.has(k(c, r)) && !this.reserved.has(k(c, r)); }
    reserve(c, r) { this.reserved.add(k(c, r)); }
    reserveDoor(d) {
        // keep two cells clear on each side of the doorway, along the way through it
        const horizontal = d.dir === 'h';   // a doorway in a horizontal wall: you pass north-south
        for (let i = -2; i <= 2; i++) {
            if (horizontal) this.reserve(d.col, d.row + i); else this.reserve(d.col + i, d.row);
        }
    }
    _footprint(id, col, row) {
        const f = FURNITURE[id] || DEFAULT_FOOT; const cells = [];
        for (let dr = 0; dr < f.h; dr++) for (let dc = 0; dc < f.w; dc++) cells.push([col + dc, row - dr]);
        return cells;
    }
    _connected() {
        const { minC, maxC, minR, maxR } = this.bounds;
        const open = (c, r) => this.walk(c, r) && !this.solid.has(k(c, r));
        let total = 0;
        for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) if (open(c, r)) total++;
        if (!open(this.spawn.col, this.spawn.row)) return false;
        const seen = new Set([k(this.spawn.col, this.spawn.row)]); const q = [[this.spawn.col, this.spawn.row]];
        while (q.length) {
            const [c, r] = q.pop();
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nc = c + dc, nr = r + dr, key = k(nc, nr);
                if (!seen.has(key) && open(nc, nr)) { seen.add(key); q.push([nc, nr]); }
            }
        }
        return seen.size === total;
    }
    _hasAccess(cells) {
        const own = new Set(cells.map(([c, r]) => k(c, r)));
        for (const [c, r] of cells) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc, nr = r + dr;
            if (!own.has(k(nc, nr)) && this.walk(nc, nr) && !this.solid.has(k(nc, nr))) return true;
        }
        return false;
    }
    /* try to put an object with its anchor (bottom-left cell) at col,row. Returns true when it was placed. */
    place(id, col, row) {
        const f = FURNITURE[id] || DEFAULT_FOOT;
        const cells = this._footprint(id, col, row);
        if (this.items.has(k(col, row))) return false;   // the game keeps one object per anchor cell, so a rug and a chair cannot share one
        if (f.ground) {
            for (const [c, r] of cells) if (this.kind(c, r) !== 'F' || !this.walk(c, r) || this.ground.has(k(c, r))) return false;
            for (const [c, r] of cells) this.ground.add(k(c, r));
            this.items.set(k(col, row), id);
            return true;
        }
        for (const [c, r] of cells) if (!this.free(c, r)) return false;
        if (f.wall) {   // the cell above each column of its top row must not be open floor: it is the wall, or the blocked row under the wall
            const top = row - f.h + 1;
            for (let dc = 0; dc < f.w; dc++) if (this.walk(col + dc, top - 1)) return false;
        }
        for (const [c, r] of cells) this.solid.add(k(c, r));
        if (!this._hasAccess(cells) || (this.baseConnected && !this._connected())) {
            for (const [c, r] of cells) this.solid.delete(k(c, r));
            return false;
        }
        this.items.set(k(col, row), id);
        this.solidIds.push({ id, col, row });
        return true;
    }
    /* usable floor rectangle of a room: inside its walls, below the blocked row under the north wall */
    area(room) { return { c0: room.minC + 1, c1: room.maxC - 1, r0: room.minR + 2, r1: room.maxR - 1 }; }
    /* candidate anchors along the north wall of a room, nearest to `prefer` (a column) first, or shuffled */
    northWall(room, rng, prefer = null) {
        const a = this.area(room); const cols = [];
        for (let c = a.c0; c <= a.c1; c++) cols.push(c);
        if (prefer === null) return rng.shuffle(cols).map(c => [c, a.r0]);
        return cols.sort((x, y) => Math.abs(x - prefer) - Math.abs(y - prefer) || rng() - 0.5).map(c => [c, a.r0]);
    }
    placeOnNorthWall(room, id, rng, prefer = null) {
        const a = this.area(room);
        const f = FURNITURE[id] || DEFAULT_FOOT;
        const row = a.r0 + f.h - 1;   // a bed 2 cells deep: its anchor is the lower cell
        for (const [c] of this.northWall(room, rng, prefer)) if (c + f.w - 1 <= a.c1 && this.place(id, c, row)) return [c, row];
        return null;
    }
    /* cells beside a wall (a ring of the usable area), shuffled; good spots for barrels, plants and the like */
    ringCells(room, rng) {
        const a = this.area(room); const out = [];
        for (let r = a.r0; r <= a.r1; r++) for (let c = a.c0; c <= a.c1; c++) if (c === a.c0 || c === a.c1 || r === a.r1 || r === a.r0) out.push([c, r]);
        return rng.shuffle(out);
    }
    placeOnRing(room, id, rng) {
        for (const [c, r] of this.ringCells(room, rng)) if (this.place(id, c, r)) return [c, r];
        return null;
    }
    placeAnywhere(room, id, rng) {
        const a = this.area(room); const out = [];
        for (let r = a.r0; r <= a.r1; r++) for (let c = a.c0; c <= a.c1; c++) out.push([c, r]);
        for (const [c, r] of rng.shuffle(out)) if (this.place(id, c, r)) return [c, r];
        return null;
    }
    /* a rug as close to (cc, cr) (its centre) as it fits */
    placeRugNear(room, id, cc, cr) {
        const f = FURNITURE[id]; const a = this.area(room); const spots = [];
        for (let r = a.r0 + f.h - 1; r <= a.r1; r++) for (let c = a.c0; c + f.w - 1 <= a.c1; c++) {
            const mx = c + (f.w - 1) / 2, my = r - (f.h - 1) / 2;
            spots.push([c, r, Math.abs(mx - cc) + Math.abs(my - cr)]);
        }
        spots.sort((p, q) => p[2] - q[2]);
        for (const [c, r] of spots) if (this.place(id, c, r)) return [c, r];
        return null;
    }
    objectAt(col, row) { return this.items.get(k(col, row)) || null; }
}

/* ===== House generator ===== */
/* A procedural house: a main hall with the front door, a room behind it, one or two rooms beside it, joined by doorways, every room furnished for
   what it is (hall, bedroom, study, kitchen, storage). The layout is fixed by the interior id, so a house is the same every time you enter it. */
export class HouseGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;
        this.seed = (seed | 0) ^ hashString(interiorId || 'house');
        this.layoutState = this._generateLayout(this.seed);
        this.bounds = this.layoutState.bounds;
        this._furnish(this.layoutState, this.seed);
    }

    /* ------------------------------------------------------------ layout ------------------------------------------------------------ */
    _separated(a, b) { // at least one empty cell between the two rooms' outer walls
        return a.maxC + 1 <= b.minC || b.maxC + 1 <= a.minC || a.maxR + 1 <= b.minR || b.maxR + 1 <= a.minR;
    }

    _tryLayout(rand, simple) {
        // --- the hall: the front door is in the middle of its south wall ---
        const w1 = rand.int(4, 6), h1 = rand.int(3, 5);
        const hall = { minC: -w1, maxC: w1, minR: -h1, maxR: h1, kind: 'hall' };
        const rooms = [hall], doors = [];

        // --- the room behind (north) ---
        const iw2 = rand.int(5, 9), ih2 = rand.int(4, 6);
        const minC2 = rand.int(hall.minC - 2, hall.maxC + 2 - (iw2 + 1));
        const back = { minC: minC2, maxC: minC2 + iw2 + 1, minR: hall.minR - (ih2 + 1), maxR: hall.minR, kind: rand() < 0.6 ? 'bedroom' : rand.pick(['study', 'storage']) };
        const lo = Math.max(hall.minC + 1, back.minC + 1), hi = Math.min(hall.maxC - 1, back.maxC - 1);
        if (hi - lo + 1 < 3) return null;
        rooms.push(back);
        doors.push({ col: rand.int(lo, hi), row: hall.minR, dir: 'h' });

        // --- rooms beside the hall ---
        const sides = simple ? [] : (rand() < 0.4 ? [1, -1] : [rand() < 0.5 ? 1 : -1]);
        const kinds = rand.shuffle(['kitchen', 'storage', 'bedroom', 'study']);
        for (const dir of sides) {
            const iw = rand.int(5, 8), ih = rand.int(5, 8);
            const minR = rand.int(hall.minR - 2, hall.maxR - 3);
            const room = dir > 0
                ? { minC: hall.maxC, maxC: hall.maxC + iw + 1, minR, maxR: minR + ih + 1, kind: kinds.pop() }
                : { minC: hall.minC - iw - 1, maxC: hall.minC, minR, maxR: minR + ih + 1, kind: kinds.pop() };
            // a doorway row both rooms can walk to: not under the blocked row of either, not in the bottom wall
            const dlo = Math.max(hall.minR, room.minR) + 2, dhi = Math.min(hall.maxR, room.maxR) - 1;
            if (dhi < dlo) return null;
            for (const other of rooms) if (other !== hall && !this._separated(room, other)) return null;
            rooms.push(room);
            doors.push({ col: dir > 0 ? hall.maxC : hall.minC, row: rand.int(dlo, dhi), dir: 'v' });
        }
        const bounds = {
            minC: Math.min(...rooms.map(r => r.minC)), maxC: Math.max(...rooms.map(r => r.maxC)),
            minR: Math.min(...rooms.map(r => r.minR)), maxR: Math.max(...rooms.map(r => r.maxR)),
        };
        return { rooms, room1: hall, internalDoors: doors, bounds };
    }

    _generateLayout(seed) {
        const rand = makeRng(seed);
        let layout = null;
        for (let i = 0; i < 40 && !layout; i++) layout = this._tryLayout(rand, false);
        for (let i = 0; i < 40 && !layout; i++) layout = this._tryLayout(rand, true);
        if (!layout) layout = this._tryLayout(makeRng(1), true); // a fixed seed that always fits
        return layout;
    }

    /* 'F' floor, 'D' doorway, 'W' wall, 'O' outside */
    _kind(col, row) {
        const L = this.layoutState, b = L.bounds;
        if (col < b.minC || col > b.maxC || row < b.minR || row > b.maxR) return 'O';
        if (col === 0 && row === L.room1.maxR) return 'D';
        for (const d of L.internalDoors) {
            if (col === d.col && row === d.row) return 'D';
            // a doorway in a side wall is two cells tall: the upper one is the lintel (floor, but under the wall's face so you cannot step on it), the lower one is the way through
            if (d.dir === 'v' && col === d.col && row === d.row - 1) return 'F';
        }
        for (const r of L.rooms) if (col > r.minC && col < r.maxC && row > r.minR && row < r.maxR) return 'F';
        for (const r of L.rooms) if (col >= r.minC && col <= r.maxC && row >= r.minR && row <= r.maxR) return 'W';
        return 'O';
    }

    /* ---------------------------------------------------------- furnishing ---------------------------------------------------------- */
    _furnish(L, seed) {
        const rand = makeRng(seed ^ 0x9e3779b9);
        const hall = L.room1;
        const spawn = this.getEntrySpawnPoint();
        const F = new Furnisher((c, r) => this._kind(c, r), L.bounds, spawn);
        F.reserveDoor({ col: 0, row: hall.maxR, dir: 'h' });
        for (const d of L.internalDoors) F.reserveDoor(d);

        this._furnishHall(F, hall, rand);
        for (const room of L.rooms) if (room !== hall) this._furnishRoom(F, room, rand);

        // the loot chest (every house has one): in one of the rooms away from the front door, in the hall only if none of them has a free spot
        const lootObject = this.config.lootObject;
        if (lootObject) {
            const rest = rand.shuffle(L.rooms.filter(r => r !== hall));
            let placed = false;
            for (const room of rest) if (F.placeOnRing(room, lootObject, rand)) { placed = true; break; }
            if (!placed) F.placeOnRing(hall, lootObject, rand);
        }
        this.furniture = F;
    }

    _furnishHall(F, hall, rand) {
        const a = F.area(hall), cx = (a.c0 + a.c1) / 2, cy = (a.r0 + a.r1) / 2;
        F.place('DOORMAT', 0, hall.maxR - 1);
        F.placeRugNear(hall, rand.pick(['RUG_LONG', 'RUG_SMALL', 'RUG_GREEN']), cx, cy);
        F.placeOnNorthWall(hall, 'FIREPLACE', rand, Math.round(cx) + rand.int(-3, 3));
        // dining table in the middle with chairs behind it and stools at its ends
        const tableSpots = [];
        for (let r = a.r0 + 1; r <= a.r1 - 1; r++) for (let c = a.c0 + 1; c + 1 <= a.c1 - 1; c++) tableSpots.push([c, r, Math.abs(c + 0.5 - cx) + Math.abs(r - cy - 0.5)]);
        tableSpots.sort((p, q) => p[2] - q[2]);
        for (const [c, r] of tableSpots) {
            if (!F.place('TABLE_LONG', c, r)) continue;
            if (rand() < 0.85) F.place('CHAIR', c, r - 1);
            if (rand() < 0.85) F.place('CHAIR', c + 1, r - 1);
            if (rand() < 0.5) F.place('STOOL', c - 1, r);
            if (rand() < 0.5) F.place('STOOL', c + 2, r);
            break;
        }
        for (let i = 0; i < rand.int(0, 2); i++) F.placeOnNorthWall(hall, 'BOOKSHELF', rand);
        if (rand() < 0.5) F.placeOnNorthWall(hall, 'WARDROBE', rand);
        for (const c of [a.c0, a.c1]) if (rand() < 0.85) F.place('CANDELABRA', c, a.r1);
        F.placeOnRing(hall, 'POTTED_PLANT', rand);
        if (rand() < 0.7) F.placeOnRing(hall, 'BARREL', rand);
        if (rand() < 0.5) F.placeOnRing(hall, rand.pick(['CRATE', 'SACKS']), rand);
        if (rand() < 0.6) F.placeOnRing(hall, 'SMALL_TABLE', rand);
    }

    _furnishRoom(F, room, rand) {
        const a = F.area(room), cx = (a.c0 + a.c1) / 2, cy = (a.r0 + a.r1) / 2;
        const bed = () => rand.pick(['BED_RED', 'BED_BLUE']);
        switch (room.kind) {
            case 'bedroom': {
                const first = F.placeOnNorthWall(room, bed(), rand);
                if (first && a.c1 - a.c0 >= 5 && rand() < 0.6) F.placeOnNorthWall(room, bed(), rand);
                F.placeOnNorthWall(room, 'WARDROBE', rand);
                if (first) F.place('SMALL_TABLE', first[0] + (rand() < 0.5 ? 1 : -1), a.r0);
                F.placeRugNear(room, rand.pick(['RUG_SMALL', 'RUG_GREEN']), cx, cy + 0.5);
                F.placeOnRing(room, 'CANDELABRA', rand);
                if (rand() < 0.6) F.placeOnRing(room, 'POTTED_PLANT', rand);
                if (rand() < 0.5) F.placeOnRing(room, 'BARREL', rand);
                break;
            }
            case 'study': {
                for (let i = 0; i < rand.int(2, 3); i++) F.placeOnNorthWall(room, 'BOOKSHELF', rand);
                F.placeRugNear(room, rand.pick(['RUG_LONG', 'RUG_SMALL']), cx, cy);
                const t = F.placeAnywhere(room, 'SMALL_TABLE', rand);
                if (t) { F.place('CHAIR', t[0], t[1] - 1); F.place('STOOL', t[0] + 1, t[1]); }
                F.placeOnRing(room, 'CANDELABRA', rand);
                if (rand() < 0.7) F.placeOnRing(room, 'POTTED_PLANT', rand);
                if (rand() < 0.5) F.placeOnRing(room, 'CRATE', rand);
                break;
            }
            case 'kitchen': {
                F.placeOnNorthWall(room, 'COUNTER', rand);
                if (rand() < 0.5) F.placeOnNorthWall(room, 'COUNTER', rand);
                if (rand() < 0.5) F.placeOnNorthWall(room, 'FIREPLACE', rand);
                const tableSpots = [];
                for (let r = a.r0 + 1; r <= a.r1; r++) for (let c = a.c0; c + 1 <= a.c1; c++) tableSpots.push([c, r, Math.abs(c + 0.5 - cx) + Math.abs(r - cy)]);
                tableSpots.sort((p, q) => p[2] - q[2]);
                for (const [c, r] of tableSpots) if (F.place('TABLE_LONG', c, r)) { F.place('STOOL', c - 1, r); F.place('STOOL', c + 2, r); if (rand() < 0.6) F.place('STOOL', c, r + 1); break; }
                for (let i = 0; i < rand.int(2, 3); i++) F.placeOnRing(room, rand.pick(['BARREL', 'SACKS', 'CRATE_SACK']), rand);
                F.placeOnRing(room, 'CANDELABRA', rand);
                break;
            }
            default: { // storage
                for (let i = 0; i < rand.int(2, 4); i++) F.placeOnRing(room, rand.pick(['CRATE', 'CRATE_SACK', 'CRATE']), rand);
                for (let i = 0; i < rand.int(2, 3); i++) F.placeOnRing(room, 'BARREL', rand);
                for (let i = 0; i < rand.int(1, 3); i++) F.placeOnRing(room, 'SACKS', rand);
                if (rand() < 0.6) F.placeOnNorthWall(room, 'BOOKSHELF', rand);
                for (let i = 0; i < rand.int(1, 3); i++) F.placeAnywhere(room, rand.pick(['CRATE', 'BARREL', 'SACKS']), rand);
                if (rand() < 0.5) F.placeOnRing(room, 'CANDELABRA', rand);
            }
        }
    }

    /* -------------------------------------------------------------- terrain / API -------------------------------------------------------------- */
    getBiomeAt(col, row) {
        return biomeFactory.getBiome(this.type) || biomeFactory.getBiome('HOUSE_INTERIOR') || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        const t = this._kind(col, row);
        if (t === 'F' && this.config.flagstoneRooms !== false && this.TILES.LAYER_1) {
            // kitchens and storerooms are paved with the second floor type (flagstone); LAYER_1 is walkable from the plank floor like dirt from grass
            for (const r of this.layoutState.rooms) if ((r.kind === 'kitchen' || r.kind === 'storage') && col > r.minC && col < r.maxC && row > r.minR && row < r.maxR) return this.TILES.LAYER_1;
        }
        if (t === 'F' || t === 'D') return this.TILES[this.config.floorTile];
        if (t === 'W') return this.TILES[this.config.wallTile];
        return this.TILES.LAYER_0;
    }

    getObjectIdAt(col, row) {
        const L = this.layoutState, b = this.bounds;
        /* the exit door is 2 tiles tall: it is anchored on the row BELOW the doorway cell (the lower wall-face row) and draws upward over both wall rows; its hitbox sits on the doorway cell. config.doorObject is the outside version of the door and would warp into another building */
        if (col === 0 && row === L.room1.maxR + 1) return this.config.exitObject || 'HOUSE_EXIT_DOOR';
        if (col < b.minC || col > b.maxC || row < b.minR || row > b.maxR) return null;
        return this.furniture.objectAt(col, row);
    }

    getEntrySpawnPoint() {
        return { col: 0, row: this.layoutState.room1.maxR - 1 };
    }

    invalidateTile(key) {
        // Not used for fixed layouts
    }
}