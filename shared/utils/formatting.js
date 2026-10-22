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
            // --- ATTRIBUTES ---
            vigor: "VIG",
            strength: "STR",
            dexterity: "DEX",
            intelligence: "INT",
            attunement: "ATN",
            speed: "SPD",

            // --- COMBAT ---
            // [FIX] Keys must be lowercase to match 'k'
            critchance: "Crit %",   
            critdamage: "Crit Dmg", 

            // --- DAMAGE TYPES ---
            blunt: "BLT",
            slash: "SLS",
            pierce: "PRC",

            fire: "FIR",
            ice: "ICE",
            lightning: "LNG", 
            water: "WAT",
            earth: "ERT",
            wind: "WND",

            light: "LGT", 
            dark: "DRK",
            arcane: "ARC",

            // --- VITALS ---
            // [FIX] Keys must be lowercase
            maxhp: "Max HP",       
            maxstamina: "Max STM", 
            maxinsight: "Max INS", 
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
    /**
     * A number short enough for a small box: whole numbers up to 9999 as they are, then 12.3k / 123k, 1.2M, 1.2B (never rounds up into the next unit).
     * "21929" -> "21.9k", "123456" -> "123k", "2500000" -> "2.5M". Anything that is not a finite number is returned as it is.
     */
    static compactNumber(num) {
        const n = Number(num);
        if (!Number.isFinite(n)) return String(num);
        const sign = n < 0 ? "-" : "";
        const a = Math.abs(Math.floor(n));
        if (a < 10000) return sign + a;
        const units = [[1e9, "B"], [1e6, "M"], [1e3, "k"]];
        for (const [size, letter] of units) {
            if (a >= size) {
                const v = a / size;
                const digits = v < 100 ? 1 : 0;
                const cut = Math.floor(v * 10 ** digits) / 10 ** digits;   // cut, not rounded: 999.9k never becomes "1000k"
                return sign + (digits ? cut.toFixed(1).replace(/\.0$/, "") : cut) + letter;
            }
        }
        return sign + a;
    }

    /**
     * Replaces bracketed tokens in a string with values from a context object.
     * Example: parseTokens("{actor} uses {ability}!", { actor: "Hero", ability: "Fireball" })
     * Returns: "Hero uses Fireball!"
     * * @param {string} text - The raw string containing {tokens}
     * @param {Object} context - An object containing the replacement values
     * @returns {string} - The fully parsed string
     */
    static parseTokens(text, context = {}) {
        if (!text) return "";

        // Finds anything inside { } brackets
        return text.replace(/{(\w+)}/g, (match, key) => {
            // If the key exists in our context object, swap it in.
            // Otherwise, leave the {token} as is so you can spot missing data in-game.
            return context[key] !== undefined ? context[key] : match;
        });
    }
}