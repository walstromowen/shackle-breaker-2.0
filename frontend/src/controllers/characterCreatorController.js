import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { events } from '../core/eventBus.js';
import { TextEntry } from '../../../shared/utils/textEntry.js';
// [NEW] Import ItemFactory
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js';

// --- CONFIGURATION DATA ---
const TEST_PARTY_SIZE = 6; 

const CREATION_DATA = {
    BACKGROUNDS: [
        { 
            id: "MERCENARY", label: "Mercenary", 
            desc: "A soldier of fortune.\n+Str +Vigor",
            attributes: { vigor: 14, strength: 14, dexterity: 10, intelligence: 8, attunement: 8 },
            // [UPDATE] Using IDs that exist in your ItemDefinitions.js
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "SCHOLAR", label: "Scholar", 
            desc: "Seeker of forbidden knowledge.\n+Int +Attunement",
            attributes: { vigor: 8, strength: 6, dexterity: 10, intelligence: 16, attunement: 12 },
            // Placeholder IDs - Ensure these exist in definitions or they won't appear
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" } 
        },
        { 
            id: "SCOUT", label: "Scout", 
            desc: "Survivalist and pathfinder.\n+Dex +Speed",
            attributes: { vigor: 10, strength: 10, dexterity: 16, intelligence: 10, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        }
    ],
    ORIGINS: [
        { label: "Imperial City", tag: "LANG_COMMON", desc: "You speak the trade tongue." },
        { label: "Northern Tribes", tag: "LANG_NORTH", desc: "You speak the dialects of ice." },
        { label: "Sunken Coast", tag: "LANG_AQUAN", desc: "You understand the tides." }
    ],
    APPEARANCES: [
        { label: "Style A", sprite: "spritesheet", portrait: "knight-1" }, 
        { label: "Style B", sprite: "hero_style_b", portrait: "hero_face_b" },
        { label: "Style C", sprite: "hero_style_c", portrait: "hero_face_c" }
    ],
    KEEPSAKES: [
        { label: "None", itemId: null, desc: "You carry nothing but your burden." },
        { label: "Old Coin", itemId: "wooden_stick", desc: "A lucky stick (Placeholder)." }, // [UPDATE] mapped to stick for testing
        { label: "Iron Key", itemId: "wooden_stick", desc: "Opens a door (Placeholder)." },
        { label: "Amber Resin", itemId: "wooden_stick", desc: "Healing item (Placeholder)." }
    ],
    COMPANIONS: [
        { 
            label: "War Dog", speciesId: "BEAST", 
            desc: "Loyal and sturdy.",
            attributes: { vigor: 12, strength: 10 },
            equipment: { accessory: "tattered_shirt" } // Placeholder
        },
        { 
            label: "Hunting Hawk", speciesId: "AVIAN", 
            desc: "Fast and watchful.",
            attributes: { dexterity: 16, speed: 10 },
            equipment: { accessory: "tattered_shirt" } // Placeholder
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

    // --- HELPER TO CONVERT STRING IDs TO ITEM MODELS ---
    _resolveEquipment(equipmentIdMap) {
        const resolved = {};
        if (!equipmentIdMap) return resolved;

        for (const [slot, itemId] of Object.entries(equipmentIdMap)) {
            // Use Factory to create the real object
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
            .map(id => ItemFactory.createItem(id)) // Create items
            .filter(item => item !== null);        // Remove nulls (invalid IDs)
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

        // --- 1. PREPARE ITEMS (Factory Conversion) ---
        const playerEquipment = this._resolveEquipment(bg.equipment);
        const playerInventory = this._resolveInventory(keep.itemId ? [keep.itemId] : []);
        const companionEquipment = this._resolveEquipment(comp.equipment);

        // --- 2. CREATE PLAYER ---
        const playerOverrides = {
            name: this.state.name, 
            attributes: { ...bg.attributes }, 
            equipment: playerEquipment, // Pass real objects
            sprite: app.sprite,
            portrait: app.portrait,
            inventory: playerInventory, // Pass real objects
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

        // Initialize party with player
        const finalParty = [player];

        // --- 3. CREATE COMPANION CLONES ---
        while (finalParty.length < TEST_PARTY_SIZE) {
            const slotNumber = finalParty.length; 
            const randomStartXP = Math.floor(Math.random() * 50);

            // Clone the equipment object so they don't share the same reference in memory
            // (ItemFactory.createItem returns a new instance, but we need to call it again or clone)
            // Ideally, we create new items for every companion:
            const newCompEquip = this._resolveEquipment(comp.equipment);

            const companionOverrides = {
                name: `${comp.label} ${slotNumber}`,
                attributes: { ...comp.attributes },
                equipment: newCompEquip, 
                xp: randomStartXP
            };

            const companionInstance = EntityFactory.create(comp.speciesId, companionOverrides);

            if (companionInstance) {
                finalParty.push(companionInstance);
            } else {
                break; 
            }
        }

        // --- 4. INJECT INTO GAME STATE ---
        gameState.party.members = finalParty;
        // Move any starting inventory items to the shared party bag
        // (If your design uses a shared bag, we pull items out of player.inventory)
        gameState.party.inventory = []; 
        if (player.inventory) {
             gameState.party.inventory.push(...player.inventory);
             player.inventory = []; // Clear personal inventory if using shared bag
        }
        
        gameState.party.gold = 100;

        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = diff.id; 

        // --- 5. DEBUG ---
        console.log("--- DEBUG: PARTY GENERATION ---");
        console.log(`PLAYER: ${player.name}`);
        // Log to verify items are Objects, not Strings
        console.log("Player Equip:", player.state.equipment); 
        console.log("Party Bag:", gameState.party.inventory);
        console.log("--------------------------------");

        // --- 6. START GAME ---
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}