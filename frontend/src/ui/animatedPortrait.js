// frontend/src/ui/animatedPortrait.js
//
// A portrait that moves as it does in battle: the front-facing idle loop of the portrait sheet (rows 0 and 1, up to 16 frames a row, 32 in all,
// a frame every 100 ms: battleCombatantRenderer.js), for the screens that show a character still (the character creator, the party screen,
// the character summary). The frame is worked out from the sheet's own size, so a smaller sheet (4 frames a row, one row) loops only the frames it
// has and never shows an empty cell. Each character starts at its own point in the loop, so a row of portraits does not move in step.

export const PORTRAIT_FRAME_MS = 100;        // as in battle (BattleCombatantRenderer.ANIMATION_SPEED)
const FRAMES_PER_ROW = 16, LOOP_FRAMES = 32;  // as in battle: two rows of 16, front-facing

/* A small, stable number for a character (its id or name), so its loop starts where it always does. */
function offsetFor(key) {
    let h = 0;
    for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
}

/**
 * The source cell of the portrait's current frame.
 * @param {HTMLImageElement|ImageBitmap} img  the portrait sheet
 * @param {object} [who]  the character (or the look being previewed): frameSize, framesPerRow, battlePortraitFramesFront, id / name / key
 * @param {number} [now]  the clock, in ms
 * @returns {{ sx: number, sy: number, size: number }}
 */
export function portraitFrame(img, who = {}, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    const size = who.frameSize || 128;
    const perRow = Math.max(1, Math.min(who.framesPerRow || FRAMES_PER_ROW, Math.floor((img && img.width || size) / size)));
    const rows = Math.max(1, Math.min(2, Math.floor((img && img.height || size) / size)));
    const total = Math.max(1, Math.min(who.battlePortraitFramesFront || LOOP_FRAMES, perRow * rows));
    const key = who.key ?? who.id ?? who.uid ?? who.name ?? '';
    const f = (Math.floor(now / PORTRAIT_FRAME_MS) + offsetFor(key)) % total;
    return { sx: (f % perRow) * size, sy: Math.floor(f / perRow) * size, size };
}
