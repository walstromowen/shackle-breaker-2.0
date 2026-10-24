import { CONFIG } from '../core/constants.js';
import { gameState } from '../core/gameState.js';
import { biomeFactory } from './biomeFactory.js';
import { BIOME_DEFINITIONS, isPlateau } from './biomeDefinitions.js';
export class TerrainGenerator {
    constructor(seed) {
        this.seed = seed;
        this.offsetX = (this.seed % 10000) * 13.7;
        this.offsetY = (this.seed % 10000) * 19.3;
        this.TILES = CONFIG.TILE_TYPES;
        this.GLOBAL_ELEVATION_MAP = [
            { threshold: -0.3, tile: this.TILES.LAYER_0 },
            { threshold: -0.15, tile: this.TILES.LAYER_1 },
            { threshold: 0.25, tile: this.TILES.LAYER_2 },
            { threshold: 0.5, tile: this.TILES.LAYER_3 },
            { threshold: 0.75, tile: this.TILES.LAYER_4 },
            { threshold: 1.0, tile: this.TILES.LAYER_5 },
            { threshold: 1.25, tile: this.TILES.LAYER_6 },
            { threshold: 1.5, tile: this.TILES.LAYER_7 },
        ];
        this._tileCache = new Map();
        this._levelCache = new Map();
        this._baseCache = new Map();
        this._smoothCache = new Map();
        this._biomeCache = new Map();
        this._rawElevCache = new Map();
        this._rawNum = new Map(); // the same raw levels under a numeric key (col * 2^22 + row): the slope limit reads thousands of them per cell
        this.elevationNoise = new PerlinNoise(this.seed);
        /* Hill field: a second, much lower-frequency noise that decides where the big hills / plateaus stand. A biome reads it as the second
           argument of shapeElevation(noise, hill) and lifts the land by a smooth amount where it is high, so a hill is one broad shape (tens of
           cells across) instead of the small bumps the base elevation noise makes. */
        this.hillNoise = new PerlinNoise(this.seed + 777);
        this.hillDetailNoise = new PerlinNoise(this.seed + 4242);
        this.massifNoise = new PerlinNoise(this.seed + 5151);
        this.massifDetailNoise = new PerlinNoise(this.seed + 6262);
        /* Flow: every land-shaping noise is read at a warped position (the position pushed around by two slow noises), so shapes bend and
           swirl instead of looking like round blobs. The canyon field's zero contour is a winding line; the biome cuts a channel along it. */
        this.warpNoiseA = new PerlinNoise(this.seed + 31);
        this.warpNoiseB = new PerlinNoise(this.seed + 57);
        this.canyonNoise = new PerlinNoise(this.seed + 9001);
        this.WARP_FREQ = 0.022; this.WARP_AMP = 11;
        this.CANYON_FREQ = 0.022;
        /* Mountain shapes added on top of the broad hill field (see getHillValue): winding ridge bands that bend back on themselves, and
           ring (donut) mountains - a wall of rock round a basin, with one gap in it. */
        this.ridgeNoise = new PerlinNoise(this.seed + 1313);
        this.ridgeMaskNoise = new PerlinNoise(this.seed + 2727);
        this.ridgeWarpA = new PerlinNoise(this.seed + 71);
        this.ridgeWarpB = new PerlinNoise(this.seed + 93);
        /* Crevices (see _crevice): narrow, twisting cracks through the plateaus, thinning out at their ends. */
        this.crevNoise = new PerlinNoise(this.seed + 8181);
        this.crevMaskNoise = new PerlinNoise(this.seed + 8282);
        this.crevWarpA = new PerlinNoise(this.seed + 8383);
        this.crevWarpB = new PerlinNoise(this.seed + 8484);
        /* Rivers: where two biomes meet the ground used to be a strip of dirt. Along some stretches of that border (where riverNoise is high) the strip
           is a river instead, wider where the noise is higher and tapering out to a dry bed at both ends; fords (small round patches where fordNoise
           is high) leave the dirt in place, so a river can always be crossed within a few dozen cells. */
        this.riverNoise = new PerlinNoise(this.seed + 6767);
        this.fordNoise = new PerlinNoise(this.seed + 6868);
        this.RIVER_FREQ = 0.011; this.RIVER_THRESHOLD = 0.16; this.FORD_FREQ = 0.05; this.FORD_THRESHOLD = 0.3;
        this.RIVER_DEPTH_NOISE = -0.5; // below the water threshold (-0.3) of the elevation map
        this.RIVER_BANK_NOISE = -0.25;  // dirt: the lowest the land beside a river goes
        this.RIDGE_FREQ = 0.017; this.RIDGE_WARP_FREQ = 0.012; this.RIDGE_WARP_AMP = 26;
        this.RING_CELL = 130; this.RING_CHANCE = 0.72;
        /* Stairs / ramps: rare places where a one-level step of a hill can be climbed (see getStairAt). The world is cut into STAIR_BLOCK x
           STAIR_BLOCK squares; each square gets a stair with chance STAIR_CHANCE, on one of the edges of a hill inside it that is straight
           enough for the piece (3 wide on a north / south edge, 2 tall on an east / west edge). */
        this.STAIR_BLOCK = 32; this.STAIR_CHANCE = 0.35; this.STAIR_MARGIN = 6;
        this._stairBlocks = new Map();
        /* Straight cliffs: the plateau levels (3 and up) are read from the elevation noise sampled on a jittered grid, so their outlines run in
           long straight, axis-aligned stretches (a plateau edge is at least STRAIGHT_COL_W - STRAIGHT_COL_A cells long, a jog at least
           STRAIGHT_ROW_W - STRAIGHT_ROW_A cells). Water and the ground levels keep their natural, curving outline. */
        this.straightCliffs = true;
        this.STRAIGHT_COL_W = 5; this.STRAIGHT_COL_A = 2;
        this.STRAIGHT_ROW_W = 4; this.STRAIGHT_ROW_A = 1;
        this._straightNoiseCache = new Map();
        this.temperatureNoise = new PerlinNoise(this.seed + 12345);
        this.moistureNoise = new PerlinNoise(this.seed + 54321);
        this.plainsNoise = new PerlinNoise(this.seed + 31337);   // the third biome field (see getBiomeAt)
        /* Ragged biome borders: the position the three biome fields are read at is shaken by three layers of noise (see getBiomeAt): a slow layer
           that bends a border into wide bays and headlands, a middle one that cuts coves and spurs into those, and a quick one that breaks the edge
           into short sharp steps. amp = how far a cell can be moved, in cells (the layers add up). */
        this.biomeEdge = [
            { freq: 0.03, amp: 16, dx: 0 },
            { freq: 0.09, amp: 8, dx: 100 },
            { freq: 0.16, amp: 3, dx: 200 },
        ].map((l, i) => ({ ...l, nx: new PerlinNoise(this.seed + 2468 + i * 1111), ny: new PerlinNoise(this.seed + 3579 + i * 1111) }));
    }
    _s(col, row) {
        return `${col},${row}`;
    }
    clearCacheForKeys(keys) {
        for (const key of keys) {
            this._dropTile(key);
            this._biomeCache.delete(key);
            this._rawElevCache.delete(key);
            { const [kc, kr] = key.split(',').map(Number); this._rawNum.delete(kc * 4194304 + kr); }
        }
    }
    /* Forget the cached tile of a cell, and of the two cells above it (their tile depends on this one, see getTileAt). */
    _dropTile(key) {
        const [col, row] = key.split(',').map(Number);
        // a cell's level now also depends on the cells up to 4 away (the sliver clean-up, see _smoothLevel), and its tile on the 2 cells below it
        for (let dc = -5; dc <= 5; dc++) {
            for (let dr = -7; dr <= 5; dr++) {
                const k = this._s(col + dc, row + dr);
                this._tileCache.delete(k);
                this._levelCache.delete(k);
                this._baseCache.delete(k);
                for (let q = 1; q <= 4; q++) this._smoothCache.delete(q + ':' + k);
            }
        }
    }
    getBiomeAt(col, row) {
        const key = this._s(col, row);
        if (this._biomeCache.has(key)) return this._biomeCache.get(key);
        const BIOME_FREQ = 0.0028;   // biome regions are a few hundred cells across
        /* One smooth field per biome (cold = snowy mountains, dry = desert, plus plains); the biome of a cell is the field that is highest there.
           Cutting ONE field into thirds would make the middle biome a thin band that wraps around the other two (a ring); with a field each,
           every biome grows as its own broad region and borders whichever biome happens to be next to it. */
        let px = col, py = row;
        for (const L of this.biomeEdge) {
            px += L.amp * L.nx.get(col * L.freq + this.offsetX + L.dx, row * L.freq + this.offsetY + L.dx);
            py += L.amp * L.ny.get(col * L.freq + this.offsetX + L.dx + 500, row * L.freq + this.offsetY + L.dx + 500);
        }
        const fx = px * BIOME_FREQ + this.offsetX, fy = py * BIOME_FREQ + this.offsetY;
        const snowy = this.temperatureNoise.get(fx, fy);
        const desert = this.moistureNoise.get(fx, fy);
        const plains = this.plainsNoise.get(fx, fy);
        const biome = biomeFactory.determineBiome(snowy, plains, desert);
        this._biomeCache.set(key, biome);
        return biome;
    }
    _warp(col, row) {
        const f = this.WARP_FREQ, A = this.WARP_AMP;
        return [
            col + A * this.warpNoiseA.get(col * f + this.offsetX, row * f + this.offsetY),
            row + A * this.warpNoiseB.get(col * f + this.offsetX + 100, row * f + this.offsetY + 100),
        ];
    }
    _hash(a, b, salt) {
        let h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul((salt + this.seed) | 0, 83492791);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    /* Ring mountains: one candidate per RING_CELL x RING_CELL square. Height ~2.1 on the crest, falling off over ~T cells either side; the
       radius wobbles with the angle, and one gap (~40 degrees) lets the crest drop so the basin can be walked into. */
    _ringField(col, row, chance = this.RING_CHANCE) {
        const C = this.RING_CELL, gx0 = Math.floor(col / C), gy0 = Math.floor(row / C);
        let best = 0, clear = 0;
        for (let gy = gy0 - 1; gy <= gy0 + 1; gy++) {
            for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) {
                if (this._hash(gx, gy, 5) > chance) continue;
                const cx = gx * C + 40 + this._hash(gx, gy, 6) * (C - 80), cy = gy * C + 40 + this._hash(gx, gy, 7) * (C - 80);
                const R = 22 + this._hash(gx, gy, 8) * 16, T = 6 + this._hash(gx, gy, 9) * 3;
                const dx = col - cx, dy = row - cy;
                const d = Math.hypot(dx, dy);
                if (d > R * 1.5 + 3 * T) continue;
                const ang = Math.atan2(dy, dx);
                const wob = this.hillDetailNoise.get(Math.cos(ang) * 1.3 + cx * 0.013 + this.offsetX, Math.sin(ang) * 1.3 + cy * 0.013 + this.offsetY);
                const Rw = R * (1 + 0.45 * wob);
                const u = (d - Rw) / T;
                /* the basin inside the wall is levelled to plain ground (and may hold a pond) */
                const cl = 1 - Math.min(1, Math.max(0, (d - (Rw - 1.0 * T)) / (0.8 * T)));
                if (cl > clear) clear = cl;
                let h = Math.exp(-u * u);
                let da = Math.abs(ang - (this._hash(gx, gy, 10) * 2 - 1) * Math.PI);
                if (da > Math.PI) da = 2 * Math.PI - da;
                const gap = Math.min(1, Math.max(0, (da - 0.12) / 0.3));
                h *= 0.12 + 0.88 * gap * gap * (3 - 2 * gap);
                if (h > best) best = h;
            }
        }
        return [best * 2.1, clear];
    }
    /* ~[-1, 1] before the extras, mean ~0. Broad hills (one every ~80 cells), plus ridge bands and rings. */
    getHillValue(col, row) {
        const [x, y] = this._warp(col, row);
        const big = this.hillNoise.get(x * 0.012 + this.offsetX, y * 0.012 + this.offsetY);
        const detail = this.hillDetailNoise.get(x * 0.05 + this.offsetX, y * 0.05 + this.offsetY);
        const base = big * 1.35 + detail * 0.3;
        /* ridge bands: along the zero contour of a noise that is warped hard, so the band bends and doubles back; only where a slow mask is high */
        const fw = this.RIDGE_WARP_FREQ, aw = this.RIDGE_WARP_AMP;
        const rx = col + aw * this.ridgeWarpA.get(col * fw + this.offsetX + 50, row * fw + this.offsetY + 50);
        const ry = row + aw * this.ridgeWarpB.get(col * fw + this.offsetX + 150, row * fw + this.offsetY + 150);
        const r = Math.abs(this.ridgeNoise.get(rx * this.RIDGE_FREQ + this.offsetX, ry * this.RIDGE_FREQ + this.offsetY));
        const m = this.ridgeMaskNoise.get(col * 0.007 + this.offsetX, row * 0.007 + this.offsetY);
        const mask = Math.min(1, Math.max(0, (m + 0.12) / 0.3));
        const bt = Math.min(1, Math.max(0, (r - 0.08) / 0.17)), band = 1 - bt * bt * (3 - 2 * bt); /* flat crest, long slopes */
        const [ringAdd, basin] = this._ringField(col, row);
        const land = base * 0.75 + 1.6 * band * mask * mask * (3 - 2 * mask);
        return land * (1 - basin) - 0.25 * basin + ringAdd;
    }
    /* Winding ridge band, 0..1: 1 along the crest of a ridge that bends and doubles back (the zero contour of a hard-warped noise), 0 away from it;
       only where a slow mask is high. The same shape getHillValue adds to its hill field. */
    _ridgeBand(col, row) {
        const fw = this.RIDGE_WARP_FREQ, aw = this.RIDGE_WARP_AMP;
        const rx = col + aw * this.ridgeWarpA.get(col * fw + this.offsetX + 50, row * fw + this.offsetY + 50);
        const ry = row + aw * this.ridgeWarpB.get(col * fw + this.offsetX + 150, row * fw + this.offsetY + 150);
        const r = Math.abs(this.ridgeNoise.get(rx * this.RIDGE_FREQ + this.offsetX, ry * this.RIDGE_FREQ + this.offsetY));
        const m = this.ridgeMaskNoise.get(col * 0.007 + this.offsetX, row * 0.007 + this.offsetY);
        const mask = Math.min(1, Math.max(0, (m + 0.12) / 0.3));
        const bt = Math.min(1, Math.max(0, (r - 0.08) / 0.17));
        return (1 - bt * bt * (3 - 2 * bt)) * mask * mask * (3 - 2 * mask);
    }
    /* Crevice: true where a narrow crack runs. The crack follows the zero contour of a noise read at a strongly warped position (so it twists), is
       about `width` noise units either side (~0.03 per cell, so 0.045 is a crack 2-3 cells wide), and a slow mask thins it to nothing at its ends. */
    _crevice(col, row, f) {
        const m = this.crevMaskNoise.get(col * 0.011 + this.offsetX, row * 0.011 + this.offsetY);
        const t = Math.min(1, Math.max(0, (m - f.maskLow) / 0.18));
        if (t <= 0) return false;
        const A = f.warp, fw = 0.035;
        const x = col + A * this.crevWarpA.get(col * fw + this.offsetX + 20, row * fw + this.offsetY + 20);
        const y = row + A * this.crevWarpB.get(col * fw + this.offsetX + 220, row * fw + this.offsetY + 220);
        return Math.abs(this.crevNoise.get(x * f.freq + this.offsetX, y * f.freq + this.offsetY)) < f.width * t * t * (3 - 2 * t);
    }
    /* Landforms drawn cell by cell on top of the straight-edged plateaus (a biome opts in with `features`; each part is optional):
         rings:   { chance, wall }   donuts: a wall of rock (one level high) round a basin, with one gap in it; the basin is cut down to the ground,
                                     also out of a mesa it stands on. `chance` = share of ring sites used, `wall` = how high the ring field must be (0..2.1) for rock.
         ridge:   { wall }           winding ridges: rock where the ridge band (0..1) is above `wall`.
         crevice: { width, freq, warp, maskLow }   narrow cracks cut down to the ground through every plateau they cross.
       They are drawn per cell, so they keep their curving, twisting outline instead of the long straight cliffs. Nothing is ever raised out of a
       pond or a dirt patch, and the usual slope limit and sliver clean-up still apply (so a wall is 2+ cells thick and one level high). */
    _applyFeatures(col, row, level, natural, f) {
        if (natural < 2 && level < 3) return level;
        if (f.rings) {
            const [add, clear] = this._ringField(col, row, f.rings.chance);
            if (clear > 0.5 && level > 2) level = 2;
            else if (add >= f.rings.wall && level < 3) level = 3;
        }
        if (f.ridge && level < 3 && this._ridgeBand(col, row) >= f.ridge.wall) level = 3;
        if (f.crevice && level >= 3 && this._crevice(col, row, f.crevice)) level = 2;
        return level;
    }
    /* Distance to the winding canyon line, as a plain number (0 on the line); the biome turns it into walls and a floor. */
    getCanyonValue(col, row, stretch, rings = true) {
        const [x, y] = this._warp(col, row);
        const sx = stretch ? stretch[0] : 1, sy = stretch ? stretch[1] : 1;
        const c = Math.abs(this.canyonNoise.get(x * (this.CANYON_FREQ / sx) + this.offsetX, y * (this.CANYON_FREQ / sy) + this.offsetY));
        /* no canyon through a ring wall: it stays a closed donut except for its own gap */
        /* (ring walls only exist in the ridge-and-ring hill field, so a massif biome skips this) */
        return rings ? c + 0.5 * Math.min(1, this._ringField(col, row)[0] / 1.0) : c;
    }
    /* Massif field (a biome opts in with `hillField: 'massif'`): a few broad domes, 100+ cells across, with a little detail on the slopes. No narrow ridge
       bands and no rings, so a tall mountain climbs in wide, long terraces (room for stairs) instead of thin ledges. About [-1.3, 1.3]. */
    getMassifValue(col, row, stretch) {
        const [x, y] = this._warp(col, row);
        const sx = stretch ? stretch[0] : 1, sy = stretch ? stretch[1] : 1;
        const big = this.massifNoise.get(x * (0.006 / sx) + this.offsetX, y * (0.006 / sy) + this.offsetY);
        const mid = this.massifDetailNoise.get(x * (0.035 / sx) + this.offsetX, y * (0.035 / sy) + this.offsetY);
        return big * 3.0 + mid * 0.45;
    }
    getBlendedElevationNoise(col, row, noCanyon = false) {
        const centerBiome = this.getBiomeAt(col, row);
        const cdef = BIOME_DEFINITIONS[centerBiome.id];
        const massif = !!(cdef && cdef.hillField === 'massif');
        const stretch = cdef && cdef.massifStretch;
        const hill = massif ? this.getMassifValue(col, row, stretch) : this.getHillValue(col, row);
        const canyon = noCanyon ? 1 : this.getCanyonValue(col, row, massif ? stretch : undefined, !massif);
        const [wx, wy] = this._warp(col, row);
        const rawNoise = this.elevationNoise.get(wx * 0.03 + this.offsetX, wy * 0.03 + this.offsetY);
        const CHECK_RADIUS = 6;
        const DIRT_RADIUS = 3;
        const TARGET_DIRT_NOISE = -0.2;
        if (
            this.getBiomeAt(col, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col, row + CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row - CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col - CHECK_RADIUS, row + CHECK_RADIUS) === centerBiome &&
            this.getBiomeAt(col + CHECK_RADIUS, row + CHECK_RADIUS) === centerBiome
        ) {
            return centerBiome.shapeElevation(rawNoise, hill, canyon);
        }
        let minDistanceToBorder = CHECK_RADIUS + 1;
        for (let d = 1; d <= CHECK_RADIUS; d++) {
            let foundBorder = false;
            for (let i = -d; i <= d; i++) {
                if (
                    this.getBiomeAt(col + i, row - d) !== centerBiome ||
                    this.getBiomeAt(col + i, row + d) !== centerBiome ||
                    this.getBiomeAt(col - d, row + i) !== centerBiome ||
                    this.getBiomeAt(col + d, row + i) !== centerBiome
                ) {
                    foundBorder = true;
                    break;
                }
            }
            if (foundBorder) {
                minDistanceToBorder = d;
                break;
            }
        }
        const naturalNoise = centerBiome.shapeElevation(rawNoise, hill, canyon);
        const riverHalf = this.getRiverHalfWidth(col, row);
        if (minDistanceToBorder <= riverHalf) return Math.min(naturalNoise, this.RIVER_DEPTH_NOISE);
        if (minDistanceToBorder <= DIRT_RADIUS) {
            // beside a river the bank is always dry: a lake of the biome never touches the river (their water would be drawn in two different styles)
            return riverHalf > 0 ? Math.max(Math.min(naturalNoise, TARGET_DIRT_NOISE), this.RIVER_BANK_NOISE) : Math.min(naturalNoise, TARGET_DIRT_NOISE);
        } else if (minDistanceToBorder <= CHECK_RADIUS) {
            const t = (minDistanceToBorder - DIRT_RADIUS) / (CHECK_RADIUS - DIRT_RADIUS + 1);
            const dampenedNoise = TARGET_DIRT_NOISE + (naturalNoise - TARGET_DIRT_NOISE) * t;
            const v = Math.min(naturalNoise, dampenedNoise);
            return riverHalf > 0 ? Math.max(v, this.RIVER_BANK_NOISE) : v;
        }
        return naturalNoise;
    }
    /* How many cells either side of a biome border the river is wide here: 0 (no river: the border stays a strip of dirt), 1 (a stream, 2 cells), 2 or 3 (4 or 6 cells). */
    getRiverHalfWidth(col, row) {
        const m = this.riverNoise.get(col * this.RIVER_FREQ + this.offsetX, row * this.RIVER_FREQ + this.offsetY);
        if (m < this.RIVER_THRESHOLD) return 0;
        if (this.fordNoise.get(col * this.FORD_FREQ + this.offsetX, row * this.FORD_FREQ + this.offsetY) > this.FORD_THRESHOLD) return 0;
        return m > this.RIVER_THRESHOLD + 0.2 ? 3 : (m > this.RIVER_THRESHOLD + 0.08 ? 2 : 1);
    }
    /* Is this cell part of a river: water, within the river's half width of a biome border? (The renderer gives all such cells one water style.) */
    isRiverCell(col, row) {
        const half = this.getRiverHalfWidth(col, row);
        if (!half) return false;
        const centre = this.getBiomeAt(col, row);
        for (let d = 1; d <= half; d++) {
            for (let i = -d; i <= d; i++) {
                if (this.getBiomeAt(col + i, row - d) !== centre || this.getBiomeAt(col + i, row + d) !== centre
                    || this.getBiomeAt(col - d, row + i) !== centre || this.getBiomeAt(col + d, row + i) !== centre) {
                    return this.getTileAt(col, row) === this.TILES.LAYER_0;
                }
            }
        }
        return false;
    }
    /* The biome whose water art every river uses (a river between two biomes is neither one's water). */
    getRiverBiome() {
        return biomeFactory.getBiome('PLAINS');
    }
    _jitter(k, salt, amp) {
        let h = Math.imul(k | 0, 73856093) ^ Math.imul(salt, 19349663);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) % (amp + 1);
    }
    /* Centre of the jittered-grid strip (width ~w, edges moved by 0..amp) that holds v. */
    _stripCentre(v, w, amp, salt) {
        const edge = (k) => k * w + this._jitter(k, salt + this.seed % 997, amp);
        let k = Math.floor(v / w);
        if (v >= edge(k + 1)) k++; else if (v < edge(k)) k--;
        return Math.floor((edge(k) + edge(k + 1) - 1) / 2);
    }
    /* The elevation noise of the jittered-grid strip that holds the cell. A plateau needs the strip AND its four side neighbours to be high
       (an erosion; the canyon is only read at the strip itself, so it keeps its width), so specks and one-strip slivers of plateau do not appear and every plateau is at least about three strips across. */
    /* The strip sizes of the cell's biome: [column width, column jitter, row height, row jitter]. A biome can set `straight: { colW, colA, rowW, rowA }`
       in its definition to get longer straight cliffs (and so more room for stairs) than the default. */
    _straightDims(col, row) {
        const b = this.getBiomeAt(col, row), d = b && BIOME_DEFINITIONS[b.id] && BIOME_DEFINITIONS[b.id].straight;
        return d ? [d.colW, d.colA, d.rowW, d.rowA] : [this.STRAIGHT_COL_W, this.STRAIGHT_COL_A, this.STRAIGHT_ROW_W, this.STRAIGHT_ROW_A];
    }
    _getStraightNoise(col, row) {
        const [dc, ca, dr, ra] = this._straightDims(col, row);
        const bd0 = BIOME_DEFINITIONS[this.getBiomeAt(col, row).id];
        const noCan = !!(bd0 && bd0.gorge !== undefined);
        const qc = this._stripCentre(col, dc, ca, 11);
        const qr = this._stripCentre(row, dr, ra, 29);
        const key = qc + ',' + qr + ',' + dc + ',' + dr;
        let n = this._straightNoiseCache.get(key);
        if (n === undefined) {
            n = Math.min(
                this.getBlendedElevationNoise(qc, qr, noCan),
                this.getBlendedElevationNoise(qc - dc, qr, true), this.getBlendedElevationNoise(qc + dc, qr, true),
                this.getBlendedElevationNoise(qc, qr - dr, true), this.getBlendedElevationNoise(qc, qr + dr, true));
            this._straightNoiseCache.set(key, n);
        }
        return n;
    }
    _getRawElevationLevel(col, row) {
        const key = this._s(col, row);
        if (gameState.world.terrainOverrides[key] !== undefined) {
            return gameState.world.terrainOverrides[key];
        }
        if (this._rawElevCache.has(key)) return this._rawElevCache.get(key);
        const finalNoise = this.getBlendedElevationNoise(col, row);
        let level = this.GLOBAL_ELEVATION_MAP.length - 1;
        for (let i = 0; i < this.GLOBAL_ELEVATION_MAP.length; i++) {
            if (finalNoise < this.GLOBAL_ELEVATION_MAP[i].threshold) {
                level = i;
                break;
            }
        }
        if (level === 2 && finalNoise < 0.0) {
            const WATER_THRESHOLD = -0.3;
            const offsets = [
                { c: -1, r: 0 },
                { c: 1, r: 0 },
                { c: 0, r: -1 },
                { c: 0, r: 1 },
                { c: -2, r: 0 },
                { c: 2, r: 0 },
                { c: 0, r: -2 },
                { c: 0, r: 2 },
                { c: -1, r: -1 },
                { c: 1, r: -1 },
                { c: -1, r: 1 },
                { c: 1, r: 1 },
            ];
            for (const off of offsets) {
                if (this.getBlendedElevationNoise(col + off.c, row + off.r) < WATER_THRESHOLD) {
                    level = 1;
                    break;
                }
            }
        }
        const natural = level;
        if (this.straightCliffs) {
            const sn = this._getStraightNoise(col, row);
            let hi = this.GLOBAL_ELEVATION_MAP.length - 1;
            for (let i = 0; i < this.GLOBAL_ELEVATION_MAP.length; i++) {
                if (sn < this.GLOBAL_ELEVATION_MAP[i].threshold) { hi = i; break; }
            }
            level = hi >= 3 ? hi : Math.min(level, 2);
            /* Gorge: a biome with `gorge: d` has its canyon cut through the plateaus cell by cell (distance to the canyon line below d), down to the
               ground / dirt level the elevation noise itself gives there. Reading the canyon only at the strip centre (as the other biomes do) would
               leave gaps in it as soon as the strips are wider than the gorge. */
            const gb = BIOME_DEFINITIONS[this.getBiomeAt(col, row).id];
            if (gb && gb.gorge !== undefined && this.getCanyonValue(col, row, gb.massifStretch, gb.hillField !== 'massif') < gb.gorge
                && !(gb.features && gb.features.rings && this._ringField(col, row, gb.features.rings.chance)[0] > 0.8)) level = Math.min(natural, 2); /* (a donut's wall stays closed: no canyon through it) */
        }
        const fb = BIOME_DEFINITIONS[this.getBiomeAt(col, row).id];
        if (fb && fb.features) level = this._applyFeatures(col, row, level, natural, fb.features);
        this._rawElevCache.set(key, level);
        return level;
    }
    /* The tile of a cell: its plateau level, with one fix-up so no rock face is left without a grass top (see below). */
    getTileAt(col, row) {
        const key = this._s(col, row);
        if (this._tileCache.has(key)) return this._tileCache.get(key);
        let level = this._getLevel(col, row);
        /* A cliff level whose rock face has no grass above it: the cell is on a level, but the cell above it and the cell below it are
           not. The face is drawn as the cell itself (plus the row under it), so a ridge only one cell thick would be rock with no top.
           The cell above such a cell is raised onto the level, which gives the face a rim and a grass top. Structures keep their tiles. */
        const below = this._getLevel(col, row + 1);
        const wanted = level + 1;
        if (wanted >= 3 && below >= wanted && this._getLevel(col, row + 2) < wanted) {
            const overrides = gameState.world.terrainOverrides;
            if (overrides[key] === undefined && overrides[this._s(col, row + 1)] === undefined) level = wanted;
        }
        const tile = this.GLOBAL_ELEVATION_MAP[level].tile;
        this._tileCache.set(key, tile);
        return tile;
    }
    _getLevel(col, row) {
        const key = this._s(col, row);
        let level = this._levelCache.get(key);
        if (level === undefined) {
            level = this._smoothLevel(col, row, 4);
            this._levelCache.set(key, level);
        }
        return level;
    }
    /* The level of a cell before the sliver clean-up (the slope-limited level). */
    _baseLevel(col, row) {
        const key = this._s(col, row);
        let level = this._baseCache.get(key);
        if (level === undefined) {
            level = this._computeLevel(col, row);
            this._baseCache.set(key, level);
        }
        return level;
    }
    /* Sliver clean-up. A cell whose two opposite neighbours (west/east, or north/south) are on the SAME level while it is on another is a strip one
       cell wide: a one-cell ridge on a plateau or a one-cell slit in it. Those draw as a thin tube of rock or a dark crack, so the cell joins its neighbours.
       Only where a cliff level (3+) is involved: water, dirt and ground keep their natural outline. One pass can leave a new 1-cell strip beside the fixed
       one, so it runs four times (each pass reads the pass before it, so the result does not depend on the order cells are asked for). */
    _smoothLevel(col, row, passes) {
        if (passes === 0) return this._baseLevel(col, row);
        const key = passes + ':' + this._s(col, row);
        let v = this._smoothCache.get(key);
        if (v !== undefined) return v;
        const f = (c, r) => this._smoothLevel(c, r, passes - 1);
        const m = f(col, row);
        v = m;
        const a = f(col - 1, row), b = f(col + 1, row);
        if (a === b && a !== m && Math.max(a, m) >= 3) v = a;
        else {
            const u = f(col, row - 1), d = f(col, row + 1);
            if (u === d && u !== m && Math.max(u, m) >= 3) v = u;
        }
        this._smoothCache.set(key, v);
        return v;
    }
    _computeLevel(col, row) {
        let finalLevel = this._getRawElevationLevel(col, row);
        const biome = this.getBiomeAt(col, row);
        if (finalLevel > 2) {
            /* how many cells wide each step of a hill is at least (the biome can ask for wider terraces with `plateauWidth`; wider means a slower climb) */
            const bdef = biome && BIOME_DEFINITIONS[biome.id];
            const PLATEAU_WIDTH = bdef && bdef.plateauWidth ? bdef.plateauWidth : 2;
            const MAX_SEARCH_RADIUS = (finalLevel - 2) * PLATEAU_WIDTH;
            const rawNum = this._rawNum;
            const raw = (c, r) => {
                const k = c * 4194304 + r;
                let v = rawNum.get(k);
                if (v === undefined) { v = this._getRawElevationLevel(c, r); rawNum.set(k, v); }
                return v;
            };
            for (let d = 1; d <= MAX_SEARCH_RADIUS; d++) {
                let minBaseLevelAtD = 999;
                for (let c = -d; c <= d; c++) {
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, raw(col + c, row - d));
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, raw(col + c, row + d));
                }
                for (let r = -d + 1; r < d; r++) {
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, raw(col - d, row + r));
                    minBaseLevelAtD = Math.min(minBaseLevelAtD, raw(col + d, row + r));
                }
                const maxAllowedLevel = minBaseLevelAtD + Math.floor((d - 1) / PLATEAU_WIDTH) + 1;
                finalLevel = Math.min(finalLevel, maxAllowedLevel);
            }
        }
        return finalLevel;
    }
    /* ---- stairs ---------------------------------------------------------------------------------------------------------------
       getStairAt(col, row) -> null, or { id, kind, ox, oy, w, h, walk, carve, style, dirs } for a cell inside a stair piece (walk = [col,row,w,h]: the cells that can be walked; mask: one string per piece row, W walkway / F,G,T open ground / R rock, see STAIR_MASK; carve = [col,row,w,h]: the cells the renderer treats as NOT part of the plateau when it works out the cast shadow, so the shadow wraps round the cliff the stair makes).
         kind  'S' terraced stair cut into a south face and back into the plateau (5 x 3 cells, the 3 middle columns walkable, climb UP)   'N' stair cut into a north edge (5 x 2, 3 middle columns walkable, climb DOWN = going south)
               'E' side-view notch cut into an east edge, with its own south cliff wall (3 x 4, walk row only, climb LEFT)   'W' the same on a west edge (climb RIGHT)
         (ox, oy) top-left cell of the piece, w x h its size in cells, style 0 | 1 (the two looks on the sheet), dirs the moves it allows.
       A stair only goes where one level meets the next (the plateau is exactly one level above the ground in front of it) along a straight
       run of edge with room around it; nothing about the terrain is changed. */
    getStairAt(col, row) {
        const B = this.STAIR_BLOCK;
        const bx = Math.floor(col / B), by = Math.floor(row / B);
        const key = bx + ',' + by;
        let list = this._stairBlocks.get(key);
        if (list === undefined) {
            list = this._computeStairBlock(bx, by);
            this._stairBlocks.set(key, list);
        }
        for (const st of list) {
            if (col >= st.ox && col < st.ox + st.w && row >= st.oy && row < st.oy + st.h) return st;
        }
        return null;
    }
    _computeStairBlock(bx, by) {
        const B = this.STAIR_BLOCK;
        // a biome can ask for more (or fewer) stairs with `stairChance` in its definition: the snowy mountains have five levels to climb
        const bd = this.getBiomeAt(bx * this.STAIR_BLOCK + (this.STAIR_BLOCK >> 1), by * this.STAIR_BLOCK + (this.STAIR_BLOCK >> 1));
        const chance = bd && BIOME_DEFINITIONS[bd.id] && BIOME_DEFINITIONS[bd.id].stairChance !== undefined ? BIOME_DEFINITIONS[bd.id].stairChance : this.STAIR_CHANCE;
        if (this._hash(bx, by, 41) >= chance) return [];
        const M = bd && BIOME_DEFINITIONS[bd.id] && BIOME_DEFINITIONS[bd.id].stairMargin !== undefined ? BIOME_DEFINITIONS[bd.id].stairMargin : this.STAIR_MARGIN;
        const perBlock = bd && BIOME_DEFINITIONS[bd.id] && BIOME_DEFINITIONS[bd.id].stairsPerBlock ? BIOME_DEFINITIONS[bd.id].stairsPerBlock : 1;
        const T = (c, r) => this.getTileAt(c, r);
        const IS = this.TILES;
        const cands = [];
        const x0 = bx * B + M, x1 = bx * B + B - M, y0 = by * B + M, y1 = by * B + B - M;
        const rowsEq = (c, r0, r1, t) => { for (let r = r0; r <= r1; r++) if (T(c, r) !== t) return false; return true; };
        const colsEq = (c0, c1, r, t) => { for (let c = c0; c <= c1; c++) if (T(c, r) !== t) return false; return true; };
        for (let r = y0; r < y1; r++) {
            for (let c = x0; c < x1; c++) {
                const h = T(c, r);
                if (isPlateau(h)) {
                    const lo = h - 1;
                    // All four stairs are cut INTO the plateau (the notch lies on plateau cells). walk = [col, row, w, h] is the part that can be walked.
                    // S: the edge row r is a plateau row whose south side is one level lower. Piece rows r-1..r+1, 3 cells c..c+2, plateau also at r-2.
                    if (colsEq(c - 2, c + 4, r, h) && colsEq(c - 2, c + 4, r - 1, h) && colsEq(c - 2, c + 4, r - 2, h) && colsEq(c - 2, c + 4, r + 1, lo) && colsEq(c - 2, c + 4, r + 2, lo) && colsEq(c - 2, c + 4, r + 3, lo))
                        cands.push({ kind: 'S', ox: c - 1, oy: r - 1, w: 5, h: 3, walk: [c, r - 1, 3, 3], carve: [c, r, 3, 1], dirs: ['UP', 'DOWN'] });
                    // N: edge row r (plateau), ground rows above it r-1..r-3; the plateau continues south (rows r..r+3, so the cell the stair leads onto is not itself the lip of a south face). Piece rows r..r+1.
                    if (colsEq(c - 2, c + 4, r, h) && colsEq(c - 2, c + 4, r + 1, h) && colsEq(c - 2, c + 4, r + 2, h) && colsEq(c - 2, c + 4, r + 3, h) && colsEq(c - 2, c + 4, r - 1, lo) && colsEq(c - 2, c + 4, r - 2, lo) && colsEq(c - 2, c + 4, r - 3, lo))
                        cands.push({ kind: 'N', ox: c - 1, oy: r, w: 5, h: 2, walk: [c, r, 3, 2], carve: [c, r, 3, 1], dirs: ['UP', 'DOWN'] });
                    // E: the plateau's east edge column c (straight over rows r-3..r+2), ground east of it. The notch (walk row r) takes cols c-2..c; the cliff wall
                    // of its north side is drawn in rows r-2, r-1 and the rim of its south side in row r+1, so the piece is 3 x 4 and only row r can be walked.
                    if (rowsEq(c, r - 3, r + 2, h) && rowsEq(c - 1, r - 3, r + 2, h) && rowsEq(c - 2, r - 3, r + 2, h) && rowsEq(c - 3, r - 3, r + 2, h)
                        && rowsEq(c + 1, r - 3, r + 2, lo) && rowsEq(c + 2, r - 3, r + 2, lo) && rowsEq(c + 3, r - 3, r + 2, lo))
                        cands.push({ kind: 'E', ox: c - 2, oy: r - 2, w: 3, h: 4, walk: [c - 2, r, 3, 1], carve: [c - 2, r - 1, 3, 2], dirs: ['LEFT', 'RIGHT'] });
                    // W: the plateau's west edge column c, ground west of it; the notch takes cols c..c+2
                    if (rowsEq(c, r - 3, r + 2, h) && rowsEq(c + 1, r - 3, r + 2, h) && rowsEq(c + 2, r - 3, r + 2, h) && rowsEq(c + 3, r - 3, r + 2, h)
                        && rowsEq(c - 1, r - 3, r + 2, lo) && rowsEq(c - 2, r - 3, r + 2, lo) && rowsEq(c - 3, r - 3, r + 2, lo))
                        cands.push({ kind: 'W', ox: c, oy: r - 2, w: 3, h: 4, walk: [c, r, 3, 1], carve: [c, r - 1, 3, 2], dirs: ['LEFT', 'RIGHT'] });
                }
            }
        }
        if (!cands.length) return [];
        // one biome under the piece (a blob biome with a stair sheet), no structure tiles: the piece is drawn from the biome's own sheet
        const good = [];
        for (const cd of cands) {
            const biome = this.getBiomeAt(cd.ox, cd.oy);
            if (!biome || !biome.blobTileset || !biome.blobTileset.cliffStairs) continue;
            let ok = true;
            for (let r = cd.oy - 1; r <= cd.oy + cd.h && ok; r++)
                for (let c = cd.ox - 1; c <= cd.ox + cd.w && ok; c++) {
                    if (this.getBiomeAt(c, r) !== biome) ok = false;
                    if (gameState.world.terrainOverrides[this._s(c, r)] !== undefined) ok = false;
                }
            if (!ok) continue;
            cd.score = this._hash(cd.ox, cd.oy, 43);
            good.push(cd);
        }
        if (!good.length) return [];
        good.sort((a, b) => b.score - a.score);
        // the best one, and (when the biome asks for `stairsPerBlock` > 1) more of them, none closer than 2 cells to another
        const out = [];
        for (const cd of good) {
            if (out.length >= perBlock) break;
            if (out.some((o) => cd.ox < o.ox + o.w + 2 && o.ox < cd.ox + cd.w + 2 && cd.oy < o.oy + o.h + 2 && o.oy < cd.oy + cd.h + 2)) continue;
            cd.style = Math.floor(this._hash(cd.ox, cd.oy, 47) * 2);
            cd.mask = STAIR_MASK[cd.kind];
            if (!cd.walk) cd.walk = [cd.ox, cd.oy, cd.w, cd.h];
            cd.id = cd.ox + ',' + cd.oy;
            out.push(cd);
        }
        return out;
    }
    invalidateTile(key) {
        this._stairBlocks.clear();
        this._dropTile(key);
        this._rawElevCache.delete(key);
        { const [kc, kr] = key.split(',').map(Number); this._rawNum.delete(kc * 4194304 + kr); }
        this.overrideVersion = (this.overrideVersion || 0) + 1;
    }
}
/* What each cell of a stair piece is, by row (piece rows top to bottom, columns left to right):
   W  walkway: the stair itself (entered from outside only along its axis, any direction between W cells)
   F  open ground of the plateau inside the piece, connected to the walkway (the plateau grass beside a north/south notch)
   G  low ground inside a side-view notch (its upper row): reached from the walkway or from the ground in front of the notch, not from the plateau
   T  plateau ground inside the piece that is NOT connected to the walkway or to G: reached only from the plateau (the grass strip under a side-view notch)
   R  rock: solid. */
const STAIR_MASK = {
    S: ['FWWWF', 'RWWWR', 'RWWWR'],
    N: ['FWWWF', 'FWWWF'],
    E: ['TRR', 'GGG', 'WWW', 'TTT'],
    W: ['RRT', 'GGG', 'WWW', 'TTT'],
};
class PerlinNoise {
    constructor(seed) {
        this.p = new Uint8Array(512);
        this.perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.perm[i] = i;
        let s = seed;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        for (let i = 0; i < 256; i++) {
            const r = rand();
            const j = Math.floor(r * 256);
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = this.perm[i & 255];
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    get(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        return this.lerp(
            v,
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1)),
        );
    }
    invalidateTile(key) {}
}
