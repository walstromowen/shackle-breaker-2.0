import { gameState } from '../../../../shared/state/gameState.js';
import { EntityFactory } from '../../../../shared/systems/factories/entityFactory.js';
import { ItemFactory } from '../../../../shared/systems/factories/itemFactory.js'; 
import { events } from '../../core/eventBus.js';
import { TextEntry } from '../../../../shared/utils/textEntry.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { TRAIT_DEFINITIONS } from '../../../../shared/data/traitDefinitions.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { PartyManager } from '../../../../shared/systems/partyManager.js'; 

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
            equipment: { mainHand: "shortsword", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        { 
            id: "BLACKSMITH", label: "Blacksmith", 
            desc: "The honest trade of blacksmithing. Hard labor has made you tough, but magic remains a mystery.",
            attributes: { vigor: 15, strength: 15, dexterity: 10, intelligence: 7, attunement: 7 },
            equipment: { mainHand: "warhammer", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        { 
            id: "RANGER", label: "Ranger", 
            desc: "A hunter of wild animals. You rely on speed and precision rather than brute force.",
            attributes: { vigor: 11, strength: 10, dexterity: 16, intelligence: 9, attunement: 8 },
            equipment: { mainHand: "dagger", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        { 
            id: "SCHOLAR", label: "Scholar", 
            desc: "One who studies magic as a science. Physically frail, but possessing immense magical potential.",
            attributes: { vigor: 9, strength: 8, dexterity: 10, intelligence: 16, attunement: 14 },
            equipment: { mainHand: "insight_of_arcane", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
    ],
    ORIGINS: [
        { label: "Alterian", tag: "LANG_ALTERIAN", desc: "Alterians are the oldest people of the known world." },
        { label: "Panzerian", tag: "LANG_PANZERIAN", desc: "Panzerians are a creative and powerful people from the icy mountains." },
        { label: "Namuh", tag: "LANG_NAMUH", desc: "The Namuh are a silent and mysterious people." }
    ],
    
    // Maps UI selection to the EntityModel properties
    APPEARANCES: [
        { label: "Legionary", spritePortrait: "legionaryHeroPortrait", spriteOverworld: "legionaryHeroSprite" }, 
        { label: "Warlord", spritePortrait: "warlordHeroPortrait", spriteOverworld: "warlordHeroSprite" },
        { label: "Nightblade", spritePortrait: "nightbladeHeroPortrait", spriteOverworld: "nightbladeHeroSprite" },

        { label: "Artificer", spritePortrait: "artificerHeroPortrait", spriteOverworld: "legionaryHeroSprite" }, 
        { label: "Avalancher", spritePortrait: "avalancherHeroPortrait", spriteOverworld: "warlordHeroSprite" },
        { label: "Shadow Caster", spritePortrait: "shadowCasterHeroPortrait", spriteOverworld: "nightbladeHeroSprite" }
    ],
    
    TRAITS: UI_TRAITS,
    KEEPSAKES: [
        { label: "None", itemId: null, desc: "You carry nothing but your burden." },
        { label: "Smith's stash", desc: "Start with a small supply of crafting materials.", items: [{ id: "wooden_shield", qty: 1 }, { id: "healing_herb", qty: 1 }, { id: "soft_wood", qty: 3 }, { id: "stone", qty: 2 }, { id: "iron_ingot", qty: 1 }] },
        { label: "Healer's Pouch", desc: "Start with various beneficial herbs.", items: [{ id: "healing_herb", qty: 3 }, { id: "invigorating_herb", qty: 3 }, { id: "illuminating_herb", qty: 3 }] },
        { label: "Drunkard", desc: "Start with a bottle of a strange ale.", items: [{ id: "healing_herb", qty: 1 }, { id: "brew_of_madness", qty: 1 }] },
    ],
    COMPANIONS: [
        { label: "None", speciesId: null, desc: "Walk the path alone.", attributes: {}, equipment: {} },
        { label: "War Dog", speciesId: "BEAST", desc: "Loyal and sturdy.", attributes: { vigor: 12, strength: 10 }  },
        { label: "Hunting Hawk", speciesId: "AVIAN", desc: "Fast and watchful.", attributes: { dexterity: 16, speed: 10 }, equipment: { accessory: "tattered_shirt" } }
    ],
    DIFFICULTIES: [
        { id: "EASY", label: "Easy", desc: "Easier challenge." },
        { id: "NORMAL", label: "Normal", desc: "Balanced challenge." },
        { id: "HARD", label: "Hard", desc: "Difficult challenge" },
        { id: "NIGHTMARE", label: "Nightmare", desc: "Hope is an illusion..." }
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

        // --- INTERACTION STATE ---
        this.mouse = { x: 0, y: 0 };
        this.lastRenderedHitboxes = [];
        this.hoveredElement = null;
    }

    // ========================================================
    // DATA & STATE ACCESS
    // ========================================================

    getState() {
        if (this.isDirty) {
            this.cachedStats = this._calculatePreviewStats();
            this.isDirty = false;
        }

        return {
            currentRow: this.currentRow,
            currentStep: this.menuOrder[this.currentRow],
            isEditingName: this.isEditingName, 
            data: CREATION_DATA,
            selections: this.state,
            previewStats: this.cachedStats,
            mouse: this.mouse,
            hoveredElement: this.hoveredElement,
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
        if (this.isEditingName && (!this.hoveredElement || this.hoveredElement.id !== 'INPUT_NAME')) {
            this.validateName();
            this.isEditingName = false;
        }

        if (!this.hoveredElement) return;
        const id = this.hoveredElement.id;

        if (id === 'INPUT_NAME') {
            this._setActiveRowByStep('name');
            this.isEditingName = true;
        } else if (id === 'BTN_START') {
            this.finalizeCharacter();
        } else if (id.startsWith('BTN_NEXT_')) {
            this._setActiveRowByStep(id.replace('BTN_NEXT_', ''));
            this.modifyValue(1);
        } else if (id.startsWith('BTN_PREV_')) {
            this._setActiveRowByStep(id.replace('BTN_PREV_', ''));
            this.modifyValue(-1);
        } else if (id.startsWith('ROW_')) {
            this._setActiveRowByStep(id.replace('ROW_', ''));
        }
    }

    handleKeyDown(e) {
        const code = e.code;

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

        if (code === "ArrowUp" || code === "KeyW") this.moveRow(-1);
        else if (code === "ArrowDown" || code === "KeyS") this.moveRow(1);
        else if (code === "ArrowLeft" || code === "KeyA") this.modifyValue(-1);
        else if (code === "ArrowRight" || code === "KeyD") this.modifyValue(1);
        else if (code === "Enter" || code === "Space") this.handleAction();
        // else if (code === "Escape") events.emit('CHANGE_SCENE', { scene: 'mainMenu' });
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
        this.currentRow = this.cycle(this.currentRow, this.menuOrder.length, dir);
    }

    modifyValue(dir) {
        const step = this.menuOrder[this.currentRow];
        const d = CREATION_DATA;
        
        // Configuration mapping steps to their state keys and max array lengths
        const stepConfig = {
            background: { key: 'backgroundIdx', max: d.BACKGROUNDS.length, triggersDirty: true },
            origin: { key: 'originIdx', max: d.ORIGINS.length, triggersDirty: true },
            appearance: { key: 'appearanceIdx', max: d.APPEARANCES.length, triggersDirty: false },
            keepsake: { key: 'keepsakeIdx', max: d.KEEPSAKES.length, triggersDirty: true },
            companion: { key: 'companionIdx', max: d.COMPANIONS.length, triggersDirty: false },
            trait: { key: 'traitIdx', max: d.TRAITS.length, triggersDirty: true },
            difficulty: { key: 'difficultyIdx', max: d.DIFFICULTIES.length, triggersDirty: false }
        };

        if (stepConfig[step]) {
            const { key, max, triggersDirty } = stepConfig[step];
            this.state[key] = this.cycle(this.state[key], max, dir);
            if (triggersDirty) this.isDirty = true;
        }
    }

    cycle(current, max, dir) {
        // Simplified modulo math replaces the manual if/else bounds checking
        return (current + dir + max) % max;
    }

    handleAction() {
        const step = this.menuOrder[this.currentRow];
        if (step === 'name') this.isEditingName = true; 
        else if (step === 'start') this.finalizeCharacter();
    }

    // ========================================================
    // ENTITY BUILDERS & PREVIEWS
    // ========================================================

    _buildPlayerOverrides() {
        const bg = CREATION_DATA.BACKGROUNDS[this.state.backgroundIdx];
        const origin = CREATION_DATA.ORIGINS[this.state.originIdx];
        const app = CREATION_DATA.APPEARANCES[this.state.appearanceIdx];
        const trait = CREATION_DATA.TRAITS[this.state.traitIdx];

        return {
            name: this.state.name, 
            attributes: { ...bg.attributes }, 
            equipment: bg.equipment, // Raw string map
            spritePortrait: app.spritePortrait,        
            spriteOverworld: app.spriteOverworld,  
            tags: [origin.tag],
            traits: [trait.id], 
            level: 1
        };
    }

    _createPreviewEntity() {
        // 1. Get base overrides
        const overrides = this._buildPlayerOverrides();
        
        // 2. Resolve equipment manually JUST for the preview calculation
        overrides.equipment = this._resolveEquipment(overrides.equipment);
        
        return EntityFactory.create("HUMANOID", overrides);
    }

    _calculatePreviewStats() {
        try {
            const tempEntity = this._createPreviewEntity();
            return tempEntity ? StatCalculator.calculateDetailed(tempEntity) : null;
        } catch (e) {
            console.error("Preview Calculation CRASHED:", e);
            return null; 
        }
    }

    _resolveEquipment(equipmentIdMap) {
        const resolved = {};
        if (!equipmentIdMap) return resolved;
        for (const [slot, itemId] of Object.entries(equipmentIdMap)) {
            const item = ItemFactory.createItem(itemId);
            if (item) resolved[slot] = item;
        }
        return resolved;
    }

    // ========================================================
    // FINALIZATION
    // ========================================================

    finalizeCharacter() {
        if (!this.state.name || this.state.name.trim() === "") {
            this.currentRow = 0; 
            this.isEditingName = true; 
            return;
        }

        console.log("--- START FINALIZE ---");

        // 1. Create Main Character via PartyManager
        PartyManager.createMainCharacter("HUMANOID", this._buildPlayerOverrides());

        // 2. Add Keepsakes
        const keep = CREATION_DATA.KEEPSAKES[this.state.keepsakeIdx];
        if (keep.items) {
            keep.items.forEach(i => InventorySystem.addItem(i.id, i.qty));
        } else if (keep.itemId) {
            InventorySystem.addItem(keep.itemId, 1);
        }

        // 3. Create Companions via PartyManager
        const comp = CREATION_DATA.COMPANIONS[this.state.companionIdx];
        if (comp.speciesId) {
            for (let i = 1; i <= 5; i++) {
                const companionInstance = PartyManager.addMember(comp.speciesId, {
                    name: `${comp.label} ${i}`,
                    attributes: { ...comp.attributes },
                    equipment: comp.equipment,
                    xp: 0 
                });
                
                if (companionInstance) {
                    // This refill can be removed here later if you move it into PartyManager.addMember!
                    companionInstance.hp = companionInstance.maxHp;
                    companionInstance.stamina = companionInstance.maxStamina;
                }
            }
        }

        // 4. Commit to Game State
        gameState.party.currency = 100;
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = CREATION_DATA.DIFFICULTIES[this.state.difficultyIdx].id; 

        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}