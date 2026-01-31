export class Formatting {
    
    /**
     * Returns a 3-letter abbreviation for a stat key.
     * @param {string} key - The full property name (e.g. 'strength', 'fire')
     * @returns {string} - The abbreviation (e.g. 'STR', 'FIR')
     */
    static getAbbreviation(key) {
        if (!key) return "---";
        
        const k = key.toLowerCase();
        
        const map = {
            // Attributes
            strength: "STR",
            dexterity: "DEX",
            agility: "AGI",
            intelligence: "INT",
            wisdom: "WIS",
            willpower: "WIL",
            vitality: "VIT",
            luck: "LUK",
            speed: "SPD",

            // Damage Types
            physical: "PHY",
            blunt: "BLT",
            slash: "SLS",
            pierce: "PRC",
            magic: "MAG",
            fire: "FIR",
            ice: "ICE",
            lightning: "LIT", // or LIG
            light: "LGT", // or HLY (Holy)
            dark: "DRK",
            poison: "PSN",
            bleed: "BLD",

            // Vitals
            maxHp: "HP",
            maxStamina: "STM",
            maxInsight: "INS",
            xp: "XP"
        };

        // Return mapped value, or default to first 3 letters uppercase
        return map[k] || key.substring(0, 3).toUpperCase();
    }

    /**
     * Capitalizes the first letter of a string.
     * @param {string} str 
     */
    static capitalize(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Formats a number with a sign if positive (e.g. "+5", "-3", "0").
     * Useful for stat modifiers.
     */
    static formatSigned(num) {
        if (!num) return "0";
        return (num > 0 ? "+" : "") + num;
    }

    /**
     * Formats a decimal 0.5 as "50%".
     * @param {number} num - The float value
     * @param {number} decimals - How many decimal places to show
     */
    static formatPercent(num, decimals = 0) {
        return (num * 100).toFixed(decimals) + "%";
    }

    /**
     * Formats large numbers with commas (e.g. 1,000,000).
     */
    static formatMoney(amount) {
        return Number(amount).toLocaleString();
    }
}