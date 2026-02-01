import { gameState } from '../../../shared/state/gameState.js';
import { EntityFactory } from '../../../shared/systems/factories/entityFactory.js';
import { events } from '../core/eventBus.js';
import { TextEntry } from '../../../shared/utils/textEntry.js';
import { ItemFactory } from '../../../shared/systems/factories/itemFactory.js';
import { StatCalculator } from '../../../shared/systems/statCalculator.js';
import { TRAIT_DEFINITIONS } from '../../../shared/data/traitDefinitions.js';

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
            equipment: { mainHand: "shortsword", torso: "tattered_shirt" }
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
        { label: "Amulet of Wisdom", itemId: "amulet_of_wisdom", desc: "Greatly enhances magical potential." }
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
    }

    getState() {
        const getIdx = (idx, list) => (idx >= 0 && idx < list.length) ? idx : 0;
        this.state.backgroundIdx = getIdx(this.state.backgroundIdx, CREATION_DATA.BACKGROUNDS);
        this.state.traitIdx = getIdx(this.state.traitIdx, CREATION_DATA.TRAITS);

        // Only recalculate stats if something changed
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
            previewStats: this.cachedStats 
        };
    }

    _createHeroEntity(currentSelections) {
        const bg = CREATION_DATA.BACKGROUNDS[currentSelections.backgroundIdx];
        const origin = CREATION_DATA.ORIGINS[currentSelections.originIdx];
        const app = CREATION_DATA.APPEARANCES[currentSelections.appearanceIdx];
        const trait = CREATION_DATA.TRAITS[currentSelections.traitIdx];

        // Resolve string IDs to actual Item instances (Only Equipment)
        const playerEquipment = this._resolveEquipment(bg.equipment);

        // NOTE: We do NOT create inventory here anymore. 
        // Inventory is shared by the party and handled in finalizeCharacter.

        const playerOverrides = {
            name: currentSelections.name, 
            attributes: { ...bg.attributes }, // Background attributes are the base
            equipment: playerEquipment,
            sprite: app.sprite,
            portrait: app.portrait,
            tags: [origin.tag],
            traits: [trait.id], 
            level: 1
        };

        // This returns an EntityModel instance
        return EntityFactory.create("HUMANOID", playerOverrides);
    }

    _calculatePreviewStats() {
        try {
            // 1. Create a "Mock" Entity
            const tempEntity = this._createHeroEntity(this.state);
            
            if (!tempEntity) return null;

            // 2. Delegate to the Calculator's Detailed Pipeline
            return StatCalculator.calculateDetailed(tempEntity);

        } catch (e) {
            console.error("Preview Calculation CRASHED:", e);
            return null; 
        }
    }

    handleMouseDown(x, y, renderer) {
        const clickedId = renderer.getHitZone(x, y);
        if (clickedId === "NAME_INPUT") {
            this.currentRow = this.menuOrder.indexOf('name');
            this.isEditingName = true; 
        }
        if (this.isEditingName && clickedId !== "NAME_INPUT") {
            this.validateName(); 
            this.isEditingName = false;
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

    _resolveEquipment(equipmentIdMap) {
        const resolved = {};
        if (!equipmentIdMap) return resolved;
        for (const [slot, itemId] of Object.entries(equipmentIdMap)) {
            try {
                const item = ItemFactory.createItem(itemId);
                if (item) resolved[slot] = item;
            } catch (err) { console.warn(`[CharCreator] Failed to load equipment: ${itemId}`, err); }
        }
        return resolved;
    }

    _resolveInventory(itemIdList) {
        if (!itemIdList || itemIdList.length === 0) return [];
        
        return itemIdList.map(id => {
            try { 
                const item = ItemFactory.createItem(id); 
                if (!item) console.warn(`[CharCreator] ItemFactory returned null for ID: '${id}'. Check ItemDefinitions!`);
                return item;
            } catch (e) { 
                console.error(`[CharCreator] Error creating item '${id}':`, e);
                return null; 
            }
        }).filter(item => item !== null);       
    }

    finalizeCharacter() {
        if (!this.state.name || this.state.name.trim() === "") {
            this.currentRow = 0; this.isEditingName = true; return;
        }

        console.log("--- START FINALIZE ---");

        // 1. Resolve Starting Inventory DIRECTLY here (Decoupled from Entity)
        const keep = CREATION_DATA.KEEPSAKES[this.state.keepsakeIdx];
        const startingItems = this._resolveInventory(keep.itemId ? [keep.itemId] : []);
        console.log(`[Inv] Resolved ${startingItems.length} starting items.`);

        // 2. Create the Final Player Entity
        const player = this._createHeroEntity(this.state);
        
        if (!player) {
            console.error("FATAL: Player entity failed to create.");
            return;
        }

        // 3. Recalculate Stats to ensure they are fresh
        const finalStats = player.stats; 
        player.hp = finalStats.maxHp;
        player.stamina = finalStats.maxStamina;
        player.insight = finalStats.maxInsight;

        const finalParty = [player];

        // 4. Create Companion
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
                const compStats = companionInstance.stats;
                companionInstance.hp = compStats.maxHp;
                companionInstance.stamina = compStats.maxStamina;
                finalParty.push(companionInstance);
            }
        }

        // 5. Inject State into Global Game State
        gameState.party.members = finalParty;
        
        // --- DIRECT ASSIGNMENT ---
        // Since inventory is shared, we push the items directly to the global state.
        // We do not pass them through the player entity anymore.
        gameState.party.inventory = [...startingItems]; 
        // -------------------------
        
        console.log("--- FINAL GLOBAL STATE ---");
        console.log("GameState Inventory:", gameState.party.inventory);

        gameState.party.gold = 100;
        if (!gameState.settings) gameState.settings = {};
        gameState.settings.difficulty = CREATION_DATA.DIFFICULTIES[this.state.difficultyIdx].id; 

        // 6. Transition
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}