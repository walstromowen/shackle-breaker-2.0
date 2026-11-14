// shared/story/storyAmbush.js: story scenes that spring on the player out in the open, as an ambush does, when their quests say it is time
// (BiomeModel.getEncounter asks before its own roll).
//
//   dry_kraken_ambush   "Behind the Mirage" (codey3): once the rest of it is done (a miragewright, the level) and the Dry Kraken is not, any step on the open sand of the
//                       desert may wake it (story/encounters/story/codey.js). It holds Codey. A lost fight leaves it waiting for the next step.
import { gameState } from '../core/gameState.js';
import { QuestDefinitions } from './questDefinitions.js';

// the chance, each step, that the sand gives way: about one step in thirty-five, so it comes soon and without warning
export const KRAKEN_AMBUSH_CHANCE = 1 / 35;

const progressOf = (questId, objectiveId) => {
    const q = gameState.quests && gameState.quests.active && gameState.quests.active[questId];
    return q ? ((q.progress && q.progress[objectiveId]) || 0) : null;
};
const amountOf = (questId, objectiveId) => (QuestDefinitions[questId].objectives.find(o => o.id === objectiveId) || {}).amount || 1;

/** True while the Dry Kraken lies in wait for this player: codey3 taken, everything else it asks done (the miragewright, the level), the kraken not
 *  yet dead, and the player out on the sand. */
export function krakenAmbushDue(biomeId) {
    if (biomeId !== 'DESERT' || (gameState.world && gameState.world.isInterior)) return false;
    if (progressOf('codey3', 'obj_codey_found') === null) return false;
    for (const o of QuestDefinitions.codey3.objectives) {
        if (o.id === 'obj_codey_found') continue;
        if (progressOf('codey3', o.id) < (o.amount || 1)) return false;
    }
    return progressOf('codey3', 'obj_codey_found') < amountOf('codey3', 'obj_codey_found');
}

/** The story scene that springs on this step, if any: { id } (BiomeModel.getEncounter). */
export function storyAmbush(biomeId) {
    if (krakenAmbushDue(biomeId) && Math.random() < KRAKEN_AMBUSH_CHANCE) return { id: 'dry_kraken_ambush' };
    return null;
}
