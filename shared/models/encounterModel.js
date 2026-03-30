export class EncounterModel {
    constructor(definition, context = {}, startingStageId = null) {
        this.id = definition.id;
        this.stages = definition.stages;
        
        // Context holds dynamic data (e.g., the biome, an item name, or the interacting character)
        this.context = context; 
        
        // Use the provided stageId if jumping mid-encounter, otherwise use the default
        this.currentStageId = startingStageId || definition.initialStage;
    }

    getCurrentStage() {
        return this.stages[this.currentStageId];
    }

    getImageId() {
        const stage = this.getCurrentStage();
        return stage && stage.imageId ? stage.imageId : 'bg_default_black';
    }

    // Gets the text and interpolates any ${context.variable} strings
    getCurrentText() {
        const stage = this.getCurrentStage();
        if (!stage || !stage.text) return "Error: Stage or text missing.";

        let parsedText = stage.text;

        // Replaces ${context.keyName} with this.context.keyName
        parsedText = parsedText.replace(/\$\{context\.([a-zA-Z0-9_]+)\}/g, (match, key) => {
            return this.context[key] !== undefined ? this.context[key] : `[Missing:${key}]`;
        });

        return parsedText;
    }

    getAvailableDecisions() {
        const stage = this.getCurrentStage();
        if (!stage || !stage.decisions) return [];

        // In the future, you can filter decisions here based on gameState (e.g., hiding choices if player lacks an item)
        return stage.decisions.filter(decision => {
            if (decision.conditions) {
                // Future conditional logic goes here
            }
            return true; 
        });
    }

    advanceToStage(stageId) {
        if (this.stages[stageId]) {
            this.currentStageId = stageId;
        } else {
            console.error(`[EncounterModel] Stage ID '${stageId}' not found in encounter '${this.id}'`);
            this.currentStageId = null; // Fallback to avoid soft-locks
        }
    }
    
    updateContext(newData) {
        this.context = { ...this.context, ...newData };
    }
}