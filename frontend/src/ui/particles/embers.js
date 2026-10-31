/**
 * ui/particles/embers.js
 *
 * Embers climbing through the dark over a whole screen: a near layer (big, quick, bright) over a far one (small, slow).
 * Deterministic from the clock, so no scene has any state to keep. Used by the title screen, the character creator and the encounters.
 * `count` / `sizeMul` thicken them for busy backgrounds. `tint` is the ember colour (EMBER is warm; COLD_EMBER is the cold green of the prologue).
 */
import { drawGlowDot } from './glowSprite.js';

export const EMBER = [232, 160, 84];
export const COLD_EMBER = [112, 232, 168];

export function drawEmbers(ctx, now, x0, width, height, alpha = 1, tint = EMBER, count = 64, sizeMul = 1) {
    ctx.save();
    const fill = `rgb(${tint[0]},${Math.max(0, tint[1] - 30)},${Math.max(0, tint[2] - 40)})`;
    const glow = `rgba(${tint[0]},${tint[1]},${tint[2]},0.9)`;
    for (let k = 0; k < count; k++) {
        const seed = k * 7919 + 13;
        const rnd = (n) => { const v = Math.sin(seed * (n + 1.37)) * 43758.5453; return v - Math.floor(v); };
        const near = rnd(7) > 0.62;                                    // about a third are close to the eye
        const speed = (near ? 0.034 : 0.016) + rnd(1) * (near ? 0.03 : 0.02);
        const prog = (now * speed + rnd(2)) % 1;                       // 0 at the bottom, 1 at the top
        const px = x0 + rnd(3) * width + Math.sin(now * (0.35 + rnd(4)) + k) * (near ? 40 : 22);
        const py = height * (1 - prog);
        const life = Math.sin(prog * Math.PI);                         // fades in and out
        const flicker = 0.62 + 0.38 * Math.sin(now * (2 + rnd(5) * 3) + k * 1.7);
        const a = alpha * life * flicker * (near ? 0.75 : 0.5);
        if (a <= 0.01) continue;
        const size = (near ? 1.8 + rnd(6) * 2.6 : 0.9 + rnd(6) * 1.5) * sizeMul;
        ctx.globalAlpha = a;
        // a cached picture of the glowing dot (glowSprite.js): a shadowBlur per ember per frame was the costliest thing on these screens
        drawGlowDot(ctx, px, py, fill, glow, size, near ? 14 : 8);
    }
    ctx.restore();
}
