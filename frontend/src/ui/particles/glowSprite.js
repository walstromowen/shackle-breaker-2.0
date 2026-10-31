/**
 * ui/particles/glowSprite.js
 *
 * A glowing dot (a filled circle with a canvas shadow round it), drawn once into a small canvas and reused.
 * Canvas shadowBlur is one of the most expensive things a 2D canvas can do: it runs a blur over every shape it is set for, every frame.
 * Embers and battle particles drew dozens of them each frame, which is what made weaker GPUs (integrated laptop graphics) drop frames.
 * Stamping a cached picture of the same dot costs about as much as drawing a plain image.
 *
 * The sprite is built exactly the way the dot used to be drawn (same fill, same shadow colour and blur), so it looks the same. Radii are
 * rounded to whole pixels (half pixels below 3 px): battle particles grow and shrink every frame, and finer steps meant a burst kept building
 * new sprites while it played. The core is under the glow, so a fraction of a pixel of radius does not show.
 */
const cache = new Map();
const MAX_CACHED = 600;   // plenty for every colour and size in use; cleared (and rebuilt as needed) if something ever floods it

/**
 * @param {string} fill        the dot's colour
 * @param {string} glow        the shadow (glow) colour
 * @param {number} radius      the dot's radius in px
 * @param {number} blur        the canvas shadowBlur it used to be drawn with
 * @returns {{ canvas: HTMLCanvasElement, half: number }}  draw it at (x - half, y - half) for a dot centred on (x, y)
 */
export function glowSprite(fill, glow, radius, blur) {
    const r = radius < 3 ? Math.max(0.5, Math.round(radius * 2) / 2) : Math.round(radius);
    const key = `${fill}|${glow}|${r}|${blur}`;
    let sprite = cache.get(key);
    if (sprite) return sprite;

    // A canvas shadow fades out over about 1.5x its blur value, so leave that much room round the dot
    const half = Math.ceil(r + blur * 1.5 + 2);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = half * 2;
    const g = canvas.getContext('2d');
    g.fillStyle = fill;
    g.shadowColor = glow;
    g.shadowBlur = blur;
    g.beginPath();
    g.arc(half, half, r, 0, Math.PI * 2);
    g.fill();

    if (cache.size >= MAX_CACHED) cache.clear();
    sprite = { canvas, half };
    cache.set(key, sprite);
    return sprite;
}

/** Draws a glowing dot centred on (x, y) with the context's current globalAlpha / blend mode. Smooth placement, so slow dots glide instead of stepping. */
export function drawGlowDot(ctx, x, y, fill, glow, radius, blur) {
    const { canvas, half } = glowSprite(fill, glow, radius, blur);
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvas, x - half, y - half);
    ctx.imageSmoothingEnabled = smoothing;
}
