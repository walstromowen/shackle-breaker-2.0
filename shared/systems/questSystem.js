// shared/systems/questSystem.js
// Listens for game events (kills, crafting, START_QUEST) and feeds them into the quest objectives.
//
// NOTE: the event bus is the frontend one (the same instance BattleController / TurnManager emit on). This file used to import
// '../core/eventBus.js', which is not where the bus lives, so the listeners never reached the events the battle emits.
import { events } from '../../frontend/src/core/eventBus.js';
import { gameState } from '../state/gameState.js';
import { QuestModel } from '../models/questModel.js';
import { QuestDefinitions } from '../data/questDefinitions.js';

let initialised = false;

export const QuestSystem = {
    /** Safe to call more than once: the listeners are only attached the first time (a second call would double-count every kill). */
    init() {
        if (initialised) return;
        initialised = true;
        console.log("[QuestSystem] Initializing...");

        // Listen to events emitted by other controllers/systems
        events.on('ITEM_CRAFTED', this.onItemCrafted.bind(this));
        events.on('ENEMY_KILLED', this.onEnemyKilled.bind(this));
        events.on('ITEM_ADDED', this.onItemAdded.bind(this));

        // Encounters hand out quests with the START_QUEST result, which only emits this event.
        events.on('START_QUEST', this.onStartQuest.bind(this));
    },

    _updateObjectives(type, targetId, amount = 1) {
        if (!gameState.quests || !gameState.quests.active) return;
        if (targetId === undefined || targetId === null) return;

        const { active } = gameState.quests;

        for (const questId in active) {
            const definition = QuestDefinitions[questId];
            if (!definition) continue;

            definition.objectives.forEach(objective => {
                // If the event matches the quest objective...
                if (objective.type === type && objective.targetId === targetId) {

                    const progressed = QuestModel.updateProgress(gameState, questId, objective.id, amount);
                    if (progressed) {
                        const isComplete = QuestModel.checkCompletion(gameState, questId);
                        console.log(`[QuestSystem] ${questId}: ${objective.id} +${amount}${isComplete ? ' (ready to collect)' : ''}`);
                        events.emit('QUEST_PROGRESS_UPDATED', {
                            questId,
                            objectiveId: objective.id,
                            isComplete: isComplete
                        });
                        // A finished quest stays in the journal until the player presses COLLECT (JournalController.collectRewards),
                        // exactly like an obtain_item quest does. Completing it here would hand out the rewards silently.
                    }
                }
            });
        }
    },

    onItemCrafted(data) {
        this._updateObjectives('craft', data.itemId, data.quantity);
    },

    onEnemyKilled(data) {
        // RECORD_KILL results (encounters) can carry an amount; a battle death is always one kill
        this._updateObjectives('kill_enemy', data.enemyId, data.amount || 1);
    },

    onItemAdded(data) {
        this._updateObjectives('obtain_item', data.itemId, data.quantity);
    },

    /** A quest handed out from outside the quest chain (an encounter's START_QUEST result). */
    onStartQuest(data) {
        const questId = data && data.questId;
        if (!questId) return;

        if (!QuestDefinitions[questId]) {
            console.warn(`[QuestSystem] START_QUEST for an unknown quest '${questId}'.`);
            return;
        }

        const quests = gameState.quests;
        if (!quests) return;

        // Already in the journal, or already finished: starting it again would reset its progress / hand out its rewards twice
        const isActive = !!(quests.active && quests.active[questId]);
        const isCompleted = Array.isArray(quests.completed) && quests.completed.includes(questId);
        if (isActive || isCompleted) return;

        const started = QuestModel.startQuest(gameState, questId);
        if (started !== false) events.emit('QUEST_STARTED', { questId });
    }
};