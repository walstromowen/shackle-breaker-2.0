// models/encounterModel.js
export class EncounterModel {
    constructor(definition, context = {}, startingStageId = null) {
        this.id = definition.id;
        this.title = definition.title || "Unknown Encounter";
        this.imageSheet = definition.imageSheet || null;
        this.stages = definition.stages;
        this.context = context;
        this.currentStageId = startingStageId || definition.initialStage;
    }

    getCurrentStage() {
        return this.stages[this.currentStageId];
    }

    getStageDisplayText() {
        if (!this.currentStageId) return "Unknown Stage";
        
        const stage = this.getCurrentStage();
        if (stage && stage.displayText) {
            return stage.displayText;
        }

        // Fallback layout algorithm parsing the key string directly if property is missing
        return this.currentStageId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getImage() {
        const stage = this.getCurrentStage();
        if (stage && stage.image) {
            return {
                sheet: stage.image.sheet || this.imageSheet || 'bg_default_black',
                col: stage.image.col || 0,
                row: stage.image.row || 0,
                x: stage.image.x,
                y: stage.image.y,
                w: stage.image.w,
                h: stage.image.h
            };
        }
        return { sheet: 'bg_default_black', col: 0, row: 0 };
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
        return stage && stage.decisions ? stage.decisions : [];
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