import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';

export class CharacterCreatorController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.currentRow = 0;
        
        this.draft = {
            name: "Kael",
            spriteIndex: 0,
            classIndex: 0
        };

        this.randomNames = ["Kael", "Lyra", "Torin", "Elara", "Draken", "Sylas", "Vea"];
        
        this.options = [
            { label: "Name", type: "input" },
            { label: "Appearance", type: "cycle" },
            { label: "Class", type: "cycle", values: ["Warrior", "Mage", "Rogue"] },
            { label: "Start Game", type: "action" }
        ];
    }

    getState() {
        return {
            currentRow: this.currentRow,
            name: this.draft.name,
            spriteIndex: this.draft.spriteIndex,
            classIndex: this.draft.classIndex,
            options: this.options
        };
    }

    handleKeyDown(key) {
        if (key === "ArrowUp" || key === "KeyW") this.moveSelection(-1);
        else if (key === "ArrowDown" || key === "KeyS") this.moveSelection(1);
        else if (key === "ArrowLeft" || key === "KeyA") this.modifyValue(-1);
        else if (key === "ArrowRight" || key === "KeyD") this.modifyValue(1);
        else if (key === "Enter" || key === "Space") this.handleAction();
    }

    moveSelection(direction) {
        const max = this.options.length - 1;
        this.currentRow += direction;
        if (this.currentRow < 0) this.currentRow = max;
        if (this.currentRow > max) this.currentRow = 0;
    }

    modifyValue(direction) {
        const currentOption = this.options[this.currentRow];

        if (currentOption.label === "Name") {
            let idx = this.randomNames.indexOf(this.draft.name);
            idx += direction;
            if (idx < 0) idx = this.randomNames.length - 1;
            if (idx >= this.randomNames.length) idx = 0;
            this.draft.name = this.randomNames[idx];
        } 
        else if (currentOption.label === "Appearance") {
            let idx = this.draft.spriteIndex + direction;
            if (idx < 0) idx = 3;
            if (idx > 3) idx = 0;
            this.draft.spriteIndex = idx;
        }
        else if (currentOption.label === "Class") {
            let idx = this.draft.classIndex + direction;
            const max = currentOption.values.length - 1;
            if (idx < 0) idx = max;
            if (idx > max) idx = 0;
            this.draft.classIndex = idx;
        }
    }

    handleAction() {
        if (this.options[this.currentRow].label === "Start Game") {
            this.triggerStartGame();
        }
    }

    triggerStartGame() {
        console.log("[CharCreator] Initiating Factory Creation...");
        this.sceneManager.transitionRenderer.start(() => {
            this.finalizeCharacter();
        });
    }

    /**
     * Finalizes the creation using the EntityFactory.
     * This bridges UI choices to the Game Engine's data requirements.
     */
    finalizeCharacter() {
        const classLabel = this.options[2].values[this.draft.classIndex];
        let classAttributes = {};

        // 1. Define Attribute Overrides per Class
        if (classLabel === "Warrior") {
            classAttributes = { vigor: 14, attunement: 5, strength: 14, dexterity: 8, intelligence: 6 };
        } else if (classLabel === "Mage") {
            classAttributes = { vigor: 8, attunement: 14, strength: 4, dexterity: 8, intelligence: 14 };
        } else if (classLabel === "Rogue") {
            classAttributes = { vigor: 10, attunement: 8, strength: 8, dexterity: 15, intelligence: 10 };
        }

        // 2. Build the Overrides Object
        const overrides = {
            name: this.draft.name,
            origin: classLabel,
            attributes: classAttributes,
            spriteIndex: this.draft.spriteIndex,
            // Custom asset mapping based on class selection
            battleSprite: `hero_${classLabel.toLowerCase()}_battle`,
            portrait: `hero_${classLabel.toLowerCase()}_face`
        };

        // 3. CREATE THE ENTITY VIA FACTORY
        // This handles cloning the blueprint, merging attributes, and calculating starting HP.
        const hero = EntityFactory.create("PLAYER", overrides);

        // 4. SAVE TO GLOBAL STATE
        gameState.party.members = [hero];
        gameState.mode = "OVERWORLD";

        console.log(`[Success] Character Created: ${hero.name} (${classLabel})`);
        
        // 5. CHANGE SCENE
        this.sceneManager.changeScene('overworld');
    }
}