export class BattleAnimationModel {
    constructor(id, definition, actor, targets) {
        this.id = id;
        this.duration = definition.duration;
        this.def = definition;
        this.actor = actor;
        this.targets = Array.isArray(targets) ? targets : (targets ? [targets] : []);

        // Keep track of audio and VFX cues we've already fired
        this.playedAudio = new Set();
        this.playedVFX = new Set(); 
    }
    
    /**
     * MASTER RENDERER METHOD
     * Call this once per frame in your render loop to get the exact state of all entities.
     */
    getFrameState(progress, isPlayer) {
        return {
            actorTransform: this.getTransform(this.actor, progress, isPlayer),
            targetTransforms: this.targets.map(target => ({
                entity: target,
                transform: this.getTransform(target, progress, isPlayer)
            })),
            newAudioCues: this.getAudioTriggers(progress),
            newVFXCues: this.getVFXTriggers(progress),
            background: this.getActiveBackground(progress)
        };
    }

    getAudioTriggers(progress) {
        if (!this.def.audio) return [];

        const triggers = [];
        this.def.audio.forEach((soundDef, index) => {
            if (progress >= soundDef.start && !this.playedAudio.has(index)) {
                this.playedAudio.add(index); 
                triggers.push(soundDef);
            }
        });
        
        return triggers;
    }

    getVFXTriggers(progress) {
        if (!this.def.vfx) return [];

        const triggers = [];
        this.def.vfx.forEach((vfxDef, index) => {
            if (progress >= vfxDef.start && !this.playedVFX.has(index)) {
                this.playedVFX.add(index); 
                // Attach origin entity context directly for the renderer
                const resolvedOrigin = vfxDef.origin === 'target' && this.targets.length > 0 
                                       ? this.targets[0] 
                                       : this.actor;
                
                triggers.push({ ...vfxDef, resolvedOrigin });
            }
        });
        
        return triggers;
    }

    getActiveBackground(progress) {
        if (!this.def.background) return null;

        const bgDef = this.def.background;
        if (progress >= bgDef.start && progress <= bgDef.end) {
            const duration = bgDef.end - bgDef.start;
            const localProgress = (progress - bgDef.start) / duration;

            let currentAlpha = 1.0;
            const fadeRatio = 0.2; 

            if (localProgress < fadeRatio) {
                currentAlpha = localProgress / fadeRatio; 
            } else if (localProgress > 1.0 - fadeRatio) {
                currentAlpha = (1.0 - localProgress) / fadeRatio; 
            }

            return {
                key: bgDef.key || 'current', 
                filter: bgDef.filter || 'none',
                alpha: currentAlpha 
            };
        }
        
        return null;
    }

    getTransform(entity, progress, isPlayer) {
        let transform = { xOffset: 0, yOffset: 0, filter: 'none', alpha: 1.0 };

        // 1. ACTOR ANIMATION
        if (entity === this.actor && this.def.actor) {
            const actDef = this.def.actor;
            
            // --- Slide In (Entrance) Logic ---
            if (actDef.type === 'slide_in') {
                const startOffset = isPlayer ? -actDef.distance : actDef.distance;

                if (progress < actDef.start) {
                    transform.xOffset += startOffset;
                } else if (progress <= actDef.end) {
                    const localProgress = (progress - actDef.start) / (actDef.end - actDef.start);
                    // Ease-out calculation so they slide in fast and gently brake
                    const easeOut = 1 - Math.pow(1 - localProgress, 3);
                    transform.xOffset += startOffset * (1 - easeOut);
                }
            }

            // --- Fade In Logic ---
            if (actDef.fadeIn) {
                if (progress < actDef.fadeIn.start) {
                    transform.alpha = 0.0;
                } else if (progress <= actDef.fadeIn.end) {
                    const fadeProgress = (progress - actDef.fadeIn.start) / (actDef.fadeIn.end - actDef.fadeIn.start);
                    transform.alpha = fadeProgress;
                }
            }

            // --- Slide Out (Flee) Logic ---
            if (actDef.type === 'slide_out') {
                const targetOffset = isPlayer ? -actDef.distance : actDef.distance;

                if (progress >= actDef.start && progress <= actDef.end) {
                    const localProgress = (progress - actDef.start) / (actDef.end - actDef.start);
                    // Ease-in calculation so they start running slow and accelerate
                    const easeIn = Math.pow(localProgress, 2); 
                    transform.xOffset += targetOffset * easeIn;
                } else if (progress > actDef.end) {
                    // Hold them at their final escaped distance once the movement finishes
                    transform.xOffset += targetOffset;
                }
            }

            // --- Existing Lunge, Sink, Shake, Fade, Flash ---
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

            if (actDef.type === 'shake' && progress >= actDef.start && progress <= actDef.end) {
                transform.xOffset += (Math.random() - 0.5) * actDef.intensity;
                transform.yOffset += (Math.random() - 0.5) * actDef.intensity;
            }

            if (actDef.fade && progress >= actDef.fade.start) {
                if (progress >= actDef.fade.end) {
                    transform.alpha = 0.0; 
                } else {
                    const fadeProgress = (progress - actDef.fade.start) / (actDef.fade.end - actDef.fade.start);
                    transform.alpha = 1.0 - fadeProgress; 
                }
            }

            if (actDef.flash && progress >= actDef.flash.start && progress <= actDef.flash.end) {
                transform.filter = actDef.flash.filter;
            }
        }

        // 2. TARGET ANIMATION
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