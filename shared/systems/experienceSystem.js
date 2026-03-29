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

        // 2. Heal the entity (Base stats no longer grow automatically)
        if (entity.maxHp) entity.hp = entity.maxHp; 
        if (entity.maxStamina) entity.stamina = entity.maxStamina;
        if (entity.maxInsight) entity.insight = entity.maxInsight;
    }
};