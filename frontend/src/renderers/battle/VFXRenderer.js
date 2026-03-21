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
        this.particles.push(p);
    }

    spawnBurst(x, y, count, baseConfig) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (baseConfig.minSpeed || 50) + Math.random() * ((baseConfig.maxSpeed || 150) - (baseConfig.minSpeed || 50));
            
            this.spawn({
                ...baseConfig,
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: (baseConfig.minLife || 0.5) + Math.random() * ((baseConfig.maxLife || 1.0) - (baseConfig.minLife || 0.5)),
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
            this.ctx.globalCompositeOperation = p.blendMode;
            this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

            this.ctx.translate(p.x, p.y);
            // Convert degrees to radians if your configurations use degrees, else assume radians
            this.ctx.rotate(p.rotation);

            if (p.sheetKey && p.frame) {
                const sheet = this.loader.get ? this.loader.get(p.sheetKey) : this.loader.getAsset(p.sheetKey);
                if (sheet) {
                    const srcX = p.frame.col * p.frameSize;
                    const srcY = p.frame.row * p.frameSize;
                    const size = p.frameSize * p.scale;
                    
                    this.ctx.drawImage(
                        sheet,
                        srcX, srcY, p.frameSize, p.frameSize,
                        -size/2, -size/2, size, size
                    );
                }
            } else {
                // Fallback / Basic Shape Particle
                this.ctx.fillStyle = p.color;
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 5 * p.scale, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Reset transform for the next particle instead of saving/restoring ctx repeatedly
            this.ctx.rotate(-p.rotation);
            this.ctx.translate(-p.x, -p.y);
        }

        this.ctx.restore();
    }
}