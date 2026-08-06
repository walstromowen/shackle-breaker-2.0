import { SpawnTableDefinitions } from '../../data/spawnTableDefinitions.js';
import { SpawnTableModel } from '../../models/spawnTableModel.js';

export class SpawnTableFactory {
    static generateBattle(tableId, difficulty = 'normal') {
        const table = SpawnTableDefinitions[tableId];
        if (!table || table.type !== 'faction_pool') {
            console.error(`SpawnTableFactory: Table '${tableId}' not found or invalid type.`);
            return new SpawnTableModel([]);
        }

        // 1. Roll to see which Faction we are fighting
        const factionPool = this._rollWeighted(table.pools);
        if (!factionPool) return new SpawnTableModel([]);

        // 2. Determine party size based on difficulty
        const diffSettings = factionPool.difficultySettings[difficulty] || factionPool.difficultySettings['normal'];
        const partySize = this._getRandomInt(diffSettings.minSize, diffSettings.maxSize);

        // 3. Generate the specific enemies
        const generatedEnemies = [];
        for (let i = 0; i < partySize; i++) {
            const rolledMember = this._rollWeighted(factionPool.members);
            const enemyConfig = this._applyModifiers(rolledMember);
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