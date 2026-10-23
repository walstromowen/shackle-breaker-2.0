/**
 * shared/world/fenceConnections.js
 *
 * Which picture a fence piece gets. Every wooden fence object (WOODEN_FENCE_H, _V and the four corners; they are all the same piece now) is
 * one post, and the picture shows rails or a plank running towards each neighbouring fence. So a straight run, a corner, a T and the two ends
 * of a gap all come out right by themselves, and a piece knocked out of a yard (see `fenceBreak` in structures.js) leaves clean ends.
 *
 * The sheet objWoodenFence.png has 32 frames side by side, one 32 x 32 picture each:
 *     frames  0..15   the post with its weeds and moss      frame = connections
 *     frames 16..31   the same post, plain                  frame = 16 + connections
 * `connections` adds up  N = 1, E = 2, S = 4, W = 8  for each neighbour that is a fence (0 = a lone post, 15 = a crossing).
 */
export const FENCE_CONNECT_KEY = 'fence';
export const FENCE_FRAMES = 32;

const N = 1, E = 2, S = 4, W = 8;
export const FENCE_BITS = Object.freeze({ N, E, S, W });

/** The connection number (0..15) of the piece at col, row. isFenceAt(col, row) says whether a neighbouring cell holds a fence. */
export function fenceConnections(col, row, isFenceAt) {
    return (isFenceAt(col, row - 1) ? N : 0)
         | (isFenceAt(col + 1, row) ? E : 0)
         | (isFenceAt(col, row + 1) ? S : 0)
         | (isFenceAt(col - 1, row) ? W : 0);
}

/** Roughly one post in three keeps its tuft of weeds, chosen from the position so it never changes between frames or visits. */
export function fenceHasTuft(col, row) {
    let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) % 3 === 0;
}

/** The frame of the sheet to draw for the fence at col, row. */
export function fenceFrame(col, row, isFenceAt) {
    return fenceConnections(col, row, isFenceAt) + (fenceHasTuft(col, row) ? 0 : 16);
}
