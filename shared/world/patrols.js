// shared/world/patrols.js: patrols come back with each new act.
//
// A patrol is a map character that walks a round and watches for you: a `wander` and eyes (`interaction.sight`): the madmen, the legionaries on
// patrol, the Arc Knights on patrol, the bears. Killing one or sending it off takes it off the map (DESTROY_OBJECT writes null into the world's
// changes, and nothing is ever made there again). So the world does not empty for good, each one taken off is written down here (with the act
// it fell in), and when the world reaches a later act it is put back where it lived: the act's harder world fills its streets and roads again.
import { gameState } from '../core/gameState.js';
import { MAP_OBJECTS_DEFINITIONS } from './mapObjectDefinitions.js';
import { ActSystem } from '../story/actSystem.js';

/** Does this map object id come back with a new act: a wanderer with eyes? */
export function isPatrol(id) {
    const def = id && MAP_OBJECTS_DEFINITIONS[id];
    return !!(def && def.wander && def.interaction && def.interaction.sight);
}

const fallen = (world = gameState.world) => (world.fallenPatrols ||= {});

/** A patrol (`id`) whose home is (col, row) on map `mapId` (null: the overworld) was taken off the map now. */
export function notePatrolFallen(id, col, row, mapId = null, world = gameState.world) {
    if (!isPatrol(id) || !Number.isFinite(col) || !Number.isFinite(row)) return;
    fallen(world)[`${mapId || 'world'}|${col},${row}`] = { id, col, row, mapId: mapId || null, act: ActSystem.getAct() };
}

/** Puts back every patrol that fell in an act before this one, through the world manager (so it is saved, sent to the other players of a shared
 *  world, and stands on the map at once when it is the map in view). Returns how many came back. */
export function respawnPatrols(worldManager, world = gameState.world) {
    const list = world.fallenPatrols;
    if (!list || !worldManager) return 0;
    const act = ActSystem.getAct();
    const here = world.isInterior ? (world.interiorId || null) : null;
    let n = 0;
    for (const [key, f] of Object.entries(list)) {
        if (!f || !(f.act < act) || !MAP_OBJECTS_DEFINITIONS[f.id]) continue;
        // only on the map in view: the overworld's patrols wait for the overworld (its cells are keyed without a map id)
        if ((f.mapId || null) !== here) continue;
        delete list[key];
        const cellKey = worldManager._s ? worldManager._s(f.col, f.row) : null;
        if (cellKey && world.changes && world.changes[cellKey] && world.changes[cellKey] !== f.id) continue;   // something else stands there now
        worldManager.modifyWorld(f.col, f.row, f.id);
        if (worldManager._wanderedFrom && cellKey) worldManager._wanderedFrom.delete(cellKey);   // (it had walked off its home when it fell)
        if (worldManager.getObject) worldManager.getObject(f.col, f.row);   // made at once if its chunk is loaded
        n++;
    }
    return n;
}
