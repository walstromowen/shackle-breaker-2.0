import { encounterDefinitions } from '../../data/encounterDefinitions.js';
import { EncounterModel } from '../../models/encounterModel.js';

export class EncounterFactory {
    /**
     * @param {string} encounterId - The ID of the encounter to load.
     * @param {object} context - Dynamic data to pass into the encounter.
     * @param {string} startingStageId - Optional. Use to jump directly to a specific stage.
     */
    static create(encounterId, context = {}, startingStageId = null) {
        const definition = encounterDefinitions[encounterId];

        if (!definition) {
            console.error(`[EncounterFactory] No definition found for encounter ID: ${encounterId}`);
            
            // Fallback definition so the game doesn't crash on a typo
            return new EncounterModel({
                id: "error_fallback",
                initialStage: "start",
                stages: {
                    "start": {
                        imageId: "bg_error",
                        text: "The fabric of reality tears. (Encounter data not found).",
                        decisions: [
                            { 
                                text: "Step back into reality.", 
                                outcomes: [
                                    { weight: 100, results: [{ type: "END_ENCOUNTER" }] }
                                ] 
                            }
                        ]
                    }
                }
            }, context);
        }

        return new EncounterModel(definition, context, startingStageId);
    }
}