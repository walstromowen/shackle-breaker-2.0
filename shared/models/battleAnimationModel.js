export class BattleAnimationModel {
    constructor(id, definition, actor, targets) {
        this.id = id;
        this.duration = definition.duration;
        this.def = definition;
        this.actor = actor;
        this.targets = targets || [];

        // Keep track of audio cues we've already fired
        this.playedAudio = new Set();
    }
    
    getAudioTriggers(progress) {
        if (!this.def.audio) return [];

        const triggers = [];
        this.def.audio.forEach((soundDef, index) => {
            // If we've passed the start time, and haven't played it yet...
            if (progress >= soundDef.start && !this.playedAudio.has(index)) {
                this.playedAudio.add(index); // Mark as played
                triggers.push(soundDef);
            }
        });
        
        return triggers;
    }

    getActiveProjectiles(progress) {
        if (!this.def.projectiles || this.def.projectiles.length === 0) {
            return [];
        }

        return this.def.projectiles
            .filter(p => progress >= p.start && progress <= p.end)
            .map(p => {
                // Calculate how far along the projectile is in its own specific lifespan (0.0 to 1.0)
                const flightProgress = (progress - p.start) / (p.end - p.start);
                return { flightProgress, def: p };
            });
    }

    // Calculates the exact visual offsets and filters for a specific entity at a specific point in time
    getTransform(entity, progress, isPlayer) {
        let transform = { xOffset: 0, yOffset: 0, filter: 'none', alpha: 1.0 };

        // 1. ACTOR ANIMATION (e.g., Lunging, Sinking, Shaking, Fading, and Flashing)
        if (entity === this.actor && this.def.actor) {
            const actDef = this.def.actor;
            
            if (actDef.type === 'lunge' && progress >= actDef.start && progress <= actDef.end) {
                const localProgress = (progress - actDef.start) / (actDef.end - actDef.start);
                const lungePeak = Math.sin(localProgress * Math.PI); 
                const direction = isPlayer ? 1 : -1;
                transform.xOffset += direction * (lungePeak * actDef.distance);
            }

            if (actDef.type === 'sink' && progress >= actDef.start && progress <= actDef.end) {
                const localProgress = (progress - actDef.start) / (actDef.end - actDef.start);
                transform.yOffset += (localProgress * localProgress) * actDef.distance;
                transform.alpha = 1.0 - localProgress; 
            }

            // --- NEW: Aggressive Shake for Fainting ---
            if (actDef.type === 'shake' && progress >= actDef.start && progress <= actDef.end) {
                // Adds a random jitter to X and Y based on the intensity
                transform.xOffset += (Math.random() - 0.5) * actDef.intensity;
                transform.yOffset += (Math.random() - 0.5) * actDef.intensity;
            }

            // --- NEW: Gradual Fade for Thanos Snap ---
            if (actDef.fade && progress >= actDef.fade.start) {
                if (progress >= actDef.fade.end) {
                    transform.alpha = 0.0; // Completely gone
                } else {
                    const fadeProgress = (progress - actDef.fade.start) / (actDef.fade.end - actDef.fade.start);
                    transform.alpha = 1.0 - fadeProgress; // Tweens from 1.0 down to 0.0
                }
            }

            if (actDef.flash && progress >= actDef.flash.start && progress <= actDef.flash.end) {
                transform.filter = actDef.flash.filter;
            }
        }

        // 2. TARGET ANIMATION (e.g., Shaking and Flashing)
        if (this.targets.includes(entity) && this.def.target) {
            const tarDef = this.def.target;
            
            if (tarDef.shake && progress >= tarDef.shake.start && progress <= tarDef.shake.end) {
                transform.xOffset += (Math.random() - 0.5) * tarDef.shake.intensity;
                transform.yOffset += (Math.random() - 0.5) * tarDef.shake.intensity;
            }
            
            if (tarDef.flash && progress >= tarDef.flash.start && progress <= tarDef.flash.end) {
                transform.filter = tarDef.flash.filter;
            }
        }

        return transform;
    }
}