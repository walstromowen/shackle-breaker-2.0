import { QuestDefinitions } from '../data/questDefinitions.js';
import { QuestFactory } from '../systems/factories/questFactory.js';
// ---> NEW: Import your systems for reward distribution <---
import { InventorySystem } from '../systems/inventorySystem.js';
import { ExperienceSystem } from '../systems/experienceSystem.js';
import { PartyManager } from '../systems/partyManager.js';

export const QuestModel = {
    startQuest(state, questId) {
        if (state.quests.active[questId] || state.quests.completed.includes(questId)) {
            return false;
        }

        const newQuest = QuestFactory.createActiveQuest(questId);
        if (newQuest) {
            state.quests.active[questId] = newQuest;

            const definition = QuestDefinitions[questId];
            if (definition) {
                definition.objectives.forEach(obj => {
                    if (obj.type === 'obtain_item') {
                        const currentAmount = state.party.inventory
                            .filter(i => i.defId === obj.targetId)
                            .reduce((sum, i) => sum + i.qty, 0);
                        if (currentAmount > 0) {
                            this.updateProgress(state, questId, obj.id, currentAmount);
                        }
                    } else if (obj.type === 'party_level') {
                        const qualifyingMembersCount = state.party.members.filter(
                            member => (member.level || 1) >= obj.targetLevel
                        ).length;
                        if (qualifyingMembersCount > 0) {
                            this.updateProgress(state, questId, obj.id, qualifyingMembersCount);
                        }
                    }
                });
            }
            return true;
        }
        return false;
    },

    updateProgress(state, questId, objectiveId, amountToAdd = 1) {
        const quest = state.quests.active[questId];
        const definition = QuestDefinitions[questId];
        
        if (!quest || !definition) return false;
        
        const objective = definition.objectives.find(o => o.id === objectiveId);
        if (!objective) return false;

        if (quest.progress[objectiveId] === undefined) {
            quest.progress[objectiveId] = 0;
        }

        const requiredAmount = objective.amount || 1;
        quest.progress[objectiveId] = Math.min(quest.progress[objectiveId] + amountToAdd, requiredAmount);
        
        return true;
    },

    checkCompletion(state, questId) {
        const quest = state.quests.active[questId];
        const definition = QuestDefinitions[questId];
        if (!quest || !definition) return false;

        return definition.objectives.every(objective => {
            const currentAmount = quest.progress[objective.id] || 0;
            const requiredAmount = objective.amount || 1;
            return currentAmount >= requiredAmount;
        });
    },

    completeQuest(state, questId) {
        if (!this.checkCompletion(state, questId)) return false;

        const definition = QuestDefinitions[questId];

        // --- REWARD DISTRIBUTION SYSTEM ---
        if (definition && definition.rewards) {
            const rewards = definition.rewards;

            if (rewards.currency) {
                state.party.currency = (state.party.currency || 0) + rewards.currency;
            }

            if (rewards.exp) {
                state.party.members.forEach(member => {
                    ExperienceSystem.addXp(member, rewards.exp);
                });
            }

            if (rewards.skillPoints) {
                state.party.skillPoints = (state.party.skillPoints || 0) + rewards.skillPoints;
            }

            if (rewards.items) {
                rewards.items.forEach(itemDef => {
                    InventorySystem.addItem(itemDef.id, itemDef.amount);
                });
            }

            if (rewards.quests) {
                rewards.quests.forEach(nextQuestId => {
                    this.startQuest(state, nextQuestId);
                });
            }

            // ---> NEW: Reward Companions <---
            if (rewards.companions) {
                rewards.companions.forEach(compDef => {
                    // Passes the ID and any overrides (like a custom name) directly to PartyManager
                    PartyManager.addMember(compDef.id, compDef.overrides || {});
                });
            }
        }

        // Move to completed array and remove from active
        state.quests.completed.push(questId);
        delete state.quests.active[questId];

        return true;
    }
};

