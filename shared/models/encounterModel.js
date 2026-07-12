export class EncounterModel {
  constructor(definition, context = {}, startingStageId = null) {
    this.id = definition.id;
    this.title = definition.title || "Unknown Encounter";
    
    // Capture the root image asset key for this specific encounter
    this.imageSheet = definition.imageSheet || null;
    
    this.stages = definition.stages;
    this.context = context;
    this.currentStageId = startingStageId || definition.initialStage;
  }

  getCurrentStage() {
    return this.stages[this.currentStageId];
  }

  getStageName() {
    if (!this.currentStageId) return "Unknown Stage";
    // Convert keys like 'sneak_fail_startle' into 'Sneak Fail Startle'
    return this.currentStageId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getImage() {
    const stage = this.getCurrentStage();
    if (stage && stage.image) {
      return {
        // Fallback hierarchy: Stage specific sheet -> Encounter root sheet -> Black fallback
        sheet: stage.image.sheet || this.imageSheet || 'bg_default_black',
        col: stage.image.col || 0,
        row: stage.image.row || 0,
        // Optional: Support explicit pixel cropping instead of col/row
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