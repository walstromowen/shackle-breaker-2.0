export class TextEntry {
    /**
     * @param {string} initialText - The starting string
     * @param {number} maxLength - Max characters allowed
     * @param {RegExp} allowedPattern - Regex for allowed keys (default: Alphanumeric + Space)
     */
    constructor(initialText = "", maxLength = 12, allowedPattern = /^[a-zA-Z0-9 ]$/) {
        this.value = initialText;
        this.maxLength = maxLength;
        this.allowedPattern = allowedPattern;
    }

    /**
     * Processes a raw keyboard event to update the text.
     * @param {KeyboardEvent} e 
     */
    handleEvent(e) {
        // 1. Handle Backspace (Remove last char)
        if (e.key === "Backspace") {
            this.value = this.value.slice(0, -1);
            return;
        }

        // 2. Ignore functional keys (Enter, Shift, Arrows, Control, etc.)
        // We check length > 1 because "A" is length 1, "Enter" is length 5.
        if (e.key.length > 1) return;

        // 3. Enforce Max Length
        if (this.value.length >= this.maxLength) return;

        // 4. Validate against pattern and Append
        if (this.allowedPattern.test(e.key)) {
            this.value += e.key;
        }
    }

    /**
     * Force set the text (e.g. when randomizing names)
     */
    reset(text) {
        // Ensure we don't exceed max length even on reset
        this.value = text.slice(0, this.maxLength);
    }
}