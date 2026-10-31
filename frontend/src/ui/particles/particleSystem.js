import { Particle } from './particle.js';
import { UITheme } from '../UITheme.js';

// A sprite's `filter` (e.g. tint('fire') in animationKit) is applied while it is drawn. Set to false to draw every sprite unfiltered
// (filters cost frame time, drop-shadow most of all).
const APPLY_SPRITE_FILTERS = true;

export class ParticleSystem {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.loader = loader;
        this.particles = [];
        this._warnedSheets = new Set();
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

    /**
     * A spray of particles from one point.
     *   angle / cone   optional, in degrees. Without them the spray goes every way. With them it goes towards `angle`
     *                  (0 = right, 90 = down, 180 = left, 270 = up), fanned out over `cone` degrees (default 30).
     *   spreadX/spreadY optional. Each particle starts somewhere inside a box that wide / tall around the point, so one cue can cover an area
     *                  (rain over the whole party, a sandstorm across the field).
     */
    spawnBurst(x, y, count, baseConfig) {
        const minSpeed = baseConfig.minSpeed ?? 120;
        const maxSpeed = baseConfig.maxSpeed ?? 360;
        const minLife = baseConfig.minLife ?? 0.5;
        const maxLife = baseConfig.maxLife ?? 1.0;
        const hasDirection = typeof baseConfig.angle === 'number';
        const cone = baseConfig.cone ?? 30;
        const spreadX = baseConfig.spreadX || 0;
        const spreadY = baseConfig.spreadY || 0;

        for (let i = 0; i < count; i++) {
            const angle = hasDirection
                ? ((baseConfig.angle + (Math.random() - 0.5) * cone) * Math.PI) / 180
                : Math.random() * Math.PI * 2;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const life = minLife + Math.random() * (maxLife - minLife);

            // scaleJitter: 0.4 = each particle is 60% to 140% of the size asked for. spinJitter: a random turn speed up to that many radians/second.
            const jitter = baseConfig.scaleJitter ? 1 + (Math.random() - 0.5) * 2 * baseConfig.scaleJitter : 1;
            const spin = baseConfig.spinJitter ? (Math.random() - 0.5) * 2 * baseConfig.spinJitter : baseConfig.rotationDelta;
            this.spawn({
                ...baseConfig,
                // windJitter: 0.5 = each particle feels 50% to 150% of the wind, so a cloud stretches out into a stream instead of moving as one
                windX: baseConfig.windJitter && baseConfig.windX ? baseConfig.windX * (1 + (Math.random() - 0.5) * 2 * baseConfig.windJitter) : baseConfig.windX,
                windY: baseConfig.windJitter && baseConfig.windY ? baseConfig.windY * (1 + (Math.random() - 0.5) * 2 * baseConfig.windJitter) : baseConfig.windY,
                scale: (baseConfig.scale ?? 1) * jitter,
                scaleDelta: baseConfig.scaleDelta ? baseConfig.scaleDelta * jitter : baseConfig.scaleDelta,
                rotationDelta: spin,
                rotation: baseConfig.spinJitter ? Math.random() * Math.PI * 2 : baseConfig.rotation,
                x: x + (Math.random() - 0.5) * spreadX,
                y: y + (Math.random() - 0.5) * spreadY,
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

    /* Smoke and ash are drawn from small sprites made once (a few variants per colour, so no two neighbours are the same shape):
         cloud   a ragged wisp of smoke: eight soft blobs of different sizes piled up unevenly, thick in the middle and thinning to nothing at every edge
         flake   a torn scrap of ash: an uneven polygon with a different outline each time, or (one in three) a soft speck of soot
       Nothing here is a rectangle, so a body that comes apart no longer sheds neat little boxes. */
    static rgbOf(color) {
        const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
        if (!m) return [140, 140, 150];
        let h = m[1];
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    _makeCanvas(size) {
        return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
    }
    /** A small repeatable random stream, so a variant always looks the same. */
    static seeded(seed) {
        let s = (seed * 9301 + 49297) % 233280;
        return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    }
    puffSprite(color = '#aaaaaa', variant = 0) {
        this._puffs = this._puffs || new Map();
        const key = color + '|' + variant;
        let c = this._puffs.get(key);
        if (!c) {
            c = this._makeCanvas(128);
            const g = c.getContext('2d');
            const [r, gr, b] = ParticleSystem.rgbOf(color);
            const rand = ParticleSystem.seeded(31 + variant * 97);
            for (let i = 0; i < 8; i++) {
                // blobs gather toward the middle but stray to one side or the other, so the outline is lumpy and different each time
                const ang = rand() * Math.PI * 2, dist = rand() * 30;
                const cx = 64 + Math.cos(ang) * dist * 1.1, cy = 64 + Math.sin(ang) * dist * 0.8;
                const rad = 20 + rand() * 24;
                const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
                grad.addColorStop(0, `rgba(${r},${gr},${b},0.55)`);
                grad.addColorStop(0.45, `rgba(${r},${gr},${b},0.28)`);
                grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
                g.fillStyle = grad;
                g.beginPath();
                g.arc(cx, cy, rad, 0, Math.PI * 2);
                g.fill();
            }
            this._puffs.set(key, c);
        }
        return c;
    }
    flakeSprite(color = '#444444', variant = 0) {
        this._flakes = this._flakes || new Map();
        const key = color + '|' + variant;
        let c = this._flakes.get(key);
        if (!c) {
            c = this._makeCanvas(32);
            const g = c.getContext('2d');
            const rand = ParticleSystem.seeded(17 + variant * 131);
            if (variant % 3 === 2) {
                // a speck of soot: round, soft at the edge
                const [r, gr, b] = ParticleSystem.rgbOf(color);
                const grad = g.createRadialGradient(16, 16, 0, 16, 16, 10);
                grad.addColorStop(0, `rgba(${r},${gr},${b},0.95)`);
                grad.addColorStop(0.55, `rgba(${r},${gr},${b},0.6)`);
                grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
                g.fillStyle = grad;
                g.beginPath(); g.arc(16, 16, 10, 0, Math.PI * 2); g.fill();
            } else {
                // a torn scrap: 6 to 8 corners at uneven distances, stretched one way
                const n = 6 + Math.floor(rand() * 3), stretch = 1.1 + rand() * 0.7, tilt = rand() * Math.PI;
                g.fillStyle = color;
                g.beginPath();
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.6, rad = 5 + rand() * 8;
                    const x = Math.cos(a) * rad * stretch, y = Math.sin(a) * rad / stretch;
                    const rx = x * Math.cos(tilt) - y * Math.sin(tilt), ry = x * Math.sin(tilt) + y * Math.cos(tilt);
                    if (i === 0) g.moveTo(16 + rx, 16 + ry); else g.lineTo(16 + rx, 16 + ry);
                }
                g.closePath();
                g.fill();
            }
            this._flakes.set(key, c);
        }
        return c;
    }

    render() {
    if (this.particles.length === 0) return;
    this.ctx.save();
    
    for (const p of this.particles) {
        // 'normal' is not a canvas blend mode (an unknown value is ignored, which left the PREVIOUS particle's mode in force), so it means source-over
        this.ctx.globalCompositeOperation = (!p.blendMode || p.blendMode === 'normal') ? 'source-over' : p.blendMode;
        this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha !== undefined ? p.alpha : 1.0));
        
        this.ctx.save(); // Save per-particle context matrix
        
        // 0. Recolour / glow the sprite (restored with the matrix below, so it never leaks to the next particle)
        if (APPLY_SPRITE_FILTERS && p.config && p.config.filter) {
            this.ctx.filter = p.config.filter;
        }
        
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
            // `cellCol` / `cellRow` (animationKit's `cell: [col, row]`) pick one cell of a sheet laid out as a grid (an item icon used as a projectile)
            // instead of playing a row of frames.
            const hasCell = p.config && p.config.cellCol !== undefined;
            const srcX = (hasCell ? p.config.cellCol : currentFrame) * p.frameSize;
            const srcY = hasCell ? (p.config.cellRow || 0) * p.frameSize : 0;
            const size = p.frameSize * (p.scale || 1.0) * 2.4;
            
            this.ctx.drawImage(
            sheet, 
            srcX, srcY, p.frameSize, p.frameSize, 
            -size/2, -size/2, size, size
            );
        } else if (!this._warnedSheets.has(p.sheetKey)) {
            // A typo'd or unloaded sheet used to fail silently (nothing is drawn). Say so once.
            this._warnedSheets.add(p.sheetKey);
            console.warn(`[ParticleSystem] sprite sheet "${p.sheetKey}" is not loaded; effects that use it will not show.`);
        }
        } else if (p.shape === 'puff') {
        // a soft cloud: a round gradient (solid in the middle, clear at the edge), made once per colour. No glow, so many are cheap.
        const puff = this.puffSprite(p.color, Math.abs(Math.floor((p.swayPhase || 0) * 10)) % 5);
        const size = 84 * (p.scale || 1.0);
        this.ctx.drawImage(puff, -size / 2, -size / 2, size, size);
        } else if (p.shape === 'streak') {
        // a thin line that is faint at its tail and strongest at its head (the lower end, for lines falling down): concentration / speed lines. No glow.
        const len = ((p.config && p.config.length) || 60) * (p.scale || 1.0), w = Math.max(1.5, 2.5 * (p.scale || 1.0)), segs = 5, a = this.ctx.globalAlpha;
        this.ctx.fillStyle = p.color || '#ffffff';
        for (let i = 0; i < segs; i++) {
            this.ctx.globalAlpha = a * ((i + 1) / segs) * ((i + 1) / segs);
            this.ctx.fillRect(-w / 2, -len / 2 + (i * len) / segs, w, len / segs + 0.5);
        }
        } else if (p.shape === 'fleck') {
        // a flake of ash: a torn scrap or a speck of soot that tumbles as it blows away
        const flake = this.flakeSprite(p.color || '#444444', Math.abs(Math.floor((p.swayPhase || 0) * 10)) % 9);
        const size = Math.max(6, 9 * (p.scale || 1.0));
        this.ctx.drawImage(flake, -size / 2, -size / 2, size, size);
        } else {
        this.ctx.fillStyle = p.color || '#ffffff';
        this.ctx.shadowColor = p.color || '#ffffff';
        this.ctx.shadowBlur = (p.config && p.config.glow === false) ? 0 : 24;   // glow: false = a plain dot, much cheaper when hundreds are on screen
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12 * (p.scale || 1.0), 0, Math.PI * 2);
        this.ctx.fill();
        }
        
        this.ctx.restore(); // Instantly clean-restores the matrix stack for the next particle
    }
    
    this.ctx.restore();
    }
}