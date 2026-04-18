import { events } from '../../core/eventBus.js';
import { StatCalculator } from '../../../../shared/systems/statCalculator.js';

export class LevelUpController {
    constructor(input) {
        this.input = input;
        this.member = null;
        this.routeData = null; // Cache the incoming data so we don't break the party screen
        
        this.availablePoints = 0;
        this.pendingAllocations = {
            vigor: 0, strength: 0, dexterity: 0, intelligence: 0, attunement: 0
        };
        
        this.attributes = ['vigor', 'strength', 'dexterity', 'intelligence', 'attunement'];
    }

    init(payload) {
        // Store the exact payload so we can hand it perfectly back to the Party screen
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

    handleMouseDown(x, y, renderer) {
        const hitZoneId = renderer.getHitZone(x, y);
        if (!hitZoneId) return;

        // Handle (+) Buttons
        if (hitZoneId.startsWith('ADD_')) {
            const attr = hitZoneId.split('_')[1].toLowerCase();
            if (this.availablePoints > 0) {
                this.pendingAllocations[attr]++;
                this.availablePoints--;
            }
        }
        
        // Handle (-) Buttons
        if (hitZoneId.startsWith('SUB_')) {
            const attr = hitZoneId.split('_')[1].toLowerCase();
            if (this.pendingAllocations[attr] > 0) {
                this.pendingAllocations[attr]--;
                this.availablePoints++;
            }
        }

        // Handle Reset
        if (hitZoneId === 'BTN_RESET') {
            this.attributes.forEach(attr => {
                if (this.pendingAllocations[attr] > 0) {
                    this.availablePoints += this.pendingAllocations[attr];
                    this.pendingAllocations[attr] = 0;
                }
            });
        }

        // Handle Confirm
        if (hitZoneId === 'BTN_CONFIRM') {
            this.commitPoints();
        }

        // Handle Cancel/Back
        if (hitZoneId === 'BTN_CANCEL') {
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

        console.log(`[LevelUpController] Committed points for ${this.member.name}`);
        this._returnToParty();
    }

    handleKeyDown(code) {
        if (code === 'Escape') {
            this._returnToParty();
        }
    }

    _returnToParty() {
        // Now safely routes straight back to 'party' with the original data intact
        events.emit('CHANGE_SCENE', { 
            scene: 'party', 
            data: this.routeData 
        });
    }

    getState() {
        // [UPDATED] We now pass pendingAllocations directly into the calculator!
        return {
            member: this.member,
            availablePoints: this.availablePoints,
            pendingAllocations: this.pendingAllocations,
            currentStats: StatCalculator.calculateDetailed(this.member),
            previewStats: StatCalculator.calculateDetailed(this.member, this.pendingAllocations)
        };
    }

    // _generatePreviewEntity() has been completely deleted!
}