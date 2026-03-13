export class WeatherModel {
    constructor(definition) {
        // Static properties pulled from the definition
        this.id = definition.id;
        this.name = definition.name;
        this.visualEffect = definition.visualEffect;
        
        // Audio
        this.audioEffect = definition.audioEffect || 'none'; 
        
        // NEW: Pull battle-specific properties from the definition
        this.animationId = definition.animationId || null; 
        this.traitId = definition.traitId || null;         
        
        // Dynamic state managed by your time/world system
        this.timeRemaining = 0;
        this.totalDuration = 0; 
        this.intensity = 0.0; 
    }
    
    /**
     * Calculates the current alpha/intensity based on time remaining/elapsed.
     * @param {number} fadeDurationHours How many in-game hours it takes to fade in/out
     */
    updateIntensity(fadeDurationHours = 0.5) {
        const timeElapsed = this.totalDuration - this.timeRemaining;

        if (timeElapsed < fadeDurationHours) {
            // Fading in
            this.intensity = timeElapsed / fadeDurationHours;
        } else if (this.timeRemaining < fadeDurationHours) {
            // Fading out
            this.intensity = this.timeRemaining / fadeDurationHours;
        } else {
            // Fully active
            this.intensity = 1.0;
        }

        // Clamp to ensure floating point math never pushes us out of bounds
        this.intensity = Math.max(0, Math.min(1, this.intensity));
    }

    // Helper method to check if the weather duration has expired
    isFinished() {
        return this.timeRemaining <= 0;
    }
}