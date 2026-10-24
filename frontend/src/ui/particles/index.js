/**
 * ui/particles/: every particle effect in the game that more than one screen (or one screen and the battle animations) can use.
 *
 * There are two kinds, and they work differently on purpose:
 *
 *   1. EVENT PARTICLES (particleSystem.js + particle.js)   things that START when something happens and live for a moment:
 *        a spark burst, a drifting sprite, a projectile, a spiral of orbs.
 *        `new ParticleSystem(ctx, loader)`, then `spawn(config)` / `spawnBurst(x, y, count, config)` when it happens,
 *        `update(dt)` and `render()` every frame. The battle animations (shared/battle/animation/) describe their effects as data and the
 *        battle renderer feeds them in here; anything else that needs a one-off effect can do the same.
 *
 *   2. AMBIENT PARTICLES (embers.js, smoke.js)   things that are simply THERE while a screen is open: embers rising, smoke drifting.
 *        `drawEmbers(ctx, now, ...)` / `drawSmoke(ctx, now, ...)` once per frame. They are worked out from the clock alone, so a screen
 *        keeps no state for them and nothing has to be created, updated or cleaned up.
 *
 * Not here: the overworld weather (screens/overworld/weatherRenderer.js). It moves thousands of drops / flakes / grains every frame and
 * therefore reuses a fixed pool and thins itself out when the frame rate drops; the object-per-particle system above would be too slow
 * for it. If you add another effect of that size, keep it next to its screen the same way.
 *
 * Where does a new effect go?  One-off, tied to an event -> a cue in a battle animation (or `spawn` / `spawnBurst` on a ParticleSystem).
 * Constantly there, cheap, no state -> a new `drawXxx(ctx, now, ...)` file in this folder. Thousands of them -> its own pool, beside its screen.
 */
export { Particle } from './particle.js';
export { ParticleSystem } from './particleSystem.js';
export { drawEmbers, EMBER, COLD_EMBER } from './embers.js';
export { drawSmoke } from './smoke.js';
