import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { events } from '../core/eventBus.js';
import { TextEntry } from '../../../shared/utils/textEntry.js';

// --- CONFIGURATION DATA ---
// We keep this data structure as you defined it. 
// It maps perfectly to the Factory overrides.
const CREATION_DATA = {
    BACKGROUNDS: [
        { 
            id: "MERCENARY", label: "Mercenary", 
            desc: "A soldier of fortune.\n+Str +Vigor",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            equipment: { mainHand: "SWORD_IRON", torso: "MAIL_RUSTY" }
        },
        { 
            id: "SCHOLAR", label: "Scholar", 
            desc: "Seeker of forbidden knowledge.\n+Int +Attunement",
            attributes: { vigor: 8, strength: 6, dexterity: 10, intelligence: 16, attunement: 12 },
            equipment: { mainHand: "STAFF_OAK", torso: "ROBE_LINEN" }
        },
        { 
            id: "SCOUT", label: "Scout", 
            desc: "Survivalist and pathfinder.\n+Dex +Speed",
            attributes: { vigor: 10, strength: 10, dexterity: 16, intelligence: 10, attunement: 8 },
            equipment: { mainHand: "BOW_SHORT", torso: "LEATHER_VEST" }
        }
    ],
    ORIGINS: [
        { label: "Imperial City", tag: "LANG_COMMON", desc: "You speak the trade tongue." },
        { label: "Northern Tribes", tag: "LANG_NORTH", desc: "You speak the dialects of ice." },
        { label: "Sunken Coast", tag: "LANG_AQUAN", desc: "You understand the tides." }
    ],
    APPEARANCES: [
        { label: "Style A", sprite: "spritesheet", portrait: "spritesheet" }, // Updated to match definitions
        { label: "Style B", sprite: "hero_style_b", portrait: "hero_face_b" },
        { label: "Style C", sprite: "hero_style_c", portrait: "hero_face_c" }
    ],
    KEEPSAKES: [
        { label: "None", itemId: null, desc: "You carry nothing but your burden." },
        { label: "Old Coin", itemId: "COIN_ANCIENT", desc: "A lucky coin from a dead empire." },
        { label: "Iron Key", itemId: "KEY_RUSTY", desc: "Opens a door you have yet to find." },
        { label: "Amber Resin", itemId: "RESIN_HEALING", desc: "A single use healing item." }
    ],
    COMPANIONS: [
        { 
            label: "War Dog", speciesId: "BEAST", 
            desc: "Loyal and sturdy.",
            attributes: { vigor: 12, strength: 10 },
            equipment: { accessory: "COLLAR_LEATHER" }
        },
        { 
            label: "Hunting Hawk", speciesId: "AVIAN", 
            desc: "Fast and watchful.",
            attributes: { dexterity: 16, speed: 10 },
            equipment: { accessory: "ANKLET_BELL" }
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

    finalizeCharacter() {
        // Validation
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

        // --- 1. CREATE PLAYER ---
        const playerOverrides = {
            name: this.state.name, 
            attributes: { ...bg.attributes }, // Clone to avoid reference issues
            equipment: { ...bg.equipment },
            sprite: app.sprite,
            portrait: app.portrait,
            inventory: keep.itemId ? [keep.itemId] : [],
            tags: [origin.tag] // Factory merges this with Humanoid tags
        };

        const player = EntityFactory.create("HUMANOID", playerOverrides);

        // --- 2. CREATE COMPANION ---
        const companionOverrides = {
            name: comp.label,
            attributes: { ...comp.attributes },
            equipment: { ...comp.equipment }
        };

        const companion = EntityFactory.create(comp.speciesId, companionOverrides);

        // --- 3. INJECT INTO GAME STATE ---
        if (!player || !companion) {
            console.error("Critical Error: Factory failed to produce entities.");
            return;
        }

        gameState.party.members = [player, companion];
        gameState.party.gold = 100;

        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = diff.id; 

        // --- 4. DEBUG: VERIFY THE MATH ---
        // This proves your EntityModel and Definitions are working.
        console.log("--- DEBUG: ENTITY GENERATION ---");
        
        console.log(`PLAYER: ${player.name} (Lvl ${player.level})`);
        console.log(`HP: ${player.hp}/${player.maxHp}`); // Should be derived from Vigor (if logic exists) or Base
        console.log(`ATTRIBUTES: Vigor ${player.attributes.vigor}, Str ${player.attributes.strength}`);
        console.log("DEFENSE (Calc):", player.defense); // Should show { blunt: 0, ... } (items are strings, so 0 stats for now)
        
        console.log(`COMPANION: ${companion.name} (${companion.state.tags.join(', ')})`);
        console.log(`SPEED: ${companion.state.baseStats.speed}`);
        console.log("--------------------------------");

        // --- 5. START GAME ---
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}