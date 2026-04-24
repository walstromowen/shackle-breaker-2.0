import { encounterDefinitions } from '../../data/encounterDefinitions.js';
import { EncounterModel } from '../../models/encounterModel.js';

export class EncounterFactory {
    static create(encounterId, context = {}, startingStageId = null) {
        const definition = encounterDefinitions[encounterId];
        
        if (!definition) {
            console.error(`[EncounterFactory] No definition found for encounter ID: ${encounterId}`);
            return new EncounterModel({
                id: "error_fallback",
                title: "Torn Reality", 
                initialStage: "start",
                stages: {
                    "start": {
                        // Updated to match the new image mapping
                        image: { sheet: "bg_error", col: 0, row: 0 },
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