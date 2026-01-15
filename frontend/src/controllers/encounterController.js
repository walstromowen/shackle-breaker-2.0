import { EncounterRegistry } from "../../../shared/registries/encounterRegistry.js"; 
import { gameState } from "../../../shared/state/gameState.js";
import { events } from "../core/eventBus.js"; 

export class EncounterController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager;
        this.selectedIndex = 0;
    }

    start(encounterId) {
        const data = EncounterRegistry.get(encounterId);
        if (!data) {
            console.error(`[Encounter] ID '${encounterId}' not found.`);
            events.emit('ENCOUNTER_END'); 
            return;
        }

        gameState.encounter = {
            ...gameState.encounter, 
            activeData: data,       
            currentStageId: data.initialStage, 
            history: []             
        };

        this.selectedIndex = 0;
        console.log(`[Encounter] Started: ${data.title}`);
    }

    getState() {
        return {
            encounter: gameState.encounter,
            ui: { selectedDecisionIndex: this.selectedIndex }
        };
    }

    handleKeyDown(key) {
        const { activeData, currentStageId } = gameState.encounter;
        // SAFETY: If data is wiped, ignore input (prevents errors during fade)
        if (!activeData) return; 

        const stage = activeData.stages[currentStageId];
        const options = stage.decisions;

        if (key === "Escape") {
             this.endEncounter(); // Changed to call method
        } 

        if (key === "ArrowUp" || key === "KeyW") {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
        } 
        else if (key === "ArrowDown" || key === "KeyS") {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
        } 
        else if (key === "Enter" || key === "Space") {
            this.selectOption(options[this.selectedIndex]);
        }
    }

    selectOption(decision) {
        if (!decision) return;

        // Logic for checks/rewards...
        if (decision.type === "CHECK") {
            // ... (keep your existing check logic)
            // For brevity, assuming success flows to resolveOutcome
        }

        this.resolveOutcome(decision);
    }

    resolveOutcome(outcomeNode) {
        if (!outcomeNode) return;

        // 1. World Modifications
        if (outcomeNode.outcome === "DESTROY_OBJECT") {
            const ctx = gameState.encounter.context;
            if (ctx && ctx.col !== null && ctx.row !== null) {
                this.worldManager.modifyWorld(ctx.col, ctx.row, null);
            }
        }

        // 2. Navigation
        if (outcomeNode.type === "EXIT" || outcomeNode.nextStage === "EXIT") {
            this.endEncounter();
        } else if (outcomeNode.nextStage) {
            gameState.encounter.currentStageId = outcomeNode.nextStage;
            this.selectedIndex = 0;
        }
    }

    /**
     * PHASE 1: Trigger the Transition
     * We do NOT clear the state here. We want the text to remain visible
     * while the screen fades to black.
     */
    endEncounter() {
        console.log("[Encounter] Signaling end...");
        events.emit('ENCOUNTER_END');
    }

    /**
     * PHASE 2: The Cleanup
     * This is called by SceneManager ONLY when the screen is fully black.
     */
    cleanup() {
        console.log("[Encounter] Wiping data (Hidden by transition).");
        gameState.encounter = { 
            activeData: null, 
            currentStageId: null, 
            history: [],
            context: null 
        };
    }
}