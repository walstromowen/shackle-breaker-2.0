import { BaseController } from '../core/baseController.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { events } from '../../core/eventBus.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { CraftingManager } from '../../../../shared/systems/craftingManager.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { ItemUpgradeSystem } from '../../../../shared/systems/itemUpgradeSystem.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { QuestDefinitions } from '../../../../shared/data/questDefinitions.js';
import { QuestModel } from '../../../../shared/models/questModel.js';

export class WorkshopController extends BaseController {
    constructor(input) {
        super(input);
        
        // Station properties
        this.stationId = 'any';
        this.stationTitle = 'Workshop';
        
        // Crafting State
        this.availableRecipes = [];
        this.selectedRecipe = null;
        this.canCraftSelected = false;
        
        // Upgrading State
        this.selectedUpgradeItem = null;
        this.canUpgradeSelected = false;
        
        // Default to the description tab when opening the workshop
        this.activeTab = 'description';
        
        // --- Scroll & Layout Support ---
        this.scrollManager = new ScrollManager();
        this.recipeScrollOffset = 0;
        this.partyScrollOffset = 0;
        this.detailsScrollOffset = 0; // scroll position of the centre (stats / skills) panel
        
        this.layout = {
            recipeBounds: null,
            partyBounds: null,
            detailsBounds: null,
            recipeMaxScroll: 0,
            partyMaxScroll: 0,
            detailsMaxScroll: 0,
            viewportH: 300,
            itemHeight: 48
        };
        
        this.currentHitboxes = [];
        this.focusId = null; // the keyboard cursor (a hitbox id)
        this._syncScrollZones();
    }

    // ========================================================
    // FOCUS & KEYBOARD (shared standard, see BaseController)
    // ========================================================
    // The things the keyboard cursor may land on
    static FOCUSABLE = /^(BTN_CLOSE|BTN_CRAFT|BTN_UPGRADE|TAB_|RECIPE_|PARTY_ITEM_)/i;

    _focusables() {
        return this.currentHitboxes.filter(h => WorkshopController.FOCUSABLE.test(h.id));
    }

    getKeyboardFocusId() {
        return this.currentHitboxes.some(h => h.id === this.focusId) ? this.focusId : null;
    }

    // The mouse moved onto something: the keyboard cursor follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        if (WorkshopController.FOCUSABLE.test(hitboxId)) this.focusId = hitboxId;
    }

    handleKeyDown(keyCode, e) {
        const intent = this.resolveIntent(keyCode, e);
        if (!intent) return;

        if (intent === 'CANCEL') {
            this._close();
        } else if (intent === 'CONFIRM') {
            const id = this.getKeyboardFocusId();
            if (id) this.onClick(id);
            else this._moveFocus('DOWN'); // nothing focused yet: the first press just shows the cursor
        } else {
            this._moveFocus(intent);
        }
    }

    _moveFocus(direction) {
        const next = this.findSpatialNeighbor(direction, this.getKeyboardFocusId(), this._focusables());
        if (next && next !== this.focusId) {
            this.focusId = next;
            this.playNavSound();
        } else if (next === null) {
            this._scrollListAtEdge(direction);
        }
    }

    // At the end of the recipe / inventory list the next row is off screen (and so has no hitbox yet): scroll it into view.
    _scrollListAtEdge(direction) {
        if (direction !== 'UP' && direction !== 'DOWN') return;
        const id = (this.focusId || '').toUpperCase();
        const step = (this.layout.itemHeight || 48) * (direction === 'DOWN' ? 1 : -1);
        if (id.startsWith('RECIPE_')) {
            this.scrollManager.setOffset('recipes', Math.max(0, Math.min(this.layout.recipeMaxScroll, this.recipeScrollOffset + step)), true);
        } else if (id.startsWith('PARTY_ITEM_')) {
            this.scrollManager.setOffset('party', Math.max(0, Math.min(this.layout.partyMaxScroll, this.partyScrollOffset + step)), true);
        }
    }

    _close() {
        this.playCancelSound();
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    init(data) {
        if (super.init) super.init(data);

        // Read station data passed in from the Overworld interaction via SceneManager
        this.stationId = data?.station || 'any';
        this.stationTitle = data?.title || 'Workshop';

        // Fetch all unlocked visible recipes, then filter based on station
        const allRecipes = CraftingManager.getVisibleRecipes(gameState);
        this.availableRecipes = allRecipes.filter(recipe => {
            // If we passed 'all' (e.g. from debug/menu), show everything.
            // Otherwise, only show recipes assigned to this exact station OR generic 'any' prep recipes.
            return this.stationId === 'all' || recipe.station === this.stationId || recipe.station === 'any';
        });

        if (this.availableRecipes.length > 0) {
            this.selectRecipe(this.availableRecipes[0]);
        } else {
            this.selectedRecipe = null;
            this.canCraftSelected = false;
        }

        this.recipeScrollOffset = 0;
        this.partyScrollOffset = 0;
        this._syncScrollZones();
    }

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
    }

    // --- SCROLL MANAGEMENT ---
    _syncScrollZones() {
        this.scrollManager.registerZone('recipes', {
            bounds: this.layout.recipeBounds,
            maxScroll: this.layout.recipeMaxScroll,
            viewportH: this.layout.viewportH,
            thumbIds: ['SCROLLBAR_THUMB_RECIPES'],
            onChange: (newOffset) => {
                this.recipeScrollOffset = newOffset;
            }
        });

        this.scrollManager.registerZone('party', {
            bounds: this.layout.partyBounds,
            maxScroll: this.layout.partyMaxScroll,
            viewportH: this.layout.viewportH,
            thumbIds: ['SCROLLBAR_THUMB_PARTY'],
            onChange: (newOffset) => {
                this.partyScrollOffset = newOffset;
            }
        });
    }

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
        this.currentHitboxes = hitboxes;

        // Dynamically calculate max scroll heights based on item counts
        const ROW_H = this.layout.itemHeight || 48;
        const VIEW_H = this.layout.viewportH || 300;
        
        const partyItemsCount = this._getFormattedInventory().length;
        const recipeRows = this.availableRecipes.length;
        const partyRows = Math.ceil(partyItemsCount / 4); // 4 columns for inventory

        this.layout.recipeMaxScroll = Math.max(0, (recipeRows * ROW_H) - VIEW_H);
        this.layout.partyMaxScroll = Math.max(0, (partyRows * ROW_H) - VIEW_H);
        
        this._syncScrollZones();
    }

    handleScroll(delta) {
        // The centre panel (stats / skills) scrolls when its content is taller than the space
        // above the materials footer.
        const b = this.layout.detailsBounds;
        const maxScroll = this.layout.detailsMaxScroll || 0;
        if (b && maxScroll > 0 &&
            this.mouse.x >= b.x && this.mouse.x <= b.x + b.w &&
            this.mouse.y >= b.y && this.mouse.y <= b.y + b.h) {
            const step = 80 * Math.sign(delta || 0);
            this.detailsScrollOffset = Math.min(maxScroll, Math.max(0, this.detailsScrollOffset + step));
            return;
        }

        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    /// --- ITEM SELECTION LOGIC ---
    selectRecipe(recipe) {
        this.detailsScrollOffset = 0;
        this.selectedUpgradeItem = null;
        this.selectedRecipe = recipe;
        this.checkCraftability();
    }

    selectUpgradeItem(item) {
        this.detailsScrollOffset = 0;
        this.selectedRecipe = null;
        this.selectedUpgradeItem = item;
        this.checkUpgradeability();
    }

    // --- CRAFTING LOGIC ---
    checkCraftability() {
        if (!this.selectedRecipe) return;

        let canCraft = true;

        if ((gameState.party.currency || 0) < (this.selectedRecipe.currencyCost || 0)) {
            canCraft = false;
        }

        if (this.selectedRecipe.materials) {
            for (const [matId, amountNeeded] of Object.entries(this.selectedRecipe.materials)) {
                if (!InventorySystem.hasItem(matId, amountNeeded)) {
                    canCraft = false;
                    break;
                }
            }
        }

        this.canCraftSelected = canCraft;
    }

    executeCrafting() {
        // 1. Deduct Currency
        gameState.party.currency -= (this.selectedRecipe.currencyCost || 0);

        // 2. Remove Materials
        for (const [matId, amountNeeded] of Object.entries(this.selectedRecipe.materials || {})) {
            InventorySystem.removeItem(matId, amountNeeded);
        }

        // 3. Add Crafted Item
        const outputId = this.selectedRecipe.outputItemId;
        const outputQty = this.selectedRecipe.outputQuantity || 1;
        InventorySystem.addItem(outputId, outputQty);

        // 4. EMIT CRAFTING EVENT
        events.emit('ITEM_CRAFTED', { itemId: outputId, quantity: outputQty });

        // ---> NEW: DIRECT QUEST PROGRESSION FOR CRAFTING <---
        if (gameState.quests && gameState.quests.active) {
            Object.keys(gameState.quests.active).forEach(questId => {
                const questDef = QuestDefinitions[questId];
                if (questDef) {
                    questDef.objectives.forEach(obj => {
                        // Check if this quest needs THIS specific item to be crafted
                        if (obj.type === 'craft' && obj.targetId === outputId) {
                            const didUpdate = QuestModel.updateProgress(gameState, questId, obj.id, outputQty);
                            
                            // Check if this craft completed the quest
                            if (didUpdate && QuestModel.checkCompletion(gameState, questId)) {
                                console.log(`[Workshop] Quest Ready to Turn In: ${questDef.name}!`);
                                // If you want quests to auto-complete and give rewards instantly instead 
                                // of going to the Journal to collect them, uncomment the line below:
                                // QuestModel.completeQuest(gameState, questId);
                            }
                        }
                    });
                }
            });
        }

        // 5. Refresh UI & Play Sound (the confirm click, then the crafting flourish on top of it)
        this.checkCraftability();
        this.updateHitboxes(this.currentHitboxes);
        this.playConfirmSound();
        this.playSfx(UI_SFX.success, 0.8);
    }

    // --- UPGRADING LOGIC ---
    checkUpgradeability() {
        if (!this.selectedUpgradeItem) return;
        this.canUpgradeSelected = ItemUpgradeSystem.canUpgrade(this.selectedUpgradeItem);
        
        // Generate and attach projected stats for the renderer preview
        this._attachProjectedStats(this.selectedUpgradeItem);
    }

    _attachProjectedStats(item) {
        if (!item || item.isMaxLevel) return;
        
        try {
            // 1. Clone the item while keeping its class prototype (getters) intact
            const dummyItem = Object.assign(Object.create(Object.getPrototypeOf(item)), item);
            
            // 2. Increment the level. Because we kept the prototype, the getters will naturally scale!
            dummyItem.level = (dummyItem.level || 0) + 1;
            
            // 3. Explicitly map the evaluated stat groups to nextStats so the UI can read them
            item.nextStats = {
                attack: dummyItem.attack,
                defense: dummyItem.defense,
                resistance: dummyItem.resistance,
                attributes: dummyItem.attributes,
                value: dummyItem.value
            };
        } catch (e) {
            console.warn("WorkshopController: Could not project next level stats for preview.", e);
        }
    }

    executeUpgrade() {
        // 1. Grab the currently selected item
        const item = this.selectedUpgradeItem;
        if (!item) return;

        // 2. Delegate to your existing ItemUpgradeSystem!
        const success = ItemUpgradeSystem.upgradeItem(item);
        if (success) {
            // 2b. If a party member is wearing it, rebuild their stats right away
            this._refreshHolderStats(item);

            // 3. Re-run your upgrade check. Automatically generates the NEW nextStats for the preview!
            this.checkUpgradeability();
            
            // 4. Force a UI refresh and play a sound
            this.updateHitboxes(this.currentHitboxes);
            
            this.playConfirmSound();
            this.playSfx(UI_SFX.success, 0.8);
        } else {
            this.playErrorSound();
        }
    }

    // --- UI INTERACTION CALLBACKS ---
    // The mouse and the keyboard both arrive here, so every branch makes its own sound.
    onClick(hitboxId) {
        if (!hitboxId) return;

        const normalizedId = hitboxId.toUpperCase();

        if (normalizedId === 'BTN_CLOSE') {
            this._close();
            return;
        }

        if (normalizedId === 'BTN_CRAFT') {
            if (this.canCraftSelected) this.executeCrafting();
            else this.playErrorSound(); // missing materials / money, or nothing selected
            return;
        }

        if (normalizedId === 'BTN_UPGRADE') {
            if (this.canUpgradeSelected) this.executeUpgrade();
            else this.playErrorSound();
            return;
        }

        // --- Handle Tab Selection ---
        if (normalizedId.startsWith('TAB_')) {
            const tabName = normalizedId.replace('TAB_', '').toLowerCase();
            if (['description', 'stats', 'skills'].includes(tabName)) {
                this.activeTab = tabName;
                this.detailsScrollOffset = 0;
                this.playConfirmSound();
            }
            return;
        }

        // --- Handle Recipe Selection ---
        if (normalizedId.startsWith('RECIPE_')) {
            const recipeId = hitboxId.substring(7);
            const recipe = this.availableRecipes.find(r => r.id === recipeId || r.id.toLowerCase() === recipeId.toLowerCase());
            
            if (recipe) {
                this.selectRecipe(recipe);
                this.playConfirmSound();
            }
            return;
        }

        // --- Handle Inventory Item Selection ---
        if (normalizedId.startsWith('PARTY_ITEM_')) {
            const index = parseInt(normalizedId.replace('PARTY_ITEM_', ''), 10);
            const inventoryList = this._getFormattedInventory();
            const selected = inventoryList[index];
            
            if (selected) {
                // Gear entries (carried OR equipped) carry a direct reference to the live item.
                // Stacked materials have no reference, so the formatted object is used as-is.
                const realItem = selected._ref
                    ? selected._ref
                    : (selected.instanceId
                        ? gameState.party.inventory.find(i => i.instanceId === selected.instanceId)
                        : selected);

                if (realItem) {
                    this.selectUpgradeItem(realItem);
                    this.playConfirmSound();
                }
            }
            return;
        }
    }

    onRightClick(hitboxId) {
        this._close();
    }
    

    // --- EQUIPPED GEAR HELPERS ---
    /**
     * Returns the equipment map of a party member (slot -> item).
     * Entities keep it either on member.state.equipment or member.equipment.
     */
    _getEquipmentMap(member) {
        return member?.state?.equipment || member?.equipment || null;
    }

    /**
     * Lists every item currently worn by a party member, with who holds it.
     * @returns {{item: object, member: object, memberIndex: number, slot: string}[]}
     */
    _getEquippedEntries() {
        const entries = [];
        const members = gameState.party?.members || [];

        members.forEach((member, memberIndex) => {
            const equipment = this._getEquipmentMap(member);
            if (!equipment) return;

            Object.entries(equipment).forEach(([slot, item]) => {
                if (item) entries.push({ item, member, memberIndex, slot });
            });
        });

        return entries;
    }

    /**
     * Finds which party member (if any) is wearing the given item instance.
     * @returns {{member: object, name: string, index: number, slot: string}|null}
     */
    _findHolder(item) {
        if (!item) return null;

        const entry = this._getEquippedEntries().find(e =>
            e.item === item || (item.instanceId && e.item.instanceId === item.instanceId)
        );
        if (!entry) return null;

        return {
            member: entry.member,
            name: entry.member.name || entry.member.id || `Member ${entry.memberIndex + 1}`,
            index: entry.memberIndex,
            slot: entry.slot
        };
    }

    /**
     * After upgrading worn gear, the holder's derived stats must be rebuilt so combat
     * and the character sheet pick up the new level immediately.
     */
    _refreshHolderStats(item) {
        const holder = this._findHolder(item);
        if (!holder) return;

        const member = holder.member;
        const refreshFns = ['recalculateStats', 'recalcStats', 'refreshStats', 'updateStats', 'calculateStats'];
        for (const fnName of refreshFns) {
            if (typeof member[fnName] === 'function') {
                member[fnName]();
                return;
            }
        }
    }

    // --- STATE FORMATTING ---
    _isGear(item) {
        const def = ItemDefinitions[item.defId || item.id] || {};
        const isEquipment = ['weapon', 'armor', 'shield'].includes((def.type || '').toLowerCase());
        return !!(item.isUpgradeable || isEquipment);
    }

    /**
     * Builds the flat UI object for a unique piece of gear.
     * `_ref` keeps a pointer to the live item so upgrades hit the real instance
     * (carried in the bag or worn by a member).
     */
    _formatGear(item, holder = null) {
        const itemId = item.defId || item.id;
        const def = ItemDefinitions[itemId] || {};

        return {
            ...item,
            defId: itemId,
            name: item.name || def.name || itemId,
            type: item.type || def.type || 'item',
            slot: item.slot || def.slot || '',
            icon: item.icon || def.icon,
            // Explicitly evaluate the getters so the UI renderer can see them
            attack: item.attack,
            defense: item.defense,
            resistance: item.resistance,
            attributes: item.attributes,
            value: item.value,
            _ref: item,
            // Holder info (null/undefined when the item is just sitting in the bag)
            equippedBy: holder ? (holder.member.name || holder.member.id || `Member ${holder.memberIndex + 1}`) : null,
            equippedByIndex: holder ? holder.memberIndex : null,
            equippedSlot: holder ? holder.slot : null
        };
    }

    _getFormattedInventory() {
        const carriedGear = [];
        const stackables = new Map();

        gameState.party.inventory.forEach(item => {
            if (!item) return;

            if (this._isGear(item)) {
                carriedGear.push(this._formatGear(item));
            } else {
                const itemId = item.defId || item.id;
                const currentQty = stackables.get(itemId) || 0;
                stackables.set(itemId, currentQty + (item.qty || 1));
            }
        });

        // Gear currently worn by party members, so it can be upgraded without unequipping
        const equippedGear = this._getEquippedEntries()
            .filter(entry => this._isGear(entry.item))
            .map(entry => this._formatGear(entry.item, entry));

        const aggregated = Array.from(stackables, ([defId, qty]) => {
            const def = ItemDefinitions[defId] || {};
            return {
                defId: defId,
                id: defId,
                qty: qty,
                name: def.name || defId,
                type: def.type || 'item',
                slot: def.slot || '',
                icon: def.icon || null,
                description: def.description || '',
                cost: def.cost || def.value || 0
            };
        });

        return [...carriedGear, ...equippedGear, ...aggregated];
    }

    getState() {
        return {
            // Metadata exposed for the Renderer to use
            stationId: this.stationId,
            stationTitle: this.stationTitle,
            
            // Recipe & Upgrade States
            availableRecipes: this.availableRecipes,
            selectedRecipe: this.selectedRecipe,
            canCraftSelected: this.canCraftSelected,
            
            selectedUpgradeItem: this.selectedUpgradeItem,
            // Who is wearing the selected item (null if it's in the bag) - looked up live
            selectedUpgradeHolder: this._findHolder(this.selectedUpgradeItem),
            canUpgradeSelected: this.canUpgradeSelected,
            activeTab: this.activeTab,
            
            // Layout & Scrolling Support
            layout: this.layout,
            recipeScrollOffset: this.recipeScrollOffset,
            partyScrollOffset: this.partyScrollOffset,
            detailsScrollOffset: this.detailsScrollOffset,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes),
            
            // Interaction & Data
            hoveredHitboxId: this.getFocusId(), // the hovered element in mouse mode, the keyboard cursor in keyboard mode
            mouse: this.mouse,
            partyCurrency: gameState.party.currency,
            partyInventory: this._getFormattedInventory()
        };
    }
}