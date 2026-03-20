export class TargetingResolver {
    // ---> NEW: Added 'allowDeadActor = false' to the parameters here! <---
    static resolve(action, actor, primaryTarget, battleState, allowDeadActor = false) {
        const scope = action.targeting?.scope || 'enemy';
        
        // Pre-filter the living combatants
        const livingEnemies = battleState.activeEnemies.filter(e => e && !e.isDead());
        const livingParty = battleState.activeParty.filter(p => p && !p.isDead());

        // Now JS knows what allowDeadActor is!
        if (actor.isDead() && !allowDeadActor) return [];

        // Define pools relative to the ACTOR's perspective
        const isParty = actor.team === 'party';
        const actorAllies = isParty ? livingParty : livingEnemies;
        const actorEnemies = isParty ? livingEnemies : livingParty;

        // ----------------------------------------------------------------------
        // DETERMINE TOTAL HITS 
        // ----------------------------------------------------------------------
        let hitCount = action.targeting?.count || 1;
        if (action.multihit) {
            const min = action.multihit.min || 1;
            const max = action.multihit.max || 1;
            hitCount = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        switch (scope) {
            case 'self':
                return Array(hitCount).fill(actor);

            case 'enemy':
            case 'ally': {
                const fallbackPool = scope === 'enemy' ? actorEnemies : actorAllies;

                if (Array.isArray(primaryTarget)) {
                    const validTargets = primaryTarget.filter(t => t && !t.isDead());
                    if (validTargets.length > 0) return validTargets; 
                }

                let finalTarget = primaryTarget;

                // --> NEW: Validate the dummy target passed by auto-queue traits!
                // If target is the actor but scope requires an enemy, invalidate it.
                if (finalTarget && !Array.isArray(finalTarget) && finalTarget !== 'ALL') {
                    if (!fallbackPool.includes(finalTarget)) {
                        finalTarget = null;
                    }
                }

                if (!finalTarget || finalTarget === 'ALL' || finalTarget.isDead()) {
                    if (fallbackPool.length === 0) return [];
                    finalTarget = fallbackPool[0]; 
                }

                return Array(hitCount).fill(finalTarget);
            }

            case 'all_enemies':
                if (hitCount > 1) {
                    const multiAoE = [];
                    for (let i = 0; i < hitCount; i++) multiAoE.push(...actorEnemies);
                    return multiAoE;
                }
                return actorEnemies;

            case 'all_allies':
                if (hitCount > 1) {
                    const multiAoE = [];
                    for (let i = 0; i < hitCount; i++) multiAoE.push(...actorAllies);
                    return multiAoE;
                }
                return actorAllies;

            case 'random_enemy': {
                if (actorEnemies.length === 0) return [];
                const randomTargets = [];
                for (let i = 0; i < hitCount; i++) {
                    const randomEnemy = actorEnemies[Math.floor(Math.random() * actorEnemies.length)];
                    randomTargets.push(randomEnemy);
                }
                return randomTargets;
            }

            case 'random_ally': {
                if (actorAllies.length === 0) return [];
                const randomTargets = [];
                for (let i = 0; i < hitCount; i++) {
                    const randomAlly = actorAllies[Math.floor(Math.random() * actorAllies.length)];
                    randomTargets.push(randomAlly);
                }
                return randomTargets;
            }
            
            case 'everyone': 
                return [...livingEnemies, ...livingParty];

            default:
                console.warn(`[TargetingResolver] Unknown targeting scope: ${scope}. Defaulting to primary target.`);
                return primaryTarget && primaryTarget !== 'ALL' && !primaryTarget.isDead() ? [primaryTarget] : [];
        }
    }
}