export class Entity {
    constructor(state) {
        this.state = state;
    }

    // --- IDENTITY ---
    get id() { return this.state.instanceId; }
    get name() { return this.state.name; }
    get origin() { return this.state.origin; }
    get traits() { return this.state.traits || []; } 

    // --- HELPER: Calculate Effective Stat (Base + Traits) ---
    _getEffectiveAttribute(attrName) {
        let total = this.state.attributes[attrName] || 0;

        for (const trait of this.traits) {
            if (trait.modifiers && trait.modifiers[attrName]) {
                total += trait.modifiers[attrName];
            }
        }
        return total;
    }

    // --- ATTRIBUTES (Calculated: Base + Traits) ---
    get vigor() { return this._getEffectiveAttribute('vigor'); }
    get strength() { return this._getEffectiveAttribute('strength'); }
    get dexterity() { return this._getEffectiveAttribute('dexterity'); }
    get intelligence() { return this._getEffectiveAttribute('intelligence'); }
    get attunement() { return this._getEffectiveAttribute('attunement'); }

    // --- DERIVED STATS ---
    get maxHp() {
        return (this.vigor * 10) + (this.strength * 0.5);
    }

    get maxStamina() {
        return (this.vigor * 5) + (this.dexterity * 5);
    }

    get maxInsight() {
        return (this.attunement * 10) + (this.intelligence * 2);
    }

    // --- OFFENSIVE STATS ---
    get baseBlunt() { return Math.floor(this.strength * 1.5); }
    get basePierce() { return Math.floor(this.dexterity * 1.2); }
    get baseSlash() { return Math.floor((this.strength + this.dexterity) / 2); }
    get evasion() { return this.dexterity * 2; }

    // --- LIVE STATS ---
    get hp() { return this.state.currentHp; }
    get stamina() { return this.state.currentStamina; }
    get insight() { return this.state.currentInsight; }

    // --- ACTIONS ---
    takeDamage(amount) {
        this.state.currentHp -= amount;
        if (this.state.currentHp <= 0) {
            this.state.currentHp = 0;
            this.state.isDead = true;
        }
    }

    heal(amount) {
        this.state.currentHp += amount;
        if (this.state.currentHp > this.maxHp) {
            this.state.currentHp = this.maxHp;
        }
    }

    spendStamina(amount) {
        if (this.state.currentStamina >= amount) {
            this.state.currentStamina -= amount;
            return true;
        }
        return false;
    }

    gainInsight(amount) {
        this.state.currentInsight += amount;
        if (this.state.currentInsight > this.maxInsight) {
            this.state.currentInsight = this.maxInsight;
        }
    }
}