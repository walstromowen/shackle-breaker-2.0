import { gameState } from '../../shared/state/gameState.js';
import { QuestModel } from '../../shared/models/questModel.js';
import { QuestDefinitions } from '../../shared/data/questDefinitions.js';

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

    // --- NEW: Run the quest check once after all level-ups are processed ---
    if (leveledUp) {
      this.checkPartyLevelQuests();
    }

    return leveledUp;
  },

  applyLevelUpStats(entity) {
    console.log(`[RPG] ${entity.name} reached Level ${entity.level}!`);
    
    // 1. Grant 1 Unified Skill Point for the player to allocate later
    if (typeof entity.skillPoints === 'undefined') entity.skillPoints = 0;
    entity.skillPoints += 1;
    
    // 2. Base stat growth (Match EntityFactory background scaling)
    if (entity.baseStats && entity.baseStats.maxHp !== undefined) {
      entity.baseStats.maxHp += 2;
    }
    
    // 3. Heal the entity upon level up
    if (entity.maxHp) entity.hp = entity.maxHp;
    if (entity.maxStamina) entity.stamina = entity.maxStamina;
    if (entity.maxInsight) entity.insight = entity.maxInsight;
  },

  // --- NEW: Extracted Quest Logic ---
  checkPartyLevelQuests() {
    Object.keys(gameState.quests.active).forEach(questId => {
      const questDef = QuestDefinitions[questId];
      if (questDef) {
        questDef.objectives.forEach(obj => {
          if (obj.type === 'party_level') {
            const qualifyingMembersCount = gameState.party.members.filter(
              m => (m.level || 1) >= obj.targetLevel
            ).length;
            
            const currentProgress = gameState.quests.active[questId].progress[obj.id] || 0;
            const diff = qualifyingMembersCount - currentProgress;
            
            if (diff > 0) {
              const didUpdate = QuestModel.updateProgress(gameState, questId, obj.id, diff);
              if (didUpdate && QuestModel.checkCompletion(gameState, questId)) {
                console.log(`[Quest System] Quest Complete: ${questDef.name}!`);
              }
            }
          }
        });
      }
    });
  }
};