import { BaseController } from '../core/baseController.js';
import { UI_SFX } from '../../ui/uiSfx.js';
import { gameState } from '../../../../shared/state/gameState.js';
import { events } from '../../core/eventBus.js';
import { DragAndDropManager } from '../../ui/dragAndDropManager.js';
import { ScrollManager } from '../../ui/scrollManager.js';
import { ContextMenuManager } from '../../ui/contextMenuManager.js';
import { InventorySystem } from '../../../../shared/systems/inventorySystem.js';
import { ItemDefinitions } from '../../../../shared/data/itemDefinitions.js';
import { AbilitySystem } from '../../../../shared/systems/abilitySystem.js';
import { CharacterSummaryLogic } from './characterSummaryLogic.js';

// This screen's own keys, on top of the shared ones (arrows / WASD, Enter / Space, Esc / Backspace / Tab)
const SUMMARY_KEYS = {
    'KeyQ': 'PREV_CHAR',
    'KeyE': 'NEXT_CHAR',
    'KeyV': 'TOGGLE_VIEW',
    'KeyX': 'DELETE',
    'Delete': 'DELETE'
};

export class CharacterSummaryController extends BaseController {
    constructor(input, data) {
        super(input, data);
        this.config = data || {};
        this.returnScene = this.config.returnScene || 'party';
        this.extraBindings = SUMMARY_KEYS;
        this.notice = null; // { text, until }: a short line for the player ("You light the Torch..."), shown by the renderer

        // Initialize Core Logic
        this.logic = new CharacterSummaryLogic(this.config);

        // View State
        this.state = 'SLOTS';
        this.viewMode = 'STATS';
        this.activeSlots = [];
        this.slotIndex = -1;
        this._lastSlotIndex = 0; // the slot the cursor was on before it moved to the inventory (Back returns to it)
        this.filteredInventory = [];
        this.inventoryIndex = -1;

        // --- GRID CONFIGURATION ---
        this.COLS = 4;
        this.detailsScrollOffset = 0;
        this.inventoryScrollOffset = 0;
        this.wasMouseDown = false;
        
        this.layout = {
            detailMaxScroll: 0,
            detailViewportH: 300,
            abilitiesMaxScroll: 0,
            abilitiesViewportH: 300,
            inventoryMaxScroll: 0,
            inventoryViewportH: 300,
            inventoryBounds: null,
            detailBounds: null,
            abilitiesBounds: null,
            itemHeight: 48
        };

        // Initialize Managers
        this.dragAndDropManager = new DragAndDropManager();
        this.scrollManager = new ScrollManager();
        this.contextMenuManager = new ContextMenuManager({
            owner: this, // the menu plays its sounds through this controller
            onAction: (actionId, payload) => this.executeMenuAction(actionId, payload)
        });

        this._syncScrollZones();
        this.updateActiveSlots();
        this.setupInteractionHandlers();
    }

    get currentMember() {
        return this.logic.currentMember;
    }

    update(dt) {
        if (super.update) super.update(dt);
        this.scrollManager.update(dt);
    }

    _syncScrollZones() {
        this.scrollManager.registerZone('inventory', {
            bounds: this.layout.inventoryBounds,
            maxScroll: this.layout.inventoryMaxScroll,
            viewportH: this.layout.inventoryViewportH,
            thumbIds: ['INV_SCROLLBAR_THUMB'],
            onChange: (newOffset) => {
                this.inventoryScrollOffset = newOffset;
            }
        });

        const isAbilities = this.viewMode === 'ABILITIES';
        this.scrollManager.registerZone('details', {
            bounds: isAbilities ? this.layout.abilitiesBounds : this.layout.detailBounds,
            maxScroll: isAbilities ? this.layout.abilitiesMaxScroll : this.layout.detailMaxScroll,
            viewportH: isAbilities ? this.layout.abilitiesViewportH : this.layout.detailViewportH,
            thumbIds: ['SCROLLBAR_THUMB', 'ABILITIES_SCROLLBAR_THUMB'],
            onChange: (newOffset) => {
                this.detailsScrollOffset = newOffset;
            }
        });
    }

    setupInteractionHandlers() {
        this.handlers = {
            'BTN_PREV_CHAR': () => this.cycleMember(-1),
            'BTN_NEXT_CHAR': () => this.cycleMember(1),
            'BTN_BACK': () => this._handleBack(),
            'BTN_UNEQUIP': () => this.unequipCurrentSlot(),
            // Text Editing Trigger
            'BTN_EDIT_NAME': () => {
                this.logic.startNameEdit();
                this.playConfirmSound();
            },
            // Tabs
            'TAB_STATS': () => this.setViewMode('STATS'),
            'BTN_TAB_STATS': () => this.setViewMode('STATS'),
            'TAB_ITEM': () => this.setViewMode('ITEM'),
            'BTN_TAB_ITEM': () => this.setViewMode('ITEM'),
            'TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
            'BTN_TAB_ABILITIES': () => this.setViewMode('ABILITIES'),
        };
    }
    
    _validateIndices() {
        // Clamp Equipment Slots
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = Math.max(0, this.activeSlots.length - 1);
            if (this.activeSlots.length === 0) this.slotIndex = -1;
        }

        // Clamp Inventory
        if (this.inventoryIndex >= this.filteredInventory.length) {
            this.inventoryIndex = Math.max(0, this.filteredInventory.length - 1);
            if (this.filteredInventory.length === 0) this.inventoryIndex = -1;
        }

        // AUTO-SWITCH FOCUS: If the active panel is empty but the other is not
        if (this.state === 'INVENTORY' && this.inventoryIndex === -1 && this.activeSlots.length > 0) {
            this.state = 'SLOTS';
            this.slotIndex = 0;
        } else if (this.state === 'SLOTS' && this.slotIndex === -1 && this.filteredInventory.length > 0) {
            this.state = 'INVENTORY';
            this.inventoryIndex = 0;
        }

        this._syncScrollZones();
    }

    // The keyboard cursor, as a hitbox id (null when it is on neither panel)
    getKeyboardFocusId() {
        if (this.state === 'SLOTS' && this.slotIndex !== -1 && this.activeSlots[this.slotIndex]) {
            return `SLOT_${this.activeSlots[this.slotIndex]}`;
        }
        if (this.state === 'INVENTORY' && this.inventoryIndex !== -1) return `INV_ITEM_${this.inventoryIndex}`;
        return null;
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);

        // The mouse left everything: clear the cursor (not while the keyboard is driving, a drag is held or a menu is open)
        if (!hitboxId && this.inputMode === 'mouse'
            && !this.dragAndDropManager.dragState.active && !this.contextMenuManager.menu) {
            this.slotIndex = -1;
            this.inventoryIndex = -1;
        }
    }

    // The mouse moved onto something: the keyboard cursor follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        // Ignore if dragging or menu is open
        if (this.dragAndDropManager.dragState.active || this.contextMenuManager.menu) return;

        if (hitboxId) {
            if (hitboxId.startsWith('SLOT_')) {
                const slotName = hitboxId.replace('SLOT_', '');
                const newIndex = this.activeSlots.indexOf(slotName);
                if (newIndex !== -1 && (this.slotIndex !== newIndex || this.state !== 'SLOTS')) {
                    this.slotIndex = newIndex;
                    this.state = 'SLOTS';
                    this.inventoryIndex = -1;
                }
            } else if (hitboxId.startsWith('INV_ITEM_')) {
                const idx = parseInt(hitboxId.split('_')[2], 10);
                if (!isNaN(idx) && (this.inventoryIndex !== idx || this.state !== 'INVENTORY')) {
                    if (this.slotIndex !== -1) this._lastSlotIndex = this.slotIndex;
                    this.inventoryIndex = idx;
                    this.state = 'INVENTORY';
                    this.slotIndex = -1;
                }
            } else {
                this.slotIndex = -1;
                this.inventoryIndex = -1;
            }
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        if (this.pendingHotbarItem) { this.pendingHotbarItem = null; this.notice = null; } // a click drops a half-made hotbar choice

        // If clicking anywhere else while editing the name, attempt to save
        if (this.logic.isEditingName && hitboxId !== 'BTN_EDIT_NAME') {
            if (this.logic.validateName()) {
                this.playConfirmSound();
            }
        }

        if (!hitboxId) {
            if (this.contextMenuManager.menu) {
                this.contextMenuManager.close();
                this.playCancelSound();
            } else {
                // Clicking on nothing lets go of the selection; with no selection nothing happened, so no sound
                const hadSelection = this.slotIndex !== -1 || this.inventoryIndex !== -1;
                this.deselectSlot();
                if (hadSelection) this.playCancelSound();
                else return false;
            }
            return;
        }

        if (this.contextMenuManager.menu) {
            if (hitboxId.startsWith('CTX_OPT_')) {
                const optIndex = parseInt(hitboxId.split('_')[2], 10);
                this.contextMenuManager.executeAction(optIndex); // plays the action's own sound, or confirm
                return;
            }
            this.contextMenuManager.close();
            this.playCancelSound();
            return;
        }

        if (this.handlers && this.handlers[hitboxId]) {
            this.handlers[hitboxId]();
            return;
        }

        if (hitboxId.startsWith('HOTBAR_')) {
            this._clickHotbarSlot(hitboxId);
            return;
        }

        let item = null;
        let source = '';
        let sourceKey = null;

        if (hitboxId.startsWith('SLOT_')) {
            sourceKey = hitboxId.replace('SLOT_', '');
            this.handleSlotClick(sourceKey);
            item = this.currentMember.equipment[sourceKey];
            source = 'equipment';
        } else if (hitboxId.startsWith('INV_ITEM_')) {
            sourceKey = parseInt(hitboxId.split('_')[2], 10);
            this.handleInventoryClick(sourceKey);
            item = this.filteredInventory[sourceKey];
            source = 'inventory';
        }

        if (item) {
            const options = this._buildMenuOptions(item, source, sourceKey);
            if (options.length > 0) {
                let menuX = this.mouse.x;
                let menuY = this.mouse.y;
                if (this.lastRenderedHitboxes) {
                    const hit = this.lastRenderedHitboxes.find(h => h.id === hitboxId);
                    if (hit) {
                        menuX = Math.floor(hit.x + hit.w + 8);
                        menuY = Math.floor(hit.y);
                    }
                }
                this.contextMenuManager.open(menuX, menuY, options, { item, source, sourceKey });
                this.playConfirmSound();

                if (!fromKeyboard && this.contextMenuManager.menu) {
                    this.contextMenuManager.menu.selectedIndex = -1;
                }
            }
        }
    }

    /* A click on a filled hotbar slot opens a small menu: Use (the first stack of that item) and Remove from Hotbar. */
    _clickHotbarSlot(hitboxId) {
        const slot = parseInt(hitboxId.split('_')[1], 10);
        const defId = InventorySystem.getHotbar()[slot];
        if (!defId) return;
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;

        const stack = this.filteredInventory.find(i => i.defId === defId);
        const options = [];
        if (stack) options.push({ label: 'Use', actionId: 'USE' });
        options.push({ label: 'Remove from Hotbar', actionId: 'HOTBAR_CLEAR' });

        let menuX = this.mouse.x, menuY = this.mouse.y;
        const hit = this.lastRenderedHitboxes && this.lastRenderedHitboxes.find(h => h.id === hitboxId);
        if (hit) { menuX = Math.floor(hit.x - 8 - 312); menuY = Math.floor(hit.y); } // the bar is in the right column: open the menu to its left
        this.contextMenuManager.open(menuX, menuY, options, { item: stack || { defId }, source: 'hotbar', sourceKey: slot });
        this.playConfirmSound();
        if (this.contextMenuManager.menu) this.contextMenuManager.menu.selectedIndex = -1;
    }

    onRightClick(hitboxId) {
        if (this.logic.isEditingName) {
            if (this.logic.validateName()) this.playConfirmSound();
            return;
        }

        // Right click undoes the most recent thing, one step per click: a half-made hotbar choice, a held item, an open menu ...
        if (this.pendingHotbarItem) {
            this.pendingHotbarItem = null;
            this.notice = null;
            this.playCancelSound();
            return;
        }
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
            this.playCancelSound();
            return;
        }
        if (this.contextMenuManager.menu) {
            this.contextMenuManager.close();
            this.playCancelSound();
            return;
        }

        // ... and with nothing left to undo it leaves the screen. It does not go through the keyboard's "inventory -> slots -> leave"
        // two-step: with the mouse that step is not a place the player ever chose to be in, and it could trap the click (see _handleBack).
        this._leaveScreen();
    }

    _leaveScreen() {
        this.playCancelSound();
        events.emit('CHANGE_SCENE', { scene: this.returnScene });
    }

    onDragStart(hitboxId) {
        if (!hitboxId || this.contextMenuManager.menu || this.logic.isEditingName) return;

        if (hitboxId.includes('SCROLLBAR_THUMB')) {
            this.scrollManager.handleDragStart(hitboxId, this.mouse.y);
            return;
        }

        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;

        if (hitboxId.startsWith('SLOT_')) {
            const slotName = hitboxId.replace('SLOT_', '');
            const item = this.currentMember.equipment[slotName];
            if (item) {
                this.slotIndex = this.activeSlots.indexOf(slotName);
                this.state = 'SLOTS';
                this.inventoryIndex = -1;
                this.dragAndDropManager.startDrag(
                    item, 'equipment', slotName,
                    this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        } else if (hitboxId.startsWith('INV_ITEM_')) {
            const idx = parseInt(hitboxId.split('_')[2], 10);
            const item = this.filteredInventory[idx];
            if (item) {
                this.inventoryIndex = idx;
                this.state = 'INVENTORY';
                this.slotIndex = -1;
                this.dragAndDropManager.startDrag(
                    item, 'inventory', idx,
                    this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        } else if (hitboxId.startsWith('HOTBAR_')) {
            const slot = parseInt(hitboxId.split('_')[1], 10);
            const defId = InventorySystem.getHotbar()[slot];
            if (defId) {
                this.slotIndex = -1;
                this.inventoryIndex = -1;
                // the dragged thing is just the item type; the slot it came from is remembered as originSlot
                this.dragAndDropManager.startDrag(
                    { defId }, 'hotbar', slot,
                    this.mouse.x, this.mouse.y,
                    this.handleItemDropped.bind(this)
                );
            }
        }
    }

    onDragMove(x, y) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragMove(y);
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.updateDrag(x, y);
        }
    }

    onDrop(sourceHitboxId, targetHitboxId) {
        if (this.scrollManager.isDragging) {
            this.scrollManager.handleDragEnd();
        } else if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag(targetHitboxId);
        }
    }

    _buildMenuOptions(item, source, sourceKey) {
        const options = [];
        const isBattle = typeof this.config.onItemSelected === 'function';
        const isStackable = (item.qty > 1);

        // Where may the item's ability be used? (AbilitySystem.contextOf: 'battle', 'overworld' or 'both'; Minor Heal is both, the torch is overworld only)
        const useAbilityId = item.useAbility || (ItemDefinitions[item.defId] && ItemDefinitions[item.defId].useAbility);

        if (isBattle) {
            if (useAbilityId && AbilitySystem.usableIn(useAbilityId, 'battle')) options.push({ label: 'Use in Battle', actionId: 'BATTLE_USE' });
        } else {
            if ((item.usable || item.type === 'consumable') && (!useAbilityId || AbilitySystem.usableIn(useAbilityId, 'overworld'))) {
                options.push({ label: 'Use', actionId: 'USE' });
            }

            // Hotbar: a consumable whose ability works in the overworld can be put on the hotbar (keys 1-9 and 0 on the overworld screen), by this menu or by dragging it onto the bar.
            if (this._canHotbar(item)) {
                const slot = InventorySystem.hotbarSlotOf(item.defId);
                if (slot === -1) options.push({ label: 'Add to Hotbar', actionId: 'HOTBAR_ADD' });
                options.push({ label: slot === -1 ? 'Hotbar Slot...' : `Move on Hotbar (${InventorySystem.HOTBAR_LABELS[slot]})...`, actionId: 'HOTBAR_PICK' });
                if (slot !== -1) options.push({ label: 'Remove from Hotbar', actionId: 'HOTBAR_CLEAR' });
            }

            if (!this.logic.readOnly) {
                if (source === 'equipment') {
                    if (this.filteredInventory.length > 0) options.push({ label: 'Swap', actionId: 'NAV_TO_INV' });
                    options.push({ label: 'Unequip', actionId: 'UNEQUIP_AND_NAV' });
                } else {
                    const isEquippable = item.equipSlot || ['weapon', 'armor', 'accessory', 'equipment'].includes(item.type);
                    if (isEquippable) {
                        options.push({ label: 'Equip', actionId: 'EQUIP' });
                    }
                }
                
                if (isStackable) {
                    options.push({ label: 'Drop 1', actionId: 'DROP_ONE' });
                    options.push({ label: 'Drop All', actionId: 'DROP_ALL' });
                } else {
                    options.push({ label: 'Drop', actionId: 'DROP_ONE' });
                }
            }
        }
        return options;
    }

    executeMenuAction(actionId, payload) {
        const { item, source, sourceKey } = payload;

        if (actionId === 'HOTBAR_ADD') {
            const bar = InventorySystem.getHotbar();
            const free = bar.findIndex(id => !id);
            if (free !== -1) this._setHotbarSlot(free, item.defId);
            else this._askHotbarSlot(item, 'The hotbar is full.');
            return;
        }
        if (actionId === 'HOTBAR_PICK') {
            this._askHotbarSlot(item, '');
            return;
        }
        if (actionId === 'HOTBAR_CLEAR') {
            const slot = InventorySystem.hotbarSlotOf(item.defId);
            if (slot !== -1) InventorySystem.clearHotbarSlot(slot);
            this.showNotice('Removed from the hotbar.');
            return;
        }

        switch (actionId) {
            case 'BATTLE_USE':
                if (this.config.onItemSelected) {
                    this.config.onItemSelected({ itemId: item.defId, abilityId: item.useAbility });
                }
                break;
            case 'NAV_TO_INV':
                this.state = 'INVENTORY';
                this.inventoryIndex = 0;
                this.scrollToItem(0);
                break;
            case 'UNEQUIP_AND_NAV':
                this.logic.unequipSlot(sourceKey);
                this.updateFilteredInventory();
                const newIdx = this._findNewestInventoryIndex(item.defId);
                this.state = 'INVENTORY';
                this.inventoryIndex = (newIdx !== -1) ? newIdx : 0;
                this.scrollToItem(this.inventoryIndex, true);
                break;
            case 'EQUIP':
                this.equipItem(item);
                break;
            case 'USE':
                if (this.logic.useItem) {
                    this.logic.useItem(item, this.currentMember);
                    if (this.logic.lastUseMessage) { // say what happened ("Aldric recovers 12 HP", "You light a torch...")
                        this.showNotice(this.logic.lastUseMessage);
                        if (!this.logic.lastUseOk) this.playErrorSound();
                        else if (this.logic.lastUseWorld) this.playSfx(UI_SFX.pickup, 0.7, 0.8);
                    }
                } else {
                    console.warn('useItem method missing on CharacterSummaryLogic');
                }
                break;
            case 'DROP_ONE':
                if (this.logic.dropItem) {
                    this.logic.dropItem(item, 1);
                } else {
                    console.warn('dropItem method missing on CharacterSummaryLogic');
                }
                break;
            case 'DROP_ALL':
                if (this.logic.dropItem) {
                    this.logic.dropItem(item, item.qty || 1);
                }
                break;
        }
        this.updateFilteredInventory();
    }

    showNotice(text, ms = 3000) {
        this.notice = { text, until: performance.now() + ms };
    }

    /* Can this item go on the hotbar? A consumable whose useAbility works in the overworld. */
    _canHotbar(item) {
        if (!item || !item.defId) return false;
        const def = ItemDefinitions[item.defId];
        const abilityId = item.useAbility || (def && def.useAbility);
        if (!abilityId) return false;
        const consumable = item.usable || item.type === 'consumable' || (def && (def.usable || def.type === 'consumable'));
        return !!consumable && AbilitySystem.usableIn(abilityId, 'overworld');
    }

    /* Hotbar: wait for the player to press the number key of the slot they want (1-9, 0). Escape, a click or any other key cancels. */
    _askHotbarSlot(item, prefix) {
        this.pendingHotbarItem = item;
        this.showNotice(`${prefix ? prefix + ' ' : ''}Press 1-9 or 0 to choose a hotbar slot (Esc to cancel).`.trim(), 10000);
    }

    _setHotbarSlot(slot, defId) {
        InventorySystem.setHotbarSlot(slot, defId);
        const name = (ItemDefinitions[defId] && ItemDefinitions[defId].name) || 'Item';
        this.showNotice(`${name} is on hotbar ${InventorySystem.HOTBAR_LABELS[slot]}.`);
        this.playConfirmSound();
    }

    /* Returns true when the key was used for the hotbar choice. */
    _handleHotbarPick(code, e) {
        const item = this.pendingHotbarItem;
        if (!item) return false;
        const key = code && InventorySystem.HOTBAR_KEYS.includes(code) ? code : (e && e.code);
        const slot = InventorySystem.HOTBAR_KEYS.indexOf(key);
        this.pendingHotbarItem = null;
        if (slot !== -1) {
            this._setHotbarSlot(slot, item.defId);
            return true;
        }
        this.notice = null;
        if (key === 'Escape') { this.playCancelSound(); return true; }
        return false; // any other key: the choice is dropped and the key does its normal job
    }

    handleKeyDown(code, e) {
        this.noteKeyboardInput(); // any key here (a hotbar pick, typing a name ...) hands control to the keyboard

        if (this.pendingHotbarItem && this._handleHotbarPick(code, e)) return;

        if (this.logic.isEditingName && e) {
            if (e.code === "Enter") {
                this.logic.validateName();
                this.playConfirmSound();
            } else if (e.code === "Escape") {
                this.logic.validateName();
                this.playCancelSound();
            } else {
                this.logic.nameInput.handleEvent(e);
                this.currentMember.name = this.logic.nameInput.value;
            }
            return;
        }

        const intent = this.resolveIntent(code, e);
        if (!intent) return;

        if (this.contextMenuManager.menu) {
            this.contextMenuManager.handleNavigation(intent);
            return;
        }

        if (intent === 'CANCEL') return this._handleBack();
        if (intent === 'PREV_CHAR') return this.cycleMember(-1);
        if (intent === 'NEXT_CHAR') return this.cycleMember(1);

        if (intent === 'TOGGLE_VIEW') {
            this.playNavSound();
            if (this.viewMode === 'STATS') this.viewMode = 'ITEM';
            else if (this.viewMode === 'ITEM') this.viewMode = 'ABILITIES';
            else this.viewMode = 'STATS';
            this.setViewMode(this.viewMode);
            return;
        }

        // Route grid navigation
        if (this.state === 'SLOTS') {
            this.handleSlotNavigation(intent);
        } else {
            this.handleInventoryNavigation(intent);
        }
    }

    _handleBack() {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.cancelDrag();
            this.playCancelSound();
            return;
        }

        // From the inventory, Back first returns to the slots; from the slots (or when there are no slots to return to) it leaves.
        if (this.state === 'INVENTORY' && this.activeSlots.length > 0) {
            this.playCancelSound();
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            // _validateIndices() hands focus straight back to the inventory when no slot is selected (slotIndex -1) and the inventory is not empty.
            // The cursor is on -1 whenever the inventory was reached by the mouse or by arrowing over from the slots, so Back did nothing and
            // the player was stuck there. Put the cursor back on a slot first.
            if (this.slotIndex === -1) {
                this.slotIndex = (this._lastSlotIndex >= 0 && this._lastSlotIndex < this.activeSlots.length) ? this._lastSlotIndex : 0;
            }
            this.updateFilteredInventory();
        } else {
            this._leaveScreen();
        }
    }

    _jumpToPanel(targetPanel) {
        this.playNavSound();
        this.state = targetPanel;

        if (targetPanel === 'INVENTORY') {
            if (this.inventoryIndex === -1) this.inventoryIndex = 0;
            if (this.slotIndex !== -1) this._lastSlotIndex = this.slotIndex;
            this.slotIndex = -1;
            this.scrollToItem(this.inventoryIndex);
        } else {
            if (this.slotIndex === -1) this.slotIndex = 0;
            this.inventoryIndex = -1;
        }
    }

    handleSlotNavigation(intent) {
        if (this.activeSlots.length === 0) return;
        
        // Recover focus
        if (this.slotIndex === -1) {
            this.slotIndex = 0;
            this.playNavSound();
            return;
        }

        const oldIndex = this.slotIndex;

        if (intent === 'UP') {
            this.slotIndex = (this.slotIndex > 0) ? this.slotIndex - 1 : this.activeSlots.length - 1;
        } else if (intent === 'DOWN') {
            this.slotIndex = (this.slotIndex < this.activeSlots.length - 1) ? this.slotIndex + 1 : 0;
        } else if (intent === 'RIGHT') {
            if (this.filteredInventory.length > 0) {
                this._jumpToPanel('INVENTORY');
            }
            return;
        }

        if (this.slotIndex !== oldIndex) {
            this.playNavSound();
        }

        if (intent === 'CONFIRM') {
            const slotName = this.activeSlots[this.slotIndex];
            const item = this.currentMember.equipment[slotName];
            if (item) {
                this.onClick(`SLOT_${slotName}`, true);
            } else if (this.filteredInventory.length > 0) {
                this.playConfirmSound();
                this._activateSlotButDontFilter(slotName);
            } else {
                this.playErrorSound(); // empty slot and nothing to put in it
            }
        } else if (intent === 'DELETE') {
            this.unequipCurrentSlot(); // plays its own sound
        }
    }

    handleInventoryNavigation(intent) {
        if (this.filteredInventory.length === 0) return;

        // Recover focus
        if (this.inventoryIndex === -1) {
            this.inventoryIndex = 0;
            this.playNavSound();
            return;
        }

        const maxIndex = this.filteredInventory.length - 1;
        const oldIndex = this.inventoryIndex;
        const col = this.inventoryIndex % this.COLS;

        if (intent === 'UP') {
            this.inventoryIndex = Math.max(0, this.inventoryIndex - this.COLS);
        } else if (intent === 'DOWN') {
            this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + this.COLS);
        } else if (intent === 'LEFT') {
            if (col === 0 && this.activeSlots.length > 0) {
                this._jumpToPanel('SLOTS');
                return;
            } else {
                this.inventoryIndex = Math.max(0, this.inventoryIndex - 1);
            }
        } else if (intent === 'RIGHT') {
            if (col === this.COLS - 1 || this.inventoryIndex === maxIndex) {
                if (this.activeSlots.length > 0) this._jumpToPanel('SLOTS');
                return;
            } else {
                this.inventoryIndex = Math.min(maxIndex, this.inventoryIndex + 1);
            }
        }

        if (this.inventoryIndex !== oldIndex) {
            this.playNavSound();
            if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(intent)) {
                this.scrollToItem(this.inventoryIndex, false);
            }
        }

        if (intent === 'CONFIRM') {
            const item = this.filteredInventory[this.inventoryIndex];
            if (item) {
                this.onClick(`INV_ITEM_${this.inventoryIndex}`, true);
            }
        }
    }

    updateHitboxes(hitboxes) {
        super.updateHitboxes(hitboxes);
        this._syncScrollZones();
    }

    _findNewestInventoryIndex(defId) {
        for (let i = this.filteredInventory.length - 1; i >= 0; i--) {
            if (this.filteredInventory[i].defId === defId) {
                return i;
            }
        }
        return -1;
    }

    handleScroll(delta) {
        this.scrollManager.handleScrollWheel(this.mouse.x, this.mouse.y, delta);
    }

    scrollToItem(index, center = false) {
        this.scrollManager.scrollToIndex('inventory', index, {
            totalItems: this.filteredInventory.length,
            columns: this.COLS,
            itemHeight: this.layout.itemHeight || 48
        }, center);
    }

    resetScroll() {
        this.scrollManager.resetAllScrolls();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this._syncScrollZones();
    }

    cycleMember(direction) {
        if (this.logic.isEditingName) {
            this.logic.validateName();
        }
        if (this.logic.cycleMember(direction)) {
            this.playNavSound();
            this.state = 'SLOTS';
            this.contextMenuManager.close();
            this.inventoryIndex = -1;
            this.resetScroll();
            this.updateActiveSlots();
        }
    }

    handleSlotClick(slotName) {
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag('SLOT_' + slotName);
            return;
        }
        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
        }
    }

    _activateSlotButDontFilter(slotName) {
        const newIndex = this.activeSlots.indexOf(slotName);
        if (newIndex !== -1) {
            this.slotIndex = newIndex;
        }
        this.state = 'INVENTORY';
        if (this.filteredInventory.length > 0) {
            this.inventoryIndex = 0;
            this.scrollToItem(0);
        }
    }

    deselectSlot() {
        const hasSelection = (this.slotIndex !== -1 || this.inventoryIndex !== -1);
        if (hasSelection) {
            this.slotIndex = -1;
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        }
    }

    handleInventoryClick(idx) {
        if (isNaN(idx) || idx >= this.filteredInventory.length) return;
        if (this.dragAndDropManager.dragState.active) {
            this.dragAndDropManager.endDrag('INV_ZONE');
            return;
        }
        const targetItem = this.filteredInventory[idx];
        if (targetItem) {
            this.inventoryIndex = idx;
            this.state = 'INVENTORY';
            this.updateFilteredInventory();
        }
    }

    updateActiveSlots() {
        this.activeSlots = this.logic.getActiveSlots();
        if (this.slotIndex >= this.activeSlots.length) {
            this.slotIndex = this.activeSlots.length > 0 ? 0 : -1;
        }
        this.updateFilteredInventory();
    }

    updateFilteredInventory() {
        const draggingItem = this.dragAndDropManager.dragState.active ? this.dragAndDropManager.dragState.payload : null;
        const draggingSource = this.dragAndDropManager.dragState.active ? this.dragAndDropManager.dragState.sourceId : null;
        this.filteredInventory = this.logic.getFilteredInventory(draggingItem, draggingSource);
        
        if (this.inventoryIndex >= this.filteredInventory.length) {
            this.inventoryIndex = Math.max(0, this.filteredInventory.length - 1);
        }
        if (this.filteredInventory.length === 0) {
            this.inventoryIndex = -1;
        }
        
        const ROW_H = this.layout.itemHeight || 48;
        const VIEW_H = this.layout.inventoryViewportH || 300;
        const totalRows = Math.ceil(this.filteredInventory.length / this.COLS);
        const contentHeight = totalRows * ROW_H;
        this.layout.inventoryMaxScroll = Math.max(0, contentHeight - VIEW_H);
        
        this._syncScrollZones();
        this.scrollManager.setOffset('inventory', this.inventoryScrollOffset);
        
        // Ensure indices are solid after inventory updates
        this._validateIndices();
    }

    equipItem(inventoryItem, targetSlotOverride = null) {
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;
        const equippedSlotName = this.logic.equipItem(inventoryItem, targetSlotOverride, this.activeSlots);
        if (equippedSlotName) {
            const newSlotIndex = this.activeSlots.indexOf(equippedSlotName);
            if (newSlotIndex !== -1) {
                this.slotIndex = newSlotIndex;
            }
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
        }
    }

    unequipCurrentSlot() {
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle || this.slotIndex === -1) {
            this.playErrorSound(); // not allowed here, or no slot selected
            return false;
        }
        const slotName = this.activeSlots[this.slotIndex];
        const didUnequip = this.logic.unequipSlot(slotName);
        if (didUnequip) {
            this.playCancelSound(); // the item leaves the slot
            this.state = 'SLOTS';
            this.inventoryIndex = -1;
            this.updateFilteredInventory();
            return true;
        }
        this.playErrorSound(); // the slot was empty
        return false;
    }

    /* The hotbar as the inventory panel draws it (null in a battle or read-only view: no hotbar block there). */
    _getHotbarView() {
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return null;
        const bar = InventorySystem.getHotbar();
        return InventorySystem.HOTBAR_KEYS.map((_, i) => ({
            index: i,
            key: InventorySystem.HOTBAR_LABELS[i],
            defId: bar[i] || null,
            qty: bar[i] ? InventorySystem.countItem(bar[i]) : 0
        }));
    }

    getFocusedItem() {
        if (this.contextMenuManager.menu && this.contextMenuManager.menu.payload) {
            return this.contextMenuManager.menu.payload.item;
        }
        if (this.dragAndDropManager.dragState.active) {
            return this.dragAndDropManager.dragState.payload;
        }
        if (this.state === 'INVENTORY') {
            return this.filteredInventory[this.inventoryIndex] || null;
        }
        if (this.slotIndex !== -1) {
            const slotName = this.activeSlots[this.slotIndex];
            return this.currentMember.equipment[slotName] || null;
        }
        return null;
    }

    // ========================================================
    // STATE EXPORT
    // ========================================================
    getState() {
        let viewSelectedSlot = (this.state === 'INVENTORY') ? -1 : this.slotIndex;
        let viewInventoryIndex = this.inventoryIndex;

        if (this.dragAndDropManager.dragState.active) {
            const dragSource = this.dragAndDropManager.dragState.sourceId;
            const origin = this.dragAndDropManager.dragState.originSlot;
            if (dragSource === 'equipment' && this.activeSlots[viewSelectedSlot] === origin) {
                viewSelectedSlot = -1;
            } else if (dragSource === 'inventory' && viewInventoryIndex === origin) {
                viewInventoryIndex = -1;
            }
        }

        // --- ARTIFICIAL TOOLTIP FOR KEYBOARD NAVIGATION ---
        // The hovered element in mouse mode, the keyboard cursor in keyboard mode. If the mouse is over something that is not a
        // slot or an item (a button, the hotbar) the tooltip still follows the cursor, as before.
        let activeTooltipId = this.getFocusId();
        if (!activeTooltipId || (!activeTooltipId.startsWith('SLOT_') && !activeTooltipId.startsWith('INV_ITEM_'))) {
            activeTooltipId = this.getKeyboardFocusId() || activeTooltipId;
        }

        return {
            readOnly: this.logic.readOnly,
            member: this.currentMember,
            derivedStats: this.logic.getDerivedStats(),
            abilities: this.logic.compileAbilities(),
            slots: this.activeSlots,
            selectedSlotIndex: viewSelectedSlot,
            isChoosingItem: (this.state === 'INVENTORY'),
            filteredInventory: this.filteredInventory,
            inventoryIndex: viewInventoryIndex,
            viewMode: this.viewMode,
            focusedItem: this.getFocusedItem(),
            scrollOffset: this.detailsScrollOffset,
            inventoryScrollOffset: this.inventoryScrollOffset,
            mouse: this.mouse,
            inputMode: this.inputMode,
            hoveredHitboxId: activeTooltipId,
            
            // --- EXPORT NAME ENTRY STATE ---
            isEditingName: this.logic.isEditingName,
            nameInputValue: this.logic.nameInput.value,
            heldItem: this.dragAndDropManager.dragState.active ? {
                item: this.dragAndDropManager.dragState.payload,
                source: this.dragAndDropManager.dragState.sourceId,
                originSlot: this.dragAndDropManager.dragState.originSlot
            } : null,
            dropTarget: this.dragAndDropManager.dragState.active ? this.hoveredHitboxId : null,
            layout: this.layout,
            contextMenu: this.contextMenuManager.menu,
            hotbar: this._getHotbarView(),
            heldHotbarOk: this.dragAndDropManager.dragState.active ? (this.dragAndDropManager.dragState.sourceId === 'hotbar' || this._canHotbar(this.dragAndDropManager.dragState.payload)) : false,
            notice: (this.notice && performance.now() < this.notice.until) ? this.notice.text : null,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }

    /* Something from the inventory (or equipment) dropped on hotbar slot n. */
    _dropOnHotbar(item, slot) {
        if (!this._canHotbar(item)) {
            this.playErrorSound();
            this.showNotice("That can't go on the hotbar.");
            return;
        }
        this._setHotbarSlot(slot, item.defId); // moves it if it was on the bar already; whatever was in that slot is replaced
    }

    /* A hotbar slot dragged and dropped: on another slot swaps the two, off the bar (the inventory, or empty space) clears it. */
    _dropFromHotbar(from, dropTargetId) {
        const bar = InventorySystem.getHotbar();
        if (dropTargetId && dropTargetId.startsWith('HOTBAR_')) {
            const to = parseInt(dropTargetId.split('_')[1], 10);
            if (to !== from && to >= 0 && to < bar.length) {
                [bar[from], bar[to]] = [bar[to], bar[from]];
                this.playConfirmSound();
            }
            return;
        }
        if (!dropTargetId || dropTargetId.startsWith('INV_') || dropTargetId === 'SCROLLBAR_INV') {
            InventorySystem.clearHotbarSlot(from);
            this.playCancelSound();
            this.showNotice('Removed from the hotbar.');
        }
    }

    handleItemDropped(item, sourceId, originSlot, dropTargetId) {
        const isBattle = typeof this.config.onItemSelected === 'function';
        if (this.logic.readOnly || isBattle) return;

        // --- HOTBAR: a slot dragged somewhere, or something dragged onto a slot ---
        if (sourceId === 'hotbar') {
            this._dropFromHotbar(originSlot, dropTargetId);
            return;
        }
        if (dropTargetId && dropTargetId.startsWith('HOTBAR_')) {
            this._dropOnHotbar(item, parseInt(dropTargetId.split('_')[1], 10));
            return;
        }

        if (!dropTargetId || dropTargetId.startsWith('INV_') || dropTargetId === 'SCROLLBAR_INV') {
            if (sourceId === 'equipment') {
                this.playCancelSound();
                this.logic.unequipSlot(originSlot);
                this.updateFilteredInventory();
                const newIndex = this._findNewestInventoryIndex(item.defId);
                this.state = 'INVENTORY';
                this.inventoryIndex = (newIndex !== -1) ? newIndex : 0;
                this.slotIndex = -1;
                this.scrollToItem(this.inventoryIndex, true);
            }
            this.updateFilteredInventory();
            return;
        }

        if (dropTargetId && dropTargetId.startsWith('SLOT_')) {
            const targetSlotRaw = dropTargetId.substring(5);
            if (!this.logic.canEquipToSlot(item, targetSlotRaw)) {
                this.playErrorSound();
                return;
            }
            const slotKey = targetSlotRaw.toLowerCase().replace(/\s/g, '');
            const canonicalSlot = this.activeSlots.find(s => s.toLowerCase().replace(/\s/g, '') === slotKey) || targetSlotRaw;
            if (sourceId === 'equipment' && originSlot === canonicalSlot) return;
            this.playConfirmSound();
            if (sourceId === 'equipment') {
                this.logic.unequipSlot(originSlot);
            }
            this.equipItem(item, canonicalSlot);
        }
    }
}