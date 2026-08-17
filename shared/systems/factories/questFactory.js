import { QuestDefinitions } from '../../data/questDefinitions.js';

export const QuestFactory = {
  /**
   * Generates a new active quest state object.
   * @param {string} questId - The ID of the quest to create.
   * @returns {object|null} The state object to insert into gameState.quests.active
   */
  createActiveQuest(questId) {
    const definition = QuestDefinitions[questId];
    
    if (!definition) {
      console.error(`QuestFactory: Quest definition not found for ID: ${questId}`);
      return null;
    }

    // Initialize progress for each objective to 0
    const initialProgress = {};
    definition.objectives.forEach(objective => {
      initialProgress[objective.id] = 0;
    });

    return {
      id: questId,
      status: "active", // Could be used later for "failed" or "ready_to_turn_in"
      progress: initialProgress
    };
  }
};