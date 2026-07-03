import { Particle } from './particle.js';
import { UITheme } from '../../ui/UITheme.js';

export class VFXRenderer {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.particles = [];
    }

    spawn(config) {
        const p = new Particle(config);
        
        if (p.maxLife === undefined) {
            p.maxLife = config.life || 1.0; 
        }

        // --- GUARANTEE FLAGS ---
        // Explicitly inject keys here to guarantee they exist for the render loop.
        p.flipX = config.flipX;
        p.flipY = config.flipY;
        p.frameCount = config.frameCount || 1; // Safety net for animations
        p.frameSize = config.frameSize || 32;
        p.sheetKey = config.sheetKey;
        
        this.particles.push(p);
    }

    spawnBurst(x, y, count, baseConfig) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const minSpeed = baseConfig.minSpeed || 120;
            const maxSpeed = baseConfig.maxSpeed || 360;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const life = (baseConfig.minLife || 0.5) + Math.random() * ((baseConfig.maxLife || 1.0) - (baseConfig.minLife || 0.5));
            
            this.spawn({
                ...baseConfig,
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            
            if (p.isDead) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
    if (this.particles.length === 0) return;
    this.ctx.save();
    
    for (const p of this.particles) {
        this.ctx.globalCompositeOperation = p.blendMode || 'source-over';
        this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha !== undefined ? p.alpha : 1.0));
        
        this.ctx.save(); // Save per-particle context matrix
        
        // 1. Move origin to particle center position
        this.ctx.translate(p.x, p.y);
        
        // 2. Perform the true horizontal/vertical scaling flips first
        const scaleX = p.flipX ? -1 : 1;
        const scaleY = p.flipY ? -1 : 1;
        this.ctx.scale(scaleX, scaleY);
        
        // 3. Apply angular rotation safely *after* mirroring dimensions
        this.ctx.rotate(p.rotation || 0);

        // --- ANIMATION LOGIC ---
        if (p.sheetKey) {
        const sheet = this.loader.get ? this.loader.get(p.sheetKey) : this.loader.getAsset(p.sheetKey);
        if (sheet) {
            const progress = p.maxLife > 0 ? Math.min(p.age / p.maxLife, 1.0) : 1.0;
            const frames = p.frameCount || 1;
            const currentFrame = Math.min(Math.floor(progress * frames), frames - 1);
            const srcX = currentFrame * p.frameSize;
            const srcY = 0;
            const size = p.frameSize * (p.scale || 1.0) * 2.4;
            
            this.ctx.drawImage(
            sheet, 
            srcX, srcY, p.frameSize, p.frameSize, 
            -size/2, -size/2, size, size
            );
        }
        } else {
        this.ctx.fillStyle = p.color || '#ffffff';
        this.ctx.shadowColor = p.color || '#ffffff';
        this.ctx.shadowBlur = 24;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12 * (p.scale || 1.0), 0, Math.PI * 2);
        this.ctx.fill();
        }
        
        this.ctx.restore(); // Instantly clean-restores the matrix stack for the next particle
    }
    
    this.ctx.restore();
    }
}