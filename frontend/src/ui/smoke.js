/**
 * ui/smoke.js
 *
 * Wisps of pale smoke drifting over a painted background (the title screen). Nothing here is a picture: a few tiles of curling, thread-like
 * smoke are made in code the first time they are needed, and drawn every frame in three layers, each slid sideways at its own speed and
 * its own way, each fading between two different tiles so the shapes keep changing instead of sliding past unchanged:
 *   ground   a thick drift low down, round the feet of everything
 *   mid      thinner threads crossing it the other way
 *   sky      a slow haze in the clouds
 * Deterministic from the clock, so no scene has any state to keep (like embers.js).
 */

const TILE_W = 256, TILE_H = 128;

// mulberry32: a small seeded random number generator
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const smooth = (t) => t * t * (3 - 2 * t);

/** A lattice of random values that wraps round, sampled with smooth interpolation at (u, v) in 0..1. */
function makeLattice(cx, cy, rand) {
    const values = new Float32Array(cx * cy);
    for (let i = 0; i < values.length; i++) values[i] = rand();
    return (u, v) => {
        const fx = (((u % 1) + 1) % 1) * cx, fy = (((v % 1) + 1) % 1) * cy;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = smooth(fx - x0), ty = smooth(fy - y0);
        const xa = x0 % cx, xb = (x0 + 1) % cx, ya = (y0 % cy) * cx, yb = ((y0 + 1) % cy) * cx;
        const top = values[ya + xa] * (1 - tx) + values[ya + xb] * tx;
        const bottom = values[yb + xa] * (1 - tx) + values[yb + xb] * tx;
        return top * (1 - ty) + bottom * ty;
    };
}

function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

/**
 * One tile of smoke. The noise is stretched sideways (fewer cells across than down), bent by a second, slower noise (that is what makes it curl),
 * and read two ways: as a soft body, and as thin bright threads where the noise crosses its middle value. The tile wraps left to right, and it
 * fades to nothing at the top and the bottom, so the band it is drawn in has no hard edges.
 * `thread` 0..1 is how much of it is thread rather than body; `bodyShare` how strong the soft body is.
 */
function makeTile(seed, { thread, bodyShare, cellsX, cellsY }, look) {
    const rand = rng(seed);
    const octaves = [1, 2, 4, 8].map((k) => ({ weight: 1 / k, lattice: makeLattice(cellsX * k, cellsY * k, rand) }));
    const warpX = makeLattice(3, 4, rand), warpY = makeLattice(3, 4, rand);
    const canvas = makeCanvas(TILE_W, TILE_H);
    const g = canvas.getContext('2d');
    const img = g.createImageData(TILE_W, TILE_H);
    const totalWeight = octaves.reduce((s, o) => s + o.weight, 0);
    for (let py = 0; py < TILE_H; py++) {
        const v = py / TILE_H;
        const edge = Math.pow(Math.sin(Math.PI * v), 1.4);                // 0 at the top and bottom of the tile, 1 in the middle
        for (let px = 0; px < TILE_W; px++) {
            const u = px / TILE_W;
            const bendU = u + (warpX(u, v) - 0.5) * 0.4;                  // bent: the smoke curls
            const bendV = v + (warpY(u, v) - 0.5) * 0.7;
            let n = 0;
            for (const o of octaves) n += o.lattice(bendU, bendV) * o.weight;
            n /= totalWeight;                                              // about 0.2 .. 0.8
            const body = Math.max(0, Math.min(1, (n - 0.42) * 3.2));      // soft cloud where the noise is high
            const ridge = 1 - Math.abs(n - 0.5) * 2;                      // 1 along the line where n = 0.5, falling away to both sides
            const threads = Math.pow(Math.max(0, ridge), 7);               // a thin bright thread along that line
            const a = (body * bodyShare * look.body + threads * thread * look.thread) * edge;
            const i = (py * TILE_W + px) * 4;
            img.data[i] = look.rgb[0]; img.data[i + 1] = look.rgb[1]; img.data[i + 2] = look.rgb[2];   // pale, a little cool
            img.data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
        }
    }
    g.putImageData(img, 0, 0);
    return canvas;
}

// The three layers. band = where on the screen it lives (fractions of the height), spread = how wide one tile is drawn (in screen widths),
// speed = pixels a second (negative drifts left), alpha = how strong, period = seconds for it to change into its other tile and back.
const LAYERS = [
    { name: 'ground', band: [0.58, 1.04], spread: 1.5, speed: 16,  alpha: 0.66, period: 17, bob: 0.025, a: { seed: 11, thread: 0.4, bodyShare: 0.8, cellsX: 4, cellsY: 3 }, b: { seed: 12, thread: 0.4, bodyShare: 0.8, cellsX: 4, cellsY: 3 } },
    { name: 'mid',    band: [0.36, 0.86], spread: 1.1, speed: -26, alpha: 0.5, period: 12, bob: 0.04,  a: { seed: 21, thread: 0.6, bodyShare: 0.4, cellsX: 3, cellsY: 4 }, b: { seed: 22, thread: 0.6, bodyShare: 0.4, cellsX: 3, cellsY: 4 } },
    { name: 'sky',    band: [-0.06, 0.52], spread: 2.0, speed: 7,  alpha: 0.34, period: 24, bob: 0.02,  a: { seed: 31, thread: 0.35, bodyShare: 0.7, cellsX: 3, cellsY: 3 }, b: { seed: 32, thread: 0.35, bodyShare: 0.7, cellsX: 3, cellsY: 3 } }
];

// Two looks. 'full' is thick drifts of pale smoke (the painted title and login backgrounds can take it). 'wisp' is for the dark screens (menus,
// encounters, battles): almost none of the soft body, only the thin curling threads, and dimmer, so the screen stays dark and moody with smoke
// drifting through it rather than a pale haze lying on it.
const LOOKS = {
    full: { body: 1,    thread: 1,   rgb: [214, 220, 230] },
    wisp: { body: 0.06, thread: 0.9, rgb: [150, 158, 174] }
};

const _tiles = {};
function tiles(mode) {
    if (!_tiles[mode]) _tiles[mode] = LAYERS.map((layer) => ({ a: makeTile(layer.a.seed, layer.a, LOOKS[mode]), b: makeTile(layer.b.seed, layer.b, LOOKS[mode]) }));
    return _tiles[mode];
}

/**
 * Draws the smoke over the whole `width` x `height` area. `now` is seconds (any steadily growing clock).
 * `wisp` true: only thin dim threads of smoke, for dark screens (see LOOKS).
 */
export function drawSmoke(ctx, now, width, height, alpha = 1, wisp = false) {
    const made = tiles(wisp ? 'wisp' : 'full');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    LAYERS.forEach((layer, i) => {
        const drawW = width * layer.spread;
        const y0 = height * layer.band[0] + Math.sin(now * 0.21 + i * 2.1) * height * layer.bob;
        const bandH = height * (layer.band[1] - layer.band[0]);
        const shift = (((now * layer.speed) % drawW) + drawW) % drawW;       // always 0..drawW, so the second copy always covers the gap
        const mix = 0.5 + 0.5 * Math.sin((now / layer.period) * Math.PI * 2 + i);   // 0..1: how much of tile b over tile a
        for (const [tile, share] of [[made[i].a, 1 - mix], [made[i].b, mix]]) {
            ctx.globalAlpha = alpha * layer.alpha * share;
            if (ctx.globalAlpha < 0.01) continue;
            for (let copy = -1; copy <= 1; copy++) {
                const x = shift + copy * drawW - drawW;
                if (x + drawW < 0 || x > width) continue;
                ctx.drawImage(tile, 0, 0, TILE_W, TILE_H, x, y0, drawW, bandH);
            }
        }
    });
    ctx.restore();
}
