// shared/world/generators/castleInteriorGenerator.js
/* The insides of a ruined castle's keep and armory (interiorDefinitions KEEP_INTERIOR, ARMORY_INTERIOR), entered from their doors (mapObjectDefinitions
   CASTLE_KEEP_DOOR, CASTLE_ARMORY_DOOR). Built like a house (HouseGenerator: rooms joined by doorways, furnished by the Furnisher so nothing ever blocks a
   doorway or cuts a room in two, fixed by the interior id so it is the same on every visit), in stone: the castle's own tiles (biome CASTLE_INTERIOR,
   cobbled floors, the castle's walls), furnished with what the game already has (the house furniture, the forge and anvil, chests, standing torches,
   braziers, the fallen soldiers, old barrels and bones).

   KEEP: a great hall, two rows of stone pillars down its length, a runner from the door to the lord's chair at the far end between braziers and
         torches, the long feast tables either side (some of them overturned by the dead); a wing either side (a bedchamber, a library, a treasury or a
         storeroom, two of them), the treasury's iron chests the keep's best loot.
   ARMORY: a long hall of weapon counters and armour lockers along its back wall, supplies stacked round it, the armory's iron chest, the fallen of its
         last defence; a smithy off one side (a forge and an anvil, both working) and a storeroom behind. */
import { biomeFactory } from '../biomeFactory.js';
import { HouseGenerator, Furnisher, FURNITURE, makeRng } from './houseGenerator.js';

// what the castle rooms use from the game's objects that the house catalogue does not know yet: the fallen (2 x 2, solid), wheelbarrows (2 wide)
for (let i = 1; i <= 15; i++) FURNITURE['FALLEN_SOLDIER_' + i] = FURNITURE['FALLEN_SOLDIER_' + i] || { w: 2, h: 2 };
for (let i = 1; i <= 3; i++) FURNITURE['WHEELBARROW_' + i] = FURNITURE['WHEELBARROW_' + i] || { w: 2, h: 1 };
const fallen = (rand) => 'FALLEN_SOLDIER_' + rand.int(1, 15);
const k = (c, r) => c + ',' + r;

/* rooms either side of a hall, joined to it by a doorway in its side wall (the house generator's rule: a row both can walk to) */
function sideRoom(rand, hall, dir, iw, ih, kind) {
    const minR = rand.int(hall.minR - 1, hall.maxR - ih - 1);
    const room = dir > 0
        ? { minC: hall.maxC, maxC: hall.maxC + iw + 1, minR, maxR: minR + ih + 1, kind }
        : { minC: hall.minC - iw - 1, maxC: hall.minC, minR, maxR: minR + ih + 1, kind };
    const dlo = Math.max(hall.minR, room.minR) + 2, dhi = Math.min(hall.maxR, room.maxR) - 1;
    if (dhi < dlo) return null;
    return { room, door: { col: dir > 0 ? hall.maxC : hall.minC, row: rand.int(dlo, dhi), dir: 'v' } };
}

class CastleInteriorBase extends HouseGenerator {
    getBiomeAt() {
        return biomeFactory.getBiome(this.config.biome || 'CASTLE_INTERIOR') || biomeFactory.getBiome('HOUSE_INTERIOR');
    }
    _kind(col, row) {
        if (this.layoutState && this.layoutState.pillars && this.layoutState.pillars.has(k(col, row))) return 'W';
        return super._kind(col, row);
    }
    getTileAt(col, row) {
        const t = this._kind(col, row);
        if (t === 'F' || t === 'D') return this.TILES[this.config.floorTile];
        if (t === 'W') return this.TILES[this.config.wallTile];
        return this.TILES.LAYER_0;
    }
    _generateLayout(seed) {
        const rand = makeRng(seed);
        let layout = null;
        for (let i = 0; i < 60 && !layout; i++) layout = this._tryLayout(rand);
        if (!layout) layout = this._tryLayout(makeRng(1), true);
        return layout;
    }
    _bounds(rooms) {
        return {
            minC: Math.min(...rooms.map(r => r.minC)), maxC: Math.max(...rooms.map(r => r.maxC)),
            minR: Math.min(...rooms.map(r => r.minR)), maxR: Math.max(...rooms.map(r => r.maxR)),
        };
    }
    _startFurnishing(L) {
        const spawn = this.getEntrySpawnPoint();
        const F = new Furnisher((c, r) => this._kind(c, r), L.bounds, spawn);
        F.reserveDoor({ col: 0, row: L.room1.maxR, dir: 'h' });
        for (const d of L.internalDoors) F.reserveDoor(d);
        F.place('DOORMAT', 0, L.room1.maxR - 1);
        return F;
    }
    /* the dead and their leavings, here and there over a room */
    _litter(F, room, rand, { bodies = [0, 1], bones = [1, 3], barrels = [0, 2] } = {}) {
        for (let i = rand.int(...bodies); i > 0; i--) F.placeAnywhere(room, fallen(rand), rand);
        for (let i = rand.int(...bones); i > 0; i--) F.placeAnywhere(room, 'BONE_PILE', rand);
        for (let i = rand.int(...barrels); i > 0; i--) F.placeOnRing(room, rand.pick(['RUINED_BARREL', 'ANCIENT_BARREL', 'BARREL']), rand);
    }
    _furnishWing(F, room, rand) {
        const a = F.area(room), cx = (a.c0 + a.c1) / 2, cy = (a.r0 + a.r1) / 2;
        switch (room.kind) {
            case 'bedchamber': {
                const bed = F.placeOnNorthWall(room, rand.pick(['BED_RED', 'BED_BLUE']), rand, Math.round(cx));
                F.placeOnNorthWall(room, 'WARDROBE', rand);
                if (bed) F.place('SMALL_TABLE', bed[0] + 1, a.r0);
                F.placeRugNear(room, rand.pick(['RUG_SMALL', 'RUG_GREEN']), cx, cy + 0.5);
                if (rand() < 0.6) F.placeOnNorthWall(room, 'BOOKSHELF', rand);
                F.placeOnRing(room, 'CANDELABRA', rand);
                this._litter(F, room, rand, { bodies: [0, 1], bones: [0, 2], barrels: [0, 1] });
                break;
            }
            case 'library': {
                for (let i = rand.int(3, 5); i > 0; i--) F.placeOnNorthWall(room, 'BOOKSHELF', rand);
                F.placeRugNear(room, 'RUG_LONG', cx, cy);
                const t = F.placeAnywhere(room, 'SMALL_TABLE', rand);
                if (t) { F.place('CHAIR', t[0], t[1] - 1); F.place('CANDELABRA', t[0] + 1, t[1]); }
                F.placeOnRing(room, 'CANDELABRA', rand);
                this._litter(F, room, rand, { bodies: [0, 1], bones: [0, 1], barrels: [0, 0] });
                break;
            }
            case 'treasury': {
                // the keep's own hoard: iron chests against the back wall, between two torches
                const chest = F.placeOnNorthWall(room, 'IRON_CHEST', rand, Math.round(cx));
                if (chest) { F.place('STANDING_TORCH', chest[0] - 2, chest[1]); F.place('STANDING_TORCH', chest[0] + 2, chest[1]); }
                else this._mustPlace(F, [room], 'IRON_CHEST', rand);
                if (rand() < 0.5) F.placeOnNorthWall(room, 'IRON_CHEST', rand);
                for (let i = rand.int(2, 3); i > 0; i--) F.placeOnRing(room, rand.pick(['CRATE', 'CRATE_SACK', 'ANCIENT_BARREL']), rand);
                this._litter(F, room, rand, { bodies: [1, 1], bones: [1, 2], barrels: [0, 0] });
                break;
            }
            default: {   // storeroom
                for (let i = rand.int(3, 5); i > 0; i--) F.placeOnRing(room, rand.pick(['CRATE', 'CRATE_SACK', 'SACKS', 'BARREL', 'ANCIENT_BARREL']), rand);
                for (let i = rand.int(1, 3); i > 0; i--) F.placeAnywhere(room, rand.pick(['CRATE', 'BARREL', 'SACKS']), rand);
                if (rand() < 0.5) F.placeOnNorthWall(room, 'COUNTER', rand);
                if (rand() < 0.5) F.placeOnRing(room, 'CANDELABRA', rand);
                this._litter(F, room, rand, { bodies: [0, 1], bones: [0, 2], barrels: [0, 1] });
            }
        }
    }
    /* an object that must be somewhere (the iron chest): along a room's walls, else anywhere in it, else in the next room */
    _mustPlace(F, rooms, id, rand) {
        for (const room of rooms) if (F.placeOnRing(room, id, rand) || F.placeAnywhere(room, id, rand)) return true;
        return false;
    }
    _loot(F, L, rand, rooms) {
        const lootObject = this.config.lootObject;
        if (!lootObject) return;
        for (const room of rand.shuffle(rooms)) if (F.placeOnRing(room, lootObject, rand)) return;
        F.placeOnRing(L.room1, lootObject, rand);
    }
}

/* ===== the keep ===== */
export class KeepGenerator extends CastleInteriorBase {
    _tryLayout(rand, simple = false) {
        const hw = rand.int(8, 10), hh = rand.int(6, 8);
        const hall = { minC: -hw, maxC: hw, minR: -hh, maxR: hh, kind: 'hall' };
        const rooms = [hall], doors = [];
        const kinds = rand.shuffle(['bedchamber', 'library', 'treasury', 'storeroom']);
        // every keep has its treasury: the wings take their kinds from the end of the list (the last one alone, in the simple layout)
        if (simple) { kinds.splice(kinds.indexOf('treasury'), 1); kinds.push('treasury'); }
        else if (!kinds.slice(-2).includes('treasury')) kinds[kinds.length - 1 - rand.int(0, 1)] = 'treasury';
        for (const dir of (simple ? [1] : [-1, 1])) {
            const s = sideRoom(rand, hall, dir, rand.int(6, 8), rand.int(5, 7), kinds.pop());
            if (!s) return null;
            for (const other of rooms) if (other !== hall && !this._separated(s.room, other)) return null;
            rooms.push(s.room); doors.push(s.door);
        }
        // two rows of pillars down the hall, every third row, clear of the doorways in its side walls
        const pillars = new Set();
        for (const pc of [-(hw - 3), hw - 3]) for (let r = hall.minR + 3; r <= hall.maxR - 3; r += 3) {
            if (doors.some(d => Math.abs(d.row - r) <= 2 && Math.abs(d.col - pc) <= 3)) continue;
            pillars.add(k(pc, r));
        }
        return { rooms, room1: hall, internalDoors: doors, bounds: this._bounds(rooms), pillars };
    }
    _furnish(L, seed) {
        const rand = makeRng(seed ^ 0x6b6565);
        const hall = L.room1, F = this._startFurnishing(L);
        const a = F.area(hall);
        // the lord's chair at the far end, between braziers, torches beyond them
        F.place('CHAIR', 0, a.r0);
        F.place('BRAZIER_UNLIT', -2, a.r0); F.place('BRAZIER_UNLIT', 2, a.r0);
        F.place('STANDING_TORCH', -4, a.r0); F.place('STANDING_TORCH', 4, a.r0);
        // the runner from the door up to it
        for (let r = a.r1 - 1; r >= a.r0 + 2; r -= 2) F.place('RUG_LONG', -1, r);
        // torches down the runner
        for (let r = a.r1 - 2; r >= a.r0 + 3; r -= 4) { F.place('STANDING_TORCH', -2, r); F.place('STANDING_TORCH', 2, r); }
        // the feast tables either side, some overturned and a body where one stood
        for (const s of [-1, 1]) {
            const c = s > 0 ? 3 : -4;                        // between the runner's torches (at +-2) and the pillars
            for (let r = a.r0 + 3; r <= a.r1 - 2; r += 3) {
                if (rand() < 0.25) { F.place(fallen(rand), c, r); continue; }
                if (!F.place('TABLE_LONG', c, r)) continue;
                if (rand() < 0.7) F.place('CHAIR', c, r - 1);
                if (rand() < 0.7) F.place('CHAIR', c + 1, r - 1);
                if (rand() < 0.4) F.place('STOOL', s > 0 ? c + 2 : c - 1, r);
            }
        }
        for (const c of [a.c0, a.c1]) { F.place('CANDELABRA', c, a.r0); if (rand() < 0.7) F.place('CANDELABRA', c, a.r1); }
        this._litter(F, hall, rand, { bodies: [1, 3], bones: [2, 5], barrels: [1, 3] });
        const wings = L.rooms.filter(r => r !== hall);
        for (const room of wings) this._furnishWing(F, room, rand);
        if (![...F.items.values()].includes('IRON_CHEST')) this._mustPlace(F, [...wings, hall], 'IRON_CHEST', rand);   // the treasury was too full
        this._loot(F, L, rand, wings);
        this.furniture = F;
    }
}

/* ===== the armory ===== */
export class ArmoryGenerator extends CastleInteriorBase {
    _tryLayout(rand, simple = false) {
        const hw = rand.int(6, 8), hh = rand.int(4, 5);
        const hall = { minC: -hw, maxC: hw, minR: -hh, maxR: hh, kind: 'hall' };
        const rooms = [hall], doors = [];
        // a smithy off one side
        const dir = rand() < 0.5 ? -1 : 1;
        const s = sideRoom(rand, hall, dir, rand.int(5, 6), rand.int(4, 6), 'smithy');
        if (!s) return null;
        rooms.push(s.room); doors.push(s.door);
        // a storeroom behind (north), through a doorway in the hall's back wall
        if (!simple) {
            const iw = rand.int(5, 8), ih = rand.int(3, 4);
            const minC = rand.int(hall.minC, hall.maxC - iw - 1);
            const back = { minC, maxC: minC + iw + 1, minR: hall.minR - ih - 1, maxR: hall.minR, kind: 'storeroom' };
            const lo = Math.max(hall.minC + 1, back.minC + 1), hi = Math.min(hall.maxC - 1, back.maxC - 1);
            if (hi - lo + 1 < 3 || !this._separated(back, s.room)) return null;
            rooms.push(back); doors.push({ col: rand.int(lo, hi), row: hall.minR, dir: 'h' });
        }
        return { rooms, room1: hall, internalDoors: doors, bounds: this._bounds(rooms), pillars: new Set() };
    }
    _furnish(L, seed) {
        const rand = makeRng(seed ^ 0x61726d);
        const hall = L.room1, F = this._startFurnishing(L);
        const a = F.area(hall), cx = (a.c0 + a.c1) / 2, cy = (a.r0 + a.r1) / 2;
        // weapon counters and armour lockers along the back wall
        for (let i = rand.int(2, 3); i > 0; i--) F.placeOnNorthWall(hall, 'COUNTER', rand);
        for (let i = rand.int(1, 2); i > 0; i--) F.placeOnNorthWall(hall, 'WARDROBE', rand);
        if (rand() < 0.5) F.placeOnNorthWall(hall, 'BOOKSHELF', rand);   // the quartermaster's ledgers
        // a table down the middle, stools round it
        for (const [c, r] of [[Math.round(cx) - 1, Math.round(cy)], [Math.round(cx) - 1, Math.round(cy) + 1], [Math.round(cx) - 3, Math.round(cy)]]) {
            if (!F.place('TABLE_LONG', c, r)) continue;
            F.place('STOOL', c - 1, r); F.place('STOOL', c + 2, r);
            break;
        }
        // the armory's chest, between two torches if there is room
        const chest = F.placeOnRing(hall, 'IRON_CHEST', rand) || (this._mustPlace(F, L.rooms, 'IRON_CHEST', rand) && null);
        let torches = 0;
        for (const c of [a.c0, a.c1]) if (F.place('STANDING_TORCH', c, a.r0 + 1)) torches++;
        if (chest && F.place('STANDING_TORCH', chest[0] + 1, chest[1])) torches++;
        for (; torches < 2 && this._mustPlace(F, [hall], 'STANDING_TORCH', rand); torches++);   // two at least, wherever there is room
        // supplies stacked round the walls
        for (let i = rand.int(4, 7); i > 0; i--) F.placeOnRing(hall, rand.pick(['CRATE', 'CRATE', 'CRATE_SACK', 'BARREL', 'SACKS']), rand);
        if (rand() < 0.5) F.placeAnywhere(hall, 'WHEELBARROW_' + rand.int(1, 3), rand);
        this._litter(F, hall, rand, { bodies: [1, 2], bones: [1, 3], barrels: [0, 1] });
        for (const room of L.rooms) {
            if (room === hall) continue;
            if (room.kind === 'smithy') {
                F.placeOnNorthWall(room, 'FORGE', rand);
                F.placeOnNorthWall(room, 'ANVIL', rand);
                F.placeOnRing(room, 'BARREL', rand);
                for (let i = rand.int(1, 2); i > 0; i--) F.placeOnRing(room, rand.pick(['CRATE', 'SACKS']), rand);
                this._litter(F, room, rand, { bodies: [0, 1], bones: [0, 1], barrels: [0, 0] });
            } else this._furnishWing(F, room, rand);
        }
        this._loot(F, L, rand, L.rooms.filter(r => r !== hall));
        this.furniture = F;
    }
}
