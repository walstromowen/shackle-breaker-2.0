// src/world/generators/CraftingHouseGenerator.js
import { CONFIG } from '../../core/constants.js';
import { biomeFactory } from '../biomeFactory.js';
import { hashString, makeRng, Furnisher } from './houseGenerator.js';

/* A single workshop room (9 x 8 cells) with its crafting stations against the north wall. config.craftingStations lists several (the village workshop
   has them all, in a row in the middle of the wall); config.craftingStation names a single one, and then the room is dressed for that trade: a hearth
   and barrels for the smith, crates and shelves for the carpenter, and so on (read from the interior type or from the station's id). The layout and
   the dressing are fixed by the interior id. */
export class CraftingHouseGenerator {
    constructor(seed, type, config, interiorId) {
        this.type = type;
        this.config = config;
        this.TILES = CONFIG.TILE_TYPES;
        this.seed = (seed | 0) ^ hashString(interiorId || type || 'workshop');
        this.room = { minC: -4, maxC: 4, minR: -7, maxR: 0 };
        this.bounds = { ...this.room };
        this._furnish();
    }

    _trade() {
        const key = String(this.type || '') + ' ' + String(this.config.craftingStation || '');
        if (/WORKSHOP/i.test(this.type || '') || (this.config.craftingStations || []).length > 1) return 'workshop';
        if (/BLACKSMITH|ANVIL|FORGE/i.test(key)) return 'smith';
        if (/CARPENTER/i.test(key)) return 'carpenter';
        if (/MASON|STONE/i.test(key)) return 'mason';
        if (/TAILOR/i.test(key)) return 'tailor';
        return 'generic';
    }

    /* 'F' floor, 'D' doorway, 'W' wall, 'O' outside */
    _kind(col, row) {
        const b = this.bounds;
        if (col < b.minC || col > b.maxC || row < b.minR || row > b.maxR) return 'O';
        if (col === 0 && row === b.maxR) return 'D';
        if (col > b.minC && col < b.maxC && row > b.minR && row < b.maxR) return 'F';
        return 'W';
    }

    _furnish() {
        const rand = makeRng(this.seed ^ 0x85ebca6b), room = this.room, trade = this._trade();
        const spawn = this.getEntrySpawnPoint();
        const F = new Furnisher((c, r) => this._kind(c, r), this.bounds, spawn);
        F.reserveDoor({ col: 0, row: room.maxR, dir: 'h' });
        const a = F.area(room), cx = (a.c0 + a.c1) / 2, cy = (a.r0 + a.r1) / 2;
        this.stationPos = null;

        F.place('DOORMAT', 0, room.maxR - 1);
        F.placeRugNear(room, rand.pick(['RUG_SMALL', 'RUG_GREEN', 'RUG_LONG']), cx, cy + 1);
        // a work table in the middle of the floor with a stool at each end
        const spots = [];
        for (let r = a.r0 + 2; r <= a.r1 - 1; r++) for (let c = a.c0 + 1; c + 1 <= a.c1 - 1; c++) spots.push([c, r, Math.abs(c + 0.5 - cx) + Math.abs(r - cy - 0.5)]);
        spots.sort((p, q) => p[2] - q[2]);
        for (const [c, r] of spots) if (F.place('TABLE_LONG', c, r)) { if (rand() < 0.7) F.place('STOOL', c - 1, r); if (rand() < 0.7) F.place('STOOL', c + 2, r); break; }

        // the stations: against the north wall, in the middle, with room to stand in front of each
        const row = a.r0;
        const stations = this.config.craftingStations || (this.config.craftingStation ? [this.config.craftingStation] : []);
        this.stationPositions = [];
        if (stations.length === 1) {
            for (const c of [0, 1, -1, 2, -2]) if (F.place(stations[0], c, row)) { this.stationPos = [c, row]; this.stationPositions.push([c, row]); break; }
        } else if (stations.length > 1) {
            /* a centred row, one cell each; a station whose cell is taken goes to the nearest free cell of the wall row */
            const first = -Math.floor((stations.length - 1) / 2);
            stations.forEach((id, i) => {
                const slots = [first + i];
                for (let d = 1; d <= a.c1 - a.c0; d++) slots.push(first + i - d, first + i + d);
                for (const c of slots) {
                    if (c < a.c0 || c > a.c1) continue;
                    if (F.place(id, c, row)) { this.stationPositions.push([c, row]); break; }
                }
            });
            if (this.stationPositions.length) this.stationPos = this.stationPositions[Math.floor(this.stationPositions.length / 2)];
        }
        const sc = this.stationPos ? this.stationPos[0] : 0;
        // what the trade has around it
        const wallProps = {
            smith: ['FIREPLACE', 'BARREL'], carpenter: ['BOOKSHELF', 'WARDROBE'], mason: ['BOOKSHELF'], tailor: ['WARDROBE', 'BOOKSHELF'], generic: ['BOOKSHELF'],
            workshop: ['BOOKSHELF', 'WARDROBE'],
        }[trade];
        for (const id of wallProps) F.placeOnNorthWall(room, id, rand, id === 'FIREPLACE' ? sc + (rand() < 0.5 ? -4 : 3) : sc + rand.pick([-3, 3]));
        const ringProps = {
            smith: ['BARREL', 'BARREL', 'CRATE', 'SACKS'], carpenter: ['CRATE', 'CRATE', 'CRATE_SACK', 'BARREL'], mason: ['CRATE', 'CRATE', 'BARREL', 'SACKS', 'SACKS'],
            tailor: ['SACKS', 'SACKS', 'CRATE_SACK', 'POTTED_PLANT'], generic: ['CRATE', 'BARREL'],
            workshop: ['BARREL', 'CRATE', 'CRATE', 'SACKS', 'CRATE_SACK'],
        }[trade];
        for (const id of ringProps) F.placeOnRing(room, id, rand);
        if (trade === 'tailor' || trade === 'generic') F.placeAnywhere(room, 'SMALL_TABLE', rand);
        if (rand() < 0.5) F.placeAnywhere(room, rand.pick(['CRATE', 'BARREL']), rand);
        for (const c of [a.c0, a.c1]) if (rand() < 0.9) F.place('CANDELABRA', c, a.r1);
        if (this.config.lootObject) F.placeOnRing(room, this.config.lootObject, rand);
        this.furniture = F;
    }

    getBiomeAt(col, row) {
        return biomeFactory.getBiome('HOUSE_INTERIOR') || biomeFactory.getBiome('PLAINS');
    }

    getTileAt(col, row) {
        const t = this._kind(col, row);
        if (t === 'F' || t === 'D') return this.TILES[this.config.floorTile];
        if (t === 'W') return this.TILES[this.config.wallTile];
        return this.TILES.LAYER_0;
    }

    getObjectIdAt(col, row) {
        const b = this.bounds;
        /* the exit door is 2 tiles tall: it is anchored on the row BELOW the doorway cell (the lower wall-face row) and draws upward over both wall rows; its hitbox sits on the doorway cell. config.doorObject is the outside version of the door and would warp into another building */
        if (col === 0 && row === b.maxR + 1) return this.config.exitObject || 'HOUSE_EXIT_DOOR';
        if (col < b.minC || col > b.maxC || row < b.minR || row > b.maxR) return null;
        return this.furniture.objectAt(col, row);
    }

    getEntrySpawnPoint() {
        return { col: 0, row: this.bounds.maxR - 1 };
    }

    invalidateTile(key) {
        // Not used for fixed layouts
    }
}