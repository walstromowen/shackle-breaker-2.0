import { events } from '../../core/eventBus.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { BaseController } from '../core/baseController.js';

export class LevelUpController extends BaseController {
    constructor(input) {
        super(input);
        this.extraBindings = { KeyP: 'CANCEL' };
        this.member = null;
        this.routeData = null;
        this.availablePoints = 0;
        this.pendingAllocations = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
        this.attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
        
        // --- KEYBOARD NAVIGATION STATE ---
        this.uiButtons = ['BTN_CANCEL', 'BTN_RESET', 'BTN_CONFIRM'];
        this.activeSection = 'ATTRIBUTES';
        this.selectedAttributeIndex = 0;
        this.attributeColumn = 'ADD';
        this.selectedButtonIndex = 2;
        
        // --- NEW: Input Lock ---
        this.isTransitioning = false; 
    }

    init(payload) {
        this.routeData = payload;
        this.member = payload.character || payload.member || payload;
        this.availablePoints = this.member.skillPoints || 0;
        
        if (!this.member.attributes) {
            this.member.attributes = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
        }
        
        this.attributes.forEach(attr => this.pendingAllocations[attr] = 0);
        
        this.activeSection = 'ATTRIBUTES';
        this.selectedAttributeIndex = 0;
        this.attributeColumn = 'ADD';
        this.selectedButtonIndex = 2;
        
        // Ensure the lock is reset when the screen loads
        this.isTransitioning = false; 
    }

    // ========================================================
    // FOCUS (shared standard, see BaseController)
    // ========================================================
    // The mouse moved onto something: the keyboard cursor follows it (silent; UIInteractionManager adds the hover tick)
    setFocusFromPointer(hitboxId) {
        if (this.isTransitioning) return; // Prevent focus changes during exit
        this._setFocus(hitboxId);
    }

    // The element the keyboard cursor is on
    getKeyboardFocusId() {
        if (this.activeSection === 'ATTRIBUTES') {
            return `${this.attributeColumn}_${this.attributes[this.selectedAttributeIndex].toUpperCase()}`;
        }
        if (this.activeSection === 'BUTTONS') return this.uiButtons[this.selectedButtonIndex];
        return null;
    }

    // Back: discard what is pending and return to the party screen
    _goBack() {
        if (this.isTransitioning) return;
        this.playCancelSound();
        this.cancelAndReturn();
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING
    // ========================================================

    _setFocus(hitboxId) {
        if (!hitboxId) return;
        
        if (hitboxId.startsWith('ADD_') || hitboxId.startsWith('SUB_')) {
            this.activeSection = 'ATTRIBUTES';
            const parts = hitboxId.split('_');
            this.attributeColumn = parts[0];
            const attr = parts[1].toLowerCase();
            const index = this.attributes.indexOf(attr);
            if (index !== -1) {
                this.selectedAttributeIndex = index;
            }
        } else if (this.uiButtons.includes(hitboxId)) {
            this.activeSection = 'BUTTONS';
            this.selectedButtonIndex = this.uiButtons.indexOf(hitboxId);
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        // --- NEW: Block all clicks if we are already closing the screen ---
        if (this.isTransitioning) return; 
        if (!hitboxId) return;

        if (!fromKeyboard) {
            this._setFocus(hitboxId);
        }

        if (hitboxId.startsWith('ADD_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.availablePoints > 0) {
                this.pendingAllocations[attr]++;
                this.availablePoints--;
                this.playConfirmSound();
            } else {
                this.playErrorSound(); // no points left
            }
        } else if (hitboxId.startsWith('SUB_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.pendingAllocations[attr] > 0) {
                this.pendingAllocations[attr]--;
                this.availablePoints++;
                this.playConfirmSound();
            } else {
                this.playErrorSound(); // nothing to take back
            }
        } else if (hitboxId === 'BTN_RESET') {
            let hasPending = false;
            this.attributes.forEach(attr => {
                if (this.pendingAllocations[attr] > 0) {
                    this.availablePoints += this.pendingAllocations[attr];
                    this.pendingAllocations[attr] = 0;
                    hasPending = true;
                }
            });
            if (hasPending) {
                this.playConfirmSound();
            } else {
                this.playErrorSound(); // nothing to reset
            }
        } else if (hitboxId === 'BTN_CONFIRM') {
            const hasPending = Object.values(this.pendingAllocations).some(v => v > 0);
            if (hasPending) {
                this.playConfirmSound();
                this.commitPoints();
            } else {
                this.playErrorSound(); // nothing allocated yet
            }
        } else if (hitboxId === 'BTN_CANCEL') {
            this._goBack();
        }
    }

    onRightClick(hitboxId) {
        this._goBack();
    }

    handleKeyDown(keyCode, e) {
        if (this.isTransitioning) return;
        const intent = this.resolveIntent(keyCode, e);
        if (!intent) return;
        this.handleNavigatingKeys(intent);
    }

    handleNavigatingKeys(intent) {
        if (this.activeSection === 'ATTRIBUTES') {
            if (intent === 'UP') {
                if (this.selectedAttributeIndex > 0) {
                    this.selectedAttributeIndex--;
                    this.playNavSound();
                }
            } else if (intent === 'DOWN') {
                if (this.selectedAttributeIndex < this.attributes.length - 1) {
                    this.selectedAttributeIndex++;
                    this.playNavSound();
                } else {
                    this.activeSection = 'BUTTONS';
                    this.selectedButtonIndex = this.attributeColumn === 'SUB' ? 0 : 2;
                    this.playNavSound();
                }
            } else if (intent === 'LEFT') {
                if (this.attributeColumn === 'ADD') {
                    this.attributeColumn = 'SUB';
                    this.playNavSound();
                }
            } else if (intent === 'RIGHT') {
                if (this.attributeColumn === 'SUB') {
                    this.attributeColumn = 'ADD';
                    this.playNavSound();
                }
            } else if (intent === 'CONFIRM') {
                const attr = this.attributes[this.selectedAttributeIndex].toUpperCase();
                const targetId = `${this.attributeColumn}_${attr}`;
                this.onClick(targetId, true);
            } else if (intent === 'CANCEL') {
                this._goBack();
            }
        } else if (this.activeSection === 'BUTTONS') {
            if (intent === 'UP') {
                this.activeSection = 'ATTRIBUTES';
                this.selectedAttributeIndex = this.attributes.length - 1;
                this.playNavSound();
            } else if (intent === 'LEFT') {
                if (this.selectedButtonIndex > 0) {
                    this.selectedButtonIndex--;
                    this.playNavSound();
                }
            } else if (intent === 'RIGHT') {
                if (this.selectedButtonIndex < this.uiButtons.length - 1) {
                    this.selectedButtonIndex++;
                    this.playNavSound();
                }
            } else if (intent === 'CONFIRM') {
                this.onClick(this.uiButtons[this.selectedButtonIndex], true);
            } else if (intent === 'CANCEL') {
                this._goBack();
            }
        }
    }

    commitPoints() {
    this.attributes.forEach(attr => {
      if (this.pendingAllocations[attr] > 0) {
        this.member.attributes[attr] += this.pendingAllocations[attr];
        // --- NEW: Reset pending allocations after applying them just to be extra safe ---
        this.pendingAllocations[attr] = 0;
      }
    });
    this.member.skillPoints = this.availablePoints;

    // Quest logic removed from here!
    
    this.cancelAndReturn();
  }

    cancelAndReturn() {
        // --- NEW: Lock the screen to prevent double-firings ---
        if (this.isTransitioning) return;
        this.isTransitioning = true; 
        
        events.emit('CHANGE_SCENE', { scene: 'party', data: this.routeData });
    }

    getState() {
        // One highlight at a time: the mouse hover in mouse mode, the keyboard cursor in keyboard mode
        const focusId = this.getFocusId();
        const mouseMode = this.inputMode === 'mouse';

        return {
            member: this.member,
            availablePoints: this.availablePoints,
            pendingAllocations: this.pendingAllocations,
            currentStats: StatCalculator.calculateDetailed(this.member),
            previewStats: StatCalculator.calculateDetailed(this.member, this.pendingAllocations),
            mouse: this.mouse,
            hoveredElement: mouseMode && focusId ? { id: focusId } : null,
            selectedElementId: mouseMode ? null : focusId,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}