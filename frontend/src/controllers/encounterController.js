import { EncounterFactory } from "../../../shared/systems/factories/encounterFactory.js";
import { gameState } from "../../../shared/state/gameState.js";
import { events } from "../core/eventBus.js"; 
import { InventorySystem } from "../../../shared/systems/inventorySystem.js"; 

export class EncounterController {
    constructor(input, config, worldManager) {
        this.input = input;
        this.config = config;
        this.worldManager = worldManager;
        
        // The active encounter model
        this.model = null;
        this.selectedIndex = 0;
    }

    /**
     * Called by SceneManager when switching to this scene via INTERACT event.
     * @param {string} encounterId - The ID from the Interaction component.
     * @param {object} context - { col, row, objectId } of the object triggering this.
     */
    start(encounterId, context = {}) {
        // Use the new Factory to build an active Model instance
        this.model = EncounterFactory.create(encounterId, context);
        
        // Safety check (handled by factory fallback, but good to ensure model exists)
        if (!this.model) {
            console.error(`[Encounter] Failed to create model for ID '${encounterId}'.`);
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        this.selectedIndex = 0;
        console.log(`[Encounter] Started: ${this.model.id}`);
    }

    getState() {
        // Safety check to prevent Renderer crash during transitions
        if (!this.model) return { imageId: null, text: "", decisions: [], ui: {} };

        // We now ask the Model for the parsed text and available decisions
        return {
            imageId: this.model.getImageId(),
            text: this.model.getCurrentText(),
            decisions: this.model.getAvailableDecisions(),
            ui: { selectedDecisionIndex: this.selectedIndex }
        };
    }

    handleKeyDown(key) {
        if (!this.model) return; 

        const options = this.model.getAvailableDecisions();
        if (!options || options.length === 0) return;

        // Escape Key -> Exit immediately (optional, depending on design)
        if (key === "Escape") {
             this.endEncounter(); 
             return;
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
            this.confirmSelection(options[this.selectedIndex]);
        }
    }

    confirmSelection(decision) {
        if (!decision || !decision.outcomes || decision.outcomes.length === 0) return;

        // 1. Calculate the total weight of all possible outcomes
        const totalWeight = decision.outcomes.reduce((sum, outcome) => sum + (outcome.weight || 1), 0);

        // 2. Roll a random number to select the outcome
        let roll = Math.random() * totalWeight;
        let selectedOutcome = null;

        for (const outcome of decision.outcomes) {
            roll -= (outcome.weight || 1);
            if (roll <= 0) {
                selectedOutcome = outcome;
                break;
            }
        }

        // Fallback safety
        if (!selectedOutcome) selectedOutcome = decision.outcomes[0];

        // 3. Process the results of the chosen outcome
        this.resolveResults(selectedOutcome.results);
    }

    resolveResults(resultsArray) {
        if (!resultsArray) return;

        resultsArray.forEach(result => {
            const type = result.type;
            const payload = result.payload;

            switch (type) {
                // --- NAVIGATION ---
                case "ADVANCE_STAGE":
                    this.model.advanceToStage(payload.stageId);
                    this.selectedIndex = 0;
                    break;
                
                case "CHANGE_ENCOUNTER":
                    // Jump entirely to a different encounter definition
                    this.model = EncounterFactory.create(payload.encounterId, this.model.context, payload.stageId);
                    this.selectedIndex = 0;
                    break;

                case "END_ENCOUNTER":
                    this.endEncounter();
                    break;

                // --- WORLD INTERACTION ---
                case "DESTROY_OBJECT":
                    const ctx = this.model.context;
                    if (ctx && ctx.col !== undefined && ctx.row !== undefined) {
                        console.log(`[Encounter] Destroying object at ${ctx.col}, ${ctx.row}`);
                        this.worldManager.modifyWorld(ctx.col, ctx.row, null);
                    } else {
                        console.warn("[Encounter] DESTROY_OBJECT called but no col/row in context.");
                    }
                    break;
                
                // --- INVENTORY ---
                case "GIVE_ITEM":
                    InventorySystem.addItem(payload.itemId, payload.qty);
                    console.log(`[Encounter] Added ${payload.qty}x ${payload.itemId} to inventory.`);
                    break;

                case "REMOVE_ITEM":
                    InventorySystem.removeItem(payload.itemId, payload.qty);
                    console.log(`[Encounter] Removed ${payload.qty}x ${payload.itemId} from inventory.`);
                    break;

                // --- BATTLE ---
                case "START_BATTLE":
                    // Trigger battle via EventBus just like the OverworldController does
                    console.log(`[Encounter] Triggering battle from dialogue!`);
                    events.emit('START_BATTLE', {
                        enemies: payload.enemies,
                        background: payload.background,
                        weather: gameState.world.currentWeather
                    });
                    break;
                    
                // --- GLOBAL EVENTS (Damage, etc.) ---
                default:
                    // Anything else gets blindly fired to the event bus for other systems to catch
                    events.emit(type, payload);
                    break;
            }
        });
    }

    /**
     * PHASE 1: Trigger the Transition
     */
    endEncounter() {
        console.log("[Encounter] Signaling end...");
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    /**
     * PHASE 2: The Cleanup
     * Called by SceneManager during the black-screen transition (optional).
     */
    cleanup() {
        console.log("[Encounter] Wiping data.");
        this.model = null;
    }
    getState() {
        // Safety check to prevent Renderer crash during transitions
        if (!this.model) return { imageId: null, text: "", decisions: [], ui: {}, party: [] };

        // We now ask the Model for the parsed text and available decisions, 
        // AND grab the active party members from the global state!
        return {
            imageId: this.model.getImageId(),
            text: this.model.getCurrentText(),
            decisions: this.model.getAvailableDecisions(),
            ui: { selectedDecisionIndex: this.selectedIndex },
            party: gameState.party.members // <--- Added this line
        };
    }
}