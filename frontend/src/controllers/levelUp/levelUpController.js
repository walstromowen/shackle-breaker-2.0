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
        this.pendingAllocations = {
            vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0
        };
        this.attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];

        // --- KEYBOARD NAVIGATION STATE ---
        this.uiButtons = ['BTN_CANCEL', 'BTN_RESET', 'BTN_CONFIRM'];
        this.activeSection = 'ATTRIBUTES'; 
        this.selectedAttributeIndex = 0;
        this.attributeColumn = 'ADD'; 
        this.selectedButtonIndex = 2; 
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
    }

    // ========================================================
    // AUDIO WRAPPERS
    // ========================================================
    playNavSound() {
        super.playNavSound(); 
    }

    playClickSound() {
        events.emit('PLAY_SFX', { id: 'click', volume: 0.5, pitch: 0.9 + Math.random() * 0.2 });
    }

    playConfirmSound() {
        super.playConfirmSound(); 
    }

    playCancelSound() {
        super.playCancelSound(); 
    }

    // ========================================================
    // STANDARDIZED INPUT HANDLING
    // ========================================================
    handleMouseMove(x, y, isMouseDown, renderer) {
        const prevHoverId = this.hoveredHitboxId;
        super.handleMouseMove(x, y, isMouseDown, renderer);

        if (this.hoveredHitboxId && this.hoveredHitboxId !== prevHoverId) {
            this._setFocus(this.hoveredHitboxId);
        }
    }

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
        if (!hitboxId) return;

        if (!fromKeyboard) {
            this._setFocus(hitboxId);
        }

        if (hitboxId.startsWith('ADD_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.availablePoints > 0) {
                this.pendingAllocations[attr]++;
                this.availablePoints--;
                this.playClickSound();
            } else {
                this.playCancelSound(); 
            }
        } else if (hitboxId.startsWith('SUB_')) {
            const attr = hitboxId.split('_')[1].toLowerCase();
            if (this.pendingAllocations[attr] > 0) {
                this.pendingAllocations[attr]--;
                this.availablePoints++;
                this.playClickSound();
            } else {
                this.playCancelSound(); 
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
                this.playClickSound(); 
            } else {
                this.playCancelSound(); // Prevent resetting if nothing is spent
            }
        } else if (hitboxId === 'BTN_CONFIRM') {
            const hasPending = Object.values(this.pendingAllocations).some(v => v > 0);
            
            if (hasPending) {
                this.playConfirmSound(); 
                this.commitPoints();
            } else {
                // Deny exiting the screen via confirm if no points are spent
                this.playCancelSound(); 
            }
        } else if (hitboxId === 'BTN_CANCEL') {
            this.playCancelSound();
            this.cancelAndReturn();
        }
    }

    onRightClick(hitboxId) {
        this.playCancelSound();
        this.cancelAndReturn();
    }

    handleKeyDown(keyCode, e) {
        const intent = (e && KEY_BINDINGS[e.code]);
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
                this.playCancelSound();
                this.cancelAndReturn();
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
                this.playCancelSound();
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

    getState() {
        let selectedId = null;
        if (this.activeSection === 'ATTRIBUTES') {
            const attr = this.attributes[this.selectedAttributeIndex].toUpperCase();
            selectedId = `${this.attributeColumn}_${attr}`;
        } else if (this.activeSection === 'BUTTONS') {
            selectedId = this.uiButtons[this.selectedButtonIndex];
        }

        return {
            member: this.member,
            availablePoints: this.availablePoints,
            pendingAllocations: this.pendingAllocations,
            currentStats: StatCalculator.calculateDetailed(this.member),
            previewStats: StatCalculator.calculateDetailed(this.member, this.pendingAllocations),
            mouse: this.mouse,
            hoveredElement: this.hoveredHitboxId ? { id: this.hoveredHitboxId } : null,
            selectedElementId: selectedId,
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}