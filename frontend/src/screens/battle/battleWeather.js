// frontend/src/screens/battle/battleWeather.js: the weather of a fight, for as long as it lasts (state.weather, shared/world/weatherDefinitions.js).
//
// The weather's own battle animation (weatherRain, weatherFog...) plays once, when it announces itself at the start (battleQueue). This is what
// stays after it: the background dimmed or tinted (`bgFilter`, drawn on the backdrop) under a wash of colour (`tint`), and the weather itself falling
// or blowing across the field in front of the fighters, a steady stream of it (`emit`: kit bursts, `rate` particles a second). A thunderstorm adds
// lightning now and then, a flash over everything and the thunder after it; fog thickens the smoke that drifts over every field. Its sound is the
// ambience channel's (SceneManager.resolveTargetAmbience: the weather's battleAmbience, looped for the whole fight).
// Light graphics (engine/graphics.js) keeps a third of the particles and no lightning flash over the screen.
import { ParticleSystem } from '../../ui/particles/particleSystem.js';
import { drawSmoke } from '../../ui/particles/smoke.js';
import { graphics } from '../../engine/graphics.js';
import { events } from '../../../../shared/core/eventBus.js';
import { burst } from '../../../../shared/battle/animation/animationKit.js';


/* Each weather's look. `emit` returns the bursts to spawn this frame for the screen size: [{ x, y, count, config }] built from kit bursts. */
export const BATTLE_WEATHER = {
    rain: {
        bgFilter: 'brightness(78%) saturate(80%)',
        tint: 'rgba(18, 32, 58, 0.22)',
        rate: 280,
        emit: (w, h, n) => [
            { x: w * 0.5, y: -30, count: n, config: burst(0, { glow: false, shape: 'streak', length: 50, rotation: 0.17, color: '#b4d0f4', scale: 0.7, alpha: 0.85, angle: 100, cone: 4, minSpeed: 900, maxSpeed: 1150, minLife: 0.9, maxLife: 1.1, area: [w * 1.3, 20] }).config },
        ],
        splash: { rate: 50, color: '#dff0ff' },
    },
    thunderstorm: {
        bgFilter: 'brightness(60%) saturate(70%) hue-rotate(10deg)',
        tint: 'rgba(10, 18, 40, 0.32)',
        rate: 340,
        emit: (w, h, n) => [
            { x: w * 0.5, y: -30, count: n, config: burst(0, { glow: false, shape: 'streak', length: 56, rotation: 0.22, color: '#b4d0f4', scale: 0.7, alpha: 0.9, angle: 102, cone: 5, minSpeed: 1000, maxSpeed: 1250, minLife: 0.8, maxLife: 1.0, area: [w * 1.3, 20] }).config },
        ],
        splash: { rate: 70, color: '#dff0ff' },
        lightning: { every: [6, 14], sfx: 'thunderClose' },
    },
    blizzard: {
        bgFilter: 'brightness(112%) saturate(40%) hue-rotate(195deg) contrast(92%)',
        tint: 'rgba(220, 236, 255, 0.16)',
        rate: 170,
        emit: (w, h, n) => [
            // fine snow driven hard from the right
            { x: w + 30, y: h * 0.5, count: Math.ceil(n * 0.8), config: burst(0, { glow: false, color: '#ffffff', scale: 0.3, alpha: 0.95, angle: 162, cone: 18, minSpeed: 600, maxSpeed: 950, minLife: 1.6, maxLife: 2.2, gravity: 120, area: [40, h * 1.2] }).config },
            // big slow flakes
            { x: w * 0.6, y: -20, count: Math.ceil(n * 0.2), config: burst(0, { glow: false, color: '#e4f4ff', scale: 0.45, alpha: 0.8, angle: 135, cone: 30, minSpeed: 180, maxSpeed: 320, minLife: 2.5, maxLife: 3.5, gravity: 60, area: [w * 1.2, 20] }).config },
        ],
    },
    sandstorm: {
        bgFilter: 'sepia(60%) saturate(150%) brightness(88%)',
        tint: 'rgba(170, 120, 60, 0.24)',
        rate: 190,
        emit: (w, h, n) => [
            // grit, flat and fast, right to left
            { x: w + 30, y: h * 0.5, count: Math.ceil(n * 0.85), config: burst(0, { glow: false, shape: 'streak', length: 44, rotation: 1.571, color: '#e0bd76', scale: 0.7, alpha: 0.85, angle: 176, cone: 6, minSpeed: 1100, maxSpeed: 1500, minLife: 1.2, maxLife: 1.5, area: [40, h * 1.2] }).config },
            // dust that hangs in the air
            { x: w + 60, y: h * 0.55, count: Math.ceil(n * 0.15), config: burst(0, { glow: false, shape: 'puff', color: '#b98f4a', scale: 2.2, alpha: 0.3, angle: 178, cone: 12, minSpeed: 250, maxSpeed: 420, minLife: 3, maxLife: 4, area: [60, h], blend: 'normal' }).config },
        ],
    },
    fog: {
        bgFilter: 'brightness(108%) saturate(35%) contrast(78%)',
        tint: 'rgba(205, 210, 216, 0.24)',
        rate: 0,
        fog: 2.0,   // a second, thicker layer of the smoke, in front of the fighters
    },
};

export class BattleWeather {
    constructor(ctx, loader) {
        this.ctx = ctx;
        this.fx = new ParticleSystem(ctx, loader);
        this.weatherId = null;
        this._carry = 0;
        this._splashCarry = 0;
        this._flash = 0;
        this._nextBolt = 0;
        this._thunderIn = -1;
    }

    /** The look of the fight's weather, or null for clear skies (or none). */
    lookOf(state) {
        const id = state && state.weather && state.weather.id;
        return (id && id !== 'clear' && BATTLE_WEATHER[id]) || null;
    }

    /** The filter to draw the backdrop with ('none' without weather). */
    backgroundFilter(state) {
        const look = this.lookOf(state);
        return (look && look.bgFilter) || 'none';
    }

    /** Behind the fighters: the wash of colour over the backdrop. */
    drawBehind(state, w, h) {
        const look = this.lookOf(state);
        if (!look || !look.tint) return;
        this.ctx.save();
        this.ctx.fillStyle = look.tint;
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();
    }

    /** In front of the fighters: the falling / blowing weather, fog, and a lightning flash. */
    updateAndDrawFront(state, dt, w, h) {
        const look = this.lookOf(state);
        const id = look ? state.weather.id : null;
        if (id !== this.weatherId) { this.weatherId = id; this.fx.particles = []; this._carry = 0; this._nextBolt = look && look.lightning ? this._boltDelay(look) : 0; }
        if (!look) return;
        const light = !!graphics.light;

        // the stream: `rate` particles a second, spread across the frames (a fraction carried over)
        if (look.rate && look.emit) {
            this._carry += look.rate * (light ? 0.35 : 1) * dt;
            const n = Math.floor(this._carry);
            if (n > 0) {
                this._carry -= n;
                for (const b of look.emit(w, h, n)) this.fx.spawnBurst(b.x, b.y, b.count, b.config);
            }
        }
        // splashes where the rain lands, along the ground
        if (look.splash && !light) {
            this._splashCarry += look.splash.rate * dt;
            const n = Math.floor(this._splashCarry);
            if (n > 0) {
                this._splashCarry -= n;
                this.fx.spawnBurst(w * 0.5, h * 0.8, n, burst(0, { glow: false, color: look.splash.color, scale: 0.18, alpha: 0.8, angle: 270, cone: 120, minSpeed: 60, maxSpeed: 150, minLife: 0.18, maxLife: 0.3, gravity: 600, area: [w, h * 0.25] }).config);
            }
        }
        this.fx.update(dt);
        this.fx.render();

        if (look.fog) drawSmoke(this.ctx, Date.now() / 1000 + 37, w, h, look.fog, false);

        // lightning: a flash over everything, the thunder a moment after
        if (look.lightning) {
            this._nextBolt -= dt;
            if (this._nextBolt <= 0) {
                this._nextBolt = this._boltDelay(look);
                this._flash = 1;
                this._thunderIn = 0.25 + Math.random() * 0.6;
            }
            if (this._thunderIn >= 0) {
                this._thunderIn -= dt;
                if (this._thunderIn < 0) events.emit('PLAY_SFX', { id: look.lightning.sfx, volume: 0.7 + Math.random() * 0.25 });
            }
            if (this._flash > 0) {
                if (!light) {
                    this.ctx.save();
                    this.ctx.fillStyle = `rgba(235, 240, 255, ${0.55 * this._flash * this._flash})`;
                    this.ctx.fillRect(0, 0, w, h);
                    this.ctx.restore();
                }
                this._flash = Math.max(0, this._flash - dt * 4);
            }
        }
    }

    _boltDelay(look) {
        const [a, b] = look.lightning.every;
        return a + Math.random() * (b - a);
    }
}
