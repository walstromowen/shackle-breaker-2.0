import { events } from '../../core/eventBus.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';
import { BaseController } from '../core/baseController.js';

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
        this.navGrid = [
            ['SUB_VIGOR', 'ADD_VIGOR'],
            ['SUB_STRENGTH', 'ADD_STRENGTH'],
            ['SUB_DEXTERITY', 'ADD_DEXTERITY'],
            ['SUB_INTELLIGENCE', 'ADD_INTELLIGENCE'],
            ['SUB_ATTUNEMENT', 'ADD_ATTUNEMENT'],
            ['BTN_CANCEL', 'BTN_RESET', 'BTN_CONFIRM'] // Bottom row buttons
        ];
        this.navRow = 0;
        this.navCol = 1; // Default focus to the top right ADD button
        this.isKeyboardActive = false;
    }

    init(payload) {
        this.routeData = payload;
        this.member = payload.character || payload.member || payload; 
        this.availablePoints = this.member.skillPoints || 0;
        
        if (!this.member.attributes) {
            this.member.attributes = {
                vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0
            };
        }

        this.attributes.forEach(attr => this.pendingAllocations[attr] = 0);
    }

    onHover(hitboxId) {
        super.onHover(hitboxId);
        // If the mouse moves over a valid hitbox, hand control back to the mouse
        if (hitboxId) {
            this.isKeyboardActive = false;
        }
    }

    onClick(hitboxId) {
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
            this.commitPoints();
        }

        if (hitboxId === 'BTN_CANCEL') {
            this._returnToParty();
        }
    }

    commitPoints() {
        this.attributes.forEach(attr => {
            if (this.pendingAllocations[attr] > 0) {
                this.member.attributes[attr] += this.pendingAllocations[attr];
            }
        });
        this.member.skillPoints = this.availablePoints;
        this._returnToParty();
    }

    handleKeyDown(code) {
        if (code === 'Escape') {
            this._returnToParty();
            return;
        }

        // --- KEYBOARD ROUTING ---
        const isUp = ['ArrowUp', 'KeyW'].includes(code);
        const isDown = ['ArrowDown', 'KeyS'].includes(code);
        const isLeft = ['ArrowLeft', 'KeyA'].includes(code);
        const isRight = ['ArrowRight', 'KeyD'].includes(code);
        const isAction = ['Enter', 'Space', 'KeyE'].includes(code);

        if (isUp || isDown || isLeft || isRight || isAction) {
            this.isKeyboardActive = true;
        }

        if (isUp && this.navRow > 0) {
            this.navRow--;
            this._clampNavCol();
        } else if (isDown && this.navRow < this.navGrid.length - 1) {
            this.navRow++;
            this._clampNavCol();
        } else if (isLeft && this.navCol > 0) {
            this.navCol--;
        } else if (isRight && this.navCol < this.navGrid[this.navRow].length - 1) {
            this.navCol++;
        } else if (isAction) {
            const currentId = this.navGrid[this.navRow][this.navCol];
            this.onClick(currentId);
        }
    }

    _clampNavCol() {
        // Prevents the cursor from dropping off the edge if navigating 
        // from a row with 3 items to a row with 2 items.
        const rowLength = this.navGrid[this.navRow].length;
        if (this.navCol >= rowLength) {
            this.navCol = rowLength - 1;
        }
    }

    _returnToParty() {
        events.emit('CHANGE_SCENE', { 
            scene: 'party', 
            data: this.routeData 
        });
    }

    getState() {
        // Decide which focus system is currently driving the UI
        const activeHoverId = this.isKeyboardActive 
            ? this.navGrid[this.navRow][this.navCol] 
            : this.hoveredHitboxId;

        return {
            member: this.member,
            availablePoints: this.availablePoints,
            pendingAllocations: this.pendingAllocations,
            currentStats: StatCalculator.calculateDetailed(this.member),
            previewStats: StatCalculator.calculateDetailed(this.member, this.pendingAllocations),
            
            hoverId: activeHoverId, // Automatically updates the renderer's highlight!
            onLayoutUpdate: (hitboxes) => this.updateHitboxes(hitboxes)
        };
    }
}