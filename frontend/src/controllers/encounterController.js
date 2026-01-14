import { EncounterRegistry } from "../../../shared/registries/encounterRegistry.js"; 
import { gameState } from "../../../shared/state/gameState.js";
import { events } from "../core/eventBus.js"; 

export class EncounterController {
    constructor(input, config) {
        this.input = input;
        this.config = config;
        this.selectedIndex = 0;
    }

    /**
     * Called by SceneManager inside the Transition Callback
     */
    start(encounterId) {
        // 1. Get the Blueprint
        const data = EncounterRegistry.get(encounterId);

        if (!data) {
            console.error(`[EncounterController] ID '${encounterId}' not found in Registry.`);
            events.emit('ENCOUNTER_END'); 
            return;
        }

        // 2. Setup the Global State
        gameState.encounter = {
            activeData: data,                // The whole object (Narrative, Title, etc.)
            currentStageId: data.initialStage, 
            history: []                      // For "Back" buttons (future feature)
        };

        // 3. Reset UI cursor
        this.selectedIndex = 0;
        
        console.log(`[EncounterController] Started: ${data.title}`);
    }

    /**
     * Called by SceneManager.render to pass data to the Renderer
     */
    getState() {
        return {
            encounter: gameState.encounter,
            ui: {
                selectedDecisionIndex: this.selectedIndex
            }
        };
    }

    /**
     * Called by SceneManager when in 'encounter' mode
     */
    handleKeyDown(key) {
        const { activeData, currentStageId } = gameState.encounter;
        if (!activeData) return;

        const stage = activeData.stages[currentStageId];
        const options = stage.decisions;
        if (key === "Escape") {
             events.emit('ENCOUNTER_END');
        } 



        // --- NAVIGATION ---
        if (key === "ArrowUp" || key === "KeyW") {
            // Cycle backwards, wrapping around
            this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
        } 
        else if (key === "ArrowDown" || key === "KeyS") {
            // Cycle forwards, wrapping around
            this.selectedIndex = (this.selectedIndex + 1) % options.length;
        } 
        // --- SELECTION ---
        else if (key === "Enter" || key === "Space") {
            this.selectOption(options[this.selectedIndex]);
        }
    }

    selectOption(decision) {
        if (!decision) return;

        console.log("Player chose:", decision.text);

        // 1. Handle EXIT (Both generic "EXIT" and complex outcome "EXIT")
        if (decision.type === "EXIT" || (decision.outcome && decision.outcome.type === "EXIT")) {
            this.endEncounter();
            return;
        }

        // 2. Handle BRANCH (Switching to a new text stage)
        if (decision.type === "BRANCH" && decision.nextStage) {
            // Update state to point to new stage
            gameState.encounter.currentStageId = decision.nextStage;
            // Reset cursor to top
            this.selectedIndex = 0;
            return;
        }

        // 3. Handle CHECK (Placeholder for now)
        if (decision.type === "CHECK") {
            console.log("Skill checks not yet implemented. Treating as success...");
            // Temporary: just force success if a 'success' branch exists
            if (decision.success && decision.success.next) {
                 gameState.encounter.currentStageId = decision.success.next;
                 this.selectedIndex = 0;
            }
        }
    }

    endEncounter() {
        // 1. Clear the State
        gameState.encounter = { activeData: null, currentStageId: null, history: [] };
        
        // 2. Tell SceneManager to transition back to Overworld
        events.emit('ENCOUNTER_END');
    }
}