export class StatCalculator {
    
    static get DAMAGE_TYPES() {
        return [
            "blunt", "slash", "pierce", 
            "fire", "ice", "lightning", "water", "earth", "wind", 
            "light", "dark", "arcane"
        ];
    }

    static calculate(character) {
        // 1. Base State
        const attrs = character.attributes || {};
        const equipment = (character.state && character.state.equipment) ? character.state.equipment : (character.equipment || {});

        // 2. Initialize Structure
        const stats = {
            attack: {}, 
            defenses: {},
            resistances: {},
            
            speed: (attrs.speed || 0),
            critChance: (attrs.dexterity || 0) * 0.01,
            critMultiplier: 1.5,
            corruption: character.state?.corruption || 0
        };

        // Zero out
        this.DAMAGE_TYPES.forEach(type => {
            stats.attack[type] = 0; 
            stats.defenses[type] = 0;
            stats.resistances[type] = 0;
        });

        // 3. Apply Attribute Scaling (Attributes -> Attack)
        const str = attrs.strength || 0;
        stats.attack.blunt += str;
        stats.attack.slash += str;
        stats.attack.pierce += str;

        const int = attrs.intelligence || 0;
        stats.attack.fire += int;     
        stats.attack.ice += int;       
        stats.attack.lightning += int; 
        stats.attack.arcane += int;    

        const end = attrs.endurance || 0;
        stats.defenses.blunt += end;
        stats.defenses.slash += end;
        stats.defenses.pierce += end;

        const dex = attrs.dexterity || 0;
        stats.speed += dex; 

        // 4. Apply Equipment
        Object.values(equipment).forEach(item => {
            if (!item) return;
            const def = item.definition || item; 

            // STRICTLY CHECK FOR 'attack'
            if (def.attack) {
                for (const [type, val] of Object.entries(def.attack)) {
                    if (stats.attack[type] !== undefined) stats.attack[type] += val;
                }
            }

            if (def.defense) {
                for (const [type, val] of Object.entries(def.defense)) {
                    if (stats.defenses[type] !== undefined) stats.defenses[type] += val;
                }
            }

            if (def.resistance) {
                for (const [type, val] of Object.entries(def.resistance)) {
                    if (stats.resistances[type] !== undefined) stats.resistances[type] += val;
                }
            }
            
            if (def.attributes) {
                if (def.attributes.speed) stats.speed += def.attributes.speed;
            }
            
            if (def.bonuses) {
                if (def.bonuses.critChance) stats.critChance += def.bonuses.critChance;
                if (def.bonuses.critMultiplier) stats.critMultiplier += def.bonuses.critMultiplier;
            }
        });

        return stats;
    }
}