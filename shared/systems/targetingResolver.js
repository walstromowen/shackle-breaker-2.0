export class TargetingResolver { 
    static resolve(action, actor, primaryTarget, battleState, allowDeadActor = false) { 
        const scope = action.targeting?.scope || 'enemy'; 
        
        const livingEnemies = battleState.activeEnemies.filter(e => e && !e.isDead()); 
        const livingParty = battleState.activeParty.filter(p => p && !p.isDead()); 
        
        if (actor.isDead() && !allowDeadActor) return []; 
        
        const isParty = actor.team === 'party'; 
        const actorAllies = isParty ? livingParty : livingEnemies; 
        const actorEnemies = isParty ? livingEnemies : livingParty; 
        const allLiving = [...livingParty, ...livingEnemies]; 
        
        let hitCount = action.targeting?.count || 1; 
        if (action.multihit) { 
            const min = action.multihit.min || 1; 
            const max = action.multihit.max || 1; 
            hitCount = Math.floor(Math.random() * (max - min + 1)) + min; 
        } 

        // ---> NEW: Tag & Reach Filters to prevent Random targets from wasting hits! <---
        const isTargetValidForRandom = (t) => {
            // Filter 1: Immunity
            if (action.tags && t.checkImmunityToTags && t.checkImmunityToTags(action.tags)) return false;
            
            // Filter 2: Reach
            const isMelee = action.range === 'melee';
            if (isMelee && t.hasTag && t.hasTag('flying')) {
                const canReach = actor.hasTag && (actor.hasTag('flying') || actor.hasTag('reach'));
                if (!canReach) return false;
            }
            
            return true;
        };

        switch (scope) { 
            case 'self': 
                return Array(hitCount).fill(actor); 
                
            case 'any': 
            case 'enemy': 
            case 'ally': { 
                let fallbackPool; 
                if (scope === 'enemy') fallbackPool = actorEnemies; 
                else if (scope === 'ally') fallbackPool = actorAllies; 
                else fallbackPool = allLiving; 
                
                if (Array.isArray(primaryTarget)) { 
                    const validTargets = primaryTarget.filter(t => t && !t.isDead()); 
                    if (validTargets.length > 0) return validTargets; 
                } 
                
                let finalTarget = primaryTarget; 
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
                // Only select enemies that are actually hitable!
                const validEnemies = actorEnemies.filter(isTargetValidForRandom);
                if (validEnemies.length === 0) return []; 
                
                const randomTargets = []; 
                for (let i = 0; i < hitCount; i++) { 
                    const randomEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)]; 
                    randomTargets.push(randomEnemy); 
                } 
                return randomTargets; 
            } 
            
            case 'random_ally': { 
                // Only select allies that are actually hitable!
                const validAllies = actorAllies.filter(isTargetValidForRandom);
                if (validAllies.length === 0) return []; 
                
                const randomTargets = []; 
                for (let i = 0; i < hitCount; i++) { 
                    const randomAlly = validAllies[Math.floor(Math.random() * validAllies.length)]; 
                    randomTargets.push(randomAlly); 
                } 
                return randomTargets; 
            } 
            
            case 'full_ally_party': { 
                const fullLivingParty = (battleState.party || battleState.activeParty).filter(p => p && !p.isDead()); 
                const fullLivingEnemies = (battleState.enemies || battleState.activeEnemies).filter(e => e && !e.isDead()); 
                const targetPool = isParty ? fullLivingParty : fullLivingEnemies; 
                
                if (hitCount > 1) { 
                    const multiAoE = []; 
                    for (let i = 0; i < hitCount; i++) multiAoE.push(...targetPool); 
                    return multiAoE; 
                } 
                return targetPool; 
            } 
            
            case 'everyone': 
                return allLiving; 
                
            default: 
                console.warn(`[TargetingResolver] Unknown targeting scope: ${scope}. Defaulting to primary target.`); 
                return primaryTarget && primaryTarget !== 'ALL' && !primaryTarget.isDead() ? [primaryTarget] : []; 
        } 
    } 
}