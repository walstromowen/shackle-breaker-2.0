import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { CraftingManager } from '../../../../shared/systems/craftingManager.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { ItemUpgradeSystem } from '../../../../shared/systems/itemUpgradeSystem.js';
import { ScrollManager } from '../../ui/scrollManager.js';

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
        
        this.layout = {
            recipeBounds: null,
            partyBounds: null,
            recipeMaxScroll: 0,
            partyMaxScroll: 0,
            viewportH: 300,
            itemHeight: 48
        };
        
        this.currentHitboxes = [];
        this._syncScrollZones();
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
        this.inputMode = 'mouse';
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    /// --- ITEM SELECTION LOGIC ---
    selectRecipe(recipe) {
        this.selectedUpgradeItem = null;
        this.selectedRecipe = recipe;
        this.checkCraftability();
    }

    selectUpgradeItem(item) {
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

    // 4. EMIT CRAFTING EVENT FOR QUEST TRACKING
    events.emit('ITEM_CRAFTED', { 
        itemId: outputId, 
        quantity: outputQty 
    });

    this.checkCraftability();
    this.updateHitboxes(this.currentHitboxes);
    events.emit('PLAY_SOUND', { id: 'crafting_success' });
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
            // 3. Re-run your upgrade check. Automatically generates the NEW nextStats for the preview!
            this.checkUpgradeability();
            
            // 4. Force a UI refresh and play a sound
            this.updateHitboxes(this.currentHitboxes);
            
            if (typeof events !== 'undefined') {
                events.emit('PLAY_SOUND', { id: 'crafting_success' });
            }
        }
    }

    // --- UI INTERACTION CALLBACKS ---
    onHover(hitboxId) {
        super.onHover(hitboxId);
    }

    onClick(hitboxId) {
        this.inputMode = 'mouse';
        if (!hitboxId) return;

        const normalizedId = hitboxId.toUpperCase();

        if (normalizedId === 'BTN_CLOSE') {
            events.emit('CHANGE_SCENE', { scene: 'overworld' });
            return;
        }

        if (normalizedId === 'BTN_CRAFT' && this.canCraftSelected) {
            this.executeCrafting();
            return;
        }

        if (normalizedId === 'BTN_UPGRADE' && this.canUpgradeSelected) {
            this.executeUpgrade();
            return;
        }

        // --- Handle Tab Selection ---
        if (normalizedId.startsWith('TAB_')) {
            const tabName = normalizedId.replace('TAB_', '').toLowerCase();
            if (['description', 'stats', 'skills'].includes(tabName)) {
                this.activeTab = tabName;
                events.emit('PLAY_SOUND', { id: 'uiClick' });
            }
            return;
        }

        // --- Handle Recipe Selection ---
        if (normalizedId.startsWith('RECIPE_')) {
            const recipeId = hitboxId.substring(7);
            const recipe = this.availableRecipes.find(r => r.id === recipeId || r.id.toLowerCase() === recipeId.toLowerCase());
            
            if (recipe) {
                this.selectRecipe(recipe);
                events.emit('PLAY_SOUND', { id: 'uiClick' });
            }
            return;
        }

        // --- Handle Inventory Item Selection ---
        if (normalizedId.startsWith('PARTY_ITEM_')) {
            const index = parseInt(normalizedId.replace('PARTY_ITEM_', ''), 10);
            const inventoryList = this._getFormattedInventory();
            const selected = inventoryList[index];
            
            if (selected) {
                // If it's unique gear it has an instanceId, grab the real one.
                // If it's a stacked material, just use the formatted object directly!
                const realItem = selected.instanceId 
                    ? gameState.party.inventory.find(i => i.instanceId === selected.instanceId) 
                    : selected;
                    
                if (realItem) {
                    this.selectUpgradeItem(realItem);
                    events.emit('PLAY_SOUND', { id: 'uiClick' });
                }
            }
            return;
        }
    }

    onRightClick(hitboxId) {
        events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }
    

    // --- STATE FORMATTING ---
    _getFormattedInventory() {
        const formatted = [];
        const stackables = new Map();

        gameState.party.inventory.forEach(item => {
            if (!item) return;

            const itemId = item.defId || item.id;
            const def = ItemDefinitions[itemId] || {};
            const isEquipment = ['weapon', 'armor', 'shield'].includes((def.type || '').toLowerCase());

            if (item.isUpgradeable || isEquipment) {
                formatted.push({
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
                    value: item.value
                });
            } else {
                const currentQty = stackables.get(itemId) || 0;
                stackables.set(itemId, currentQty + (item.qty || 1));
            }
        });

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

        return [...formatted, ...aggregated];
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
            canUpgradeSelected: this.canUpgradeSelected,
            activeTab: this.activeTab,
            
            // Layout & Scrolling Support
            layout: this.layout,
            recipeScrollOffset: this.recipeScrollOffset,
            partyScrollOffset: this.partyScrollOffset,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes),
            
            // Interaction & Data
            hoveredHitboxId: this.hoveredHitboxId,
            mouse: this.mouse,
            partyCurrency: gameState.party.currency,
            partyInventory: this._getFormattedInventory()
        };
    }
}