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

    /**
     * Called by SceneManager when switching to this scene.
     * @param {string} encounterId - The ID from the Interaction component.
     * @param {object} context - { row, col } of the object triggering this.
     */
    start(encounterId, context = null) {
        const data = EncounterRegistry.get(encounterId);
        
        // Safety: If ID is wrong, go back immediately
        if (!data) {
            console.error(`[Encounter] ID '${encounterId}' not found.`);
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        // Initialize State
        gameState.encounter = {
            ...gameState.encounter, 
            activeData: data,       
            currentStageId: data.initialStage, 
            history: [],
            context: context // <--- STORE THE CONTEXT HERE
        };

        this.selectedIndex = 0;
        console.log(`[Encounter] Started: ${data.title}`);
    }

    getState() {
        // Flatten the state for the Renderer
        // The Renderer expects: { data, currentStage, ui }
        const { activeData, currentStageId } = gameState.encounter;
        
        // Safety check to prevent Renderer crash during transitions
        if (!activeData) return { data: null, currentStage: null, ui: {} };

        return {
            data: activeData,
            currentStage: activeData.stages[currentStageId],
            ui: { selectedDecisionIndex: this.selectedIndex }
        };
    }

    handleKeyDown(key) {
        const { activeData, currentStageId } = gameState.encounter;
        
        // SAFETY: If data is wiped (during fade out), ignore input
        if (!activeData) return; 

        const stage = activeData.stages[currentStageId];
        const options = stage.decisions;

        // Escape Key -> Exit immediately (optional, or opens menu)
        if (key === "Escape") {
             this.endEncounter(); 
        } 

        // Navigation
        if (key === "ArrowUp" || key === "KeyW") {
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
        } 
        else if (key === "ArrowDown" || key === "KeyS") {
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
        } 
        // Selection
        else if (key === "Enter" || key === "Space") {
            this.selectOption(options[this.selectedIndex]);
        }
    }

    selectOption(decision) {
        if (!decision) return;

        // Placeholder: Skill Check Logic would go here
        if (decision.type === "CHECK") {
            // Example: const success = RollDice(gameState.party.members[0].attributes.strength);
        }

        this.resolveOutcome(decision);
    }

    resolveOutcome(outcomeNode) {
        if (!outcomeNode) return;

        // 1. World Modifications (e.g., removing the object you interacted with)
        if (outcomeNode.outcome === "DESTROY_OBJECT") {
            const ctx = gameState.encounter.context;
            
            // Now this check will pass because we stored 'context' in start()
            if (ctx && ctx.col !== null && ctx.row !== null) {
                console.log(`[Encounter] Destroying object at ${ctx.col}, ${ctx.row}`);
                this.worldManager.modifyWorld(ctx.col, ctx.row, null);
            } else {
                console.warn("[Encounter] DESTROY_OBJECT called but no context found.");
            }
        }

        // 2. Navigation Logic
        if (outcomeNode.type === "EXIT" || outcomeNode.nextStage === "EXIT") {
            this.endEncounter();
        } else if (outcomeNode.nextStage) {
            // Advance to next stage
            gameState.encounter.currentStageId = outcomeNode.nextStage;
            this.selectedIndex = 0;
        }
    }

    /**
     * PHASE 1: Trigger the Transition
     * We emit the event. The SceneManager hears this, fades the screen,
     * and THEN calls our cleanup() method.
     */
    endEncounter() {
        console.log("[Encounter] Signaling end...");
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    /**
     * PHASE 2: The Cleanup
     * Called by SceneManager during the black-screen transition.
     */
    cleanup() {
        console.log("[Encounter] Wiping data.");
        gameState.encounter = { 
            activeData: null, 
            currentStageId: null, 
            history: [],
            context: null 
        };
    }
}