// shared/world/interiorFactory.js
import { INTERIOR_DEFINITIONS } from './interiorDefinitions.js';
import { HouseGenerator } from './generators/houseGenerator.js';
import { CaveGenerator } from './generators/caveGenerator.js';
import { CraftingHouseGenerator } from './generators/craftingHouseGenerator.js';
import { CatacombGenerator } from './generators/catacombGenerator.js';
import { gameState } from '../core/gameState.js';

const GENERATORS = { HOUSE: HouseGenerator, CRAFTING_HOUSE: CraftingHouseGenerator, CAVE: CaveGenerator, CATACOMBS: CatacombGenerator };

export class InteriorFactory {
    /** Called with the interior id when this browser picks the Hooded Stranger's workshop (multiplayerSession sends it to the host). */
    static onStrangerHome = null;

    static create(seed, interiorType, interiorId) {
        let type = interiorType, config = INTERIOR_DEFINITIONS[type];

        if (!config) {
            // An unknown type used to turn into a cave, so a house door with a misspelt type dropped you into a cave. Fall back to a house (and say so loudly).
            console.error(`[InteriorFactory] Unknown interior type "${interiorType}": add it to interiorDefinitions.js. Using ABANDONED_HOUSE instead.`);
            type = 'ABANDONED_HOUSE';
            config = INTERIOR_DEFINITIONS[type];
        }

        // The Hooded Stranger (the Shackled quest giver) lives in exactly one village workshop in the world: the first one walked into
        // becomes his (world.strangerHome, saved with the world), and he is there on every visit; no other workshop ever has him.
        // In multiplayer the host's world decides, however many players there are: the claim goes to the host (onStrangerHome, set by
        // multiplayerSession), whose answer every player takes, and a guest who joins gets it with the world.
        if (type === 'ABANDONED_WORKSHOP' && interiorId) {
            const w = gameState.world;
            if (w && !w.strangerHome) {
                w.strangerHome = interiorId;
                if (typeof InteriorFactory.onStrangerHome === 'function') InteriorFactory.onStrangerHome(interiorId);
            }
            if (w && w.strangerHome === interiorId) config = { ...config, questGiver: 'HOODED_STRANGER_NPC' };
        }

        const Generator = GENERATORS[config.generatorType];
        if (!Generator) throw new Error(`[InteriorFactory] ${type} has unknown generatorType "${config.generatorType}" (use HOUSE, CRAFTING_HOUSE, CAVE or CATACOMBS)`);
        return new Generator(seed, type, config, interiorId);
    }
}