import { ENTITIES } from '../../blueprints/entities.js';

export const createEntity = (blueprintId, level = 1, customName = null) => {
    const bp = ENTITIES[blueprintId];
    if (!bp) throw new Error(`Entity ${blueprintId} not found`);

    return {
        uid: crypto.randomUUID(),
        name: customName || bp.name, // Use custom name (for players/companions)
        type: bp.type,              // PLAYER, COMPANION, or ENEMY
        level: level,
        hp: bp.baseHp * level,
        maxHp: bp.baseHp * level,
        stats: {
            atk: bp.baseAtk * level,
            // ... other stats
        },
        inventory: [],
        statusEffects: []
    };
};