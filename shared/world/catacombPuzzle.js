// shared/world/catacombPuzzle.js: the catacombs' gate puzzle. Browser-free.
//
// The CatacombGenerator puts a lever (LEVER) in each of the dungeon's farthest rooms, one cold brazier (BRAZIER_UNLIT) per lever in the antechamber, and a
// gate (CATACOMB_GATE) between the antechamber and the main chamber; their cells are in `terrain.puzzle` = { levers, braziers, gate }.
// Pulling a lever (interaction SWITCH, OverworldController) turns it down for good and lights the next brazier; with the last lever down the gate rises.
// Everything is an ordinary change of the map (WorldManager.modifyWorld), so it is saved with the game, kept when you leave and come back, and reaches the
// other players of a multiplayer world like any other change.

import { gameState } from '../core/gameState.js';

export const PUZZLE = {
    LEVER: 'LEVER', LEVER_DOWN: 'LEVER_ON',
    BRAZIER_COLD: 'BRAZIER_UNLIT', BRAZIER_LIT: 'STANDING_TORCH',
    GATE: 'CATACOMB_GATE', GATE_OPEN: 'CATACOMB_GATE_OPEN',
};

/* what stands on a cell now: a change made to it, else what the generator put there */
function objectAt(wm, c, r) {
    const changes = gameState.world.changes || {};
    const key = wm._s(c, r);
    return changes[key] !== undefined ? changes[key] : wm.terrain.getObjectIdAt(c, r);
}
function replace(wm, c, r, id) {
    wm.ensureChunkLoaded(c, r);
    wm.modifyWorld(c, r, id);
    wm._placeObject(c, r, id);
}

/** { total, pulled, open } for the catacomb the player is in, or null when there is no puzzle here. */
export function puzzleState(wm) {
    const p = wm && wm.terrain && wm.terrain.puzzle;
    if (!p) return null;
    const pulled = p.levers.filter((l) => objectAt(wm, l.c, l.r) === PUZZLE.LEVER_DOWN).length;
    return { total: p.levers.length, pulled, open: objectAt(wm, p.gate.c, p.gate.r) === PUZZLE.GATE_OPEN };
}

/** Pull the lever on (col, row). Returns { ok, message, pulled, total, opened }. */
export function pullLever(wm, col, row) {
    const p = wm && wm.terrain && wm.terrain.puzzle;
    const lever = p && p.levers.find((l) => l.c === col && l.r === row);
    if (!lever) return { ok: false, message: 'It will not move.' };
    if (objectAt(wm, col, row) === PUZZLE.LEVER_DOWN) return { ok: false, message: 'The lever is already down.' };
    replace(wm, col, row, PUZZLE.LEVER_DOWN);
    const { pulled, total } = puzzleState(wm);
    // the braziers light in order, one for every lever down, whichever lever it was
    p.braziers.forEach((b, i) => {
        const want = i < pulled ? PUZZLE.BRAZIER_LIT : PUZZLE.BRAZIER_COLD;
        if (objectAt(wm, b.c, b.r) !== want) replace(wm, b.c, b.r, want);
    });
    if (pulled >= total) {
        if (objectAt(wm, p.gate.c, p.gate.r) !== PUZZLE.GATE_OPEN) replace(wm, p.gate.c, p.gate.r, PUZZLE.GATE_OPEN);
        return { ok: true, opened: true, pulled, total, message: 'The last brazier roars to life, and with a groan of iron the great gate rises. The main chamber is open.' };
    }
    return { ok: true, opened: false, pulled, total, message: `The lever grinds down. Far off, a brazier flares to life. (${pulled} of ${total})` };
}
