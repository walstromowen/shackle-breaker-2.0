import { SpawnTableDefinitions } from './spawnTableDefinitions.js';
import { SpawnTableModel } from './spawnTableModel.js';
import { ActSystem } from '../story/actSystem.js';

/* A bigger party meets bigger groups. EXTRA_ENEMIES[n - 1] is added to both ends of the spawn table's group size when n party members can
   fight (alive, up to the 3 that fit on the field); a fraction is a chance of one more (1.5 = one or two), and a lone fighter meets one fewer
   (never less than one). Without it two companions turned every fight into a rout: 99% wins (tools/playthroughSim.mjs, PARTY=3); with it an
   ordinary fight is usually won (about 95% for a party) but costs about a quarter of the party's HP, so three or so in a row without
   healing wear a party down.
   A party of several players (multiplayer) is harder still: every player beyond the first adds EXTRA_ENEMIES_PER_PLAYER to the group, and
   LEVELS_PER_PLAYER levels to every enemy in the fight (sceneManager START_BATTLE), since they bring reserves and the whole group's abilities. */
export const PARTY_SCALING = { EXTRA_ENEMIES: [-1, 0, 1.5], MAX_FIGHTERS: 3, EXTRA_ENEMIES_PER_PLAYER: 1, LEVELS_PER_PLAYER: 1 };

export class SpawnTableFactory {
    /* `fighters`: how many of the party can fight at once (1-3); `players`: how many players share the fight. See PARTY_SCALING.
       Without them the table's own group size is used as written. */
    static generateBattle(tableId, difficulty = 'normal', { fighters, players = 1 } = {}, scaling = PARTY_SCALING) {
        const table = SpawnTableDefinitions[tableId];
        if (!table || table.type !== 'faction_pool') {
            console.error(`SpawnTableFactory: Table '${tableId}' not found or invalid type.`);
            return new SpawnTableModel([]);
        }

        // 1. Roll to see which Faction we are fighting. A pool (or a member) can be limited to some acts with `minAct` / `maxAct` (story/actDefinitions.js):
        //    act 2 adds its own enemies to the same tables. A table that leaves nothing for the current act is used whole, so it can never come up empty.
        const actPools = table.pools.filter(p => ActSystem.isAvailable(p) && p.members.some(m => ActSystem.isAvailable(m)));
        const factionPool = this._rollWeighted(actPools.length ? actPools : table.pools);
        if (!factionPool) return new SpawnTableModel([]);
        const actMembers = factionPool.members.filter(m => ActSystem.isAvailable(m));
        const members = actMembers.length ? actMembers : factionPool.members;

        // 2. Determine party size based on difficulty
        const diffSettings = factionPool.difficultySettings[difficulty] || factionPool.difficultySettings['normal'];
        const want = (fighters ? scaling.EXTRA_ENEMIES[Math.min(scaling.MAX_FIGHTERS, Math.max(1, fighters)) - 1] || 0 : 0)
            + Math.max(0, players - 1) * (scaling.EXTRA_ENEMIES_PER_PLAYER || 0);
        const extra = Math.floor(want) + (Math.random() < want - Math.floor(want) ? 1 : 0);
        const lo = Math.max(1, diffSettings.minSize + extra);
        const partySize = this._getRandomInt(lo, Math.max(lo, diffSettings.maxSize + extra));

        // 3. Generate the specific enemies
        const generatedEnemies = [];
        for (let i = 0; i < partySize; i++) {
            const rolledMember = this._rollWeighted(members);
            const enemyConfig = this._applyModifiers(rolledMember);
            // The shackled are the cursed: every one of them is born at the top of the corruption scale (see CORRUPTION in core/constants.js)
            if (factionPool.factionId === 'shackled') enemyConfig.baseStats = { corruption: 100, naturalCorruption: true };
            generatedEnemies.push(enemyConfig);
        }

        return new SpawnTableModel(generatedEnemies);
    }
    
    static generateEncounter(tableId, timeOfDay) {
        const table = SpawnTableDefinitions[tableId];
        if (!table || table.type !== 'time_weighted') return new SpawnTableModel([]);
        
        const validPools = table.pools.filter(p => !p.allowedTimes || p.allowedTimes.includes(timeOfDay));
        if (validPools.length === 0) return new SpawnTableModel([]);
        
        const rolledEncounter = this._rollWeighted(validPools);
        if (!rolledEncounter) return new SpawnTableModel([]);
        
        return new SpawnTableModel([], rolledEncounter.id);
    }

    // ==========================================
    // INTERNAL HELPER METHODS
    // ==========================================
    static _applyModifiers(memberData) {
        // Start with the base ID
        const config = { id: memberData.id };
        const mods = memberData.modifiers;

        if (!mods) return config;

        // Apply Level Offset
        if (mods.levelOffset && Math.random() <= mods.levelOffset.chance) {
            config.levelOffset = this._getRandomInt(mods.levelOffset.min, mods.levelOffset.max);
        }

        // Apply Equipment
        if (mods.equipment && mods.equipment.length > 0) {
            config.equipment = {};
            mods.equipment.forEach(eqModifier => {
                if (Math.random() <= eqModifier.chance) {
                    const randomItem = eqModifier.items[Math.floor(Math.random() * eqModifier.items.length)];
                    config.equipment[eqModifier.slot] = randomItem;
                }
            });
        }

        // Apply Abilities (extra ones this enemy can use, each with its own chance)
        if (mods.abilities && mods.abilities.length > 0) {
            config.abilities = [];
            mods.abilities.forEach(abilityModifier => {
                if (Math.random() <= abilityModifier.chance) {
                    config.abilities.push(abilityModifier.id);
                }
            });
        }

        // Apply Traits
        if (mods.traits && mods.traits.length > 0) {
            config.traits = [];
            mods.traits.forEach(traitModifier => {
                if (Math.random() <= traitModifier.chance) {
                    config.traits.push(traitModifier.id);
                }
            });
        }

        return config;
    }

    static _rollWeighted(pool) {
        if (!pool || pool.length === 0) return null;
        const totalWeight = pool.reduce((sum, entry) => sum + (entry.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const entry of pool) {
            random -= (entry.weight || 1);
            if (random <= 0) return entry;
        }
        return pool[0];
    }

    static _getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}