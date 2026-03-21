export class Particle {
    constructor(config) {
        // Lifecycle
        this.age = 0;
        this.life = config.life || 1.0;
        this.maxLife = this.life;
        this.isDead = false;

        // Positioning (Targeted)
        this.startX = config.startX || config.x || 0;
        this.startY = config.startY || config.y || 0;
        this.endX = config.endX || this.startX;
        this.endY = config.endY || this.startY;
        this.movement = config.movement || null; 
        this.arcHeight = config.arc || config.arcHeight || -50;

        // Positioning (Physics/Burst)
        this.x = this.startX;
        this.y = this.startY;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.gravity = config.gravity || 0;
        this.drag = config.drag !== undefined ? config.drag : 1;

        // Visuals
        this.config = config;
        this.scale = config.scale || 1.0;
        this.scaleDelta = config.scaleDelta || 0;
        
        this.baseAlpha = config.alpha !== undefined ? config.alpha : 1.0;
        this.alpha = this.baseAlpha;
        this.fadeOut = config.fadeOut !== undefined ? config.fadeOut : true;
        
        this.rotation = config.rotation || 0;
        this.rotationDelta = config.rotationDelta || 0;
        
        this.color = config.color || '#ffffff';
        this.blendMode = config.blendMode || 'source-over';
        
        // --- THE ONLY NEEDED CHANGE IS HERE ---
        // Default to 'battleProjectiles' so older animations don't break
        this.sheetKey = config.sheetKey || 'battleProjectiles'; 
        
        this.frame = config.frame || null;
        this.frameSize = config.frameSize || 32;
    }

    update(dt) {
        this.age += dt;
        const progress = Math.min(this.age / this.maxLife, 1.0);

        if (progress >= 1.0) {
            this.isDead = true;
            return;
        }

        // Route to the correct movement logic
        if (this.movement) {
            this.applyTargetedMovement(progress);
        } else {
            this.applyPhysicsMovement(dt);
        }

        // Apply shared transforms
        this.scale += this.scaleDelta * dt;
        if (this.scale < 0) this.scale = 0;
        
        // Auto-rotation (used for arcs) overrides standard rotationDelta
        if (this.config.rotation !== 'auto') {
            this.rotation += this.rotationDelta * dt;
        }

        // Standard fade out in the last 50% of life
        const customAlphas = ['expand_and_fade', 'float_up_and_pop', 'swipe_diagonal'];
        if (this.fadeOut && !customAlphas.includes(this.movement)) {
            if (progress > 0.5) {
                const fadeProgress = (progress - 0.5) / 0.5;
                this.alpha = this.baseAlpha * (1 - fadeProgress);
            }
        }
    }

    applyPhysicsMovement(dt) {
        this.vy += this.gravity * dt;
        this.vx *= this.drag;
        this.vy *= this.drag;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    applyTargetedMovement(progress) {
        switch (this.movement) {
            case 'linear':
                this.x = this.lerp(this.startX, this.endX, progress);
                this.y = this.lerp(this.startY, this.endY, progress);
                break;

            case 'arc':
                this.x = this.lerp(this.startX, this.endX, progress);
                const baseLineY = this.lerp(this.startY, this.endY, progress);
                this.y = baseLineY + (Math.sin(progress * Math.PI) * this.arcHeight);
                
                if (this.config.rotation === 'auto') {
                    const nextX = this.lerp(this.startX, this.endX, progress + 0.01);
                    const nextBaseY = this.lerp(this.startY, this.endY, progress + 0.01);
                    const nextY = nextBaseY + (Math.sin((progress + 0.01) * Math.PI) * this.arcHeight);
                    this.rotation = Math.atan2(nextY - this.y, nextX - this.x);
                }
                break;

            case 'expand_and_fade':
                this.x = this.startX;
                this.y = this.startY;
                this.scale = (this.config.scale || 1.0) * (1.0 + progress); 
                this.alpha = this.baseAlpha * (1.0 - progress); 
                break;

            case 'float_up_and_pop':
                this.x = this.startX;
                this.y = this.startY - (progress * 40); 
                this.alpha = progress > 0.8 ? this.baseAlpha * ((1.0 - progress) / 0.2) : this.baseAlpha;
                this.scale = (this.config.scale || 1.0) + (progress * 0.2); 
                break;

            case 'swipe_diagonal':
                this.x = this.startX + (progress * 60) - 30; 
                this.y = this.startY + (progress * 60) - 30; 
                this.alpha = this.baseAlpha * Math.sin(progress * Math.PI); 
                break;
                
            default:
                this.x = this.startX;
                this.y = this.startY;
                break;
        }
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
}