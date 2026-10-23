import { QuestDefinitions } from './questDefinitions.js';
import { QuestFactory } from './questFactory.js';
import { InventorySystem } from '../items/inventorySystem.js';
import { ExperienceSystem } from '../characters/experienceSystem.js';
import { PartyManager } from '../characters/partyManager.js';

// How many quests the HUD tracker shows at once (the journal's Track button keeps to the same limit)
export const MAX_TRACKED_QUESTS = 3;

export const QuestModel = {
    /** Puts a quest on the HUD tracker; when it is full the one tracked longest ago makes room. */
    trackQuest(state, questId) {
        if (!state.quests.trackedIds) state.quests.trackedIds = [];
        const tracked = state.quests.trackedIds;
        if (tracked.includes(questId)) return;
        while (tracked.length >= MAX_TRACKED_QUESTS) tracked.shift();
        tracked.push(questId);
    },

    startQuest(state, questId) {
        if (state.quests.active[questId] || state.quests.completed.includes(questId)) {
            return false;
        }

        const newQuest = QuestFactory.createActiveQuest(questId);
        if (newQuest) {
            state.quests.active[questId] = newQuest;
            this.trackQuest(state, questId); // a new quest is tracked from the moment it is given, wherever it came from
            const definition = QuestDefinitions[questId];
            
            if (definition) {
                definition.objectives.forEach(obj => {
                    // Retroactive check for obtain_item (allows auto-complete if they already have it)
                    if (obj.type === 'obtain_item') {
                        const currentAmount = state.party.inventory
                            .filter(i => i.defId === obj.targetId)
                            .reduce((sum, i) => sum + i.qty, 0);
                        if (currentAmount > 0) {
                            this.updateProgress(state, questId, obj.id, currentAmount);
                        }
                    } 
                    // Retroactive check for party_level (allows auto-complete if already high enough level)
                    else if (obj.type === 'party_level') {
                        const qualifyingMembersCount = state.party.members.filter(
                            member => (member.level || 1) >= obj.targetLevel
                        ).length;
                        if (qualifyingMembersCount > 0) {
                            this.updateProgress(state, questId, obj.id, qualifyingMembersCount);
                        }
                    }
                    
                    // ❌ WE REMOVED THE 'craft' CHECK HERE!
                    // Now, 'craft' quests will start at 0, even if the player already owns the item.
                    // They MUST go to the workshop to trigger the ITEM_CRAFTED event!
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

        // a finished quest leaves the tracker first, so the quest it unlocks takes its place instead of pushing another one out
        const trackedAt = state.quests.trackedIds ? state.quests.trackedIds.indexOf(questId) : -1;
        if (trackedAt > -1) state.quests.trackedIds.splice(trackedAt, 1);
        
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

            // Reward Companions
            if (rewards.companions) {
                rewards.companions.forEach(compDef => {
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