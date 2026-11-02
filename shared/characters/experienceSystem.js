import { gameState } from '../core/gameState.js';
import { QuestModel } from '../story/questModel.js';
import { QuestDefinitions } from '../story/questDefinitions.js';

export const MAX_LEVEL = 150;

/*
 * THE XP CURVE. The number of fights a level takes is the design knob; XP is just that many fights' worth of XP.
 *   Level 20 (where act 2 starts) comes after about 50 fights, and the last levels take about 6 each: level 150 after about 600.
 * A "fight" here is two enemies of the player's own level (enemies are built at the party's highest level: sceneManager START_BATTLE).
 *   XP to the next level = what one such enemy is worth x 2 enemies x FIGHTS_PER_LEVEL(level)
 * What an enemy is worth is battleRewardSystem._calculateEnemyXp (its stats x 0.15 + 10 per level). `enemyXp` below is a straight-line fit of it
 * (close from level 1 to 150; backend/test/scaling.test.js checks that it stays that way), so changing an enemy's stats does not
 * quietly change how long a level takes. The party shares a fight's XP between its living members.
 */
export const XP_CURVE = {
    FIGHTS_PER_LEVEL_FIRST: 2,     // fights a level takes at level 1
    FIGHTS_PER_LEVEL_LAST: 6,      // ... and at MAX_LEVEL
    ENEMIES_PER_FIGHT: 2,
    ENEMY_XP_BASE: 30,
    ENEMY_XP_PER_LEVEL: 13
};

/* A successful encounter roll: 15% of a level at DC 12 (scaled by DC / 12, at most x1.5): about a third of a fight's XP */
export const ROLL_XP = { SHARE: 0.15, BASE_DC: 12, MAX_HARDNESS: 1.5 };

export const ExperienceSystem = {
  /** About what an enemy of this level is worth in XP (see the note above). */
  enemyXp(level) {
    return XP_CURVE.ENEMY_XP_BASE + XP_CURVE.ENEMY_XP_PER_LEVEL * level;
  },

  fightsPerLevel(level) {
    const t = Math.min(1, Math.max(0, (level - 1) / (MAX_LEVEL - 1)));
    return XP_CURVE.FIGHTS_PER_LEVEL_FIRST + (XP_CURVE.FIGHTS_PER_LEVEL_LAST - XP_CURVE.FIGHTS_PER_LEVEL_FIRST) * t;
  },

  getMaxXP(level) {
    return Math.floor(this.enemyXp(level) * XP_CURVE.ENEMIES_PER_FIGHT * this.fightsPerLevel(level));
  },

  /**
   * What a successful encounter roll is worth: the only XP an encounter gives (EncounterController.executeLogic awards it to whoever rolled).
   * A share of the XP the roller's level takes, so it is worth the same at level 1 and level 100: ROLL_XP.SHARE of a level against
   * DC 12, more against a harder DC and less against an easy one (nothing against DC 0, which cannot fail).
   */
  rollXp(level, dc) {
    const hardness = Math.min(ROLL_XP.MAX_HARDNESS, Math.max(0, (dc || 0) / ROLL_XP.BASE_DC));
    return Math.round(this.getMaxXP(Math.max(1, level || 1)) * ROLL_XP.SHARE * hardness);
  },

  /** A reward written for the early game (an encounter's "5 XP") grows with the level, as an enemy's XP does: x1 at level 1, x20 at level 100. */
  scaleReward(amount, level) {
    return Math.max(1, Math.round(amount * this.enemyXp(level || 1) / this.enemyXp(1)));
  },

  addXp(entity, amount) {
    if (typeof entity.xp === 'undefined') entity.xp = 0;
    if (typeof entity.skillPoints === 'undefined') entity.skillPoints = 0;
    
    entity.maxXp = this.getMaxXP(entity.level);   // always from the curve, so a save made under an older curve picks up the new one
    
    entity.xp += amount;
    let leveledUp = false;

    while (entity.xp >= entity.maxXp) {
      if (entity.level >= MAX_LEVEL) {
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