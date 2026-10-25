// shared/world/villagePlanner.js
//
// The village planner: how a BLUEPRINT in structures.js (the abandoned villages) becomes a village: the plaza, the roads, the side streets, the
// buildings along them, the street dressing, the trees and the paving. It is not a class of its own: these are methods of the WorldManager,
// kept in a file of their own because they are most of what it does with structures. worldManager.js copies them onto WorldManager.prototype,
// so `this` is the WorldManager (this.getElevation, this.modifyWorld, this._placeObject, ...).
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { STRUCTURES } from './structures.js';
import { gameState } from '../core/gameState.js';
import { BIOME_DEFINITIONS, isPlateau } from './biomeDefinitions.js';

/* N, E, S, W: the ways a road can head (the index is the `d` of a road cell) */
const VILLAGE_DIRS = [
    { c: 0, r: -1 },
    { c: 1, r: 0 },
    { c: 0, r: 1 },
    { c: -1, r: 0 },
];

/* The stairs a village can cut where a road meets a cliff, by the way the road is heading (index into VILLAGE_DIRS): { kind, up }. `up` is true when the road
   climbs a level on the way (it stands on the low side of the piece), false when it comes down (it stands on the high side). The pieces are the natural ones
   (terrainGenerator.js, STAIR_MASK): 'S' and 'N' are 5 x 3 / 5 x 2 and are walked north / south, 'E' and 'W' are 3 x 4 side views walked west / east. */
const STAIR_SITES = [
    [{ kind: 'S', up: true }, { kind: 'N', up: false }],
    [{ kind: 'W', up: true }, { kind: 'E', up: false }],
    [{ kind: 'N', up: true }, { kind: 'S', up: false }],
    [{ kind: 'E', up: true }, { kind: 'W', up: false }],
];
const STAIR_SIZE = { S: [5, 3], N: [5, 2], E: [3, 4], W: [3, 4] };

export class VillagePlanner {
    /* ================================================================================================================
       VILLAGE PLANNER (a BLUEPRINT in structures.js)

       1. the hub prefab is written;
       2. the main roads grow out of its four sides. A road is a line of centre cells; every centre is stamped as a
          (2 * rad + 1) x (2 * rad + 1) square (3 x 3 for a 3-wide road), which gives a clean band in every direction and
          filled corners where a road turns. Nothing is written yet: the roads only claim cells in `plan.roadOwner`;
       3. side streets fork off the straight parts of the main roads;
       3b. where a street meets a cliff the village cuts a stair into it, and the streets go on up (or down) the level beyond, with side streets of their own
          (`levels` in the blueprint, _linkLevels);
       4. buildings are placed along every road, on both sides, with the gate facing the road;
       5. street dressing is put on the grass beside the roads, and trees are planted along them and in the empty lots;
       6. finally the roads are painted into the terrain and the cells they cover (and a verge around them) are cleared.
       ================================================================================================================ */
    _planBlueprint(startCol, startRow, blueprint, cx, cy) {
        const hub = STRUCTURES[blueprint.centerPrefab];
        if (!hub) return;
        console.log(`[WorldManager] Planning Blueprint Structure at ${startCol}, ${startRow}`);
        const cfg = this._villageConfig(blueprint);
        /* read before the hub is written: its terrain changes the corner cell */
        const baseElev = this.getElevation(startCol, startRow);
        this._writePrefabToGlobalState(startCol, startRow, hub);
        const plan = {
            cfg,
            baseElev,
            salt: (cx * 31 + cy * 17) % 997,
            hubTiles: new Set(),
            buildingTiles: new Set(),
            roadOwner: new Map() /* cell key -> { road: id, step } */,
            roads: [] /* { id, kind: 'arm' | 'side', parent, elev, depth, centres: [{ c, r, d }] } (d = the way the road was heading when it reached the cell; elev = the level it runs on, depth = stairs between it and the hub) */,
            stairs: [] /* the stairs this village cut (terrain.addVillageStair) */,
        };
        for (let y = 0; y < hub.height; y++) {
            for (let x = 0; x < hub.width; x++) plan.hubTiles.add(this._s(startCol + x, startRow + y));
        }
        this._planMainRoads(plan, startCol, startRow, hub, blueprint, cx, cy);
        this._planSideStreets(plan);
        this._linkLevels(plan);
        this._planBuildings(plan, blueprint);
        this._planStreetProps(plan, blueprint);
        this._planTrees(plan, blueprint);
        this._paveRoads(plan);
    }
    _villageConfig(bp) {
        const width = Math.max(1, Math.round(bp.roadWidth ?? 3));
        const rad = Math.floor((width - 1) / 2);
        const gap = Math.max(0, bp.roadGap ?? 1);
        const side = bp.sideStreets || {};
        return {
            rad,
            gap,
            pathTile: bp.pathTile ?? 1,
            wear: bp.edgeWear ?? 0,
            verge: bp.verge ?? 1,
            turnChance: bp.turnChance ?? 0.15,
            minTurn: bp.minStepsBetweenTurns ?? 5,
            /* a road may touch its own recent stamps (a bend), but not an older stretch of itself: 2 * (reach + rad) steps back is as far
               as two cells of one road can be and still be within `reach` of each other round a 90 degree bend */
            foldSteps: 2 * (2 * rad + gap),
            /* a side street may touch its parent for this many steps (the junction) */
            graceSteps: 2 * rad + gap,
            sideChance: side.chance ?? 0,
            sideSpacing: side.spacing ?? 10,
            sideStart: side.startAt ?? 8,
            sideEnd: side.endBefore ?? 6,
            sideMin: side.length ? side.length.min : 7,
            sideMax: side.length ? side.length.max : 14,
            sideCount: side.max ?? 6,
            sideDepth: Math.max(1, side.depth ?? 1),
            density: bp.buildingDensity ?? 0.5,
            maxBuildings: bp.maxBuildings ?? 28,
            setback: bp.setback ?? 0,
            skipStart: 3,
            tries: Math.max(1, bp.buildingTries ?? 1),
            levels: this._levelConfig(bp.levels),
        };
    }
    _levelConfig(lv) {
        lv = lv || {};
        return {
            max: lv.max ?? 0,                              // most stairs one village cuts
            depth: lv.depth ?? 2,                          // most stairs between a street and the hub (levels climbed or descended)
            chance: lv.chance ?? 1,
            spacing: lv.spacing ?? 10,                     // empty cells between two stairs
            probeStep: lv.probeStep ?? 2,                  // a spur toward a cliff is tried from every n-th cell of a street
            spurMin: lv.spur ? lv.spur.min : 2,            // length of the spur leading to the stair
            spurMax: lv.spur ? lv.spur.max : 16,
            upperMin: lv.upper ? lv.upper.min : 8,        // length of the street on the far side, at least
            upperMax: lv.upper ? lv.upper.max : 34,
        };
    }
    /* the level a road runs on */
    _roadElev(plan, road) {
        return road && road.elev !== undefined ? road.elev : plan.baseElev;
    }
    /* a stair of this village (or a natural one) is where a road, a yard or a prop may not be: a village stair only blocks its own cells (the road to it
       ends right against it), a natural stair its cells and one more ring */
    _stairBlocksRoad(c, r) {
        const t = this.terrain;
        if (!t || !t.getStairAt) return false;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const st = t.getStairAt(c + dc, r + dr);
                if (st && (!st.village || (dc === 0 && dr === 0))) return true;
            }
        }
        return false;
    }
    /* within `pad` cells of a stair this village cut: no yard goes there (a yard's footpath is dirt, which would pull the cliff down, see _wouldClip) */
    _nearVillageStair(plan, c, r, pad) {
        for (const st of plan.stairs) {
            if (c >= st.ox - pad && c < st.ox + st.w + pad && r >= st.oy - pad && r < st.oy + st.h + pad) return true;
        }
        return false;
    }
    /* a cell a road may be painted on */
    _roadTileOk(plan, c, r, elev) {
        const key = this._s(c, r);
        if (plan.hubTiles.has(key)) return true;
        if (plan.buildingTiles.has(key)) return false;
        if (gameState.world.changes[key] !== undefined) return false;
        if (this.getElevation(c, r) !== (elev ?? plan.baseElev)) return false;
        if (this.isBlockedByFace(c, r) || this.isCliffFace(c, r)) return false;
        if (this._stairBlocksRoad(c, r)) return false;
        return true;
    }
    /* can the road `road` have a centre at (c, r)? `step` is the index that centre would get on the road */
    _centreOk(plan, road, c, r, step) {
        const cfg = plan.cfg;
        const rad = cfg.rad;
        const elev = this._roadElev(plan, road);
        if (plan.hubTiles.has(this._s(c, r))) return false; // a road leaves the hub, it never runs inside it
        for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
                if (!this._roadTileOk(plan, c + dx, r + dy, elev)) return false;
            }
        }
        /* keep `gap` cells of grass between this road and any other road, and do not fold back onto an older stretch of itself */
        const reach = rad + cfg.gap;
        for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
                const o = plan.roadOwner.get(this._s(c + dx, r + dy));
                if (!o) continue;
                if (o.road === road.id) {
                    if (step - o.step > cfg.foldSteps) return false;
                    continue;
                }
                if (road.parent !== undefined && o.road === road.parent && step <= cfg.graceSteps) continue;
                return false;
            }
        }
        return true;
    }
    _stampRoad(plan, road, c, r, step, created = null) {
        const rad = plan.cfg.rad;
        for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
                const key = this._s(c + dx, r + dy);
                const o = plan.roadOwner.get(key);
                if (!o) {
                    plan.roadOwner.set(key, { road: road.id, step });
                    if (created) created.push(key);
                } else if (o.road === road.id) {
                    o.step = step;
                }
            }
        }
    }
    /* true when the road runs straight from `back` centres before centre i to `fwd` centres after it */
    _straightAt(cs, i, back, fwd) {
        if (i - back < 0 || i + fwd >= cs.length) return false;
        const d = cs[i].d;
        for (let j = i - back + 1; j <= i + fwd; j++) {
            if (cs[j].d !== d) return false;
        }
        return true;
    }
    _planMainRoads(plan, startCol, startRow, hub, bp, cx, cy) {
        const cfg = plan.cfg;
        const midC = startCol + Math.floor(hub.width / 2);
        const midR = startRow + Math.floor(hub.height / 2);
        const wanted = [];
        for (let i = 0; i < 4; i++) {
            if (this.pseudoRandom(cx * 11, cy * i * 13) < bp.branchChance) wanted.push(i);
        }
        /* a village needs at least two streets */
        for (let i = 0; i < 4 && wanted.length < 2; i++) {
            if (!wanted.includes(i)) wanted.push(i);
        }
        let active = [];
        for (const i of wanted) {
            const d = VILLAGE_DIRS[i];
            const c = midC + d.c * Math.floor(hub.width / 2);
            const r = midR + d.r * Math.floor(hub.height / 2);
            const lenRng = this.pseudoRandom(cx * 17 + i * 5, cy * 31 + i * 3);
            const maxLen = Math.floor(lenRng * (bp.branchLength.max - bp.branchLength.min)) + bp.branchLength.min;
            const road = { id: plan.roads.length, kind: 'arm', parent: undefined, centres: [{ c, r, d: i }] };
            plan.roads.push(road);
            active.push({ road, c, r, dirIndex: i, len: 0, maxLen, sinceTurn: 0 });
        }
        /* all roads grow one step at a time, in turns, so none of them gets first pick of the land */
        while (active.length > 0) {
            const nextActive = [];
            for (const p of active) {
                if (p.len >= p.maxLen) continue;
                if (p.sinceTurn >= cfg.minTurn && this.pseudoRandom(p.c * 53, p.r * 67) < cfg.turnChance) {
                    const leftDir = (p.dirIndex + 3) % 4;
                    const rightDir = (p.dirIndex + 1) % 4;
                    const turnDir = this.pseudoRandom(p.c * 71, p.r * 79) < 0.5 ? leftDir : rightDir;
                    if (this._centreOk(plan, p.road, p.c + VILLAGE_DIRS[turnDir].c, p.r + VILLAGE_DIRS[turnDir].r, p.len + 1)) {
                        p.dirIndex = turnDir;
                        p.sinceTurn = 0;
                    }
                }
                let nextC = p.c + VILLAGE_DIRS[p.dirIndex].c;
                let nextR = p.r + VILLAGE_DIRS[p.dirIndex].r;
                let valid = this._centreOk(plan, p.road, nextC, nextR, p.len + 1);
                if (!valid) {
                    /* blocked: bend round the obstacle */
                    const leftDir = (p.dirIndex + 3) % 4;
                    const rightDir = (p.dirIndex + 1) % 4;
                    const tryFirst = this.pseudoRandom(p.c, p.r) < 0.5 ? leftDir : rightDir;
                    const trySecond = tryFirst === leftDir ? rightDir : leftDir;
                    for (const dir of [tryFirst, trySecond]) {
                        const tc = p.c + VILLAGE_DIRS[dir].c;
                        const tr = p.r + VILLAGE_DIRS[dir].r;
                        if (this._centreOk(plan, p.road, tc, tr, p.len + 1)) {
                            p.dirIndex = dir;
                            nextC = tc;
                            nextR = tr;
                            valid = true;
                            p.sinceTurn = 0;
                            break;
                        }
                    }
                }
                if (!valid) continue;
                p.c = nextC;
                p.r = nextR;
                p.len++;
                p.sinceTurn++;
                p.road.centres.push({ c: nextC, r: nextR, d: p.dirIndex });
                this._stampRoad(plan, p.road, nextC, nextR, p.len);
                nextActive.push(p);
            }
            active = nextActive;
        }
    }
    _planSideStreets(plan) {
        const cfg = plan.cfg;
        if (!cfg.sideChance) return;
        this._growDistrict(plan, plan.roads.filter((rd) => rd.kind === 'arm'));
    }
    /* streets fork off the roads `arms`; with `sideStreets.depth` 2 or more, streets fork off those streets too (alleys between the blocks of a town) */
    _growDistrict(plan, arms) {
        const cfg = plan.cfg;
        let made = 0;
        for (let generation = 1; generation <= cfg.sideDepth && arms.length > 0; generation++) {
            const before = plan.roads.length;
            made = this._forkSideStreets(plan, arms, made);
            arms = plan.roads.slice(before);
        }
    }
    /* ---- levels ----------------------------------------------------------------------------------------------------------------
       A street that meets a cliff does not have to stop there: the village cuts a stair into the cliff (the same four pieces as the natural stairs, kept in
       gameState.world.villageStairs) and the street goes on over the top (or down below), as a district of its own with side streets, yards and, where it
       meets another cliff, another stair. Each street has the level it runs on (road.elev) and the number of stairs between it and the hub (road.depth).

       The search: from every other cell of every street, a spur is probed straight out to the side (and straight ahead from the end of a street) as far as
       the ground stays level and free; where it ends the cliff is, and _stairSites tests the four pieces against the terrain there (the piece must sit
       on a straight run of cliff, see terrainGenerator._stairShapesAt). */
    _linkLevels(plan) {
        const lv = plan.cfg.levels;
        if (!lv.max || !this.terrain || !this.terrain.villageStairShape) return;
        const cands = [];
        const hashOf = (cand) => { const o = cand.road.centres[cand.i]; return this.pseudoRandom(o.c * 59 + cand.dir * 7 + plan.salt, o.r * 61 + cand.road.id * 3 + 13); };
        const addCandidates = (road) => {
            if ((road.depth || 0) >= lv.depth) return;
            const cs = road.centres;
            for (let i = 2; i < cs.length - 1; i += lv.probeStep) {
                if (!this._straightAt(cs, i, 1, 1)) continue;
                for (const turn of [1, 3]) cands.push({ road, i, dir: (cs[i].d + turn) % 4 });
            }
            if (cs.length > 3) cands.push({ road, i: cs.length - 1, dir: cs[cs.length - 1].d, tip: true });
        };
        for (const road of plan.roads.slice()) addCandidates(road);
        let made = 0;
        while (cands.length > 0 && made < lv.max) {
            /* the streets nearest the hub first, in a random order among themselves */
            let best = 0;
            let bestKey = Infinity;
            for (let k = 0; k < cands.length; k++) {
                const key = (cands[k].road.depth || 0) * 10 + hashOf(cands[k]);
                if (key < bestKey) { bestKey = key; best = k; }
            }
            const cand = cands.splice(best, 1)[0];
            if (this.pseudoRandom(cand.road.centres[cand.i].c * 67 + 5, cand.road.centres[cand.i].r * 71 + plan.salt) >= lv.chance) continue;
            const fresh = this._tryLink(plan, cand);
            if (!fresh) continue;
            made++;
            for (const road of fresh) addCandidates(road);
        }
    }
    /* the stair pieces that fit the terrain with the end of a street at `tip` heading `dir` on level `elev`: [{ cd, up, far: { c, r }, farElev }] */
    _stairSites(tip, dir, elev) {
        const out = [];
        for (const { kind, up } of STAIR_SITES[dir]) {
            const [w, h] = STAIR_SIZE[kind];
            let ox, oy;
            if (dir === 0) { ox = tip.c - 2; oy = tip.r - h - 1; }
            else if (dir === 2) { ox = tip.c - 2; oy = tip.r + 2; }
            else if (dir === 1) { ox = tip.c + 2; oy = tip.r - 2; }
            else { ox = tip.c - 2 - (w - 1); oy = tip.r - 2; }
            const anchor = kind === 'S' ? [ox + 1, oy + 1] : kind === 'N' ? [ox + 1, oy] : kind === 'E' ? [ox + 2, oy + 2] : [ox, oy + 2];
            const cd = this.terrain.villageStairShape(anchor[0], anchor[1], kind);
            if (!cd || cd.ox !== ox || cd.oy !== oy) continue;
            const far = dir === 0 ? { c: tip.c, r: oy - 2 } : dir === 2 ? { c: tip.c, r: oy + h + 1 } : dir === 1 ? { c: ox + w + 1, r: tip.r } : { c: ox - 2, r: tip.r };
            const farElev = elev + (up ? 1 : -1);
            if (farElev < 2 || this.getElevation(far.c, far.r) !== farElev) continue;
            out.push({ cd, up, far, farElev });
        }
        return out;
    }
    /* probe a spur from the street cell `cand` points at; when it ends at a cliff where a stair fits, build the spur, the stair, the street beyond it and the
       side streets of that. Returns the new roads, or null. */
    _tryLink(plan, cand) {
        const cfg = plan.cfg;
        const lv = cfg.levels;
        const road = cand.road;
        const elev = this._roadElev(plan, road);
        const origin = road.centres[cand.i];
        const vec = VILLAGE_DIRS[cand.dir];
        const spur = { id: plan.roads.length, kind: 'side', parent: road.id, elev, depth: road.depth || 0, centres: [{ c: origin.c, r: origin.r, d: cand.dir }] };
        const run = [{ c: origin.c, r: origin.r }];
        for (let k = 1; k <= lv.spurMax; k++) {
            const c = origin.c + vec.c * k;
            const r = origin.r + vec.r * k;
            if (!this._centreOk(plan, spur, c, r, k)) break;
            run.push({ c, r });
        }
        for (let back = 0; back <= 5; back++) {
            const idx = run.length - 1 - back;
            if (idx < (cand.tip ? 0 : lv.spurMin)) break;
            for (const site of this._stairSites(run[idx], cand.dir, elev)) {
                const made = this._buildLink(plan, road, spur, run, idx, cand, site);
                if (made) return made;
            }
        }
        return null;
    }
    _buildLink(plan, road, spur0, run, idx, cand, site) {
        const cfg = plan.cfg;
        const lv = cfg.levels;
        const cd = site.cd;
        /* stairs keep their distance from each other */
        for (const st of plan.stairs) {
            if (cd.ox < st.ox + st.w + lv.spacing && st.ox < cd.ox + cd.w + lv.spacing && cd.oy < st.oy + st.h + lv.spacing && st.oy < cd.oy + cd.h + lv.spacing) return null;
        }
        const created = [];
        const rollback = () => { for (const key of created) plan.roadOwner.delete(key); return null; };
        /* the spur claims its cells first, so the street beyond sees them */
        const spur = { ...spur0, centres: [spur0.centres[0]] };
        if (idx > 0) {
            for (let k = 1; k <= idx; k++) {
                spur.centres.push({ c: run[k].c, r: run[k].r, d: cand.dir });
                this._stampRoad(plan, spur, run[k].c, run[k].r, k, created);
            }
        }
        /* the street beyond: straight on from the far side of the stair, bending round the ledge it is on */
        const far = { id: plan.roads.length + (idx > 0 ? 1 : 0), kind: 'side', parent: idx > 0 ? spur.id : road.id, elev: site.farElev, depth: (road.depth || 0) + 1, centres: [{ c: site.far.c, r: site.far.r, d: cand.dir }] };
        if (!this._centreOk(plan, far, site.far.c, site.far.r, 0)) return rollback();
        this._stampRoad(plan, far, site.far.c, site.far.r, 0, created);
        const want = lv.upperMin + Math.floor(this.pseudoRandom(site.far.c * 73 + 11, site.far.r * 79 + plan.salt) * (lv.upperMax - lv.upperMin + 1));
        const len = this._extendRoad(plan, far, cand.dir, want, created);
        if (len < lv.upperMin) return rollback();
        const st = this.terrain.addVillageStair(cd);
        plan.stairs.push(st);
        const fresh = [];
        if (idx > 0) { plan.roads.push(spur); fresh.push(spur); }
        plan.roads.push(far);
        fresh.push(far);
        const before = plan.roads.length;
        this._growDistrict(plan, [far]);
        for (let k = before; k < plan.roads.length; k++) fresh.push(plan.roads[k]);
        return fresh;
    }
    /* grow `road` on from its last centre for up to `maxLen` cells, heading `dir`: straight, a turn now and then, and a bend round whatever is in the way (the
       same rules as the main roads). Returns how many cells it grew. */
    _extendRoad(plan, road, dir, maxLen, created) {
        const cfg = plan.cfg;
        let { c, r } = road.centres[road.centres.length - 1];
        let sinceTurn = 0;
        let len = 0;
        while (len < maxLen) {
            if (sinceTurn >= cfg.minTurn && this.pseudoRandom(c * 53 + 3, r * 67 + 5) < cfg.turnChance) {
                const turn = this.pseudoRandom(c * 71 + 1, r * 79 + 2) < 0.5 ? (dir + 3) % 4 : (dir + 1) % 4;
                if (this._centreOk(plan, road, c + VILLAGE_DIRS[turn].c, r + VILLAGE_DIRS[turn].r, len + 1)) { dir = turn; sinceTurn = 0; }
            }
            let nc = c + VILLAGE_DIRS[dir].c;
            let nr = r + VILLAGE_DIRS[dir].r;
            let valid = this._centreOk(plan, road, nc, nr, len + 1);
            if (!valid) {
                const first = this.pseudoRandom(c, r) < 0.5 ? (dir + 3) % 4 : (dir + 1) % 4;
                for (const turn of [first, first === (dir + 3) % 4 ? (dir + 1) % 4 : (dir + 3) % 4]) {
                    const tc = c + VILLAGE_DIRS[turn].c;
                    const tr = r + VILLAGE_DIRS[turn].r;
                    if (this._centreOk(plan, road, tc, tr, len + 1)) { dir = turn; nc = tc; nr = tr; valid = true; sinceTurn = 0; break; }
                }
            }
            if (!valid) break;
            c = nc;
            r = nr;
            len++;
            sinceTurn++;
            road.centres.push({ c, r, d: dir });
            this._stampRoad(plan, road, c, r, len, created);
        }
        return len;
    }
    _forkSideStreets(plan, arms, made) {
        const cfg = plan.cfg;
        for (const arm of arms) {
            const cs = arm.centres;
            let last = -999;
            for (let i = cfg.sideStart; i < cs.length - cfg.sideEnd; i++) {
                if (made >= cfg.sideCount) return made;
                if (i - last < cfg.sideSpacing) continue;
                /* the junction needs a straight stretch on both sides, so the parent cannot bend into the new street */
                if (!this._straightAt(cs, i, 6, 6)) continue;
                const here = cs[i];
                if (this.pseudoRandom(here.c * 29 + plan.salt, here.r * 31 + 5) >= cfg.sideChance) continue;
                const flip = this.pseudoRandom(here.c * 37 + 3, here.r * 41 + plan.salt) < 0.5;
                const dirs = flip ? [(here.d + 3) % 4, (here.d + 1) % 4] : [(here.d + 1) % 4, (here.d + 3) % 4];
                const len = cfg.sideMin + Math.floor(this.pseudoRandom(here.c * 43, here.r * 47 + 9) * (cfg.sideMax - cfg.sideMin + 1));
                for (const dir of dirs) {
                    if (this._growSideStreet(plan, arm, here, dir, len)) {
                        last = i;
                        made++;
                        break;
                    }
                }
            }
        }
        return made;
    }
    _growSideStreet(plan, parent, at, dirIndex, len) {
        const cfg = plan.cfg;
        const road = { id: plan.roads.length, kind: 'side', parent: parent.id, elev: this._roadElev(plan, parent), depth: parent.depth || 0, centres: [{ c: at.c, r: at.r, d: dirIndex }] };
        const d = VILLAGE_DIRS[dirIndex];
        const created = [];
        let c = at.c;
        let r = at.r;
        let steps = 0;
        for (let k = 1; k <= len; k++) {
            const nc = c + d.c;
            const nr = r + d.r;
            if (!this._centreOk(plan, road, nc, nr, k)) break;
            c = nc;
            r = nr;
            steps = k;
            road.centres.push({ c, r, d: dirIndex });
            this._stampRoad(plan, road, c, r, k, created);
        }
        if (steps < cfg.sideMin) {
            for (const key of created) plan.roadOwner.delete(key);
            return false;
        }
        plan.roads.push(road);
        return true;
    }
    _planBuildings(plan, bp) {
        const cfg = plan.cfg;
        const mods = (bp.modules || []).filter((m) => STRUCTURES[m.prefab]).map((m) => ({ ...m, placed: 0 }));
        if (mods.length === 0) return;
        /* every spot along a road where a yard could stand, on either side: centred on a road cell, on the straight parts. Whether it really fits
           (nothing in the way, and its footpath ends right on the road) is decided in _placeModule. */
        const slots = [];
        for (const road of plan.roads) {
            const cs = road.centres;
            for (let i = cfg.skipStart; i < cs.length; i++) {
                if (!this._straightAt(cs, i, 1, 1)) continue;
                slots.push({ road, i, side: 0 });
                slots.push({ road, i, side: 1 });
            }
        }
        const hash = (slot, salt) => {
            const ctr = slot.road.centres[slot.i];
            return this.pseudoRandom(ctr.c * 19 + slot.side * 7 + salt * 5, ctr.r * 23 + salt * 3 + plan.salt);
        };
        let total = 0;
        const place = (slot, mod) => {
            if (!this._placeModule(plan, slot, mod)) return false;
            mod.placed++;
            total++;
            return true;
        };
        /* a module's weight depends on the street: `verticalWeight` beside a north-south road, `horizontalWeight` beside an east-west one (0 = never there; the side houses show
           their long wall to a north-south street and have no door), both default to `weight` */
        const isVertical = (slot) => { const d = slot.road.centres[slot.i].d; return d === 0 || d === 2; };
        const weightOn = (m, vertical) => (vertical ? (m.verticalWeight ?? m.weight ?? 1) : (m.horizontalWeight ?? m.weight ?? 1));
        /* 1. the buildings every village must have (the crafting stations): the first spot that fits, nearest the hub first, with some jitter */
        mods.forEach((mod, m) => {
            if (!mod.required) return;
            const order = slots.map((s) => ({ s, k: s.i + hash(s, 11 + m) * 14 })).sort((a, b) => a.k - b.k);
            for (const { s } of order) {
                if (total >= cfg.maxBuildings) break;
                if (weightOn(mod, isVertical(s)) <= 0) continue;
                if (place(s, mod)) break;
            }
        });
        /* 2. everything else, walking outwards from the hub. A spot takes the module it rolled; when that one does not fit (a wider yard against its neighbour, a junction) the
           next roll is tried, up to `tries` times, so a street fills up with no gaps */
        slots.sort((a, b) => a.i - b.i || hash(a, 3) - hash(b, 3));
        for (const s of slots) {
            if (total >= cfg.maxBuildings) break;
            if (hash(s, 5) >= cfg.density) continue;
            const vertical = isVertical(s);
            let pool = mods.filter((m) => (m.max === undefined || m.placed < m.max) && weightOn(m, vertical) > 0).map((m) => ({ m, w: weightOn(m, vertical) }));
            for (let attempt = 0; attempt < cfg.tries && pool.length > 0; attempt++) {
                const sum = pool.reduce((acc, e) => acc + e.w, 0);
                let roll = hash(s, 7 + attempt * 3) * sum;
                let pick = pool[pool.length - 1];
                for (const e of pool) {
                    roll -= e.w;
                    if (roll < 0) {
                        pick = e;
                        break;
                    }
                }
                if (place(s, pick.m)) break;
                pool = pool.filter((e) => e !== pick);
            }
        }
    }
    _placeModule(plan, slot, mod) {
        const cfg = plan.cfg;
        const ctr = slot.road.centres[slot.i];
        const horizontal = ctr.d === 1 || ctr.d === 3;
        /* the variant whose gate faces the road. Horizontal road: side 0 is north, 1 is south. Vertical road: side 0 is west, 1 is east. */
        let gate;
        if (horizontal) {
            if (slot.side === 0) gate = 'S';
            else gate = this.pseudoRandom(ctr.c * 5 + 1, ctr.r * 3 + 2) < 0.5 ? 'EN' : 'WN';
        } else {
            gate = slot.side === 0 ? 'E' : 'W';
        }
        const proto = STRUCTURES[mod.prefab];
        const prefab = (proto.variants && proto.variants[gate]) || proto;
        const w = prefab.width;
        const h = prefab.height;
        const off = cfg.rad + 1 + cfg.setback;
        let originC;
        let originR;
        if (horizontal) {
            originC = ctr.c - Math.floor(w / 2);
            originR = slot.side === 0 ? ctr.r - off - (h - 1) : ctr.r + off;
        } else {
            originR = ctr.r - Math.floor(h / 2);
            originC = slot.side === 0 ? ctr.c - off - (w - 1) : ctr.c + off;
        }
        /* the footpath leaves the yard at `entry`; the cell it points at must be road (or hub), or the yard would face a field */
        if (prefab.entry) {
            const e = prefab.entry;
            const key = this._s(originC + e.x + e.dx, originR + e.y + e.dy);
            if (!plan.roadOwner.has(key) && !plan.hubTiles.has(key)) return false;
        }
        if (!this._moduleFits(plan, originC, originR, w, h, this._roadElev(plan, slot.road))) return false;
        this._writePrefabToGlobalState(originC, originR, prefab);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) plan.buildingTiles.add(this._s(originC + x, originR + y));
        }
        return true;
    }
    _moduleFits(plan, originC, originR, w, h, elev) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const key = this._s(originC + x, originR + y);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) return false;
                if (this._nearStair(originC + x, originR + y) || this._nearVillageStair(plan, originC + x, originR + y, 5)) return false;
            }
        }
        if (this.getElevation(originC, originR) !== (elev ?? plan.baseElev)) return false;
        return this._isStructureFootprintValid(originC, originR, w, h);
    }
    /* A standing torch now and then beside the road (blueprint `streetTorches`). Same cell rules as the street dressing; planned first, so a torch
       takes its cell before any barrel or tuft of grass can. */
    _planStreetTorches(plan, bp) {
        const tc = bp.streetTorches;
        if (!tc || !tc.chance || !MAP_OBJECTS_DEFINITIONS[tc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = tc.spacing ?? 10;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length; i++) {
                if (i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 83 + plan.salt, cs[i].r * 89 + 17) >= tc.chance) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                const side = this.pseudoRandom(cs[i].c * 97 + 5, cs[i].r * 101 + plan.salt) < 0.5 ? 0 : 1;
                const sgn = side === 0 ? -off : off;
                const c = horizontal ? cs[i].c : cs[i].c + sgn;
                const r = horizontal ? cs[i].r + sgn : cs[i].r;
                const key = this._s(c, r);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;     // not on a scarecrow's second tile either
                if (this.getElevation(c, r) !== this._roadElev(plan, road) || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                this.modifyWorld(c, r, tc.id);
                this._placeObject(c, r, tc.id);
                last = i;
            }
        }
    }
    /* A scarecrow now and then on the verge NORTH of an east-west road (blueprint `scarecrows`), so that the 5 tiles it sees straight beneath it (the
       PECULIAR_SCARECROW's `triggerLine`, as wide as the scarecrow) run across the road. Same cell rules as the torches, for every tile of its two wide base
       and the row above it; planned before them. The only place the object is ever made. */
    _planStreetScarecrows(plan, bp) {
        const sc = bp.scarecrows;
        if (!sc || !sc.chance || !MAP_OBJECTS_DEFINITIONS[sc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = sc.spacing ?? 12;
        const w = MAP_OBJECTS_DEFINITIONS[sc.id].width || 1;
        let placed = 0;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length && placed < (sc.max ?? 3); i++) {
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                if (!horizontal || i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 71 + plan.salt, cs[i].r * 73 + 29) >= sc.chance) continue;
                const c = cs[i].c, r = cs[i].r - off;
                let free = true;
                for (let dc = 0; dc < w && free; dc++) {
                    const key = this._s(c + dc, r);
                    if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key) || plan.buildingTiles.has(this._s(c + dc, r - 1))) free = false;
                    else if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) free = false;
                    else if (this.getElevation(c + dc, r) !== this._roadElev(plan, road) || this.isBlockedByFace(c + dc, r) || this.isCliffFace(c + dc, r) || this._nearStair(c + dc, r)) free = false;
                }
                if (!free) continue;
                this.modifyWorld(c, r, sc.id);
                this._placeObject(c, r, sc.id);
                last = i;
                placed++;
            }
        }
    }
    /* Old graves on the verge beside the roads (blueprint `gravestones`): the same cell rules as the torches. `encounterChance` of the stones are the
       dig-able OLD_GRAVESTONE, the rest the plain TOMBSTONE (same sprite). Planned after the scarecrows and torches, before the street dressing. */
    _planGravestones(plan, bp) {
        const gc = bp.gravestones;
        if (!gc || !gc.chance || !MAP_OBJECTS_DEFINITIONS[gc.id]) return;
        const off = plan.cfg.rad + 1;
        const spacing = gc.spacing ?? 9;
        let placed = 0;
        for (const road of plan.roads) {
            const cs = road.centres;
            let last = -Infinity;
            for (let i = 2; i < cs.length && placed < (gc.max ?? 10); i++) {
                if (i - last < spacing || !this._straightAt(cs, i, 2, 0)) continue;
                if (this.pseudoRandom(cs[i].c * 107 + plan.salt, cs[i].r * 109 + 31) >= gc.chance) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                const side = this.pseudoRandom(cs[i].c * 113 + 7, cs[i].r * 127 + plan.salt) < 0.5 ? 0 : 1;
                const sgn = side === 0 ? -off : off;
                const c = horizontal ? cs[i].c : cs[i].c + sgn;
                const r = horizontal ? cs[i].r + sgn : cs[i].r;
                const key = this._s(c, r);
                if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;
                if (this.getElevation(c, r) !== this._roadElev(plan, road) || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                const id = gc.encounterId && MAP_OBJECTS_DEFINITIONS[gc.encounterId] && this.pseudoRandom(c * 131 + 3, r * 137 + plan.salt) < (gc.encounterChance ?? 0)
                    ? gc.encounterId : gc.id;
                this.modifyWorld(c, r, id);
                this._placeObject(c, r, id);
                last = i;
                placed++;
            }
        }
    }
    _planStreetProps(plan, bp) {
        this._planStreetScarecrows(plan, bp);
        this._planStreetTorches(plan, bp);
        this._planGravestones(plan, bp);
        const sp = bp.streetProps;
        if (!sp || !sp.chance || !sp.pool || sp.pool.length === 0) return;
        const off = plan.cfg.rad + 1;
        for (const road of plan.roads) {
            const cs = road.centres;
            for (let i = 2; i < cs.length; i++) {
                if (!this._straightAt(cs, i, 2, 0)) continue;
                const horizontal = cs[i].d === 1 || cs[i].d === 3;
                for (let side = 0; side < 2; side++) {
                    if (this.pseudoRandom(cs[i].c * 61 + side * 13 + plan.salt, cs[i].r * 67 + 11) >= sp.chance) continue;
                    const sgn = side === 0 ? -off : off;
                    const c = horizontal ? cs[i].c : cs[i].c + sgn;
                    const r = horizontal ? cs[i].r + sgn : cs[i].r;
                    const key = this._s(c, r);
                    if (plan.roadOwner.has(key) || plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
                    if (gameState.world.changes[key] !== undefined || this._collisionMap.has(key)) continue;     // not on a scarecrow's second tile either
                    if (this.getElevation(c, r) !== this._roadElev(plan, road) || this.isBlockedByFace(c, r) || this.isCliffFace(c, r) || this._nearStair(c, r)) continue;
                    /* the dressing follows the biome of the cell: `streetProps.biomes[biomeId]` replaces `pool` there (an empty list = nothing) */
                    const pool = this._biomePool(sp, this.getBiomeAt(c, r).id);
                    if (pool.length === 0) continue;
                    const id = pool[Math.floor(this.pseudoRandom(c * 73 + 1, r * 79 + 2) * pool.length)];
                    if (!MAP_OBJECTS_DEFINITIONS[id]) continue;
                    this.modifyWorld(c, r, id);
                    this._placeObject(c, r, id);
                }
            }
        }
    }
    /* Trees along the roads and in the empty lots of the village. Every cell within `reach` of a road is a candidate; a tree stands where its whole
       footprint stays `clearRoad` cells off the road (so the canopy never covers it) and `clearBuilding` cells off every yard, where nothing else is,
       and where the terrain allows (the same test the natural trees pass). Cells close to a road are more likely (an avenue), and a slow wave makes
       the trees come in groves rather than evenly. The footprint is reserved, so the natural trees of the biome cannot grow into it later. */
    /* the list a village feature (`trees`, `streetProps`) draws from in a biome: `cfg.biomes[biomeId]` when the blueprint lists that biome (an empty
       list means "none here"), otherwise the default `cfg.pool` */
    _biomePool(cfg, biomeId) {
        const own = cfg.biomes && cfg.biomes[biomeId];
        return own !== undefined ? own : (cfg.pool || []);
    }
    _planTrees(plan, bp) {
        const tr = bp.trees;
        if (!tr || !tr.chance || (!tr.pool && !tr.biomes)) return;
        /* weighted pick lists per biome, built once */
        const pools = new Map();
        const poolOf = (biomeId) => {
            let p = pools.get(biomeId);
            if (!p) {
                const list = this._biomePool(tr, biomeId).filter((t) => MAP_OBJECTS_DEFINITIONS[t.id]);
                p = { list, total: list.reduce((acc, t) => acc + (t.weight ?? 1), 0) };
                pools.set(biomeId, p);
            }
            return p;
        };
        const cfg = plan.cfg;
        const reach = tr.reach ?? 14;
        const clearRoad = tr.clearRoad ?? 2;
        const clearBuilding = tr.clearBuilding ?? 2;
        const cap = reach + 4;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        const grow = (key) => {
            const comma = key.indexOf(',');
            const c = +key.slice(0, comma);
            const r = +key.slice(comma + 1);
            if (c < x0) x0 = c;
            if (c > x1) x1 = c;
            if (r < y0) y0 = r;
            if (r > y1) y1 = r;
        };
        for (const key of plan.roadOwner.keys()) grow(key);
        for (const key of plan.hubTiles) grow(key);
        for (const key of plan.buildingTiles) grow(key);
        if (x0 === Infinity) return;
        x0 -= reach; y0 -= reach; x1 += reach; y1 += reach;
        const W = x1 - x0 + 1;
        const H = y1 - y0 + 1;
        const roadMask = new Uint8Array(W * H);
        const bldMask = new Uint8Array(W * H);
        const mark = (set, mask) => {
            for (const key of set) {
                const comma = key.indexOf(',');
                mask[(+key.slice(comma + 1) - y0) * W + (+key.slice(0, comma) - x0)] = 1;
            }
        };
        mark(plan.roadOwner.keys(), roadMask);
        mark(plan.hubTiles, roadMask);
        mark(plan.buildingTiles, bldMask);
        const dRoad = this._distanceField(W, H, roadMask, cap);
        const dBld = this._distanceField(W, H, bldMask, cap);
        const taken = new Uint8Array(W * H);
        let planted = 0;
        for (let r = y0; r <= y1 && planted < (tr.max ?? 200); r++) {
            for (let c = x0; c <= x1 && planted < (tr.max ?? 200); c++) {
                const i = (r - y0) * W + (c - x0);
                const d = dRoad[i];
                if (d > reach || d < clearRoad) continue;
                /* groves: a slow wave over the village, never quite zero */
                const wave = 0.5 + 0.5 * Math.sin(c * 0.23 + plan.salt) * Math.sin(r * 0.19 - plan.salt * 0.7);
                let p = tr.chance * (0.3 + 1.4 * wave);
                if (d <= clearRoad + 1) p *= tr.roadsideBoost ?? 1.8;
                if (this.pseudoRandom(c * 83 + 3, r * 89 + plan.salt) >= p) continue;
                /* the trees of the biome this cell is in (a village road can run out of the plains into a desert or a snowfield) */
                const biomeId = this.getBiomeAt(c, r).id;
                const bpool = poolOf(biomeId);
                if (bpool.list.length === 0) continue;
                let roll = this.pseudoRandom(c * 97 + 7, r * 101 + 5) * bpool.total;
                let pick = bpool.list[bpool.list.length - 1];
                for (const t of bpool.list) {
                    roll -= t.weight ?? 1;
                    if (roll < 0) { pick = t; break; }
                }
                const def = MAP_OBJECTS_DEFINITIONS[pick.id];
                if (!def) continue;
                const w = def.w || def.width || 1;
                const h = def.h || def.height || 1;
                let ok = c + w - 1 <= x1 && r + h - 1 <= y1;
                for (let y = 0; y < h && ok; y++) {
                    for (let x = 0; x < w; x++) {
                        const j = (r + y - y0) * W + (c + x - x0);
                        const key = this._s(c + x, r + y);
                        if (dRoad[j] < clearRoad || dBld[j] < clearBuilding || taken[j] || this._collisionMap.has(key) || gameState.world.changes[key] !== undefined) { ok = false; break; }
                        /* the whole footprint stays in one biome (isFootprintValid below keeps the other cells off the biome border, the anchor is checked here) */
                        if ((x || y) && this.getBiomeAt(c + x, r + y).id !== biomeId) { ok = false; break; }
                        if (!x && !y && this.isBiomeEdge(c, r)) { ok = false; break; }
                    }
                }
                if (!ok || !this.isFootprintValid(c, r, w, h)) continue;
                /* reserve the footprint and a ring round it, so trees never touch */
                for (let y = -1; y <= h; y++) {
                    for (let x = -1; x <= w; x++) {
                        const cc = c + x, rr = r + y;
                        if (cc < x0 || cc > x1 || rr < y0 || rr > y1) continue;
                        taken[(rr - y0) * W + (cc - x0)] = 1;
                    }
                }
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (x === 0 && y === 0) continue;
                        this.modifyWorld(c + x, r + y, null);
                    }
                }
                this.modifyWorld(c, r, pick.id);
                this._placeObject(c, r, pick.id);
                planted++;
            }
        }
    }
    /* Chebyshev distance of every cell of a W x H box to the nearest set cell of `mask`, capped at `cap` */
    _distanceField(W, H, mask, cap) {
        const dist = new Int16Array(W * H).fill(cap);
        const queue = new Int32Array(W * H);
        let head = 0;
        let tail = 0;
        for (let i = 0; i < W * H; i++) {
            if (mask[i]) { dist[i] = 0; queue[tail++] = i; }
        }
        while (head < tail) {
            const i = queue[head++];
            const nd = dist[i] + 1;
            if (nd >= cap) continue;
            const x = i % W;
            const y = (i / W) | 0;
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= H) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= W) continue;
                    const j = ny * W + nx;
                    if (dist[j] > nd) { dist[j] = nd; queue[tail++] = j; }
                }
            }
        }
        return dist;
    }
    /* would a dirt tile at (c, r) lower a cliff beside it? The terrain keeps a hill's slope gentle (terrainGenerator._computeLevel): a plateau cell can be at most
       2 + floor((d - 1) / plateauWidth) levels high with a dirt cell d cells away, so a cell of a higher level that close to the new dirt is cut down */
    _wouldClip(c, r) {
        const bdef = BIOME_DEFINITIONS[this.getBiomeAt(c, r).id];
        const width = bdef && bdef.plateauWidth ? bdef.plateauWidth : 2;
        const reach = 2 * width + 2;
        for (let dr = -reach; dr <= reach; dr++) {
            for (let dc = -reach; dc <= reach; dc++) {
                const d = Math.max(Math.abs(dr), Math.abs(dc));
                if (d === 0) continue;
                if (this.terrain._baseLevel(c + dc, r + dr) > 2 + Math.floor((d - 1) / width)) return true;
            }
        }
        return false;
    }
    _paveRoads(plan) {
        const cfg = plan.cfg;
        const overrides = gameState.world.terrainOverrides;
        const centreSet = new Set();
        for (const road of plan.roads) {
            for (const ctr of road.centres) centreSet.add(this._s(ctr.c, ctr.r));
        }
        const roadKeys = [];
        for (const key of plan.roadOwner.keys()) {
            if (plan.hubTiles.has(key) || plan.buildingTiles.has(key)) continue;
            roadKeys.push(key);
        }
        const isRoad = new Set(roadKeys);
        const nextToBuilding = (c, r) => {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const k = this._s(c + dx, r + dy);
                    if (plan.buildingTiles.has(k) || plan.hubTiles.has(k)) return true;
                }
            }
            return false;
        };
        /* the edge columns of the road wear away in places. Never the centre cells, never where a footpath or the hub meets the road, and never two
           worn cells within 2 cells of each other, so the road is at least two cells wide everywhere. */
        const worn = new Set();
        const nearWorn = (c, r) => {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) if (worn.has(this._s(c + dx, r + dy))) return true;
            }
            return false;
        };
        /* a cell on a straight edge of the road: grass on exactly one side, road on the opposite side. (A corner, a junction mouth or a cell between
           two roads is never worn, which would leave a grass island or a ragged corner.) */
        const outside = (k) => !isRoad.has(k) && !plan.hubTiles.has(k) && !plan.buildingTiles.has(k);
        const straightEdge = (c, r) => {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if (!outside(this._s(c + dx, r + dy))) continue;
                if (!isRoad.has(this._s(c - dx, r - dy))) return false;
                return outside(this._s(c + dy, r + dx)) === false && outside(this._s(c - dy, r - dx)) === false;
            }
            return false;
        };
        for (const key of roadKeys) {
            const [c, r] = key.split(',').map(Number);
            if (cfg.wear > 0 && !centreSet.has(key) && !nextToBuilding(c, r) && straightEdge(c, r) && !nearWorn(c, r) && this.pseudoRandom(c * 41 + 5, r * 43 + 9) < cfg.wear) worn.add(key);
        }
        /* a street on a cliff level is dirt only to the eye (a dirt TILE there would be a pit); on the low ground it is a dirt tile, except where that would
           pull a cliff down (_wouldClip: those cells stay grass, so the stair and the cliff beside the street keep their shape) */
        let levelPaths = false;
        for (const key of roadKeys) {
            const [c, r] = key.split(',').map(Number);
            const paved = !worn.has(key);
            if (paved) {
                if (isPlateau(this.getTileAt(c, r))) {
                    gameState.world.levelPaths[key] = 1;
                    levelPaths = true;
                } else if (!this._wouldClip(c, r)) {
                    overrides[key] = cfg.pathTile;
                    this.terrain.invalidateTile(key);
                }
            }
            this.modifyWorld(c, r, null);
        }
        if (levelPaths) this.terrain.overrideVersion = (this.terrain.overrideVersion || 0) + 1;
        /* a verge round the roads: no random tree or rock grows right up to the dirt (structures and anything already decided are left alone) */
        if (cfg.verge > 0) {
            const v = cfg.verge;
            for (const key of roadKeys) {
                const [c, r] = key.split(',').map(Number);
                for (let dy = -v; dy <= v; dy++) {
                    for (let dx = -v; dx <= v; dx++) {
                        const k = this._s(c + dx, r + dy);
                        if (isRoad.has(k) || plan.hubTiles.has(k) || plan.buildingTiles.has(k)) continue;
                        if (gameState.world.changes[k] !== undefined) continue;
                        this.modifyWorld(c + dx, r + dy, null);
                    }
                }
            }
        }
    }
}
