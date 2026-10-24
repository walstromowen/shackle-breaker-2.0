/**
 * shared/battle/animation/animationKit.js
 * HELPERS FOR WRITING BATTLE ANIMATIONS (used by battleAnimationDefinitions.js)
 *
 * The animation system itself has not changed: an animation is still a plain object
 *   { duration, audio[], background, actor, vfx[], target }
 * and BattleAnimationModel / BattleRenderer / VFXRenderer read exactly that. This file only makes the object easier to write and
 * hard to get wrong. Every helper returns plain data, so you can still write a raw object anywhere if you need something unusual.
 *
 * ---------------------------------------------------------------------------------------------------------------------
 *  QUICK REFERENCE
 * ---------------------------------------------------------------------------------------------------------------------
 *  anim(duration, { hit, audio, background, actor, vfx, target })
 *      duration   seconds. Everything below is in seconds from the start.
 *      hit        optional "moment of impact". Any time can then be written relative to it ('hit', 'hit+0.2', 'end-0.3'),
 *                 so retiming an animation is one number instead of five.
 *
 *  audio:        [ sfx(start, 'key', { volume, pitch }) ]
 *  background:   background(start, end, 'key', 'css filter')
 *  actor:        what the caster does:  lunge(start, end, distance, extra)   wobble(start, end, intensity, extra)
 *                hop(start, end, height, extra)   slideIn / slideOut(start, end, distance, extra)
 *                or just { flash: flash(start, end, filter) }.   extra can hold flash / fade / fadeIn.
 *  vfx:          [ spawn(start, 'sheet', opts)   a sprite that appears (on the target by default, at: 'source' for the caster)
 *                  travel(start, 'sheet', opts)  a sprite that flies from the caster to the target(s)
 *                  burst(start, opts)            a spray of glowing dots (needs no art, just a colour)
 *                  ...stream(start, count, gap, 'sheet', opts)   many travel sprites in a row (beams, jets) ]
 *  target:       what the victim does:  { shake: shake(start, end, intensity), flash: flash(start, end, filter) }
 *                (an array of these is fine for several separate hits)
 *
 *  spawn / travel / stream options
 *      life        seconds the sprite lives                 scale     size multiplier
 *      frames      frames in the sheet row (default 1)      size      source frame size in px (default 64)
 *      move        'static' | 'spread_and_fade' (a pool flowing outwards, then thinning away) | 'expand_and_fade' | 'rise_and_hold' (comes up from below, stays fully visible, then thins away) | 'shrink_and_fade' | 'float_up_and_pop' | 'swipe_diagonal' | 'swipe_diagonal_alt'
 *                  | 'diagonal_drop' | 'linear' | 'arc'      (travel defaults to 'linear')
 *      blend       'screen' (default, glowing) | 'normal' | 'multiply' (dark) | 'source-over'
 *      filter      css filter for the sprite (recolour it with tint())
 *      offsetX / offsetY   nudge in px                      drop: [x, y]   start distance for 'diagonal_drop'
 *      arc         arc height in px for move 'arc' (negative = up)       aim: true  turn the sprite to face where it is flying
 *      facing      with aim: which way the art points at rest, in degrees clockwise from right (an arrow drawn pointing
 *                  down-right is facing: 45)               spin        spin speed in radians/second
 *      fadeOut: false  stay fully visible until it lands
 *      alpha       0..1 opacity (a faint copy a few ms behind makes a motion trail)
 *  burst options:  count, color, scale, minSpeed, maxSpeed, minLife, maxLife, gravity (negative floats up), drag, blend, at, alpha
 *                  glow: false  a plain dot with no halo (far cheaper; use it for rain, snow, sand and anything with dozens of dots)
 *                  angle (degrees: 0 right, 90 down, 180 left, 270 up) + cone (fan width, default 30): send the spray one way instead of every way
 *                  area: [width, height]  start anywhere in a box that size around the point (rain, snow, a sandstorm)
 *                  shape: 'puff' (a soft cloud, for fog and smoke) | 'fleck' (a tumbling flake of ash) | omitted (a glowing dot)
 *                  wind: [x, y]  px/s the particles are blown toward, windPull: how fast they get there (per second, ~1 = a second),
 *                  sway: px/s of wandering as they drift (gusts), grow: scale change per second (a puff spreading out),
 *                  windJitter (0.5 = each one feels 50-150% of the wind, so a cloud stretches into a stream),
 *                  scaleJitter (0.4 = 60-140% of the size) and spinJitter (random tumble, radians/second) so no two look alike,
 *                  envelope: true  fade in, then thin away smoothly (instead of staying solid until the very end)
 *                  offsetX / offsetY      move the whole spray (e.g. offsetY: -260 starts it above the target)
 *  repeat(start, count, gap, (t, i) => cue)   the same cue again and again: repeat(0, 12, 0.2, t => burst(t, { ... }))
 *  stream options: everything above, plus  jitter: n  (spreads the sprites up/down by up to 2n px) and
 *                  variants: [{ life, offsetY, scale }, ...]  (per-sprite values, cycled)
 *
 *  tint('fire')                        a recolour filter. Names: red fire gold yellow lime green teal cyan blue violet purple pink
 *  tint('fire', { bright: 200, sat: 500, glow: 'orange' })
 * ---------------------------------------------------------------------------------------------------------------------
 *  RULES OF THUMB
 *  - Every ability gets its OWN animation id (the id of the ability is the easiest choice). abilityDefinitions.js points at it with animationId.
 *  - Line the target's shake/flash up with the moment the sprite lands. Use `hit` so they cannot drift apart.
 *  - Filters cost frame time (especially drop-shadow). A stream of 20 sprites with a drop-shadow each is the expensive case.
 *  - Run `node tools/checkAnimations.mjs` after editing: it catches typos, missing ids, sounds/sheets that do not exist and look-alike animations.
 */

export const TINT_HUES = {
    red: 330, fire: 15, orange: 15, gold: 35, yellow: 45, lime: 70, green: 95,
    teal: 150, cyan: 190, blue: 205, violet: 235, purple: 262, pink: 295
};

/** A recolour filter: tint('green') or tint('fire', { bright: 200, sat: 500, glow: 'orange' }) or tint(190) for a raw hue. */
export function tint(color, opts = {}) {
    const hue = typeof color === 'number' ? color : TINT_HUES[color];
    if (hue === undefined) throw new Error(`animationKit: unknown tint "${color}". Use one of: ${Object.keys(TINT_HUES).join(', ')} (or a hue number)`);
    const { bright = 160, sat = 350, glow = null, glowSize = 10 } = opts;
    let f = `brightness(${bright}%) sepia(100%) hue-rotate(${hue}deg) saturate(${sat}%)`;
    if (glow) f += ` drop-shadow(0 0 ${glowSize}px ${glow})`;
    return f;
}

// ---------------------------------------------------------------------------------------------------------------------
// small building blocks
// ---------------------------------------------------------------------------------------------------------------------
const clean = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) r[k] = v; return r; };

export const sfx = (start, key, { volume, pitch } = {}) => clean({ start, key, volume, pitch });
export const flash = (start, end, filter) => ({ start, end, filter });
export const shake = (start, end, intensity) => ({ start, end, intensity });
export const fade = (start, end) => ({ start, end });
export const background = (start, end, key, filter) => clean({ start, end, key, filter });

export const lunge = (start, end, distance, extra = {}) => ({ type: 'lunge', start, end, distance, ...extra });
export const wobble = (start, end, intensity, extra = {}) => ({ type: 'shake', start, end, intensity, ...extra });
export const hop = (start, end, height, extra = {}) => ({ type: 'hop', start, end, height, ...extra });
export const slideIn = (start, end, distance, extra = {}) => ({ type: 'slide_in', start, end, distance, ...extra });
export const slideOut = (start, end, distance, extra = {}) => ({ type: 'slide_out', start, end, distance, ...extra });

// ---------------------------------------------------------------------------------------------------------------------
// vfx
// ---------------------------------------------------------------------------------------------------------------------
// 'screen' (glow) unless told otherwise; 'source-over' is the canvas default, so it is simply left out
const blendOf = (b) => (b === undefined ? 'screen' : (b === 'source-over' ? undefined : b));

const spriteConfig = (sheetKey, o = {}) => clean({
    life: o.life ?? 0.5,
    sheetKey,
    frameCount: o.frames ?? 1,
    frameSize: o.size ?? 64,
    movement: o.move,
    arc: o.arc,
    rotation: o.aim ? 'auto' : o.rotation,
    rotationOffset: o.facing !== undefined ? -o.facing * Math.PI / 180 : undefined,
    rotationDelta: o.spin,
    dropX: o.drop ? o.drop[0] : undefined,
    dropY: o.drop ? o.drop[1] : undefined,
    offsetX: o.offsetX,
    offsetY: o.offsetY,
    scale: o.scale ?? 1.5,
    blendMode: blendOf(o.blend),
    filter: o.filter,
    fadeOut: o.fadeOut,
    alpha: o.alpha
});

export const spawn = (start, sheetKey, o = {}) => ({ start, type: 'spawn', origin: o.at || 'target', config: spriteConfig(sheetKey, o) });
export const travel = (start, sheetKey, o = {}) => ({ start, type: 'travel', origin: 'source', config: spriteConfig(sheetKey, { life: 0.3, ...o }) });

/** A spray of glowing dots. No sprite sheet needed: the colour is the whole look. */
export const burst = (start, o = {}) => ({
    start, type: 'burst', origin: o.at || 'target', count: o.count ?? 12,
    config: clean({
        color: o.color ?? '#ffffff', scale: o.scale ?? 1.0,
        minSpeed: o.minSpeed, maxSpeed: o.maxSpeed, minLife: o.minLife, maxLife: o.maxLife,
        gravity: o.gravity, drag: o.drag, blendMode: blendOf(o.blend), alpha: o.alpha, glow: o.glow,
        angle: o.angle, cone: o.cone,
        spreadX: o.area ? o.area[0] : undefined, spreadY: o.area ? o.area[1] : undefined,
        offsetX: o.offsetX, offsetY: o.offsetY,
        shape: o.shape, windX: o.wind ? o.wind[0] : undefined, windY: o.wind ? o.wind[1] : undefined, windPull: o.windPull,
        sway: o.sway, swayRate: o.swayRate, scaleDelta: o.grow, windJitter: o.windJitter, scaleJitter: o.scaleJitter, spinJitter: o.spinJitter, envelope: o.envelope
    })
});

/** `count` copies of a cue, `gap` seconds apart: repeat(0, 10, 0.25, t => burst(t, { ... })). Weather and other long loops. */
export function repeat(start, count, gap, make) {
    return Array.from({ length: count }, (_, i) => make(Math.round((start + i * gap) * 10000) / 10000, i));
}

/** `count` travel sprites, `gap` seconds apart: the body of a beam or a jet. */
export function stream(start, count, gap, sheetKey, o = {}) {
    const { jitter = 0, variants = null, ...rest } = o;
    return Array.from({ length: count }, (_, i) => {
        const v = variants ? variants[i % variants.length] : {};
        const offsetY = v.offsetY ?? (jitter ? ((i * 7) % 5 - 2) * jitter : rest.offsetY);
        return travel(Math.round((start + i * gap) * 10000) / 10000, sheetKey, { ...rest, ...v, offsetY });
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// anim(): assemble + resolve symbolic times
// ---------------------------------------------------------------------------------------------------------------------
const round = (n) => Math.round(n * 10000) / 10000;

function resolveTime(value, hit, duration, where) {
    if (typeof value === 'number') return round(value);
    const m = /^(hit|end)\s*([+-]\s*\d*\.?\d+)?$/.exec(String(value));
    if (!m) throw new Error(`animationKit: bad time "${value}" in ${where}`);
    const base = m[1] === 'hit' ? hit : duration;
    if (base === undefined) throw new Error(`animationKit: "${value}" used in ${where} but this animation has no hit time`);
    return round(base + (m[2] ? Number(m[2].replace(/\s/g, '')) : 0));
}

function walk(node, hit, duration, where) {
    if (Array.isArray(node)) return node.flat().map((n, i) => walk(n, hit, duration, `${where}[${i}]`));
    if (node && typeof node === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(node)) {
            if (v === undefined) continue;
            if ((k === 'start' || k === 'end') ) out[k] = resolveTime(v, hit, duration, `${where}.${k}`);
            else out[k] = walk(v, hit, duration, `${where}.${k}`);
        }
        return out;
    }
    return node;
}

/** Assemble an animation definition. Returns the plain object the battle code already understands. */
export function anim(duration, spec = {}) {
    if (!(duration > 0)) throw new Error(`animationKit: duration must be above 0 (got ${duration})`);
    const { hit, ...parts } = spec;
    const ORDER = ['audio', 'background', 'actor', 'vfx', 'target'];
    const out = { duration };
    for (const k of [...ORDER, ...Object.keys(parts).filter(k => !ORDER.includes(k))]) {
        if (parts[k] !== undefined) out[k] = walk(parts[k], hit, duration, k);
    }
    return out;
}