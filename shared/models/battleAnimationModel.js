export class BattleAnimationModel {
    constructor(id, definition, actor, targets) {
        this.id = id;
        this.duration = definition.duration;
        this.def = definition;
        this.actor = actor;
        this.targets = targets || [];
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
        let transform = { xOffset: 0, yOffset: 0, filter: 'none' };

        // 1. ACTOR ANIMATION (e.g., Lunging and Flashing)
        if (entity === this.actor && this.def.actor) {
            const actDef = this.def.actor;
            
            if (actDef.type === 'lunge' && progress >= actDef.start && progress <= actDef.end) {
                // Normalize progress within the specific action window
                const localProgress = (progress - actDef.start) / (actDef.end - actDef.start);
                const lungePeak = Math.sin(localProgress * Math.PI); // 0 -> 1 -> 0 arc
                const direction = isPlayer ? 1 : -1;
                
                transform.xOffset += direction * (lungePeak * actDef.distance);
            }

            // NEW: Allow the actor to flash/glow (great for charge-ups!)
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