export class EncounterModel {
    constructor(definition, context = {}, startingStageId = null) {
        this.id = definition.id;
        this.title = definition.title || "Unknown Encounter";
        this.stages = definition.stages;
        this.context = context;
        this.currentStageId = startingStageId || definition.initialStage;
    }

    getCurrentStage() {
        return this.stages[this.currentStageId];
    }

    // UPDATED: Now returns an object with sheet, col, and row.
    getImage() {
        const stage = this.getCurrentStage();
        return stage && stage.image ? stage.image : { sheet: 'bg_default_black', col: 0, row: 0 };
    }

    getBgm() {
        const stage = this.getCurrentStage();
        return stage && stage.bgm ? stage.bgm : null;
    }

    getCurrentText() {
        const stage = this.getCurrentStage();
        if (!stage || !stage.text) return "Error: Stage or text missing.";

        let parsedText = stage.text;
        parsedText = parsedText.replace(/\$\{context\.([a-zA-Z0-9_]+)\}/g, (match, key) => {
            return this.context[key] !== undefined ? this.context[key] : `[Missing:${key}]`;
        });

        return parsedText;
    }

    getAvailableDecisions() {
        const stage = this.getCurrentStage();
        if (!stage || !stage.decisions) return [];

        return stage.decisions.filter(decision => {
            if (decision.conditions) {
                const meetsConditions = decision.conditions.every(cond => {
                    if (cond.type === "has_other_party_members") {
                        return gameState.party.members.length > 1;
                    }
                    return true;
                });
                if (!meetsConditions) return false;
            }
            return true;
        });
    }

    advanceToStage(stageId) {
        if (this.stages[stageId]) {
            this.currentStageId = stageId;
        } else {
            console.error(`[EncounterModel] Stage ID '${stageId}' not found in encounter '${this.id}'`);
            this.currentStageId = null;
        }
    }

    updateContext(newData) {
        this.context = { ...this.context, ...newData };
    }
}