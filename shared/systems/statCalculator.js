// shared/systems/StatCalculator.js
export class StatCalculator {
    
    static DAMAGE_TYPES = [
        "blunt", "slash", "pierce", 
        "fire", "water", "lightning", "earth", "wind", 
        "light", "shadow", "arcane"
    ];

    /**
     * returns { attacks, defenses, resistances, other }
     */
    static calculate(character) {
        // 1. Base State
        const attrs = character.attributes || {};
        const equipment = (character.state && character.state.equipment) ? character.state.equipment : {};

        // 2. Initialize Structure
        const stats = {
            attacks: {},
            defenses: {},
            resistances: {},
            other: {
                speed: 0,
                critical: 0,
                corruption: character.state?.corruption || 0
            }
        };

        // Zero out all types
        this.DAMAGE_TYPES.forEach(type => {
            stats.attacks[type] = 0;
            stats.defenses[type] = 0;
            stats.resistances[type] = 0;
        });

        // 3. Apply Attribute Bonuses (Example Logic - Tweak as needed)
        // Strength adds Physical Dmg
        stats.attacks.blunt += (attrs.strength || 0);
        stats.attacks.slash += (attrs.strength || 0);
        
        // Dexterity adds Critical & Speed
        stats.other.critical += (attrs.dexterity || 0) * 0.5;
        stats.other.speed += (attrs.agility || 0);

        // Intelligence adds Elemental Dmg
        stats.attacks.fire += (attrs.intelligence || 0);
        stats.attacks.arcane += (attrs.intelligence || 0);

        // Endurance adds Physical Defense
        stats.defenses.blunt += (attrs.endurance || 0);
        stats.defenses.slash += (attrs.endurance || 0);

        // 4. Apply Equipment
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const def = item.definition || item; // Handle model or raw definition

            // Add Damage
            if (def.damage) {
                for (const [type, val] of Object.entries(def.damage)) {
                    if (stats.attacks[type] !== undefined) stats.attacks[type] += val;
                }
            }

            // Add Defense
            if (def.defense) {
                for (const [type, val] of Object.entries(def.defense)) {
                    if (stats.defenses[type] !== undefined) stats.defenses[type] += val;
                }
            }

            // Add Resistances (Assume defined in item.resistance)
            if (def.resistance) {
                for (const [type, val] of Object.entries(def.resistance)) {
                    if (stats.resistances[type] !== undefined) stats.resistances[type] += val;
                }
            }
            
            // Add Bonuses (Speed/Crit on items)
            if (def.bonuses) {
                if (def.bonuses.speed) stats.other.speed += def.bonuses.speed;
                if (def.bonuses.critical) stats.other.critical += def.bonuses.critical;
            }
        });

        return stats;
    }
}