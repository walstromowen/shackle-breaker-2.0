export class BattlePartyModel {
    /**
     * @param {CombatantModel[]} combatants - Array of wrapped entities
     */
    constructor(combatants = []) {
        this.members = combatants; 
        
        // Indices pointing to this.members array
        // -1 indicates an empty slot on the battlefield
        // Default to 3 slots (Standard RPG style)
        this.activeSlots = [-1, -1, -1]; 
    }

    /**
     * Sets up the initial battlefield positions.
     * Fills slots 0, 1, 2 with the first available living members.
     * @param {number} activeCount - How many slots to fill (usually 1 or 3)
     */
    initialize(activeCount = 3) {
        this.activeSlots.fill(-1);
        let assigned = 0;

        for (let i = 0; i < this.members.length; i++) {
            if (assigned >= activeCount) break;

            // Only deploy if they are alive
            if (this.members[i].hp > 0) {
                this.activeSlots[assigned] = i;
                assigned++;
            }
        }
    }

    /**
     * Returns the Combatant objects currently on the field.
     * Slots with no member (or -1) return null.
     * @returns {(CombatantModel|null)[]}
     */
    getActiveMembers() {
        return this.activeSlots.map(index => {
            if (index === -1) return null;
            return this.members[index];
        });
    }

    /**
     * Returns the specific combatant at a battlefield position.
     * @param {number} slotIndex - 0, 1, or 2
     */
    getMemberAt(slotIndex) {
        const memberIndex = this.activeSlots[slotIndex];
        if (memberIndex === -1) return null;
        return this.members[memberIndex];
    }

    /**
     * Returns members who are alive but NOT currently on the field.
     */
    getReserveMembers() {
        return this.members.filter((c, index) => {
            const isAlive = c.hp > 0;
            const isDeployed = this.activeSlots.includes(index);
            return isAlive && !isDeployed;
        });
    }

    /**
     * Swaps a member from the bench into an active slot.
     * @param {number} slotIndex - The battlefield slot (0-2)
     * @param {number} memberIndex - The index in this.members array
     */
    swapMember(slotIndex, memberIndex) {
        if (slotIndex < 0 || slotIndex >= this.activeSlots.length) return false;
        if (memberIndex < 0 || memberIndex >= this.members.length) return false;
        
        // Basic validation: Don't swap in a dead guy
        if (this.members[memberIndex].hp <= 0) return false;

        this.activeSlots[slotIndex] = memberIndex;
        return true;
    }

    /**
     * Checks if the entire party is wiped out.
     */
    isDefeated() {
        return this.members.every(m => m.hp <= 0);
    }
}