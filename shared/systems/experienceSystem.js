export const ExperienceSystem = {
    BASE_XP: 100,
    GROWTH_RATE: 1.04,
    CURVE_POWER: 2,

    getMaxXP(level) {
        const exponential = Math.pow(this.GROWTH_RATE, level);
        const polynomial = Math.pow(level, this.CURVE_POWER);
        return Math.floor(this.BASE_XP * polynomial * exponential / 4);
    },

    addXp(entity, amount) {
        if (typeof entity.xp === 'undefined') entity.xp = 0;
        if (typeof entity.skillPoints === 'undefined') entity.skillPoints = 0;
        if (!entity.maxXp) entity.maxXp = this.getMaxXP(entity.level);

        entity.xp += amount;
        
        let leveledUp = false;
        while (entity.xp >= entity.maxXp) {
            if (entity.level >= 150) {
                entity.xp = entity.maxXp;
                break;
            }

            entity.xp -= entity.maxXp;
            entity.level++;
            entity.maxXp = this.getMaxXP(entity.level);
            
            this.applyLevelUpStats(entity);
            leveledUp = true;
        }
        return leveledUp;
    },

    applyLevelUpStats(entity) {
        console.log(`[RPG] ${entity.name} reached Level ${entity.level}!`);
        
        // 1. Grant Skill Points
        if (typeof entity.skillPoints === 'undefined') entity.skillPoints = 0;
        entity.skillPoints += 1;

        // 2. Upgrade the raw base stats
        if (entity.baseStats) {
            entity.baseStats.maxHp += 10 + Math.floor(entity.level * 0.5);
            entity.baseStats.maxStamina += 2;
            entity.baseStats.maxInsight += 1;
            
            // Optional: Heal the entity upon leveling up using the NEW calculated max
            entity.hp = entity.maxHp; 
        } else {
            console.warn(`[RPG] Level Up Error: Could not find baseStats for ${entity.name}`);
        }
    }
    
};