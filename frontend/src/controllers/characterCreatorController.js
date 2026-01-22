import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { events } from '../core/eventBus.js';
import { TextEntry } from '../../../shared/utils/textEntry.js';
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js';

const CREATION_DATA = {
    BACKGROUNDS: [
        { 
            id: "TRAVELER", label: "Traveler", 
            desc: "Travelers from far and wide came to see the incredible discovery of what was magic in the Altus Kingdom. Those first to arive were amazed by what they saw. Those last to arrive were horrified.",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "BLACKSMITH", label: "Blacksmith", 
            desc: "The honest trade of blacksmithing is a profession that was held in high esteem by Alterians, and Panzerians alike. After the discovery of magic, most blacksmiths found themselves unable to find work, but with their sanity intact.",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "RANGER", label: "Ranger", 
            desc: "Not all were enamored with the discovery of magic. A select few of the populance sought an escape from the people's obsession of it. Many of those that left became rangers, hunting wild animals and later more unnatural things.",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "SCHOLAR", label: "Scholar", 
            desc: "Almost overnight, the scholars and philosophers of the Altus kingdom abandoned their studies to begin research of magic. Some saw magic as a science, others as life itself.",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        
    ],
    ORIGINS: [
        { label: "Alterian", tag: "LANG_ALTERIAN", desc: "Alterians are the oldest people of the known world and the first to discover magic. They are a fearless and adventurous people who hail from the ancient Altus kingdom. They value strength, honor, and loyalty to one's family. Or at least, they use to." },
        { label: "Panzerian", tag: "LANG_PANZERIAN", desc: "Panzerians are a creative and powerful people from the icy mountains of Panzeria. They are master engineers who have acomplished a variety of impressive technolgical and architectural feats. Most notably being their weapons of war, all of which were eventually used against them." },
        { label: "Namuh", tag: "LANG_NAMUH", desc: "The Namuh are a silent and mysterious people who communicate only through a form sign language. Not much is known about the Namuh people except for rumors, many of which speaking of a great tragedy befalling the Namuh people and the becoming of a shadow of their former selves." }
    ],
    APPEARANCES: [
        { label: "Style A", sprite: "spritesheet", portrait: "knight-1" }, 
        { label: "Style B", sprite: "spritesheet_panzerian", portrait: "hero_face_b" },
        { label: "Style C", sprite: "spritesheet_namuh", portrait: "hero_face_c" }
    ],
    KEEPSAKES: [
        { label: "None", itemId: null, desc: "You carry nothing but your burden." },
        { label: "Old Coin", itemId: "wooden_stick", desc: "A lucky stick (Placeholder)." }, 
        { label: "Iron Key", itemId: "wooden_stick", desc: "Opens a door (Placeholder)." },
        { label: "Amber Resin", itemId: "wooden_stick", desc: "Healing item (Placeholder)." }
    ],
    COMPANIONS: [
        // [UPDATE] Added "None" option
        { 
            label: "None", speciesId: null, 
            desc: "Walk the path alone.",
            attributes: {}, equipment: {}
        },
        { 
            label: "War Dog", speciesId: "BEAST", 
            desc: "Loyal and sturdy.",
            attributes: { vigor: 12, strength: 10 },
            equipment: { accessory: "tattered_shirt" } 
        },
        { 
            label: "Hunting Hawk", speciesId: "AVIAN", 
            desc: "Fast and watchful.",
            attributes: { dexterity: 16, speed: 10 },
            equipment: { accessory: "tattered_shirt" } 
        }
    ],
    DIFFICULTIES: [
        { id: "EASY", label: "Easy", desc: "For those new to the path.\nEnemies deal 50% damage." },
        { id: "NORMAL", label: "Normal", desc: "The intended experience.\nBalanced challenge." },
        { id: "HARD", label: "Hard", desc: "Resources are scarce.\nEnemies deal 150% damage." },
        { id: "NIGHTMARE", label: "Nightmare", desc: "Death is permanent.\nGood luck, Shackle-breaker." }
    ]
};

export class CharacterCreatorController {
    constructor() {
        this.menuOrder = ['name', 'background', 'origin', 'appearance', 'keepsake', 'companion', 'difficulty', 'start'];
        this.currentRow = 0;

        this.nameInput = new TextEntry("Shackle Breaker", 16); 
        this.isEditingName = false;

        // Selection State
        this.state = {
            name: "Shackle Breaker",
            backgroundIdx: 0,
            originIdx: 0,
            appearanceIdx: 0,
            keepsakeIdx: 0,
            companionIdx: 0,
            difficultyIdx: 1 
        };
    }

    getState() {
        return {
            currentRow: this.currentRow,
            currentStep: this.menuOrder[this.currentRow],
            isEditingName: this.isEditingName, 
            data: CREATION_DATA,
            selections: this.state
        };
    }

    // --- INPUT HANDLING ---

    handleMouseDown(x, y, renderer) {
        const clickedId = renderer.getHitZone(x, y);

        if (clickedId === "NAME_INPUT") {
            this.currentRow = this.menuOrder.indexOf('name');
            this.isEditingName = true; 
            return;
        }

        if (this.isEditingName) {
            this.validateName(); 
            this.isEditingName = false;
        }
    }

    handleKeyDown(e) {
        const code = e.code;

        // --- MODE 1: TYPING NAME ---
        if (this.isEditingName) {
            if (code === "Enter" || code === "Escape") {
                this.validateName();
                this.isEditingName = false; 
            } else {
                this.nameInput.handleEvent(e); 
                this.state.name = this.nameInput.value; 
            }
            return; 
        }

        // --- MODE 2: MENU NAVIGATION ---
        if (code === "ArrowUp" || code === "KeyW") this.moveRow(-1);
        else if (code === "ArrowDown" || code === "KeyS") this.moveRow(1);
        else if (code === "ArrowLeft" || code === "KeyA") this.modifyValue(-1);
        else if (code === "ArrowRight" || code === "KeyD") this.modifyValue(1);
        else if (code === "Enter") this.handleAction();
    }

    validateName() {
        if (this.nameInput.value.trim() === "") {
            this.nameInput.reset("Shackle Breaker");
            this.state.name = "Shackle Breaker";
        }
    }

    moveRow(dir) {
        const max = this.menuOrder.length - 1;
        this.currentRow = this.cycle(this.currentRow, max + 1, dir);
    }

    modifyValue(dir) {
        const step = this.menuOrder[this.currentRow];
        const s = this.state;
        const d = CREATION_DATA;

        switch(step) {
            case 'name': break; 
            case 'background': s.backgroundIdx = this.cycle(s.backgroundIdx, d.BACKGROUNDS.length, dir); break;
            case 'origin': s.originIdx = this.cycle(s.originIdx, d.ORIGINS.length, dir); break;
            case 'appearance': s.appearanceIdx = this.cycle(s.appearanceIdx, d.APPEARANCES.length, dir); break;
            case 'keepsake': s.keepsakeIdx = this.cycle(s.keepsakeIdx, d.KEEPSAKES.length, dir); break;
            case 'companion': s.companionIdx = this.cycle(s.companionIdx, d.COMPANIONS.length, dir); break;
            case 'difficulty': s.difficultyIdx = this.cycle(s.difficultyIdx, d.DIFFICULTIES.length, dir); break;
        }
    }

    cycle(current, max, dir) {
        let val = current + dir;
        if (val < 0) val = max - 1;
        if (val >= max) val = 0;
        return val;
    }

    handleAction() {
        const step = this.menuOrder[this.currentRow];
        if (step === 'name') {
            this.isEditingName = true; 
        } else if (step === 'start') {
            this.finalizeCharacter();
        }
    }

    _resolveEquipment(equipmentIdMap) {
        const resolved = {};
        if (!equipmentIdMap) return resolved;

        for (const [slot, itemId] of Object.entries(equipmentIdMap)) {
            const item = ItemFactory.createItem(itemId);
            if (item) {
                resolved[slot] = item;
            }
        }
        return resolved;
    }

    _resolveInventory(itemIdList) {
        if (!itemIdList || itemIdList.length === 0) return [];
        return itemIdList
            .map(id => ItemFactory.createItem(id)) 
            .filter(item => item !== null);       
    }

    finalizeCharacter() {
        if (!this.state.name || this.state.name.trim() === "") {
            this.currentRow = 0; 
            this.isEditingName = true; 
            return;
        }

        console.log("[CharCreator] Generating Entity Instances...");

        const bg = CREATION_DATA.BACKGROUNDS[this.state.backgroundIdx];
        const origin = CREATION_DATA.ORIGINS[this.state.originIdx];
        const app = CREATION_DATA.APPEARANCES[this.state.appearanceIdx];
        const keep = CREATION_DATA.KEEPSAKES[this.state.keepsakeIdx];
        const comp = CREATION_DATA.COMPANIONS[this.state.companionIdx];
        const diff = CREATION_DATA.DIFFICULTIES[this.state.difficultyIdx];

        // --- 1. PREPARE ITEMS ---
        const playerEquipment = this._resolveEquipment(bg.equipment);
        const playerInventory = this._resolveInventory(keep.itemId ? [keep.itemId] : []);

        // --- 2. CREATE PLAYER ---
        const playerOverrides = {
            name: this.state.name, 
            attributes: { ...bg.attributes }, 
            equipment: playerEquipment,
            sprite: app.sprite,
            portrait: app.portrait,
            inventory: playerInventory,
            tags: [origin.tag],
            level: 1, 
            xp: 0,
            skillPoints: 0
        };

        const player = EntityFactory.create("HUMANOID", playerOverrides);

        if (!player) {
            console.error("Critical Error: Factory failed to produce player.");
            return;
        }

        const finalParty = [player];

        // --- 3. CREATE SINGLE COMPANION (If Selected) ---
        // [UPDATE] Logic changed: Check speciesId. If valid, add ONE companion.
        if (comp.speciesId) {
            const newCompEquip = this._resolveEquipment(comp.equipment);

            const companionOverrides = {
                name: comp.label, // Just "War Dog", not "War Dog 1"
                attributes: { ...comp.attributes },
                equipment: newCompEquip, 
                xp: 0 
            };

            const companionInstance = EntityFactory.create(comp.speciesId, companionOverrides);

            if (companionInstance) {
                finalParty.push(companionInstance);
                console.log(`[CharCreator] Companion added: ${companionInstance.name}`);
            }
        } else {
             console.log("[CharCreator] No companion selected.");
        }

        // --- 4. INJECT INTO GAME STATE ---
        gameState.party.members = finalParty;
        gameState.party.inventory = []; 
        if (player.inventory) {
             gameState.party.inventory.push(...player.inventory);
             player.inventory = []; 
        }
        
        gameState.party.gold = 100;

        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = diff.id; 

        // --- 5. DEBUG ---
        console.log("--- DEBUG: PARTY GENERATION ---");
        console.log(`PLAYER: ${player.name}`);
        console.log("Party Size:", finalParty.length);
        console.log("--------------------------------");

        // --- 6. START GAME ---
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}