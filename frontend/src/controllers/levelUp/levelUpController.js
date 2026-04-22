import { events } from '../../core/eventBus.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { BaseController } from '../core/baseController.js';

const KEY_BINDINGS = {
    'ArrowUp': 'UP', 'KeyW': 'UP',
    'ArrowDown': 'DOWN', 'KeyS': 'DOWN',
    'ArrowLeft': 'LEFT', 'KeyA': 'LEFT',
    'ArrowRight': 'RIGHT', 'KeyD': 'RIGHT',
    'Enter': 'CONFIRM', 'Space': 'CONFIRM',
    'Escape': 'CANCEL', 'Backspace': 'CANCEL', 'KeyP': 'CANCEL', 'Tab': 'CANCEL'
};

export class LevelUpController extends BaseController {
    constructor(input) {
        super(input);
        this.member = null;
        this.routeData = null;
        this.availablePoints = 0;
        this.pendingAllocations = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
        this.attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];

        // --- KEYBOARD NAVIGATION STATE ---
        this.uiButtons = ['BTN_CANCEL', 'BTN_RESET', 'BTN_CONFIRM'];
        this.activeSection = 'ATTRIBUTES'; // 'ATTRIBUTES' or 'BUTTONS'
        this.selectedAttributeIndex = 0;
        this.attributeColumn = 'ADD'; // 'SUB' or 'ADD'
        this.selectedButtonIndex = 2; // Default focus to the CONFIRM button
    }

    init(payload) {
        this.routeData = payload;
        this.member = payload.character || payload.member || payload;
        this.availablePoints = this.member.skillPoints || 0;

        if (!this.member.attributes) {
            this.member.attributes = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0 };
        }

        this.attributes.forEach(attr => this.pendingAllocations[attr] = 0);

        // Reset navigation state on load
        this.activeSection = 'ATTRIBUTES';
        this.selectedAttributeIndex = 0;
        this.attributeColumn = 'ADD';
        this.selectedButtonIndex = 2;
        this._syncHoverWithFocus();
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING
    // ========================================================
    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        // --- SYNC KEYBOARD LOGIC WITH MOUSE HOVER ---
        if (this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            this._syncFocusWithHover(this.hoveredHitboxId);
        }
    }

    _syncFocusWithHover(hitboxId) {
        if (!hitboxId) return;

        if (hitboxId.startsWith('ADD_') || hitboxId.startsWith('SUB_')) {
            this.activeSection = 'ATTRIBUTES';
            const parts = hitboxId.split('_');
            this.attributeColumn = parts[0]; // 'ADD' or 'SUB'
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

    _syncHoverWithFocus() {
        if (this.activeSection === 'ATTRIBUTES') {
            const attr = this.attributes[this.selectedAttributeIndex].toUpperCase();
            this.hoveredHitboxId = `${this.attributeColumn}_${attr}`;
        } else if (this.activeSection === 'BUTTONS') {
            this.hoveredHitboxId = this.uiButtons[this.selectedButtonIndex];
        }
    }

    onClick(hitboxId, fromKeyboard = false) {
        if (!hitboxId) return;

        if (hitboxId.startsWith('ADD_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.availablePoints > 0) {
                this.pendingAllocations[attr]++;
                this.availablePoints--;
            }
        }
        
        if (hitboxId.startsWith('SUB_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.pendingAllocations[attr] > 0) {
                this.pendingAllocations[attr]--;
                this.availablePoints++;
            }
        }
        
        if (hitboxId === 'BTN_RESET') {
            this.attributes.forEach(attr => {
                if (this.pendingAllocations[attr] > 0) {
                    this.availablePoints += this.pendingAllocations[attr];
                    this.pendingAllocations[attr] = 0;
                }
            });
        }
        
        if (hitboxId === 'BTN_CONFIRM') {
            // Mirror visual lock: Only commit if there are actually points to spend
            const hasPending = Object.values(this.pendingAllocations).some(v => v > 0);
            if (hasPending) {
                this.commitPoints();
            }
        }
        
        if (hitboxId === 'BTN_CANCEL') {
            this.cancelAndReturn();
        }
    }

    onRightClick(hitboxId) {
        this.cancelAndReturn();
    }

    handleKeyDown(keyCode, e) {
        let intent = (e && KEY_BINDINGS[e.code]) || 
                     (typeof this._mapKeyCodeToIntent === 'function' ? this._mapKeyCodeToIntent(keyCode) : null);

        this.handleNavigatingKeys(intent, e);
        this._syncHoverWithFocus();
    }

    handleNavigatingKeys(intent, e) {
        if (this.activeSection === 'ATTRIBUTES') {
            if (intent === 'UP' || e?.code === 'ArrowUp' || e?.code === 'KeyW') {
                if (this.selectedAttributeIndex > 0) {
                    this.selectedAttributeIndex--;
                }
            } else if (intent === 'DOWN' || e?.code === 'ArrowDown' || e?.code === 'KeyS') {
                if (this.selectedAttributeIndex < this.attributes.length - 1) {
                    this.selectedAttributeIndex++;
                } else {
                    // Drop down to the UI buttons
                    this.activeSection = 'BUTTONS';
                    // Smart routing: left side drops to cancel, right side to confirm
                    this.selectedButtonIndex = this.attributeColumn === 'SUB' ? 0 : 2;
                }
            } else if (intent === 'LEFT' || e?.code === 'ArrowLeft' || e?.code === 'KeyA') {
                if (this.attributeColumn === 'ADD') {
                    this.attributeColumn = 'SUB';
                }
            } else if (intent === 'RIGHT' || e?.code === 'ArrowRight' || e?.code === 'KeyD') {
                if (this.attributeColumn === 'SUB') {
                    this.attributeColumn = 'ADD';
                }
            } else if (intent === 'CONFIRM' || e?.code === 'Enter' || e?.code === 'Space') {
                // FIXED: Reconstruct the target ID dynamically instead of relying on mouse hover state
                const attr = this.attributes[this.selectedAttributeIndex].toUpperCase();
                const targetId = `${this.attributeColumn}_${attr}`;
                this.onClick(targetId, true);
            } else if (intent === 'CANCEL' || e?.code === 'Escape' || e?.code === 'Backspace') {
                this.cancelAndReturn();
            }
        } else if (this.activeSection === 'BUTTONS') {
            if (intent === 'UP' || e?.code === 'ArrowUp' || e?.code === 'KeyW') {
                // Return to the bottom of the attributes list
                this.activeSection = 'ATTRIBUTES';
                this.selectedAttributeIndex = this.attributes.length - 1;
            } else if (intent === 'LEFT' || e?.code === 'ArrowLeft' || e?.code === 'KeyA') {
                if (this.selectedButtonIndex > 0) {
                    this.selectedButtonIndex--;
                }
            } else if (intent === 'RIGHT' || e?.code === 'ArrowRight' || e?.code === 'KeyD') {
                if (this.selectedButtonIndex < this.uiButtons.length - 1) {
                    this.selectedButtonIndex++;
                }
            } else if (intent === 'CONFIRM' || e?.code === 'Enter' || e?.code === 'Space') {
                this.onClick(this.uiButtons[this.selectedButtonIndex], true);
            } else if (intent === 'CANCEL' || e?.code === 'Escape' || e?.code === 'Backspace') {
                this.cancelAndReturn();
            }
        }
    }

    commitPoints() {
        this.attributes.forEach(attr => {
            if (this.pendingAllocations[attr] > 0) {
                this.member.attributes[attr] += this.pendingAllocations[attr];
            }
        });
        
        this.member.skillPoints = this.availablePoints;
        this.cancelAndReturn();
    }

    cancelAndReturn() {
        events.emit('CHANGE_SCENE', { scene: 'party', data: this.routeData });
    }

    // ========================================================
    // STATE ACCESS FOR RENDERER
    // ========================================================
    getState() {
        // FIXED: Derive the active ID directly from stable state, so it never blinks out
        // even if the mouse cursor gets parked in a dead zone.
        let activeId = null;
        if (this.activeSection === 'ATTRIBUTES') {
            const attr = this.attributes[this.selectedAttributeIndex].toUpperCase();
            activeId = `${this.attributeColumn}_${attr}`;
        } else if (this.activeSection === 'BUTTONS') {
            activeId = this.uiButtons[this.selectedButtonIndex];
        }

        return {
            member: this.member,
            availablePoints: this.availablePoints,
            pendingAllocations: this.pendingAllocations,
            currentStats: StatCalculator.calculateDetailed(this.member),
            previewStats: StatCalculator.calculateDetailed(this.member, this.pendingAllocations),
            hoveredElement: { id: activeId },
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}