import { gameState } from '../state/gameState.js';
import { ExperienceSystem } from './experienceSystem.js';
import { InventorySystem } from './inventorySystem.js';
import { LootTableFactory } from './factories/lootTableFactory.js';

export class BattleRewardSystem {
    /**
     * Processes all XP, currency, and loot drops, applying them to the game state.
     * @param {Array} partyRoster - Array of CombatantModels
     * @param {Array} enemyRoster - Array of CombatantModels
     * @param {Array} battleLedger - Array of battle events (e.g., kills, ability uses)
     * @returns {Array<string>} An array of formatted UI messages describing the rewards.
     */
    static processVictory(partyRoster, enemyRoster, battleLedger = []) {
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

            // --- Process Loot Table ID via Factory ---
            const lootId = enemy.originalEntity.lootTableId;
            if (lootId) {
                const generatedLoot = LootTableFactory.generateLoot(lootId, 1, 0);
                if (generatedLoot && generatedLoot.items) {
                    generatedLoot.items.forEach(item => {
                        const itemId = typeof item === 'string' ? item : item.id;
                        const quantity = item.qty || 1;
                        for (let i = 0; i < quantity; i++) {
                            droppedItems.push(itemId);
                        }
                    });
                }
            }
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
            const itemCounts = droppedItems.reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {});

            const lootStrings = Object.entries(itemCounts).map(([id, count]) => {
                InventorySystem.addItem(id, count);
                const readableName = id.replace(/_/g, ' ');
                return count > 1 ? `${readableName} x${count}` : readableName;
            });
            messages.push(`Loot recovered: ${lootStrings.join(', ')}`);
        } else if (totalCurrency === 0) {
            messages.push(`The enemies left nothing useful behind.`);
        }

        // 5. Process Trait Rewards from the Ledger
        if (battleLedger && battleLedger.length > 0) {
            const traitMessages = this._processTraitRewards(battleLedger, partyRoster, enemyRoster);
            messages.push(...traitMessages);
        }

        return messages;
    }

    static _calculateEnemyXp(enemy) {
        if (enemy.originalEntity.xpReward) return enemy.originalEntity.xpReward;
        
        const sumStats = (statObj) => statObj ? Object.values(statObj).reduce((sum, val) => sum + val, 0) : 0;
        const statSum = enemy.maxHp + (enemy.stats.speed ?? 10) + sumStats(enemy.stats.attack) + sumStats(enemy.stats.defense);
        return Math.floor(statSum * 0.15) + ((enemy.originalEntity.level || 1) * 10);
    }

    static _processTraitRewards(battleLedger, partyRoster, enemyRoster) {
        const messages = [];

        const tryAwardTrait = (partyMember, sourceData, condition) => {
            if (!partyMember || !sourceData || partyMember.isDead()) return;

            const traitRewards = sourceData.traitRewards || sourceData.traitReward || sourceData.def?.traitRewards || sourceData.def?.traitReward || sourceData.definition?.traitRewards || sourceData.definition?.traitReward || sourceData.config?.traitRewards || sourceData.config?.traitReward;
            if (!traitRewards) return;

            const traits = Array.isArray(traitRewards) ? traitRewards : [traitRewards];

            traits.forEach(traitDef => {
                const reqCondition = (typeof traitDef === 'object' && traitDef.condition) ? traitDef.condition : 'kill';
                if (reqCondition !== condition) return;

                const traitId = typeof traitDef === 'string' ? traitDef : traitDef.id;
                const chance = (typeof traitDef === 'object' && traitDef.chance !== undefined) ? traitDef.chance : 1.0;

                if (Math.random() <= chance) {
                    const entity = partyMember.originalEntity;
                    const currentTraits = entity.traits || [];

                    if (!currentTraits.includes(traitId)) {
                        if (typeof entity.addTrait === 'function') {
                            entity.addTrait(traitId); 
                            const readableName = traitId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            messages.push(`${partyMember.name} learned a new trait: ${readableName}!`);
                        } else {
                            console.warn(`Could not add trait ${traitId} to ${partyMember.name}: no addTrait method found.`);
                        }
                    }
                }
            });
        };

        battleLedger.forEach(entry => {
            if (entry.type === 'DEATH') {
                if (entry.killer?.team === 'party' && entry.killed?.team === 'enemy') {
                    tryAwardTrait(entry.killer, entry.killed.originalEntity, 'kill');
                }
            }
            else if (entry.type === 'ABILITY_USED') {
                if (entry.actor?.team === 'party') {
                    tryAwardTrait(entry.actor, entry.action, 'use_ability');
                    if (entry.target?.team === 'enemy') {
                        tryAwardTrait(entry.actor, entry.target.originalEntity, 'use_ability');
                    }
                }
                if (entry.target?.team === 'party') {
                    tryAwardTrait(entry.target, entry.action, 'hit_by_ability');
                    if (entry.actor?.team === 'enemy') {
                        tryAwardTrait(entry.target, entry.actor.originalEntity, 'hit_by_ability');
                    }
                }
            }
            else if (entry.type === 'STATUS_APPLIED') {
                if (entry.actor?.team === 'party' && entry.target?.team === 'enemy') {
                    tryAwardTrait(entry.actor, entry.target.originalEntity, 'apply_status');
                    tryAwardTrait(entry.actor, entry.status, 'apply_status');
                }
                if (entry.actor?.team === 'enemy' && entry.target?.team === 'party') {
                    tryAwardTrait(entry.target, entry.actor.originalEntity, 'receive_status');
                    tryAwardTrait(entry.target, entry.status, 'receive_status');
                }
            }
        });

        partyRoster.forEach(partyMember => {
            if (!partyMember.isDead()) {
                enemyRoster.forEach(enemy => {
                    tryAwardTrait(partyMember, enemy.originalEntity, 'survive');
                });
            }
        });

        return messages;
    }
}