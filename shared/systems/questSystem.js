// systems/questSystem.js
import { events } from '../core/eventBus.js';
import { gameState } from '../state/gameState.js';
import { QuestModel } from '../models/questModel.js';
import { QuestDefinitions } from '../data/questDefinitions.js';

export const QuestSystem = {
    init() {
        console.log("[QuestSystem] Initializing...");
        
        // Listen to events emitted by other controllers/systems
        events.on('ITEM_CRAFTED', this.onItemCrafted.bind(this));
        events.on('ENEMY_KILLED', this.onEnemyKilled.bind(this));
        events.on('ITEM_ADDED', this.onItemAdded.bind(this));
    },

    _updateObjectives(type, targetId, amount = 1) {
        if (!gameState.quests || !gameState.quests.active) return;
        
        const { active } = gameState.quests;

        for (const questId in active) {
            const definition = QuestDefinitions[questId];
            if (!definition) continue;

            definition.objectives.forEach(objective => {
                // If the event matches the quest objective...
                if (objective.type === type && objective.targetId === targetId) {
                    
                    // Route to your existing, untouched QuestModel!
                    const progressed = QuestModel.updateProgress(gameState, questId, objective.id, amount);
                    
                    if (progressed) {
                        events.emit('QUEST_PROGRESS_UPDATED', { 
                            questId, 
                            objectiveId: objective.id,
                            isComplete: QuestModel.checkCompletion(gameState, questId)
                        });
                    }
                }
            });
        }
    },

    onItemCrafted(data) {
        this._updateObjectives('craft', data.itemId, data.quantity);
    },

    onEnemyKilled(data) {
        this._updateObjectives('kill_enemy', data.enemyId, 1);
    },

    onItemAdded(data) {
        this._updateObjectives('obtain_item', data.itemId, data.quantity);
    }
};