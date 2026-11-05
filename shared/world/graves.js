// shared/world/graves.js: what a multiplayer party leaves behind when it falls.
//
// In a multiplayer world a defeat cannot send a player to the title screen (that would take them out of the world, or close it for everyone
// when it is the host's): the party gets back up at its last rest point instead (SceneManager GAME_OVER), and its bag and coin stay behind in a
// grave where it fell. A grave is a map object (PLAYER_GRAVE) kept in the world's changes like a banner, so every player sees it and the host
// saves it, and beside it under "grave:<cell key>" is what it holds: { owner, name, items: [saved items], currency, day }. Only its owner can
// dig it up (interacting with it), which gives everything back and takes the grave away. Equipped gear stays on the characters.
import { gameState } from '../core/gameState.js';
import { ItemFactory } from '../items/itemFactory.js';
import { ItemDefinitions } from '../items/itemDefinitions.js';
import { InventorySystem } from '../items/inventorySystem.js';

export const GRAVE = { OBJECT_ID: 'PLAYER_GRAVE', SEARCH_RADIUS: 4 };

const keyOf = (wm, col, row) => 'grave:' + wm._s(col, row);

/** What the grave on (col, row) holds, or null. */
export function graveAt(wm, col, row) {
    return (gameState.world.changes && gameState.world.changes[keyOf(wm, col, row)]) || null;
}

/** The nearest free tile to (col, row) for a grave: open ground with nothing on it (a grave never covers another grave, a banner or a door). */
export function graveSpot(wm, col, row) {
    const changes = gameState.world.changes || {};
    for (let r = 0; r <= GRAVE.SEARCH_RADIUS; r++) {
        for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) !== r) continue;
            const c = col + dc, w = row + dr;
            if (!wm.isTileFree(c, w) || wm.getObjectAt(c, w)) continue;
            const id = changes[wm._s(c, w)];
            if (id !== undefined && id !== null) continue;
            return { col: c, row: w };
        }
    }
    return null;
}

/**
 * The party falls: its bag and coin go into a grave near (col, row) on the map the player is on. Returns { col, row, count, currency } or null
 * when there was nothing to leave (an empty bag and no coin) or nowhere to put it (then the party keeps its things).
 */
export function dropGrave(wm, col, row, owner, name) {
    const party = gameState.party;
    const items = (party.inventory || []).filter(Boolean).map(i => (typeof i.toJSON === 'function' ? i.toJSON() : { ...i }));
    const currency = Math.max(0, party.currency || 0);
    if (!items.length && !currency) return null;
    const spot = graveSpot(wm, col, row);
    if (!spot) return null;
    wm.modifyWorld(spot.col, spot.row, GRAVE.OBJECT_ID);
    wm._placeObject(spot.col, spot.row, GRAVE.OBJECT_ID);
    wm.setChange(keyOf(wm, spot.col, spot.row), { owner, name, items, currency, day: gameState.world.day || 1 });
    party.inventory = [];
    party.currency = 0;
    return { ...spot, count: items.length, currency };
}

/**
 * Dig up the grave on (col, row): its owner gets everything back (stackables onto their stacks, gear as it was, levels and all) and the
 * grave is gone. Returns { ok, message, items: [{ id, qty }], currency }.
 */
export function collectGrave(wm, col, row, me) {
    const g = graveAt(wm, col, row);
    if (!g) return { ok: false, message: 'Only earth, freshly turned.' };
    if (g.owner && me && g.owner !== me) return { ok: false, message: `${g.name || 'Someone'}'s grave. What lies here is not yours to take.` };
    const got = [];
    for (const saved of g.items || []) {
        const def = ItemDefinitions[saved.defId];
        if (!def) continue;
        if (def.stackable) InventorySystem.addItem(saved.defId, saved.qty || 1);
        else {
            const item = ItemFactory.createItem(saved.defId, saved);
            if (item) gameState.party.inventory.push(item);
        }
        got.push({ id: saved.defId, qty: saved.qty || 1 });
    }
    gameState.party.currency = (gameState.party.currency || 0) + (g.currency || 0);
    wm.setChange(keyOf(wm, col, row), undefined);
    wm.modifyWorld(col, row, undefined);
    return { ok: true, message: `You dig up what you left behind${g.currency ? ` and ${g.currency} coin` : ''}.`, items: got, currency: g.currency || 0 };
}
