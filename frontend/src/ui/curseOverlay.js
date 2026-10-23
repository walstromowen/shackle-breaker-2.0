// frontend/src/ui/curseOverlay.js: the cursed look of a shackled character's portrait.
//
// A shackled character (CorruptionSystem) is drawn on every portrait screen (character summary, party, level up, encounter) as a dark, drained copy of
// the portrait with crimson cracks of corruption running over the figure and a red aura behind it. It is ALIVE, never a still picture:
//   - the aura breathes (a slow pulse),
//   - the cracks crackle: four different sets of cracks flicker one after the other (about 5 a second, each cross-fading into the next) and glow brighter and fainter,
//   - dark red wisps rise from the figure and fade out above it,
//   - every couple of seconds the figure twitches: a one-pixel jolt with a red ghost image trailing it (the erratic behaviour the Shackling encounter talks about).
// Only the figure itself is painted over (the layers are built from the portrait's own pixels with 'source-atop'), so the panel behind it is untouched. The layers are
// made once per portrait frame and kept; everything that moves is worked out from the clock when drawing (no state), so any screen can call it every frame.
import { CorruptionSystem } from '../../../shared/characters/corruptionSystem.js';

const WISPS = 16;
const built = new WeakMap();   // portrait sheet -> Map(frame key -> { dark, veins })

/** Is this character shackled (and so drawn cursed)? Accepts a party member, a battle combatant's entity or a plain record. */
export function isCursed(entity) {
    return CorruptionSystem.isShackled(entity);
}

// a small repeatable random number generator, so a portrait always gets the same cracks
const seeded = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
};

const makeCanvas = (w, h) => {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

function buildLayers(sheet, sx, sy, sw, sh) {
    // 1. the figure, drained and darkened toward a bruised violet
    const dark = makeCanvas(sw, sh);
    const g = dark.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.filter = 'grayscale(0.78) brightness(0.74) contrast(1.08)';   // (a browser without canvas filters just gets the tint below)
    g.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh);
    g.filter = 'none';
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(38,8,58,0.55)';
    g.fillRect(0, 0, sw, sh);

    // 2. the cracks: four sets (different random walks) that flicker one after the other
    return { dark, veins: [0, 1, 2, 3].map((k) => buildVeins(sheet, sx, sy, sw, sh, k)) };
}

/* One set of cracks: pixel-wide crimson veins that wander across the figure (a hot core, a darker rim), cut to the figure's shape. */
function buildVeins(sheet, sx, sy, sw, sh, variant) {
    const mask = makeCanvas(sw, sh);
    const m = mask.getContext('2d');
    m.imageSmoothingEnabled = false;
    const rand = seeded(7 + variant * 101 + Math.floor(sx * 13 + sy * 7));
    const walk = (x, y, steps, core) => {
        let dx = rand() < 0.5 ? -1 : 1, dy = rand() < 0.5 ? -1 : 1;
        for (let i = 0; i < steps; i++) {
            m.fillStyle = core ? '#ff4a3a' : '#9c1030';
            m.fillRect(Math.round(x), Math.round(y), 1, 1);
            if (core && rand() < 0.18) m.fillRect(Math.round(x) + 1, Math.round(y), 1, 1);
            const r = rand();
            if (r < 0.35) dx = -dx; else if (r < 0.55) dy = -dy;
            x += rand() < 0.7 ? dx : 0;
            y += rand() < 0.7 ? dy : 0;
            if (rand() < 0.06) walk(x, y, Math.floor(steps / 2), false);   // a fork
        }
    };
    const veinCount = 11;
    for (let i = 0; i < veinCount; i++) {
        const x = sw * (0.25 + rand() * 0.5), y = sh * (0.12 + rand() * 0.76);
        walk(x, y, 10 + Math.floor(rand() * 16), false);
        walk(x, y, 5 + Math.floor(rand() * 8), true);
    }
    m.globalCompositeOperation = 'destination-in';   // only the pixels that landed on the figure stay
    m.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh);
    return mask;
}

function layersFor(sheet, sx, sy, sw, sh) {
    let frames = built.get(sheet);
    if (!frames) built.set(sheet, frames = new Map());
    const key = `${sx},${sy},${sw},${sh}`;
    let layers = frames.get(key);
    if (!layers) frames.set(key, layers = buildLayers(sheet, sx, sy, sw, sh));
    return layers;
}

/**
 * Draws a cursed portrait: `drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh)` with the shackled look, animated from the clock. `alpha` multiplies everything (the
 * encounter screen fades its portraits). Everything it changes on the context is put back.
 */
export function drawCursedPortrait(ctx, sheet, sx, sy, sw, sh, dx, dy, dw, dh, alpha = 1) {
    const { dark, veins } = layersFor(sheet, sx, sy, sw, sh);
    const t = performance.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.9);
    const px = dw / sw;   // one pixel of the portrait, on the screen

    // the twitch: for a moment every ~2.3 seconds the figure jolts a pixel sideways, with a red ghost left behind
    const cycle = t % 2.3;
    const twitch = cycle < 0.14 ? (cycle < 0.07 ? 1 : -1) : 0;

    ctx.save();
    // the aura, held inside the portrait's own box
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
    const glow = ctx.createRadialGradient(dx + dw / 2, dy + dh * 0.55, dw * 0.08, dx + dw / 2, dy + dh * 0.55, dw * 0.78);
    glow.addColorStop(0, `rgba(170,18,48,${(0.34 + 0.2 * pulse) * alpha})`);
    glow.addColorStop(0.55, `rgba(70,8,60,${(0.2 + 0.08 * pulse) * alpha})`);
    glow.addColorStop(1, 'rgba(20,0,30,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(dx, dy, dw, dh);

    ctx.imageSmoothingEnabled = false;
    if (twitch) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(veins[0], 0, 0, sw, sh, dx - twitch * 3 * px, dy, dw, dh);   // the ghost (cracks only: a red smear)
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(dark, 0, 0, sw, sh, dx + twitch * px, dy, dw, dh);

    // the cracks crackle: this set cross-fades into the next one, 5 sets a second
    const phase = t * 5;
    const i = Math.floor(phase) % veins.length, j = (i + 1) % veins.length, mix = phase - Math.floor(phase);
    const glowing = 0.6 + 0.4 * Math.sin(t * 3.1 + 1.3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * glowing * (1 - mix);
    ctx.drawImage(veins[i], 0, 0, sw, sh, dx + twitch * px, dy, dw, dh);
    ctx.globalAlpha = alpha * glowing * mix;
    ctx.drawImage(veins[j], 0, 0, sw, sh, dx + twitch * px, dy, dw, dh);

    // wisps: small dark-red embers of corruption rising off the figure, each on its own loop
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < WISPS; k++) {
        const life = ((t * (0.16 + (k % 4) * 0.035)) + k * 0.371) % 1;          // 0 at the feet, 1 at the top
        const x = dx + dw * (0.2 + 0.6 * ((k * 0.6180339) % 1)) + Math.sin(t * 1.4 + k * 2.1) * dw * 0.035;
        const y = dy + dh * (0.95 - 0.9 * life);
        const a = Math.sin(life * Math.PI) * 0.75 * alpha;
        const size = Math.max(2, Math.round(px * (1 + (k % 3))));
        ctx.globalAlpha = a;
        ctx.fillStyle = k % 3 === 0 ? '#ff5a45' : (k % 3 === 1 ? '#b0153a' : '#5a1a6e');
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.restore();
}
