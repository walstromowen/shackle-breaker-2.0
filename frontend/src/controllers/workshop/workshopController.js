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
        
        this.availableRecipes = CraftingManager.getVisibleRecipes(gameState);
        if (this.availableRecipes.length > 0) {
            this.selectRecipe(this.availableRecipes[0]);
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
            onChange: (newOffset) => { this.recipeScrollOffset = newOffset; }
        });
        
        this.scrollManager.registerZone('party', {
            bounds: this.layout.partyBounds,
            maxScroll: this.layout.partyMaxScroll,
            viewportH: this.layout.viewportH,
            thumbIds: ['SCROLLBAR_THUMB_PARTY'],
            onChange: (newOffset) => { this.partyScrollOffset = newOffset; }
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

    // --- ITEM SELECTION LOGIC ---
    
    selectRecipe(recipe) {
        this.selectedUpgradeItem = null;
        this.selectedRecipe = recipe;
        this.activeTab = 'description';
        this.checkCraftability();
    }
    
    selectUpgradeItem(item) {
        this.selectedRecipe = null;
        this.selectedUpgradeItem = item;
        this.activeTab = 'description';
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
        InventorySystem.addItem(
            this.selectedRecipe.outputItemId,
            (this.selectedRecipe.outputQuantity || 1)
        );
        
        this.checkCraftability();
        this.updateHitboxes(this.currentHitboxes);
        events.emit('PLAY_SOUND', { id: 'crafting_success' });
    }

    // --- UPGRADING LOGIC ---
    
    checkUpgradeability() {
        if (!this.selectedUpgradeItem) return;
        this.canUpgradeSelected = ItemUpgradeSystem.canUpgrade(this.selectedUpgradeItem);
    }

    executeUpgrade() {
        if (ItemUpgradeSystem.upgradeItem(this.selectedUpgradeItem)) {
            this.checkUpgradeability();
            this.updateHitboxes(this.currentHitboxes);
            events.emit('PLAY_SOUND', { id: 'crafting_success' });
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

    // Split inventory: equipment/upgradeables remain individual instances.
    // Materials and consumables are stacked by definition ID.
    gameState.party.inventory.forEach(item => {
        if (!item) return;
        
        // Grab the base definition ID safely
        const itemId = item.defId || item.id;
        const def = ItemDefinitions[itemId] || {};
        const isEquipment = ['weapon', 'armor', 'shield'].includes((def.type || '').toLowerCase());

        if (item.isUpgradeable || isEquipment) {
            // Retain specific instance, but explicitly normalize fallback properties
            formatted.push({
                ...item,
                defId: itemId, // ADDED: Ensures the renderer can always look up the definition
                name: item.name || def.name || itemId, // ADDED: Ensures name text doesn't fail
                type: item.type || def.type || 'item',
                slot: item.slot || def.slot || '',
                icon: item.icon || def.icon
            });
        } else {
            // ADDED: Safely group stackables by itemId rather than strictly item.defId
            const currentQty = stackables.get(itemId) || 0;
            stackables.set(itemId, currentQty + (item.qty || 1));
        }
    });

    // Map stacked items back to a fully decorated array
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