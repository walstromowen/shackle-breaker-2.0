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

export const CREATION_DATA = {
    BACKGROUNDS: [
        {
            id: "TRAVELER", label: "Traveler",
            desc: "Travelers from far and wide came to see the incredible discovery of what was magic in the Altus Kingdom. Those first to arive were amazed by what they saw. Those last to arrive were horrified.",
            attributes: { vigor: 12, strength: 12, dexterity: 12, intelligence: 10, attunement: 10 },
            equipment: { mainHand: "shortsword", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        {
            id: "BLACKSMITH", label: "Blacksmith",
            desc: "The honest trade of blacksmithing is a profession that was held in high esteem by Alterians, and Panzerians alike. After the discovery of magic, most blacksmiths found themselves unable to find work, but with their sanity intact.",
            attributes: { vigor: 15, strength: 15, dexterity: 10, intelligence: 7, attunement: 7 },
            equipment: { mainHand: "warhammer", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        {
            id: "RANGER", label: "Ranger",
            desc: "Not all were enamored with the discovery of magic. A select few of the populance sought an escape from the people's obsession of it. Many of those that left became rangers, hunting wild animals and later more unnatural things.",
            attributes: { vigor: 11, strength: 10, dexterity: 16, intelligence: 9, attunement: 8 },
            equipment: { mainHand: "dagger", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
        {
            id: "SCHOLAR", label: "Scholar",
            desc: "Almost overnight, the scholars and philosophers of the Altus kingdom abandoned their studies to begin research of magic. Some saw magic as a science, others as life itself.",
            attributes: { vigor: 9, strength: 8, dexterity: 10, intelligence: 16, attunement: 14 },
            equipment: { mainHand: "insight_of_arcane", head: "tattered_hood", arms: "tattered_gloves", torso: "tattered_shirt", legs: "tattered_pants", feet: "tattered_boots" }
        },
    ],
    ORIGINS: [
        { label: "Alterian", tag: "LANG_ALTERIAN", desc: "Alterians are the oldest people of the known world and the first to discover magic. They are a fearless and adventurous people who hail from the ancient Altus kingdom. Despite their reputation as conquerors, Alterians are actually quite diplomatic. They value strength, honor, and loyalty to one's family. Or at least, they use to." },
        { label: "Panzerian", tag: "LANG_PANZERIAN", desc: "Panzerians are a creative and powerful people from the icy mountains of Panzeria. They are master engineers who have acomplished a variety of impressive technolgical and architectural feats. Most notably being their weapons of war including cannons, genetically engineered beasts, and the famous Panzerian armor. All of which were eventually used against them." },
        { label: "Namuh", tag: "LANG_NAMUH", desc: "The Namuh are a silent and mysterious people who communicate only through a form sign language. Not much is known about the Namuh people except for rumors, many of which speaking of a great tragedy befalling the Namuh people and the becoming of a shadow of their former selves." }
    ],
    APPEARANCES: [
        { label: "Legionary", spritePortrait: "legionaryHeroPortrait", spriteOverworld: "legionaryHeroSprite" },
        { label: "Warlord", spritePortrait: "warlordHeroPortrait", spriteOverworld: "warlordHeroSprite" },
        { label: "Nightblade", spritePortrait: "nightbladeHeroPortrait", spriteOverworld: "nightbladeHeroSprite" },
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
        { label: "War Dog", speciesId: "DOG", desc: "Loyal and sturdy.", attributes: { vigor: 12, strength: 10 }  },
        //{ label: "Hunting Hawk", speciesId: "AVIAN", desc: "Fast and watchful.", attributes: { dexterity: 16, speed: 10 }, equipment: { accessory: "tattered_shirt" } }
    ],
    DIFFICULTIES: [
        { id: "easy", label: "Easy", desc: "Easier challenge." },
        { id: "normal", label: "Normal", desc: "Balanced challenge." },
        { id: "hard", label: "Hard", desc: "Difficult challenge" },
        { id: "nightmare", label: "Nightmare", desc: "Hope is an illusion..." }
    ]
};

export class CharacterCreatorLogic {
    constructor() {
        this.menuOrder = ['name', 'background', 'origin', 'appearance', 'keepsake', 'companion', 'trait', 'difficulty', 'seed', 'start'];
        this.currentRow = 0;

        this.nameInput = new TextEntry("Shackle Breaker", 16);
        this.seedInput = new TextEntry("", 16); 
        this.isEditingName = false;
        this.isEditingSeed = false; 

        this.state = {
            name: "Shackle Breaker",
            seed: "", 
            backgroundIdx: 0,
            originIdx: 0,
            appearanceIdx: 0,
            keepsakeIdx: 0,
            companionIdx: 0,
            traitIdx: 0,
            difficultyIdx: 1
        };

        this.cachedStats = null;
        this.isDirty = true;
    }

    setRowByStep(stepName) {
        const idx = this.menuOrder.indexOf(stepName);
        if (idx !== -1) this.currentRow = idx;
    }

    moveRow(dir) {
        this.currentRow = this._cycle(this.currentRow, this.menuOrder.length, dir);
    }

    modifyValue(dir) {
        const step = this.menuOrder[this.currentRow];
        const d = CREATION_DATA;

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
            this.state[key] = this._cycle(this.state[key], max, dir);
            
            if (triggersDirty) this.isDirty = true;
            return triggersDirty; 
        }

        return false;
    }

    validateActiveInput() {
        if (this.isEditingName) {
            if (this.nameInput.value.trim() === "") {
                this.nameInput.reset("Shackle Breaker");
                this.state.name = "Shackle Breaker";
            }
            this.isEditingName = false;
        }
        
        if (this.isEditingSeed) {
            this.state.seed = this.seedInput.value;
            this.isEditingSeed = false;
        }
    }

    handleAction() {
        const step = this.menuOrder[this.currentRow];
        if (step === 'name') this.isEditingName = true;
        else if (step === 'seed') this.isEditingSeed = true; 
        else if (step === 'start') this.finalizeCharacter();
    }

    _cycle(current, max, dir) {
        return (current + dir + max) % max;
    }

    getCurrentStep() {
        return this.menuOrder[this.currentRow];
    }

    getPreviewStats() {
        if (this.isDirty) {
            try {
                const tempEntity = this._createPreviewEntity();
                this.cachedStats = tempEntity ? StatCalculator.calculateDetailed(tempEntity) : null;
            } catch (e) {
                console.error("Preview Calculation CRASHED:", e);
                this.cachedStats = null;
            }
            this.isDirty = false;
        }
        return this.cachedStats;
    }

    _buildPlayerOverrides() {
        const bg = CREATION_DATA.BACKGROUNDS[this.state.backgroundIdx];
        const origin = CREATION_DATA.ORIGINS[this.state.originIdx];
        const app = CREATION_DATA.APPEARANCES[this.state.appearanceIdx];
        const trait = CREATION_DATA.TRAITS[this.state.traitIdx];

        return {
            name: this.state.name,
            attributes: { ...bg.attributes },
            equipment: bg.equipment,
            spritePortrait: app.spritePortrait,
            spriteOverworld: app.spriteOverworld,
            tags: [origin.tag],
            traits: [trait.id],
            level: 1
        };
    }

    _createPreviewEntity() {
        const overrides = this._buildPlayerOverrides();
        overrides.equipment = this._resolveEquipment(overrides.equipment);
        return EntityFactory.create("HUMANOID", overrides);
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

        let finalSeed;
        if (this.state.seed && this.state.seed.trim() !== "") {
            finalSeed = parseInt(this.state.seed, 10);
            if (isNaN(finalSeed)) {
                finalSeed = this.state.seed.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a
                }, 0);
                finalSeed = Math.abs(finalSeed);
            }
        } else {
            finalSeed = Math.floor(Math.random() * 1000000);
        }

        gameState.seed = finalSeed;

        PartyManager.createMainCharacter("HUMANOID", this._buildPlayerOverrides());

        const keep = CREATION_DATA.KEEPSAKES[this.state.keepsakeIdx];
        if (keep.items) {
            keep.items.forEach(i => InventorySystem.addItem(i.id, i.qty));
        } else if (keep.itemId) {
            InventorySystem.addItem(keep.itemId, 1);
        }

        // --- FIXED: ADD ONLY ONE COMPANION ---
        const comp = CREATION_DATA.COMPANIONS[this.state.companionIdx];
        if (comp.speciesId) {
            const companionInstance = PartyManager.addMember(comp.speciesId, {
                name: comp.label, // Stripped out the tracking index text "1"
                attributes: { ...comp.attributes },
                equipment: comp.equipment,
                xp: 0
            });
            if (companionInstance) {
                companionInstance.hp = companionInstance.maxHp;
                companionInstance.stamina = companionInstance.maxStamina;
            }
        }

        gameState.party.currency = 100;
        gameState.difficulty = CREATION_DATA.DIFFICULTIES[this.state.difficultyIdx].id;

        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
}