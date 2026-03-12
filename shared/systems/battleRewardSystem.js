import { gameState } from '../state/gameState.js';
import { ExperienceSystem } from './experienceSystem.js';
import { InventorySystem } from './inventorySystem.js';

export class BattleRewardSystem {
    /**
     * Processes all XP, currency, and loot drops, applying them to the game state.
     * @param {Array} partyRoster - Array of CombatantModels
     * @param {Array} enemyRoster - Array of CombatantModels
     * @returns {Array<string>} An array of formatted UI messages describing the rewards.
     */
    static processVictory(partyRoster, enemyRoster) {
        let totalXp = 0;
        let totalCurrency = 0;
        const droppedItems = [];
        const messages = [];

        // 1. Calculate Totals from Enemies
        enemyRoster.forEach(enemy => {
            totalXp += this._calculateEnemyXp(enemy);
            
            const currReward = enemy.originalEntity.currencyReward || { min: 0, max: 0 };
            if (currReward.max > 0) {
                totalCurrency += Math.floor(Math.random() * (currReward.max - currReward.min + 1)) + currReward.min;
            }
            
            (enemy.originalEntity.lootTable || []).forEach(loot => {
                if (Math.random() <= loot.dropRate) droppedItems.push(loot.id);
            });
        });

        messages.push(`Victory! The party gained ${totalXp} XP.`);

        // 2. Distribute XP to Surviving Party Members
        const aliveParty = partyRoster.filter(m => !m.isDead());
        const xpPerMember = Math.floor(totalXp / Math.max(1, aliveParty.length));

        aliveParty.forEach(member => {
            if (ExperienceSystem.addXp(member.originalEntity, xpPerMember)) {
                messages.push(`${member.name} reached Level ${member.originalEntity.level}!`);
            }
        });

        // 3. Distribute Currency
        if (totalCurrency > 0) {
            gameState.party.currency = (gameState.party.currency || 0) + totalCurrency;
            messages.push(`The party found ${totalCurrency} currency!`);
        }

        // 4. Distribute Loot
        if (droppedItems.length > 0) {
            const itemCounts = droppedItems.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
            const lootStrings = Object.entries(itemCounts).map(([id, count]) => {
                InventorySystem.addItem(id, count);
                const readableName = id.replace(/_/g, ' '); 
                return count > 1 ? `${readableName} x${count}` : readableName;
            });
            messages.push(`Loot recovered: ${lootStrings.join(', ')}`);
        } else if (totalCurrency === 0) {
            messages.push(`The enemies left nothing useful behind.`);
        }

        return messages;
    }

    static _calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        
        const sumStats = (statObj) => statObj ? Object.values(statObj).reduce((sum, val) => sum + val, 0) : 0;
        const statSum = enemy.maxHp + (enemy.stats.speed ?? 10) + sumStats(enemy.stats.attack) + sumStats(enemy.stats.defense);
       
        return Math.floor(statSum * 0.15) + ((enemy.originalEntity.level || 1) * 10);
    }
}