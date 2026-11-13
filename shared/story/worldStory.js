// shared/story/worldStory.js: the story's state that belongs to the WORLD, not to a player (multiplayer option 3, like Dark Souls): where the story's
// characters are and what has become of them is the same for everyone in a world, and it is the host's world that holds it. A guest's choices change
// the host's world, and are not carried home to their own.
//
// A world flag is kept in gameState.world.changes as "story:<id>": true, so it is saved with the world and sent to every player like any other change
// to the world (worldSync). For compatibility, and for the player's own world, a player's own milestones and finished quests still count when the
// world is theirs (single player, or the host): a save from before the flags moved needs no migration. ActSystem.hasMilestone / grantMilestone
// route these ids here, so every story check (`has_milestone` conditions, the acts, story/heroes.js) asks the world.
import { gameState } from '../core/gameState.js';
import { worldSync } from '../core/worldSync.js';

export const WORLD_FLAGS = new Set([
    'act2', 'act3',                      // the acts: the world's blood moon, its harder enemies
    'stranger_met',                      // someone has met the Hooded Stranger (what Nikoli and Jaeger can be told)
    'codey_back',                        // Codey has been brought back to Mentoras (act 3: they go north)
    'nikoli_met', 'nikoli_told',         // Nikoli
    'jaeger_met', 'jaeger_told',         // Jaeger
    'mentoras_taken', 'pursuer_done',    // "pursuer": Jaeger takes Mentoras; he is freed
    'friends_met', 'brothers_done',      // "friends" / "brothers": the reunion; Jaeger beaten in the snowy house
    'brothers_sword_taken', 'brothers_sword_shown'   // "ashes": the sword taken from the cold campfire; shown to Mentoras
]);

const KEY = (id) => `story:${id}`;
const questDone = (state, q) => Array.isArray(state.quests?.completed) && state.quests.completed.includes(q);
// flags older saves never recorded, read from what they did record (only for the player's own world)
const LEGACY = {
    stranger_met: (s) => questDone(s, 'shackled_stranger'),
    codey_back: (s) => questDone(s, 'codey3')
};

export const isWorldFlag = (id) => WORLD_FLAGS.has(id);

/** Is this flag set in the world being played? */
export function hasWorldFlag(id, state = gameState) {
    const changes = state.world && state.world.changes;
    if (changes && changes[KEY(id)] === true) return true;
    if (!worldSync.ownsWorld) return false;
    if (Array.isArray(state.milestones) && state.milestones.includes(id)) return true;
    return !!(LEGACY[id] && LEGACY[id](state));
}

/** Sets a flag in the world being played (and, in the player's own world, among their milestones too). True the first time. */
export function setWorldFlag(id, state = gameState) {
    const first = !hasWorldFlag(id, state);
    if (!state.world) state.world = {};
    if (!state.world.changes) state.world.changes = {};
    state.world.changes[KEY(id)] = true;
    if (worldSync.ownsWorld) {
        if (!Array.isArray(state.milestones)) state.milestones = [];
        if (!state.milestones.includes(id)) state.milestones.push(id);
    }
    if (worldSync.onLocalChange) worldSync.onLocalChange(KEY(id), true);
    return first;
}
