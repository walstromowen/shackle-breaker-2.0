// frontend/src/controllers/partyController.js
import { gameState } from '../../../shared/state/gameState.js';

export class PartyController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
    }

    handleKeyDown(code) {
        // Pressing P again, or Escape, closes the menu
        if (code === 'KeyP' || code === 'Escape' || code === 'Tab') {
            console.log("[Party] Closing Menu...");
            gameState.mode = "OVERWORLD";
        }
    }

    getState() {
        return { members: gameState.party.members };
    }
}