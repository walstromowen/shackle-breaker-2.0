export class TargetingResolver {
    /**
     * Resolves the final list of targets for an action.
     * @param {Object} action - The ability being used.
     * @param {Object} actor - The combatant performing the action.
     * @param {Object|Array|String} primaryTarget - The directly selected target(s), or the string 'ALL'.
     * @param {Object} battleState - The current state of the battle from the BattleController.
     * @returns {Array} An array of valid, living combatant objects to apply effects to.
     */
    static resolve(action, actor, primaryTarget, battleState) {
        const scope = action.targeting?.scope || 'enemy';
        
        // Pre-filter the living combatants
        const livingEnemies = battleState.activeEnemies.filter(e => e && !e.isDead());
        const livingParty = battleState.activeParty.filter(p => p && !p.isDead());

        if (actor.isDead()) return [];

        // ----------------------------------------------------------------------
        // DETERMINE TOTAL HITS (Handles both 'count: 3' and 'multihit: {min, max}')
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
                const fallbackPool = scope === 'enemy' ? livingEnemies : livingParty;

                // SCENARIO A: Split Multi-Target (Magic Missile via UI Array)
                // If your UI allows selecting multiple distinct targets, it passes an array.
                if (Array.isArray(primaryTarget)) {
                    const validTargets = primaryTarget.filter(t => t && !t.isDead());
                    if (validTargets.length > 0) return validTargets; 
                }

                // SCENARIO B: Single-Target Multi-Hit (Flurry)
                let finalTarget = primaryTarget;

                // Fallback if target is dead/invalid
                if (!finalTarget || finalTarget === 'ALL' || finalTarget.isDead()) {
                    if (fallbackPool.length === 0) return [];
                    finalTarget = fallbackPool[0]; 
                }

                // Returns an array like: [Target A, Target A, Target A]
                return Array(hitCount).fill(finalTarget);
            }

            case 'all_enemies':
                // Optional: If an AoE has a multihit, it hits the whole group X times
                if (hitCount > 1) {
                    const multiAoE = [];
                    for (let i = 0; i < hitCount; i++) multiAoE.push(...livingEnemies);
                    return multiAoE;
                }
                return livingEnemies;

            case 'all_allies':
                if (hitCount > 1) {
                    const multiAoE = [];
                    for (let i = 0; i < hitCount; i++) multiAoE.push(...livingParty);
                    return multiAoE;
                }
                return livingParty;

            case 'random_enemy': {
                // SCENARIO C: Split Random Multi-Hit (Wild Swing / Auto-Split Magic Missile)
                if (livingEnemies.length === 0) return [];
                const randomTargets = [];
                for (let i = 0; i < hitCount; i++) {
                    const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                    randomTargets.push(randomEnemy);
                }
                // Returns an array like: [Target C, Target A, Target B]
                return randomTargets;
            }

            case 'random_ally': {
                if (livingParty.length === 0) return [];
                const randomTargets = [];
                for (let i = 0; i < hitCount; i++) {
                    const randomAlly = livingParty[Math.floor(Math.random() * livingParty.length)];
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