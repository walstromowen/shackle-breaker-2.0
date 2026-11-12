// shared/world/interiorFactory.js
import { INTERIOR_DEFINITIONS } from './interiorDefinitions.js';
import { HouseGenerator } from './generators/houseGenerator.js';
import { CaveGenerator } from './generators/caveGenerator.js';
import { CraftingHouseGenerator } from './generators/craftingHouseGenerator.js';
import { CatacombGenerator } from './generators/catacombGenerator.js';
import { gameState } from '../core/gameState.js';
import { movedNorth, snowHouseResidents, catacombResidents } from '../story/heroes.js';

const GENERATORS = { HOUSE: HouseGenerator, CRAFTING_HOUSE: CraftingHouseGenerator, CAVE: CaveGenerator, CATACOMBS: CatacombGenerator };

/* The places in a world that a story character takes as theirs the first time the player comes upon one (saved with the world; in multiplayer
   the host's world decides, see multiplayerSession):
     strangerHome          the Hooded Stranger's workshop: the first workshop the player walks into (an interior id, the door's cell "col_row")
     strangerDesertHome    where he goes in act 2: the first workshop in a desert village the player walks into in act 2
     nikoliCampfire        Nikoli's camp: the first campfire of the snowy mountains the world puts down near the player ("col,row", WorldManager)
     jaegerCatacomb        where Jaeger waits, posing as Nikoli: the first catacombs the player walks into (an interior id); he stands in its hoard until met
     strangerSnowHome      act 3: the first snowy-mountain crafting house entered once Codey is back, where Mentoras and Codey go (story/heroes.js) */
export const STORY_HOMES = ['strangerHome', 'strangerDesertHome', 'nikoliCampfire', 'jaegerCatacomb', 'strangerSnowHome'];

const hasMilestone = (id) => Array.isArray(gameState.milestones) && gameState.milestones.includes(id);

export class InteriorFactory {
    /** Called with the interior id when this browser picks the Hooded Stranger's workshop (multiplayerSession sends it to the host). */
    static onStrangerHome = null;
    /** Called with (key, id) when this browser claims any of the STORY_HOMES (multiplayerSession: the host decides, and tells everyone). */
    static onHomeClaim = null;

    /** The Hooded Stranger's workshop, if the world has none yet: `id` is the workshop's interior id (its door's cell, "col_row"). The first
     *  workshop the player walks into is his, however far from the spawn it is; once claimed it never changes. */
    static claimStrangerHome(id) {
        const w = gameState.world;
        if (!w || w.strangerHome || !id) return false;
        w.strangerHome = id;
        if (typeof InteriorFactory.onStrangerHome === 'function') InteriorFactory.onStrangerHome(id);
        return true;
    }

    /** Claims one of the STORY_HOMES for this world, if it has none yet. True when this call claimed it. */
    static claimHome(key, id) {
        if (key === 'strangerHome') return InteriorFactory.claimStrangerHome(id);
        const w = gameState.world;
        if (!w || !STORY_HOMES.includes(key) || w[key] || !id) return false;
        w[key] = id;
        if (typeof InteriorFactory.onHomeClaim === 'function') InteriorFactory.onHomeClaim(key, id);
        return true;
    }

    /** Who stands in the workshop `interiorId` (an NPC map object id, or null), from the world's claims and this player's story:
     *    act 1             the Hooded Stranger, in his workshop (the first one entered is claimed for him)
     *    act 2             he has gone to the first desert workshop entered in act 2 (`biomeId` is the village's biome); his old workshop
     *                      holds Nikoli if the player told Nikoli where to look, and stands empty otherwise. Never both in one place. */
    static workshopResident(interiorId, biomeId = null) {
        const w = gameState.world;
        if (!w || !interiorId) return null;
        if (!hasMilestone('act2')) {
            InteriorFactory.claimStrangerHome(interiorId);
            return w.strangerHome === interiorId ? 'HOODED_STRANGER_NPC' : null;
        }
        // his old workshop: Nikoli waits there once told, until he goes north to find Mentoras (act 3)
        if (w.strangerHome === interiorId) return hasMilestone('nikoli_told') && !movedNorth() ? 'NIKOLI_NPC' : null;
        // act 3, Codey back: the snowy house, and whoever this player's story has there (story/heroes.js); a list, placed side by side
        if (movedNorth() && biomeId === 'SNOWY_MOUNTAINS' && w.strangerDesertHome !== interiorId) InteriorFactory.claimHome('strangerSnowHome', interiorId);
        if (w.strangerSnowHome === interiorId) { const who = snowHouseResidents(); return who.length ? who : null; }
        if (biomeId === 'DESERT') InteriorFactory.claimHome('strangerDesertHome', interiorId);
        // the desert workshop: Mentoras, until he has gone north; then only the mark he scratched into the anvil
        if (w.strangerDesertHome === interiorId) return movedNorth() ? 'STRANGER_MARK' : 'HOODED_STRANGER_NPC';
        return null;
    }

    static create(seed, interiorType, interiorId) {
        let type = interiorType, config = INTERIOR_DEFINITIONS[type];

        if (!config) {
            // An unknown type used to turn into a cave, so a house door with a misspelt type dropped you into a cave. Fall back to a house (and say so loudly).
            console.error(`[InteriorFactory] Unknown interior type "${interiorType}": add it to interiorDefinitions.js. Using ABANDONED_HOUSE instead.`);
            type = 'ABANDONED_HOUSE';
            config = INTERIOR_DEFINITIONS[type];
        }

        // The Hooded Stranger (the Shackled quest giver) lives in exactly one village workshop in the world: the first one the player walks
        // into is his (claimStrangerHome), wherever it is, saved with the world, and he is there on every visit; no other workshop ever has him.
        // In multiplayer the host's world decides, however many players there are: the claim goes to the host (onStrangerHome, set by
        // multiplayerSession), whose answer every player takes, and a guest who joins gets it with the world.
        // In act 2 he moves on (workshopResident): to the first desert workshop entered, with Nikoli one step behind him.
        if (type === 'ABANDONED_WORKSHOP' && interiorId) {
            const resident = InteriorFactory.workshopResident(interiorId, gameState.world && gameState.world.interiorBiome);
            if (resident) config = { ...config, questGiver: resident };
        }

        // Jaeger waits in the hoard of the first catacombs entered, for each player until they have met him (milestone jaeger_met)
        if (config.generatorType === 'CATACOMBS' && interiorId) {
            InteriorFactory.claimHome('jaegerCatacomb', interiorId);
            const who = gameState.world && gameState.world.jaegerCatacomb === interiorId ? catacombResidents() : [];
            if (who.length) config = { ...config, storyNpc: who };
        }

        const Generator = GENERATORS[config.generatorType];
        if (!Generator) throw new Error(`[InteriorFactory] ${type} has unknown generatorType "${config.generatorType}" (use HOUSE, CRAFTING_HOUSE, CAVE or CATACOMBS)`);
        return new Generator(seed, type, config, interiorId);
    }
}