import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { events } from '../core/eventBus.js';
import { TextEntry } from '../../../shared/utils/textEntry.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { TRAIT_DEFINITIONS } from '../../../shared/data/traitDefinitions.js';

// NEW IMPORTS
import { ItemModel } from '../../../shared/models/itemModel.js';
import { InventorySystem } from '../../../shared/systems/inventorySystem.js';

const ALLOWED_TRAITS = ['quick', 'inquisitive', 'brawler', 'tough'];
const UI_TRAITS = ALLOWED_TRAITS.map(key => ({
    id: key,
    label: TRAIT_DEFINITIONS[key].name,
    desc: TRAIT_DEFINITIONS[key].description,
    ...TRAIT_DEFINITIONS[key]
}));

const CREATION_DATA = {
    BACKGROUNDS: [
        { 
            id: "TRAVELER", label: "Traveler", 
            desc: "Travelers from far and wide came to see the incredible discovery of what was magic in the Altus Kingdom.",
            attributes: { vigor: 12, strength: 12, dexterity: 12, intelligence: 10, attunement: 10 },
            equipment: { mainHand: "shortsword", torso: "tattered_shirt"}
        },
        { 
            id: "BLACKSMITH", label: "Blacksmith", 
            desc: "The honest trade of blacksmithing. Hard labor has made you tough, but magic remains a mystery.",
            attributes: { vigor: 15, strength: 15, dexterity: 10, intelligence: 7, attunement: 7 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "RANGER", label: "Ranger", 
            desc: "A hunter of wild animals. You rely on speed and precision rather than brute force.",
            attributes: { vigor: 11, strength: 10, dexterity: 16, intelligence: 9, attunement: 8 },
            equipment: { mainHand: "wooden_stick", torso: "tattered_shirt" }
        },
        { 
            id: "SCHOLAR", label: "Scholar", 
            desc: "One who studies magic as a science. Physically frail, but possessing immense magical potential.",
            attributes: { vigor: 9, strength: 8, dexterity: 10, intelligence: 16, attunement: 14 },
            equipment: { mainHand: "insight_of_fire", torso: "tattered_shirt" }
        },
    ],
    ORIGINS: [
        { label: "Alterian", tag: "LANG_ALTERIAN", desc: "Alterians are the oldest people of the known world." },
        { label: "Panzerian", tag: "LANG_PANZERIAN", desc: "Panzerians are a creative and powerful people from the icy mountains." },
        { label: "Namuh", tag: "LANG_NAMUH", desc: "The Namuh are a silent and mysterious people." }
    ],
    APPEARANCES: [
        { label: "Style A", sprite: "spritesheet", portrait: "alterian-legionary" }, 
        { label: "Style B", sprite: "spritesheet_panzerian", portrait: "hero_face_b" },
        { label: "Style C", sprite: "spritesheet_namuh", portrait: "namuh-nightblade" }
    ],
    TRAITS: UI_TRAITS,
    KEEPSAKES: [
        { label: "None", itemId: null, desc: "You carry nothing but your burden." },
        { label: "Merchant's Bag", desc: "Start with a small supply of materials.", items: [{ id: "soft_wood", qty: 3 }] },
        { label: "Healer's Pouch", desc: "Start with a small supply of healing herbs.", items: [{ id: "healing_herb", qty: 3 }, { id: "amulet_of_the_dev", qty: 1 },{ id: "kurtus_brew", qty: 1 }] },
    ],
        COMPANIONS: [
        { label: "None", speciesId: null, desc: "Walk the path alone.", attributes: {}, equipment: {} },
        { label: "War Dog", speciesId: "BEAST", desc: "Loyal and sturdy.", attributes: { vigor: 12, strength: 10 }, equipment: { accessory: "tattered_shirt" } },
        { label: "Hunting Hawk", speciesId: "AVIAN", desc: "Fast and watchful.", attributes: { dexterity: 16, speed: 10 }, equipment: { accessory: "tattered_shirt" } }
    ],
    DIFFICULTIES: [
        { id: "EASY", label: "Easy", desc: "Enemies deal 50% damage." },
        { id: "NORMAL", label: "Normal", desc: "Balanced challenge." },
        { id: "HARD", label: "Hard", desc: "Enemies deal 150% damage." },
        { id: "NIGHTMARE", label: "Nightmare", desc: "Death is permanent." }
    ]
};

export class CharacterCreatorController {
    constructor() {
        this.menuOrder = ['name', 'background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'start'];
        this.currentRow = 0;
        this.nameInput = new TextEntry("Shackle Breaker", 16); 
        this.isEditingName = false;
        
        this.state = {
            name: "Shackle Breaker",
            backgroundIdx: 0, originIdx: 0, appearanceIdx: 0,
            keepsakeIdx: 0, companionIdx: 0, traitIdx: 0, difficultyIdx: 1 
        };
        
        this.cachedStats = null;
        this.isDirty = true; 

        // --- NEW: INTERACTION STATE ---
        this.mouse = { x: 0, y: 0 };
        this.lastRenderedHitboxes = [];
        this.hoveredElement = null;
    }

    // ========================================================
    // DATA & STATE ACCESS
    // ========================================================

    getState() {
        const getIdx = (idx, list) => (idx >= 0 && idx < list.length) ? idx : 0;
        this.state.backgroundIdx = getIdx(this.state.backgroundIdx, CREATION_DATA.BACKGROUNDS);
        this.state.traitIdx = getIdx(this.state.traitIdx, CREATION_DATA.TRAITS);

        if (this.isDirty) {
            this.cachedStats = this._calculatePreviewStats();
            this.isDirty = false;
        }

        return {
            // Logic Data
            currentRow: this.currentRow,
            currentStep: this.menuOrder[this.currentRow],
            isEditingName: this.isEditingName, 
            data: CREATION_DATA,
            selections: this.state,
            previewStats: this.cachedStats,

            // UI State (For Renderer)
            mouse: this.mouse,
            hoveredElement: this.hoveredElement,
            
            // Callback for Hitbox Injection
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }

    updateHitboxes(hitboxes) {
        this.lastRenderedHitboxes = hitboxes;
    }

    // ========================================================
    // INPUT HANDLING (MOUSE & KEYBOARD)
    // ========================================================

    handleMouseMove(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;

        // Iterate backwards (top-most elements first)
        let found = null;
        for (let i = this.lastRenderedHitboxes.length - 1; i >= 0; i--) {
            const b = this.lastRenderedHitboxes[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                found = b;
                break;
            }
        }
        this.hoveredElement = found;
    }

    handleMouseDown(x, y) {
        // If editing name and we click outside, validate and close
        if (this.isEditingName) {
            if (!this.hoveredElement || this.hoveredElement.id !== 'INPUT_NAME') {
                this.validateName();
                this.isEditingName = false;
            }
        }

        if (!this.hoveredElement) return;

        const id = this.hoveredElement.id;

        // 1. Name Input Click
        if (id === 'INPUT_NAME') {
            this.currentRow = this.menuOrder.indexOf('name');
            this.isEditingName = true;
            return;
        }

        // 2. Start Button
        if (id === 'BTN_START') {
            this.finalizeCharacter();
            return;
        }

        // 3. Arrow Buttons (e.g., BTN_NEXT_background, BTN_PREV_origin)
        if (id.startsWith('BTN_NEXT_')) {
            const step = id.replace('BTN_NEXT_', '');
            this._setActiveRowByStep(step);
            this.modifyValue(1);
        }
        else if (id.startsWith('BTN_PREV_')) {
            const step = id.replace('BTN_PREV_', '');
            this._setActiveRowByStep(step);
            this.modifyValue(-1);
        }

        // 4. Row Selection (Clicking the text label itself)
        else if (id.startsWith('ROW_')) {
            const step = id.replace('ROW_', '');
            this._setActiveRowByStep(step);
        }
    }

    handleKeyDown(e) {
        const code = e.code;

        // --- MODE 1: NAME EDITING ---
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

        // --- MODE 2: NAVIGATION (WASD/Arrows/Space/Esc) ---
        
        // Navigation: Vertical
        if (code === "ArrowUp" || code === "KeyW") {
            this.moveRow(-1);
        }
        else if (code === "ArrowDown" || code === "KeyS") {
            this.moveRow(1);
        }
        
        // Navigation: Horizontal (Cycling options)
        else if (code === "ArrowLeft" || code === "KeyA") {
            this.modifyValue(-1);
        }
        else if (code === "ArrowRight" || code === "KeyD") {
            this.modifyValue(1);
        }
        
        // Action: Space / Enter
        else if (code === "Enter" || code === "Space") {
            this.handleAction();
        }
        
        // Cancel / Exit
        else if (code === "Escape") {
             // Optional: Go back to main menu
             // events.emit('CHANGE_SCENE', { scene: 'mainMenu' });
        }
    }

    // ========================================================
    // LOGIC HELPERS
    // ========================================================

    _setActiveRowByStep(stepName) {
        const idx = this.menuOrder.indexOf(stepName);
        if (idx !== -1) this.currentRow = idx;
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
        let changed = false;

        switch(step) {
            case 'name': break; 
            case 'background': s.backgroundIdx = this.cycle(s.backgroundIdx, d.BACKGROUNDS.length, dir); changed = true; break;
            case 'origin': s.originIdx = this.cycle(s.originIdx, d.ORIGINS.length, dir); changed = true; break;
            case 'appearance': s.appearanceIdx = this.cycle(s.appearanceIdx, d.APPEARANCES.length, dir); break;
            case 'keepsake': s.keepsakeIdx = this.cycle(s.keepsakeIdx, d.KEEPSAKES.length, dir); changed = true; break;
            case 'companion': s.companionIdx = this.cycle(s.companionIdx, d.COMPANIONS.length, dir); break;
            case 'trait': s.traitIdx = this.cycle(s.traitIdx, d.TRAITS.length, dir); changed = true; break; 
            case 'difficulty': s.difficultyIdx = this.cycle(s.difficultyIdx, d.DIFFICULTIES.length, dir); break;
        }
        if (changed) this.isDirty = true;
    }

    cycle(current, max, dir) {
        let val = current + dir;
        if (val < 0) val = max - 1;
        if (val >= max) val = 0;
        return val;
    }

    handleAction() {
        const step = this.menuOrder[this.currentRow];
        if (step === 'name') this.isEditingName = true; 
        else if (step === 'start') this.finalizeCharacter();
    }

    // ========================================================
    // ENTITY CREATION LOGIC
    // ========================================================

    _createHeroEntity(currentSelections) {
        const bg = CREATION_DATA.BACKGROUNDS[currentSelections.backgroundIdx];
        const origin = CREATION_DATA.ORIGINS[currentSelections.originIdx];
        const app = CREATION_DATA.APPEARANCES[currentSelections.appearanceIdx];
        const trait = CREATION_DATA.TRAITS[currentSelections.traitIdx];

        const playerEquipment = this._resolveEquipment(bg.equipment);

        const playerOverrides = {
            name: currentSelections.name, 
            attributes: { ...bg.attributes }, 
            equipment: playerEquipment,
            sprite: app.sprite,
            portrait: app.portrait,
            tags: [origin.tag],
            traits: [trait.id], 
            level: 1
        };

        return EntityFactory.create("HUMANOID", playerOverrides);
    }

    _calculatePreviewStats() {
        try {
            const tempEntity = this._createHeroEntity(this.state);
            if (!tempEntity) return null;
            return StatCalculator.calculateDetailed(tempEntity);
        } catch (e) {
            console.error("Preview Calculation CRASHED:", e);
            return null; 
        }
    }

    _resolveEquipment(equipmentIdMap) {
        const resolved = {};
        if (!equipmentIdMap) return resolved;
        
        for (const [slot, itemId] of Object.entries(equipmentIdMap)) {
            try {
                const item = new ItemModel(itemId);
                if (item) resolved[slot] = item;
            } catch (err) { 
                console.warn(`[CharCreator] Failed to load equipment: ${itemId}`, err); 
            }
        }
        return resolved;
    }

    finalizeCharacter() {
        if (!this.state.name || this.state.name.trim() === "") {
            this.currentRow = 0; this.isEditingName = true; return;
        }

        console.log("--- START FINALIZE ---");

        gameState.party.inventory = [];

        const keep = CREATION_DATA.KEEPSAKES[this.state.keepsakeIdx];
        
        if (keep.items) {
            keep.items.forEach(i => {
                InventorySystem.addItem(i.id, i.qty);
            });
        } 
        else if (keep.itemId) {
            InventorySystem.addItem(keep.itemId, 1);
        }
        
        const player = this._createHeroEntity(this.state);
        
        if (!player) {
            console.error("FATAL: Player entity failed to create.");
            return;
        }

        // [FIXED] Use Direct Getters instead of player.stats
        // player.maxHp calls the calculator, giving us the correct total.
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        player.insight = player.maxInsight;

        const finalParty = [player];

        const comp = CREATION_DATA.COMPANIONS[this.state.companionIdx];
        if (comp.speciesId) {
            const companionOverrides = {
                name: comp.label, 
                attributes: { ...comp.attributes },
                equipment: this._resolveEquipment(comp.equipment), 
                xp: 0 
            };
            const companionInstance = EntityFactory.create(comp.speciesId, companionOverrides);
            if (companionInstance) {
                // [FIXED] Use Direct Getters here too
                companionInstance.hp = companionInstance.maxHp;
                companionInstance.stamina = companionInstance.maxStamina;
                finalParty.push(companionInstance);
            }
        }

        gameState.party.members = finalParty;
        gameState.party.gold = 100;
        
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = CREATION_DATA.DIFFICULTIES[this.state.difficultyIdx].id; 

        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}