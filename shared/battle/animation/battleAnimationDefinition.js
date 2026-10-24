/**
 * shared/battle/animation/battleAnimationDefinition.js
 * Battle animations, listed alphabetically by id. Written with the helpers in animationKit.js (read its header for the one-page reference).
 *
 * Every ability that can be used in a fight points at an animation of its own through `animationId` (the ability's own id is the usual choice).
 * Status effects, weather and the battle engine use the rest; those have a comment saying so.
 *
 * After editing, run:  node tools/checkAnimations.mjs
 * It checks for typos, missing or shared animations, sounds / sprite sheets that do not exist, cues that run past the end, and look-alike animations.
 */
import { anim, sfx, flash, shake, fade, background, lunge, wobble, hop, slideIn, slideOut, spawn, travel, burst, stream, repeat, tint, orbit } from './animationKit.js';

// Heal / Recover / Channel, minor and moderate: motes of light rise off the target and a soft ring draws in, in the colour of what it restores
// (green health, gold stamina, blue insight). `big` is the moderate version: longer, more motes, a ring of orbs and a closing flare.
const restoring = ({ big, hex, pale, hue, sound, pitch }) => {
    const d = big ? 1.9 : 1.4;
    return anim(d, {
        seconds: true,
        audio: [
            sfx(0.05, sound, { volume: big ? 0.9 : 0.7, pitch }),
            ...(big ? [sfx(0.9, 'purifySfx', { volume: 0.5, pitch: pitch * 1.4 })] : [])
        ],
        vfx: [
            ...repeat(0.05, big ? 9 : 5, 0.12, t => burst(t, { count: big ? 5 : 3, color: hex, scale: 0.55, area: [110, 30], offsetY: 40, angle: 270, cone: 20, minSpeed: 90, maxSpeed: 170, minLife: 0.6, maxLife: 0.9, gravity: -20, envelope: true })),
            ...repeat(0.1, big ? 5 : 3, 0.2, t => burst(t, { count: 2, color: pale, scale: 0.35, area: [90, 30], offsetY: 50, angle: 270, cone: 15, minSpeed: 120, maxSpeed: 200, minLife: 0.5, maxLife: 0.8, envelope: true })),
            ...(big ? [0, 2.094, 4.189].map(phase => orbit(0.1, { life: 1.0, turns: 1, radius: 90, squash: 0.45, phase, scale: 0.45, color: hex, offsetY: -20 })) : []),
            burst(big ? 1.1 : 0.7, { count: big ? 16 : 8, color: pale, scale: 0.5, minSpeed: 50, maxSpeed: 150, minLife: 0.3, maxLife: 0.6, gravity: -60, offsetY: -30 })
        ],
        target: { flash: flash(0.1, d * 0.85, `brightness(${big ? 150 : 130}%) sepia(60%) hue-rotate(${hue}deg) saturate(180%)`) }
    });
};

export const BattleAnimationDefinitions = {
    // Scripted boss ability. Not used by any player ability.
    "abyssal_void": anim(3, {
        audio: [sfx(0.033, 'darkMagicSFX', { volume: 1 })],
        background: background(0.067, 0.933, 'voidBackground', 'brightness(80%) sepia(50%) hue-rotate(250deg)'),
        actor: { flash: flash(0.067, 0.933, 'brightness(150%) hue-rotate(250deg)') },
        target: { shake: shake(0.333, 0.833, 36), flash: flash(0.333, 0.833, 'invert(100%)') }
    }),
    // The pool splashes down small and spreads outwards; a fainter second wave rolls out past it. Bubbles pop up as it spreads and fumes rise off it.
    "acid_pool": anim(2.6, {
        seconds: true,
        audio: [sfx(0.05, 'acidPoolSfx', { volume: 1 }), sfx(0.9, 'poisonSplashSfx', { volume: 0.4, pitch: 1.5 })],
        vfx: [
            spawn(0, 'acidPoolAnimation', { life: 2.2, move: 'spread_and_fade', scale: 2.6, blend: 'normal' }),
            spawn(0.15, 'acidPoolAnimation', { life: 1.4, move: 'spread_and_fade', scale: 3.2, blend: 'normal', alpha: 0.45 }),
            burst(0.05, { count: 14, color: '#9be84a', scale: 0.9, minSpeed: 140, maxSpeed: 320, minLife: 0.4, maxLife: 0.7, gravity: 600, offsetY: 20 }),
            ...repeat(0.25, 6, 0.28, t => burst(t, { count: 3, color: '#9be84a', scale: 1.2, minSpeed: 10, maxSpeed: 40, minLife: 0.4, maxLife: 0.7, gravity: -90, glow: false, area: [150, 40], offsetY: 20 })),
            ...repeat(0.5, 4, 0.4, t => spawn(t, 'acidicSmogAnimation', { life: 0.7, move: 'float_up_and_pop', scale: 1.2, blend: 'source-over', offsetX: ((t * 100) % 3 - 1) * 40 }))
        ],
        target: { shake: shake(0.1, 0.8, 8), flash: flash(0.05, 1.5, 'hue-rotate(70deg) saturate(180%) brightness(110%)') }
    }),
    // Arcane Blast: two sparks circle in while the caster gathers, then the Arcane Blast orbs are fired out to the target in one straight line, close enough to run together into a solid beam, for
    // about a second and a half. The first swirl lands at `hit`. Nothing is drawn on the target itself: it just shakes and flashes until the beam dies.
    "arcane_blast": anim(2.8, {
        seconds: true,
        hit: 1.0,
        audio: [
            sfx(0, 'arcaneDartSfx', { volume: 1.1, pitch: 0.6 }),
            sfx(0.65, 'shockSfx', { volume: 0.7, pitch: 0.55 }),
            sfx('hit', 'earthquake1Sfx', { volume: 0.8, pitch: 1.2 })
        ],
        actor: wobble(0, 0.8, 6, { flash: flash(0, 1.9, tint('cyan', { bright: 200, sat: 300, glow: 'cyan', glowSize: 12 })) }),
        vfx: [
            orbit(0.05, { at: 'source', life: 0.6, turns: 1.25, radius: 90, squash: 0.6, phase: 0, scale: 0.5, color: '#7fe0ff', offsetY: -30 }),
            orbit(0.05, { at: 'source', life: 0.6, turns: 1.25, radius: 90, squash: 0.6, phase: 3.1416, scale: 0.35, color: '#ffffff', offsetY: -30 }),
            spawn(0.25, 'arcaneBlastAnimation', { at: 'source', life: 0.45, scale: 0.7, move: 'static', spin: 6 }),
            // the beam: orbs fired one after another along ONE line (no scatter), close enough together to overlap into a solid, hard-driven cord,
            // with a wider, fainter row of orbs over it for the glow
            ...stream(0.7, 70, 0.015, 'arcaneBlastAnimation', { life: 0.3, scale: 0.7, spin: 8 }),
            ...stream(0.7, 35, 0.03, 'arcaneBlastAnimation', { life: 0.3, scale: 1.1, spin: -5, alpha: 0.3 })
        ],
        target: {
            shake: shake('hit', 'hit+1.0', 40),
            flash: flash('hit', 'hit+1.0', tint('cyan', { bright: 300, sat: 300, glow: 'cyan', glowSize: 18 }))
        }
    }),
    "arcane_dart": anim(1.5, {
        audio: [sfx(0.533, 'arcaneDartSfx')],
        background: background(0, 1, 'arcaneVortexBg'),
        actor: { flash: flash(0, 0.2, 'brightness(200%) hue-rotate(180deg) saturate(300%)') },
        vfx: [
            travel(0.2, 'arcaneDartAnimation', { life: 0.4, frames: 4, scale: 2 })
        ],
        target: { shake: shake(0.4, 0.6, 24), flash: flash(0.4, 0.533, 'brightness(300%) sepia(50%) hue-rotate(180deg)') }
    }),
    // Baton Pass: the caster steps back and the glow of their turn is sent sweeping off to the side.
    "baton_pass": anim(1.2, {
        seconds: true,
        audio: [sfx(0.05, 'rallySfx', { volume: 0.8, pitch: 1.4 })],
        actor: lunge(0, 0.25, -60, { flash: flash(0, 0.6, tint('gold', { glow: 'gold' })) }),
        vfx: [
            spawn(0.05, 'rallyAnimation', { at: 'source', life: 0.55, scale: 1.3, move: 'float_up_and_pop', filter: tint('gold', { bright: 130, sat: 200 }) }),
            ...repeat(0.1, 5, 0.06, t => burst(t, { at: 'source', count: 4, color: '#ffd24a', shape: 'streak', length: 80, scale: 0.7, rotation: 1.571, angle: 180, cone: 10, minSpeed: 420, maxSpeed: 640, minLife: 0.25, maxLife: 0.4, area: [20, 80], glow: false, envelope: true })),
            burst(0.1, { at: 'source', count: 10, color: '#ffd24a', scale: 0.9, minSpeed: 80, maxSpeed: 220, gravity: -120 })
        ]
    }),
    // Bear Form: dust billows up around the caster, who grows and roars; claw marks flash across the cloud.
    "bear_form": anim(2.2, {
        seconds: true,
        audio: [
            sfx(0.1, 'wolfCry', { volume: 0.8, pitch: 0.5 }),
            sfx(0.6, 'crunchSfx', { volume: 1, pitch: 0.5 })
        ],
        actor: wobble(0.1, 1.0, 16, { flash: flash(0, 1.6, 'brightness(70%) sepia(100%) hue-rotate(10deg) saturate(300%)') }),
        vfx: [
            spawn(0.15, 'smokeAnimation', { life: 0.9, scale: 2.8, blend: 'normal' }),
            spawn(0.6, 'smokeAnimation', { life: 0.9, scale: 3.4, blend: 'normal' }),
            spawn(0.8, 'clawAnimation', { life: 0.4, scale: 2, move: 'swipe_diagonal', blend: 'normal' }),
            ...repeat(0.2, 5, 0.12, t => burst(t, { count: 5, color: '#9a6a3a', scale: 0.8, minSpeed: 90, maxSpeed: 260, gravity: 260, blend: 'source-over', offsetY: 30 })),
            burst(0.65, { count: 14, color: '#c8a070', shape: 'streak', length: 80, scale: 0.8, spinJitter: 0.01, minSpeed: 420, maxSpeed: 680, minLife: 0.25, maxLife: 0.4, glow: false, envelope: true, offsetY: -30 })
        ]
    }),
    "bite": anim(1.5, {
        audio: [sfx(0.133, 'crunchSfx', { volume: 1 })],
        actor: lunge(0, 0.2, 96),
        vfx: [
            spawn(0.133, 'biteAnimation', { life: 0.4, move: 'shrink_and_fade', scale: 3, blend: 'multiply' })
        ],
        target: { shake: shake(0.133, 0.333, 29), flash: flash(0.133, 0.267, 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)') }
    }),
    // Status effect animation.
    "bleed": anim(1.5, {
        audio: [sfx(0.1, 'slashSfx', { volume: 0.6, pitch: 0.7 }), sfx(0.12, 'bleedSfx', { volume: 0.8 })],
        vfx: [
            spawn(0.15, 'bleedAnimation', { life: 0.5, move: 'static', scale: 0.8 })
        ],
        target: { shake: shake(0.1, 0.3, 10), flash: flash(0.1, 0.6, 'brightness(120%) sepia(100%) hue-rotate(330deg) saturate(400%)') }
    }),
    "bolster": anim(1.2, {
        audio: [sfx(0.05, 'strikeSfx', { volume: 1 })],
        actor: { flash: flash(0, 0.2, 'brightness(180%) saturate(150%)') },
        vfx: [
            spawn(0.05, 'bolsterAnimation', { life: 0.5, move: 'expand_and_fade', scale: 2.2 })
        ],
        target: { shake: shake(0.05, 0.2, 15), flash: flash(0.05, 1, 'brightness(130%) sepia(100%) hue-rotate(190deg) saturate(300%)') }
    }),
    // Leather armor's ability: a deep breath, a green glow rising off the user.
    "recuperate": anim(2.2, {
        seconds: true,
        audio: [sfx(0.1, 'rallySfx', { volume: 0.6, pitch: 0.8 })],
        actor: { flash: flash(0.1, 1.9, 'brightness(125%) sepia(50%) hue-rotate(60deg) saturate(200%)') },
        vfx: [
            // concentration lines: thin pale-green streaks falling straight down over the user, wave after wave, with a few finer white ones between
            ...repeat(0.1, 12, 0.11, t => burst(t, { at: 'source', count: 5, color: '#b4f08a', shape: 'streak', length: 95, scale: 1, angle: 90, cone: 3, minSpeed: 520, maxSpeed: 760, minLife: 0.45, maxLife: 0.7, area: [150, 10], offsetY: -190, glow: false, envelope: true })),
            ...repeat(0.15, 8, 0.16, t => burst(t, { at: 'source', count: 3, color: '#ffffff', shape: 'streak', length: 60, scale: 0.6, angle: 90, cone: 3, minSpeed: 600, maxSpeed: 820, minLife: 0.4, maxLife: 0.6, area: [150, 10], offsetY: -190, glow: false, envelope: true, alpha: 0.7 }))
        ]
    }),
    // Cloth armor's ability: a still moment, a blue light settling over the user.
    "draw_insight": anim(2.3, {
        seconds: true,
        audio: [
            sfx(0.1, 'purifySfx', { volume: 0.6, pitch: 0.9 }),
            sfx(1.55, 'arcaneDartSfx', { volume: 0.5, pitch: 1.4 })
        ],
        actor: { flash: flash(1.3, 2.0, 'brightness(150%) sepia(60%) hue-rotate(250deg) saturate(250%)') },
        vfx: [
            // three small arcane orbs (a third of a turn apart), each with a fainter copy just behind it, spiral in around the user and are drawn in
            ...[0, 2.094, 4.189].flatMap(phase => [
                orbit(0.1, { at: 'source', life: 1.5, turns: 1.75, radius: 120, squash: 0.5, phase, scale: 0.5, color: '#b07cff', offsetY: -30 }),
                orbit(0.1, { at: 'source', life: 1.5, turns: 1.75, radius: 120, squash: 0.5, phase: phase - 0.35, scale: 0.3, color: '#d8b8ff', alpha: 0.4, offsetY: -30 })
            ]),
            burst(1.55, { at: 'source', count: 12, color: '#d8b8ff', scale: 0.4, minSpeed: 30, maxSpeed: 110, minLife: 0.3, maxLife: 0.6, gravity: -40, offsetY: -30 })
        ]
    }),
    // The boulder lands at 0.6s.
    "boulder_throw": anim(1.8, {
        audio: [
            sfx(0, 'earthquake1Sfx', { volume: 0.8, pitch: 1.5 }),
            sfx(0.6, 'earthquake2Sfx', { volume: 1.2, pitch: 0.8 })
        ],
        actor: lunge(0, 0.2, 40),
        vfx: [
            travel(0.2, 'boulderThrowAnimation', { life: 0.4, frames: 4, scale: 3, blend: 'normal' }),
            spawn(0.6, 'impactAnimation', { life: 0.5, move: 'expand_and_fade', scale: 2.5, blend: 'multiply' })
        ],
        target: { shake: shake(0.6, 1.1, 40), flash: flash(0.6, 0.9, 'sepia(80%) brightness(80%) saturate(150%)') }
    }),
    // Status effect animation.
    "bound": anim(1.5, {
        audio: [sfx(0.1, 'strikeSfx', { volume: 0.7, pitch: 0.5 })],
        vfx: [
            spawn(0.15, 'boundAnimation', { life: 1, move: 'static', scale: 1.5, blend: 'multiply' })
        ],
        target: { shake: shake(0.1, 0.5, 4), flash: flash(0.1, 1.2, 'brightness(70%) sepia(60%) hue-rotate(80deg) saturate(120%)') }
    }),
    // Brew of Madness: the caster downs it, convulses, and ragged magenta spikes burst out of them.
    "brew_of_madness": anim(1.9, {
        seconds: true,
        audio: [
            sfx(0.1, 'crunchSfx', { volume: 0.7, pitch: 1.4 }),
            sfx(0.75, 'intimidateSfx', { volume: 0.9, pitch: 1.3 })
        ],
        actor: wobble(0.6, 1.5, 14, { flash: flash(0, 1.7, 'brightness(120%) sepia(100%) hue-rotate(280deg) saturate(500%)') }),
        vfx: [
            burst(0.2, { count: 6, color: '#e060a0', scale: 0.7, minSpeed: 60, maxSpeed: 140, gravity: 200, offsetY: -60 }),
            ...[0, 1.571, 3.1416, 4.712].map(phase => orbit(0.6, { life: 0.9, turns: 3, radius: 80, squash: 0.6, phase, scale: 0.4, color: '#ff4aa0', offsetY: -30 })),
            burst(0.7, { count: 10, color: '#7a1a50', shape: 'puff', scale: 1.4, grow: 2, minSpeed: 30, maxSpeed: 120, minLife: 0.6, maxLife: 0.9, blend: 'normal', glow: false, envelope: true, offsetY: -30 }),
            ...repeat(0.8, 3, 0.1, t => burst(t, { count: 7, color: '#ff4aa0', shape: 'streak', length: 90, scale: 0.8, spinJitter: 0.01, minSpeed: 380, maxSpeed: 620, minLife: 0.25, maxLife: 0.4, glow: false, envelope: true, offsetY: -30 }))
        ]
    }),
    // Status effect animation.
    "burn": anim(2, {
        audio: [sfx(0.1, 'fireballCastSfx', { volume: 0.5, pitch: 1.3 }), sfx(0.1, 'burnSfx', { volume: 0.8 })],
        vfx: [
            spawn(0.1, 'burnAnimation', { life: 0.6, move: 'float_up_and_pop', scale: 0.9 })
        ],
        target: { shake: shake(0.1, 0.6, 8), flash: flash(0.05, 0.8, 'brightness(180%) sepia(100%) hue-rotate(15deg) saturate(350%)') }
    }),
    "claw": anim(1.2, {
        audio: [sfx(0.1, 'clawSfx', { volume: 1, pitch: 1.1 })],
        actor: lunge(0, 0.15, 100),
        vfx: [
            spawn(0.1, 'clawAnimation', { life: 0.3, move: 'swipe_diagonal', scale: 1.6, blend: 'normal' })
        ],
        target: { shake: shake(0.1, 0.3, 22), flash: flash(0.1, 0.3, 'brightness(150%) sepia(100%) hue-rotate(330deg) saturate(300%)') }
    }),
    "cleave": anim(1.5, {
        audio: [sfx(0.08, 'cleaveSfx', { volume: 1 })],
        actor: lunge(0, 0.15, 130),
        vfx: [
            spawn(0.1, 'cleaveAnimation', { life: 0.3, move: 'swipe_diagonal', scale: 2.6 })
        ],
        target: { shake: shake(0.1, 0.35, 32), flash: flash(0.1, 0.25, 'brightness(200%) sepia(30%)') }
    }),
    // Counter Stance: the caster plants their feet, a ring of orange force snaps out, and sparks spit off it.
    "counter_stance": anim(1, {
        seconds: true,
        audio: [sfx(0.1, 'strikeSfx', { volume: 0.9, pitch: 1.3 })],
        actor: lunge(0, 0.15, -24, { flash: flash(0, 0.6, tint('fire', { bright: 140, sat: 250, glow: 'orange', glowSize: 8 })) }),
        vfx: [
            spawn(0.1, 'impactAnimation', { at: 'source', life: 0.35, scale: 1.1, move: 'static', filter: tint('fire') }),
            spawn(0.2, 'impactAnimation', { at: 'source', life: 0.4, scale: 1.8, move: 'expand_and_fade', filter: tint('fire') }),
            burst(0.2, { at: 'source', count: 12, color: '#ffb040', scale: 0.7, minSpeed: 160, maxSpeed: 360, minLife: 0.2, maxLife: 0.4 })
        ]
    }),
    // Fallback used when an ability has no animationId.
    "default_attack": anim(0.5, {
        audio: [sfx(0.2, 'strikeSfx')],
        target: { flash: flash(0.2, 0.6, 'brightness(200%)') }
    }),
    // Drain Life: the target is cut, its life rises as red motes, and they are drawn into the caster, who glows with it.
    "drain_life": anim(2.2, {
        seconds: true,
        hit: 0.2,
        audio: [
            sfx('hit-0.05', 'spiritReapSfx', { volume: 0.8, pitch: 0.8 }),
            sfx(1.1, 'purifySfx', { volume: 0.6, pitch: 0.7 })
        ],
        actor: { flash: flash(1.1, 2.0, tint('red', { bright: 150, sat: 350, glow: 'crimson' })) },
        vfx: [
            spawn('hit', 'bleedAnimation', { life: 0.8, scale: 1.6, move: 'float_up_and_pop' }),
            ...repeat(0.3, 7, 0.1, t => burst(t, { count: 3, color: '#c01838', scale: 0.7, area: [90, 40], offsetY: 20, angle: 270, cone: 25, minSpeed: 100, maxSpeed: 200, minLife: 0.6, maxLife: 0.9, gravity: -30, envelope: true })),
            // and the same motes gathering around the caster
            ...[0, 2.094, 4.189].map(phase => orbit(0.9, { at: 'source', life: 1.0, turns: 1.25, radius: 100, squash: 0.45, phase, scale: 0.45, color: '#e0405a', offsetY: -30 })),
            burst(1.8, { at: 'source', count: 12, color: '#ff8090', scale: 0.5, minSpeed: 40, maxSpeed: 130, gravity: -60, offsetY: -30 })
        ],
        target: {
            shake: shake('hit', 1.0, 14),
            flash: flash('hit', 1.2, 'brightness(60%) sepia(100%) hue-rotate(330deg) saturate(300%)')
        }
    }),
    // Earthquake: the ground splits under the target three times, and stones and dust are thrown up and rain back down while it trembles.
    "earthquake": anim(4, {
        seconds: true,
        audio: [
            sfx(0.25, 'earthquake1Sfx', { volume: 1 }),
            sfx(0.5, 'earthquake2Sfx', { volume: 1 }),
            sfx(0.8, 'earthquake3Sfx', { volume: 1 })
        ],
        vfx: [
            spawn(0.8, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 2, blend: 'source-over' }),
            spawn(1.6, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 2.5, blend: 'source-over' }),
            spawn(2.4, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 1.8, blend: 'source-over' }),
            ...repeat(0.8, 3, 0.8, t => burst(t, { count: 12, color: '#6b5a44', scale: 1.0, minSpeed: 160, maxSpeed: 420, minLife: 0.6, maxLife: 1.0, gravity: 800, angle: 270, cone: 70, blend: 'source-over', offsetY: 50 })),
            ...repeat(0.8, 14, 0.2, t => burst(t, { count: 4, color: '#a08a6a', shape: 'puff', scale: 0.9, grow: 1.5, minSpeed: 20, maxSpeed: 90, minLife: 0.6, maxLife: 1.0, gravity: -30, glow: false, area: [170, 30], offsetY: 60, blend: 'normal', envelope: true }))
        ],
        target: { shake: shake(0.25, 3.6, 72), flash: flash(0.8, 3.2, 'sepia(80%) brightness(60%) saturate(120%)') }
    }),
    // Engine animation: a combatant joins the fight (BattleCombatantRenderer keys off this id).
    "enter_battle": anim(1.5, {
        audio: [],
        actor: slideIn(0, 0.5, 240, { fadeIn: fade(0, 0.4), flash: flash(0.4, 0.7, 'brightness(200%)') })
    }),
    // Status effect animation.
    "evasive": anim(1.5, {
        audio: [sfx(0.1, 'smokeSfx', { volume: 1, pitch: 1.3 })],
        vfx: [
            spawn(0.1, 'smokeAnimation', { life: 0.6, move: 'float_up_and_pop', scale: 1.8 })
        ],
        target: { flash: flash(0.1, 0.8, 'brightness(150%) saturate(50%) blur(2px) drop-shadow(0 0 10px white)') }
    }),
    "eviscerate": anim(1.5, {
        audio: [
            sfx(0.1, 'slashSfx', { volume: 1 }),
            sfx(0.2, 'eviscerateSfx', { volume: 1 })
        ],
        actor: lunge(0, 0.15, 140),
        vfx: [
            spawn(0.1, 'eviscerateAnimation', { life: 0.35, move: 'swipe_diagonal', scale: 2.2 })
        ],
        target: { shake: shake(0.1, 0.5, 38), flash: flash(0.1, 0.6, 'brightness(160%) sepia(100%) hue-rotate(330deg) saturate(500%)') }
    }),
    "execute": anim(2, {
        audio: [sfx(0.15, 'eviscerateSfx', { volume: 1, pitch: 0.8 })],
        actor: lunge(0, 0.15, 150, { flash: flash(0, 0.2, 'brightness(50%) sepia(100%) hue-rotate(330deg) saturate(500%)') }),
        vfx: [
            spawn(0.15, 'eviscerateAnimation', { life: 0.5, move: 'expand_and_fade', scale: 1.5, blend: 'multiply' })
        ],
        target: { shake: shake(0.15, 0.7, 50), flash: flash(0.15, 0.8, 'brightness(120%) sepia(100%) hue-rotate(330deg) saturate(400%) invert(20%)') }
    }),
    // Engine animation: a combatant is knocked out.
    "faint": anim(2, {
        actor: wobble(0, 0.75, 19, { fade: fade(0.1, 0.9), flash: flash(0, 0.9, 'sepia(80%) brightness(200%) blur(4px)') }),
        // The body comes apart like fog and ash in the wind: soft grey clouds that billow up and spread as the wind takes them, and flakes of ash that
        // tumble away on the same wind, rising and wandering as they go. They keep drifting for a second or two after the body has gone.
        vfx: [
            // smoke: the body's grey breath, ragged wisps of pale smoke first and darker ones after
            ...repeat(0.04, 10, 0.09, (t, i) => burst(t, {
                count: 3, shape: 'puff', color: i % 2 ? '#7d828c' : '#a9acb4', scale: 0.8, scaleJitter: 0.5, grow: 0.55, area: [100, 120], offsetY: 6,
                minSpeed: 10, maxSpeed: 50, angle: 300, cone: 140, wind: [260, -40], windJitter: 0.55, windPull: 0.8, sway: 90, swayRate: 2.2,
                minLife: 1.2, maxLife: 2.1, alpha: 0.85, envelope: true, glow: false, blend: 'source-over'
            })),
            // ash: grey and black flakes, lifted and carried off
            ...repeat(0.08, 10, 0.08, (t, i) => burst(t, {
                count: 5, shape: 'fleck', color: ['#1f1e1d', '#3b3935', '#6f6a62'][i % 3], scale: 1.5, scaleJitter: 0.5, spinJitter: 7, area: [90, 110], offsetY: 4,
                minSpeed: 20, maxSpeed: 110, angle: 290, cone: 150, wind: [330, -60], windJitter: 0.5, windPull: 0.7, sway: 150, swayRate: 5, gravity: -26,
                minLife: 0.9, maxLife: 1.9, alpha: 1, envelope: true, glow: false, blend: 'source-over'
            }))
        ],
        target: { flash: flash(0, 0.9, 'sepia(80%) brightness(200%) blur(4px)') }
    }),
    "fire_punch": anim(1.5, {
        audio: [sfx(0.15, 'firePunchSfx', { volume: 1 })],
        actor: lunge(0, 0.2, 110, { flash: flash(0, 0.2, 'brightness(150%) sepia(100%) hue-rotate(15deg) saturate(400%)') }),
        vfx: [
            spawn(0.15, 'firePunchAnimation', { life: 0.4, move: 'expand_and_fade', scale: 2 })
        ],
        target: { shake: shake(0.15, 0.5, 35), flash: flash(0.15, 0.5, 'brightness(200%) sepia(100%) hue-rotate(15deg) saturate(400%)') }
    }),
    "fireball": anim(1.5, {
        audio: [sfx(0, 'fireballCastSfx', { volume: 1 }), sfx(0.4, 'fireballImpactSfx', { volume: 1 })],
        actor: { flash: flash(0, 0.2, 'brightness(250%) sepia(100%) hue-rotate(10deg)') },
        vfx: [
            travel(0.2, 'fireballAnimation', { life: 0.4, frames: 4, scale: 2 })
        ],
        target: { shake: shake(0.4, 0.6, 28), flash: flash(0.4, 0.6, 'brightness(250%) sepia(100%) hue-rotate(350deg) saturate(500%)') }
    }),
    // Stream of 21 sprites with staggered heights. The target reacts when the fastest one lands (0.5s).
    "flamethrower": anim(1.3, {
        audio: [sfx(0, 'fireballCastSfx', { volume: 1, pitch: 1.2 })],
        actor: { flash: flash(0, 0.6, 'brightness(150%) sepia(100%) hue-rotate(15deg) saturate(300%)') },
        vfx: [
            ...stream(0.1, 21, 0.02, 'flamethrowerAnimation', { variants: [
                { life: 0.5, offsetY: 0, scale: 1.5 },
                { life: 0.45, offsetY: -15, scale: 1.6 },
                { life: 0.55, offsetY: 12, scale: 1.4 },
                { life: 0.4, offsetY: -8, scale: 1.5 },
                { life: 0.6, offsetY: 20, scale: 1.7 },
                { life: 0.45, offsetY: -22, scale: 1.5 },
                { life: 0.5, offsetY: 5, scale: 1.6 },
                { life: 0.55, offsetY: -18, scale: 1.4 },
                { life: 0.4, offsetY: 15, scale: 1.5 },
                { life: 0.6, offsetY: -10, scale: 1.7 },
                { life: 0.45, offsetY: 25, scale: 1.5 },
                { life: 0.5, offsetY: -5, scale: 1.6 },
                { life: 0.55, offsetY: 18, scale: 1.4 },
                { life: 0.4, offsetY: -20, scale: 1.5 },
                { life: 0.6, offsetY: 10, scale: 1.7 },
                { life: 0.45, offsetY: -12, scale: 1.5 },
                { life: 0.5, offsetY: 22, scale: 1.6 },
                { life: 0.55, offsetY: -25, scale: 1.4 },
                { life: 0.4, offsetY: 8, scale: 1.5 },
                { life: 0.6, offsetY: -15, scale: 1.7 },
                { life: 0.5, offsetY: 15, scale: 1.5 }
            ] })
        ],
        target: { shake: shake(0.5, 1.1, 25), flash: flash(0.5, 1.1, 'brightness(200%) sepia(100%) hue-rotate(15deg) saturate(400%)') }
    }),
    // Engine animation, and the Retreat ability's animation (BattleCombatantRenderer keys off this id).
    "flee": anim(1.5, {
        audio: [sfx(0, 'retreatSfx', { volume: 1 })],
        actor: slideOut(0, 1.2, 360, { fade: fade(0.4, 1.2) }),
        target: { type: 'slide_out', start: 0, end: 1.2, distance: 360, fade: fade(0.4, 1.2) }
    }),
    "flurry": anim(1, {
        audio: [
            sfx(0.15, 'slashSfx', { volume: 1, pitch: 1 }),
            sfx(0.25, 'slashSfx', { volume: 1, pitch: 1.2 }),
            sfx(0.35, 'slashSfx', { volume: 1, pitch: 0.9 })
        ],
        actor: lunge(0, 0.15, 120),
        vfx: [
            spawn(0.15, 'slashAnimation', { life: 0.3, move: 'swipe_diagonal', scale: 1.8 }),
            spawn(0.25, 'slashAnimation', { life: 0.3, move: 'swipe_diagonal_alt', scale: 2 }),
            spawn(0.35, 'slashAnimation', { life: 0.3, move: 'swipe_diagonal', scale: 2.4 })
        ],
        target: { shake: shake(0.15, 0.55, 35), flash: flash(0.15, 0.45, 'brightness(200%) sepia(50%) hue-rotate(330deg) saturate(300%)') }
    }),
    "frigid_gale": anim(1.8, {
        audio: [sfx(0.1, 'iceBoltCastSfx', { volume: 1.2, pitch: 0.7 })],
        actor: { flash: flash(0, 0.4, 'brightness(180%) sepia(100%) hue-rotate(190deg) saturate(200%)') },
        vfx: [
            travel(0.2, 'frigidGaleAnimation', { life: 0.5, frames: 4, scale: 1.5 }),
            travel(0.4, 'frigidGaleAnimation', { life: 0.5, frames: 4, scale: 2 })
        ],
        target: { shake: shake(0.5, 1.2, 25), flash: flash(0.5, 1, 'brightness(200%) sepia(80%) hue-rotate(190deg) saturate(300%) drop-shadow(0 0 10px cyan)') }
    }),
    // Status effect animation.
    "frozen": anim(2, {
        audio: [sfx(0.05, 'frozenSfx', { volume: 0.8, pitch: 2 })],
        vfx: [
            spawn(0.1, 'frozenAnimation', { life: 1.5, move: 'static', scale: 1.8 })
        ],
        target: { shake: shake(0.05, 0.2, 10), flash: flash(0.05, 1.8, 'brightness(140%) sepia(100%) hue-rotate(190deg) saturate(250%)') }
    }),
    // Gravity: the air darkens, motes of dark violet are dragged down onto the target, and it is slammed into the ground.
    "gravity": anim(2.4, {
        seconds: true,
        audio: [
            sfx(0.1, 'spiteCastSfx', { volume: 1, pitch: 0.55 }),
            sfx(1.2, 'earthquake1Sfx', { volume: 1, pitch: 0.5 })
        ],
        background: background(0, 2.0, 'arcaneVortexBg', 'brightness(35%) sepia(100%) hue-rotate(250deg) saturate(300%)'),
        actor: { flash: flash(0.1, 1.0, 'brightness(130%) sepia(100%) hue-rotate(250deg) saturate(300%)') },
        vfx: [
            // dark motes fall onto the target from above, faster and faster, as if the air itself were pressing down
            ...repeat(0.3, 10, 0.09, t => burst(t, { count: 4, color: '#8a4ad8', shape: 'streak', length: 90, scale: 0.9, angle: 90, cone: 4, minSpeed: 500, maxSpeed: 800, minLife: 0.35, maxLife: 0.5, area: [130, 10], offsetY: -240, glow: false, envelope: true })),
            ...[0, 2.094, 4.189].map(phase => orbit(0.3, { life: 0.9, turns: 1.25, radius: 110, squash: 0.4, phase, scale: 0.5, color: '#5a2a8a', offsetY: -40 })),
            spawn(1.2, 'earthquakeAnimation', { life: 0.9, scale: 2.2, move: 'static', blend: 'multiply' }),
            burst(1.2, { count: 12, color: '#2a1050', shape: 'puff', scale: 1.6, grow: 2.5, minSpeed: 80, maxSpeed: 220, minLife: 0.6, maxLife: 0.9, blend: 'normal', glow: false, envelope: true, offsetY: 50 }),
            burst(1.2, { count: 18, color: '#5a2a8a', scale: 1.4, minSpeed: 60, maxSpeed: 220, gravity: 500, offsetY: 40 })
        ],
        target: {
            shake: shake(1.2, 2.0, 12),
            flash: flash(0.5, 2.0, 'brightness(45%) sepia(100%) hue-rotate(250deg) saturate(250%)')
        }
    }),
    // Healing Rain: a soft green-teal rain falls on every ally, and warm motes lift off them as they mend.
    "healing_rain": anim(2.6, {
        seconds: true,
        audio: [
            sfx(0.05, 'weatherRainShort', { volume: 0.6, pitch: 1.2 }),
            sfx(0.6, 'purifySfx', { volume: 0.8, pitch: 1.1 })
        ],
        actor: { flash: flash(0, 0.6, 'brightness(160%) sepia(60%) hue-rotate(160deg) saturate(200%)') },
        vfx: [
            ...repeat(0.2, 14, 0.12, t => burst(t, { count: 8, color: '#9affd0', shape: 'streak', length: 90, scale: 1.1, angle: 90, cone: 3, minSpeed: 640, maxSpeed: 880, minLife: 0.35, maxLife: 0.5, area: [160, 10], offsetY: -240, glow: false, envelope: true })),
            ...repeat(0.7, 7, 0.2, t => burst(t, { count: 3, color: '#7dff9a', scale: 0.5, area: [120, 30], offsetY: 40, angle: 270, cone: 20, minSpeed: 70, maxSpeed: 150, minLife: 0.7, maxLife: 1.0, gravity: -20, envelope: true })),
            burst(1.9, { count: 14, color: '#d8ffe8', scale: 0.5, minSpeed: 50, maxSpeed: 140, minLife: 0.3, maxLife: 0.6, gravity: -50, offsetY: -30 })
        ],
        target: { flash: flash(0.5, 2.2, 'brightness(145%) sepia(60%) hue-rotate(95deg) saturate(160%)') }
    }),
    "hide": anim(1.5, {
        audio: [sfx(0.1, 'smokeSfx', { volume: 1, pitch: 1.1 })],
        actor: wobble(0.1, 0.3, 5),
        vfx: [
            spawn(0.1, 'smokeAnimation', { life: 0.6, move: 'expand_and_fade', scale: 1.5, blend: 'normal' })
        ],
        target: { flash: flash(0.1, 1.5, 'brightness(40%) grayscale(50%) blur(1px) drop-shadow(0 0 8px #111)') }
    }),
    // Hit and run: a slash, then the caster slips back in a smear of dust.
    "hit_and_run": anim(1.3, {
        seconds: true,
        audio: [
            sfx(0.12, 'slashSfx', { volume: 1, pitch: 1.3 }),
            sfx(0.45, 'smokeSfx', { volume: 0.5, pitch: 1.5 })
        ],
        actor: [
            lunge(0, 0.15, 150),
            lunge(0.45, 1.0, -90, { flash: flash(0.45, 1.0, 'brightness(80%) blur(2px)') })
        ],
        vfx: [
            spawn(0.13, 'slashAnimation', { life: 0.2, scale: 1.4, move: 'swipe_diagonal_alt' }),
            burst(0.14, { count: 8, color: '#ffffff', scale: 0.6, minSpeed: 160, maxSpeed: 360, minLife: 0.2, maxLife: 0.4 }),
            // speed lines trailing the caster as it pulls away, and the dust it kicks up
            ...repeat(0.45, 4, 0.08, t => burst(t, { at: 'source', count: 3, color: '#e8e0cc', shape: 'streak', length: 70, scale: 0.6, rotation: 1.571, angle: 0, cone: 8, minSpeed: 380, maxSpeed: 560, minLife: 0.2, maxLife: 0.35, area: [20, 70], glow: false, envelope: true })),
            spawn(0.4, 'smokeAnimation', { at: 'source', life: 0.7, scale: 1.4, blend: 'normal' })
        ],
        target: { shake: shake(0.13, 0.4, 22), flash: flash(0.13, 0.3, 'brightness(220%)') }
    }),
    // Howl: the caster throws back their head and a red shockwave rolls out of them; the target is shaken by it.
    "howl": anim(2, {
        seconds: true,
        audio: [sfx(0.05, 'wolfCry', { volume: 1, pitch: 1 }), sfx(0.5, 'intimidateSfx', { volume: 0.5, pitch: 1.2 })],
        actor: wobble(0.05, 0.9, 10, { flash: flash(0, 0.9, 'brightness(150%) sepia(100%) hue-rotate(340deg) saturate(400%)') }),
        vfx: [
            // three rings of red dots rolling outwards, one after another
            ...repeat(0.3, 3, 0.22, t => burst(t, { at: 'source', count: 36, color: '#ff3030', scale: 1.1, minSpeed: 460, maxSpeed: 470, minLife: 0.55, maxLife: 0.6, drag: 1.5, offsetY: -40 })),
            ...repeat(0.3, 4, 0.1, t => burst(t, { at: 'source', count: 6, color: '#ff4a4a', shape: 'streak', length: 90, scale: 0.8, spinJitter: 0.01, minSpeed: 380, maxSpeed: 620, minLife: 0.25, maxLife: 0.4, glow: false, envelope: true, offsetY: -40 }))
        ],
        target: { shake: shake(0.7, 1.4, 12), flash: flash(0.7, 1.7, 'brightness(160%) sepia(100%) hue-rotate(340deg) saturate(400%) drop-shadow(0 0 12px red)') }
    }),
    // Was "ice_bolt". Renamed to match the ability that uses it.
    "ice_shard": anim(1.5, {
        hit: 0.6,
        audio: [
            sfx(0, 'iceBoltCastSfx', { volume: 1 }),
            sfx(1, 'iceBoltImpactSfx', { volume: 1 })
        ],
        actor: { flash: flash(0, 0.2, 'brightness(200%) sepia(100%) hue-rotate(190deg) saturate(300%)') },
        vfx: [
            travel(0.2, 'iceBoltAnimation', { life: 0.4, frames: 4, scale: 1 }),
            spawn('hit', 'frozenAnimation', { life: 0.5, scale: 1.2 }),
            burst('hit', { count: 10, color: '#bfeaff', scale: 0.9, minSpeed: 160, maxSpeed: 380, gravity: 400 })
        ],
        target: {
            shake: shake(0.4, 0.6, 28),
            flash: flash(0.4, 0.6, 'brightness(250%) sepia(100%) hue-rotate(190deg) saturate(500%)')
        }
    }),
    "inferno": anim(2.5, {
        audio: [
            sfx(0.1, 'fireballCastSfx', { volume: 1.5, pitch: 0.6 }),
            sfx(0.6, 'meteorShowerImpactSfx', { volume: 1.2 })
        ],
        background: background(0, 2, 'voidBackground', 'brightness(50%) sepia(100%) hue-rotate(350deg) saturate(500%)'),
        actor: { shake: { start: 0.6, end: 1.2, intensity: 20 }, flash: flash(0.5, 1.5, 'brightness(250%) sepia(100%) hue-rotate(350deg) saturate(500%) drop-shadow(0 0 15px red)') },
        vfx: [
            spawn(0.4, 'firePunchAnimation', { life: 1, move: 'expand_and_fade', scale: 4.5 })
        ],
        target: { shake: shake(0.6, 1.5, 45), flash: flash(0.6, 1.6, 'brightness(300%) sepia(100%) hue-rotate(350deg) saturate(600%) drop-shadow(0 0 15px red)') }
    }),
    "intimidate": anim(2, {
        audio: [sfx(0.1, 'intimidateSfx', { volume: 1, pitch: 0.7 })],
        actor: lunge(0, 0.2, 40, { flash: flash(0, 0.5, 'brightness(50%) sepia(100%) hue-rotate(260deg) saturate(400%) drop-shadow(0 0 10px purple)') }),
        vfx: [
            spawn(0.3, 'intimidateAnimation', { life: 0.6, move: 'expand_and_fade', scale: 1.5, blend: 'multiply' })
        ],
        target: { shake: shake(0.3, 1.2, 15), flash: flash(0.3, 1.2, 'brightness(60%) sepia(80%) hue-rotate(260deg) saturate(200%)') }
    }),
    // Bear trap: iron jaws snap shut. Two bars of steel slam together from either side, with a flash and flying splinters.
    "item_bear_trap": anim(1.3, {
        seconds: true,
        audio: [
            sfx(0.1, 'strikeSfx', { volume: 0.9, pitch: 0.5 }),
            sfx(0.45, 'strikeSfx', { volume: 1, pitch: 0.4 })
        ],
        actor: wobble(0, 0.4, 6),
        vfx: [
            burst(0.15, { count: 4, color: '#aab0b8', shape: 'streak', length: 130, scale: 1.1, rotation: 1.571, angle: 20, cone: 4, minSpeed: 500, maxSpeed: 560, minLife: 0.22, maxLife: 0.26, offsetX: -110, offsetY: 40, glow: false, envelope: true }),
            burst(0.15, { count: 4, color: '#aab0b8', shape: 'streak', length: 130, scale: 1.1, rotation: 1.571, angle: 160, cone: 4, minSpeed: 500, maxSpeed: 560, minLife: 0.22, maxLife: 0.26, offsetX: 110, offsetY: 40, glow: false, envelope: true }),
            spawn(0.4, 'impactAnimation', { life: 0.3, scale: 1.2, filter: 'brightness(120%) sepia(60%)' }),
            burst(0.4, { count: 12, color: '#d9d2c3', scale: 0.8, minSpeed: 140, maxSpeed: 340, gravity: 500 })
        ]
    }),
    "item_poison_knife": anim(1.5, {
        hit: 0.32,
        audio: [
            sfx(0.05, 'quickStabSfx', { volume: 0.9, pitch: 1 }),
            sfx('hit+0.03', 'poisonSfx', { volume: 0.6, pitch: 1.1 })
        ],
        actor: lunge(0, 0.1, -14),
        vfx: [
            travel(0.1, 'thrustAnimation', { life: 0.22, scale: 1, blend: 'normal', move: 'arc', arc: -50, spin: 22, filter: tint('green', { bright: 130, sat: 200 }) }),
            spawn('hit', 'poisonAnimation', { life: 0.6, scale: 1.2, move: 'float_up_and_pop', blend: 'multiply' }),
            burst('hit', { count: 8, color: '#58c040', scale: 0.9, gravity: -90 })
        ],
        target: {
            shake: shake('hit', 'hit+0.18', 12),
            flash: flash('hit', 1.1, 'brightness(115%) saturate(180%) hue-rotate(100deg)')
        }
    }),
    // Smoke bomb: thrown with a hiss, bursting into a thick cloud that lingers over the target.
    "item_smoke_bomb": anim(1.8, {
        seconds: true,
        audio: [
            sfx(0.05, 'strikeSfx', { volume: 0.5, pitch: 1.6 }),
            sfx(0.4, 'smokeSfx', { volume: 1, pitch: 0.8 })
        ],
        actor: lunge(0, 0.15, -12),
        vfx: [
            travel(0.08, 'smokeAnimation', { life: 0.3, scale: 0.4, blend: 'normal', move: 'arc', arc: -90 }),
            spawn(0.4, 'smokeAnimation', { life: 1.1, scale: 2.8, blend: 'normal' }),
            spawn(0.55, 'smokeAnimation', { life: 1.1, scale: 2.2, move: 'float_up_and_pop', blend: 'normal' }),
            burst(0.4, { count: 10, color: '#b8b8b8', shape: 'puff', scale: 1.2, minSpeed: 60, maxSpeed: 200, minLife: 0.6, maxLife: 1.0, glow: false, envelope: true })
        ],
        target: { flash: flash(0.45, 1.7, 'brightness(55%) grayscale(50%) blur(1px)') }
    }),
    // A net thrown over the target: it flies out spinning, opens, and settles over it as crossed cords for a second.
    "item_throw_net": anim(1.6, {
        seconds: true,
        hit: 0.45,
        audio: [
            sfx(0.05, 'vineLashSfx', { volume: 0.8, pitch: 0.8 }),
            sfx('hit', 'strikeSfx', { volume: 0.8, pitch: 0.6 })
        ],
        actor: lunge(0, 0.2, -20),
        vfx: [
            travel(0.1, 'boundAnimation', { life: 0.35, scale: 0.9, blend: 'normal', move: 'arc', arc: -50, spin: 7 }),
            // the cords: two crossing sets of lines laid over the target, a few at a time, so it reads as a mesh
            ...repeat(0.45, 3, 0.05, t => burst(t, { count: 5, color: '#e8d098', shape: 'streak', length: 150, scale: 1.4, rotation: 0.785, angle: 0, cone: 0, minSpeed: 1, maxSpeed: 3, minLife: 1.0, maxLife: 1.1, area: [110, 110], offsetY: -30, glow: false, envelope: true })),
            ...repeat(0.45, 3, 0.05, t => burst(t, { count: 5, color: '#e8d098', shape: 'streak', length: 150, scale: 1.4, rotation: -0.785, angle: 0, cone: 0, minSpeed: 1, maxSpeed: 3, minLife: 1.0, maxLife: 1.1, area: [110, 110], offsetY: -30, glow: false, envelope: true })),
            burst('hit', { count: 10, color: '#d8c08a', scale: 0.6, minSpeed: 80, maxSpeed: 220, minLife: 0.3, maxLife: 0.5, gravity: 300 })
        ],
        target: {
            shake: shake('hit', 'hit+0.3', 14),
            flash: flash('hit', 'hit+1.0', 'brightness(80%) sepia(60%) saturate(120%)')
        }
    }),
    // Throw Dagger: the throwing knife (throwing_knife.png, drawn pointing right) flies straight at the target, buries itself in it, and
    // stays there for a moment, quivering, before it fades.
    "throw_dagger": anim(2.0, {
        seconds: true,
        hit: 0.4,
        audio: [
            sfx(0.06, 'thrustSfx', { volume: 0.8, pitch: 1.5 }),
            sfx('hit', 'quickStabSfx', { volume: 1, pitch: 0.95 })
        ],
        actor: lunge(0, 0.18, -14),
        vfx: [
            travel(0.12, 'throwingKnifeAnimation', { life: 0.28, hold: 1.3, scale: 0.5, blend: 'source-over', aim: true, fadeOut: false }),
            travel(0.15, 'throwingKnifeAnimation', { life: 0.28, scale: 0.5, blend: 'source-over', aim: true, fadeOut: false, alpha: 0.25 }),
            burst('hit', { count: 7, color: '#e8e8f0', scale: 0.3, minSpeed: 60, maxSpeed: 180, gravity: 320, minLife: 0.25, maxLife: 0.5, glow: false })
        ],
        target: { shake: shake('hit', 'hit+0.2', 14), flash: flash('hit', 'hit+0.12', 'brightness(190%)') }
    }),
    // Throw Poison Dagger: the same throw with the coated knife (poison_throwing_knife.png). It sticks, drips poison for a while, and the target is shaded sickly green.
    "throw_poison_dagger": anim(2.4, {
        seconds: true,
        hit: 0.4,
        audio: [
            sfx(0.06, 'thrustSfx', { volume: 0.8, pitch: 1.4 }),
            sfx('hit', 'quickStabSfx', { volume: 0.9, pitch: 1.0 }),
            sfx('hit+0.05', 'poisonSfx', { volume: 0.6, pitch: 1.1 })
        ],
        actor: lunge(0, 0.18, -14),
        vfx: [
            travel(0.12, 'poisonKnifeAnimation', { life: 0.28, hold: 1.7, scale: 0.5, blend: 'source-over', aim: true, fadeOut: false }),
            travel(0.15, 'poisonKnifeAnimation', { life: 0.28, scale: 0.5, blend: 'source-over', aim: true, fadeOut: false, alpha: 0.25 }),
            spawn('hit+0.05', 'poisonAnimation', { life: 0.8, scale: 0.5, move: 'expand_and_fade', blend: 'multiply' }),
            burst('hit', { count: 8, color: '#58c040', scale: 0.45, minSpeed: 60, maxSpeed: 200, gravity: 300 }),
            // drops of poison falling off the knife for as long as it hangs in the target
            ...repeat(0.5, 9, 0.17, t => burst(t, { count: 2, color: '#58c040', scale: 0.3, minSpeed: 5, maxSpeed: 40, gravity: 280, minLife: 0.35, maxLife: 0.6, glow: false, area: [16, 6] }))
        ],
        target: { shake: shake('hit', 'hit+0.2', 12), flash: flash('hit', 'hit+1.6', 'brightness(115%) saturate(180%) hue-rotate(100deg)') }
    }),
    "item_throwing_knife": anim(1, {
        hit: 0.22,
        audio: [
            sfx(0.03, 'thrustSfx', { volume: 0.8, pitch: 1.5 }),
            sfx('hit', 'quickStabSfx', { volume: 1, pitch: 1.2 })
        ],
        actor: lunge(0, 0.08, -14),
        vfx: [
            travel(0.08, 'thrustAnimation', { life: 0.14, scale: 0.9, blend: 'normal', move: 'arc', arc: -25, spin: 28 }),
            spawn('hit', 'slashAnimation', { life: 0.15, scale: 1, move: 'swipe_diagonal' })
        ],
        target: { shake: shake('hit', 'hit+0.13', 14), flash: flash('hit', 'hit+0.08', 'brightness(200%)') }
    }),
    // The arrow sprites are drawn pointing right, and turn to fly along their path.
    // Arrows (loose_arrow, which Triple Shot also uses, quick_draw, poisoned_arrow) fly for a visible moment and then STAY in the target for about a second (travel `hold`),
    // quivering, before they fade, so the hit can actually be seen. The turn waits for the whole animation.
    "loose_arrow": anim(2.1, {
        seconds: true,
        hit: 0.55,
        audio: [
            sfx(0.05, 'bowReleaseSfx', { volume: 1 }),
            sfx('hit', 'arrowImpactSfx', { volume: 1 })
        ],
        actor: lunge(0, 0.2, -12),
        vfx: [
            travel(0.1, 'looseArrowAnimation', { life: 0.45, hold: 1.4, scale: 0.85, blend: 'source-over', aim: true, fadeOut: false }),
            spawn('hit', 'looseArrowImpactAnimation', { life: 0.5, frames: 4, scale: 0.75, blend: 'source-over' })
        ],
        target: { shake: shake('hit', 'hit+0.3', 15), flash: flash('hit', 'hit+0.2', 'brightness(180%) sepia(30%)') }
    }),
    "magic_missile": anim(0.9, {
        hit: 0.4,
        audio: [sfx(0.05, 'arcaneDartSfx', { volume: 0.9, pitch: 1.4 })],
        actor: { flash: flash(0, 0.12, 'brightness(200%) hue-rotate(250deg) saturate(300%)') },
        vfx: [
            travel(0.1, 'arcaneDartAnimation', { life: 0.3, frames: 4, scale: 1.3, move: 'arc', arc: -70, filter: 'hue-rotate(60deg) brightness(130%)' }),
            spawn('hit', 'impactAnimation', { life: 0.2, scale: 1.1, filter: tint('pink') }),
            burst('hit', { count: 6, color: '#ff8de0', scale: 0.8, minSpeed: 140, maxSpeed: 300 })
        ],
        target: {
            shake: shake('hit', 'hit+0.15', 16),
            flash: flash('hit', 'hit+0.1', 'brightness(250%) sepia(60%) hue-rotate(260deg) saturate(300%)')
        }
    }),
    // Generic lunge. No ability uses this any more; kept for enemies, items and traits that still reference it.
    "melee_lunge": anim(1.5, {
        audio: [
            sfx(0, 'slashSfx', { pitch: 1.1 }),
            sfx(0.133, 'slashSfx', { volume: 1 })
        ],
        actor: lunge(0, 0.2, 96),
        target: { shake: shake(0.133, 0.333, 29), flash: flash(0.133, 0.267, 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)') }
    }),
    // The meteor lands at 0.8s; the impact, shake and flash are timed to it.
    "meteor_shower": anim(1.6, {
        audio: [
            sfx(0, 'earthquake1Sfx', { volume: 0.8, pitch: 0.5 }),
            sfx(0, 'fireballCastSfx', { volume: 1.2, pitch: 0.6 }),
            sfx(0.8, 'meteorShowerImpactSfx', { volume: 1.4, pitch: 0.7 })
        ],
        background: background(0, 1.5, 'voidBackground', 'brightness(30%) sepia(100%) hue-rotate(330deg) saturate(400%)'),
        actor: { flash: flash(0, 0.8, 'brightness(250%) sepia(100%) hue-rotate(350deg) saturate(500%) drop-shadow(0 0 10px orange)') },
        vfx: [
            spawn(0, 'meteorShowerAnimation', { life: 0.8, frames: 4, move: 'diagonal_drop', scale: 3.5, offsetX: 0, offsetY: 0, drop: [1400, 1400], fadeOut: false }),
            spawn(0.8, 'impactAnimation', { life: 0.6, move: 'expand_and_fade', scale: 3.5 })
        ],
        target: { shake: shake(0.8, 1.3, 55), flash: flash(0.8, 1.4, 'brightness(350%) sepia(100%) hue-rotate(350deg) saturate(600%) drop-shadow(0 0 20px red)') }
    }),
    "minor_channel": restoring({ big: false, hex: '#6ab4ff', pale: '#d0e8ff', hue: 195, sound: 'arcaneDartSfx', pitch: 1.7 }),
    "minor_heal": restoring({ big: false, hex: '#7dff9a', pale: '#d8ffe8', hue: 95, sound: 'purifySfx', pitch: 1.3 }),
    "minor_recover": restoring({ big: false, hex: '#ffd24a', pale: '#fff2c0', hue: 40, sound: 'restSfx', pitch: 1.4 }),
    "moderate_channel": restoring({ big: true, hex: '#6ab4ff', pale: '#d0e8ff', hue: 195, sound: 'arcaneDartSfx', pitch: 1.3 }),
    "moderate_heal": restoring({ big: true, hex: '#7dff9a', pale: '#d8ffe8', hue: 95, sound: 'purifySfx', pitch: 1 }),
    "moderate_recover": restoring({ big: true, hex: '#ffd24a', pale: '#fff2c0', hue: 40, sound: 'restSfx', pitch: 1 }),
    // Osmose: insight drawn out of the target as blue motes, which stream across and settle into the caster.
    "osmose": anim(2, {
        seconds: true,
        audio: [
            sfx(0.1, 'arcaneDartSfx', { volume: 0.7, pitch: 0.6 }),
            sfx(1.1, 'purifySfx', { volume: 0.5, pitch: 1.4 })
        ],
        actor: { flash: flash(1.1, 1.8, 'brightness(150%) sepia(100%) hue-rotate(200deg) saturate(300%)') },
        vfx: [
            ...[0, 2.094, 4.189].map(phase => orbit(0.1, { life: 0.9, turns: 1.5, radius: 90, squash: 0.5, phase, scale: 0.45, color: '#3a7ad8', offsetY: -30 })),
            ...repeat(0.3, 8, 0.1, t => burst(t, { count: 3, color: '#6ab4ff', scale: 0.6, area: [90, 40], offsetY: 10, angle: 180, cone: 60, minSpeed: 220, maxSpeed: 380, minLife: 0.4, maxLife: 0.7, envelope: true })),
            ...[0, 2.094, 4.189].map(phase => orbit(1.0, { at: 'source', life: 0.8, turns: 1.25, radius: 100, squash: 0.45, phase, scale: 0.45, color: '#6ab4ff', offsetY: -30 })),
            burst(1.7, { at: 'source', count: 12, color: '#d0e8ff', scale: 0.45, minSpeed: 40, maxSpeed: 120, gravity: -50, offsetY: -30 })
        ],
        target: {
            shake: shake(0.1, 1.0, 8),
            flash: flash(0.1, 1.1, 'brightness(70%) sepia(100%) hue-rotate(200deg) saturate(250%)')
        }
    }),
    "overload": anim(2, {
        audio: [sfx(0.1, 'shockSfx', { volume: 1.3, pitch: 0.8 })],
        background: background(0.1, 0.5, 'voidBackground', 'brightness(200%) sepia(50%) hue-rotate(60deg) invert(10%)'),
        actor: { flash: flash(0.1, 1, 'brightness(300%) drop-shadow(0 0 15px yellow)') },
        vfx: [
            spawn(0.2, 'overloadAnimation', { life: 0.8, frames: 4, move: 'expand_and_fade', scale: 3.5 }),
            spawn(0.4, 'overloadAnimation', { life: 0.6, frames: 4, move: 'static', scale: 2.5 })
        ],
        target: { shake: shake(0.2, 1.2, 50), flash: flash(0.2, 1, 'brightness(300%) sepia(100%) hue-rotate(50deg) saturate(500%) drop-shadow(0 0 15px yellow)') }
    }),
    // Status effect animation.
    "paralyzed": anim(1.5, {
        audio: [
            sfx(0.1, 'paralyzedSfx', { volume: 0.6, pitch: 1.8 }),
            sfx(0.5, 'paralyzedSfx', { volume: 0.4, pitch: 1.9 })
        ],
        vfx: [
            burst(0.1, { count: 10, color: '#fff7a0', scale: 0.8, minSpeed: 120, maxSpeed: 340, minLife: 0.15, maxLife: 0.3 }),
            burst(0.5, { count: 6, color: '#c8f0ff', scale: 0.6, minSpeed: 80, maxSpeed: 240, minLife: 0.15, maxLife: 0.3 })
        ],
        target: { shake: shake(0.1, 0.8, 12), flash: flash(0.1, 0.8, 'brightness(250%) sepia(100%) hue-rotate(45deg) saturate(500%)') }
    }),
    // Status effect animation.
    "poison": anim(2, {
        audio: [sfx(0.1, 'poisonSfx', { volume: 0.6, pitch: 1.2 })],
        vfx: [
            spawn(0.05, 'poisonAnimation', { life: 0.4, move: 'float_up_and_pop', scale: 0.6, blend: 'source-over' }),
            spawn(0.1, 'poisonAnimation', { life: 0.4, move: 'float_up_and_pop', scale: 0.75, blend: 'source-over' }),
            spawn(0.15, 'poisonAnimation', { life: 0.4, move: 'float_up_and_pop', scale: 0.45, blend: 'source-over' })
        ],
        target: { flash: flash(0, 0.75, 'brightness(110%) saturate(160%) hue-rotate(100deg)') }
    }),
    // Cue times are a fraction of the duration (the renderer compares them with timer / duration); `seconds: true` lets an animation that is not
    // 1s long write them in real seconds instead (the arrow's flight is in real seconds).
    "poisoned_arrow": anim(3.0, {
        seconds: true,
        hit: 0.6,
        audio: [
            sfx(0.05, 'bowReleaseSfx', { volume: 1, pitch: 0.9 }),
            sfx('hit', 'arrowImpactSfx', { volume: 0.9 }),
            sfx('hit+0.05', 'poisonSplashSfx', { volume: 1 })
        ],
        actor: lunge(0, 0.2, -14),
        vfx: [
            travel(0.1, 'poisonedArrowAnimation', { life: 0.5, hold: 1.8, scale: 0.85, blend: 'source-over', aim: true, fadeOut: false }),
            spawn('hit', 'poisonedArrowImpactAnimation', { life: 0.5, frames: 4, scale: 0.75, blend: 'source-over' }),
            spawn('hit+0.1', 'poisonAnimation', { life: 1.2, move: 'expand_and_fade', scale: 1.0, blend: 'multiply' }),
            burst('hit', { count: 7, color: '#7ddc3a', scale: 0.7, minSpeed: 100, maxSpeed: 240, gravity: 300 })
        ],
        target: { shake: shake('hit', 'hit+0.4', 20), flash: flash('hit', 'hit+1.4', 'brightness(120%) saturate(200%) hue-rotate(100deg)') }
    }),
    "punch": anim(1, {
        audio: [sfx(0.1, 'punchSfx', { volume: 1 })],
        actor: lunge(0, 0.15, 80),
        vfx: [
            spawn(0.1, 'punchAnimation', { life: 0.25, move: 'expand_and_fade', scale: 1.3 })
        ],
        target: { shake: shake(0.1, 0.25, 18), flash: flash(0.1, 0.2, 'brightness(180%)') }
    }),
    // Purify: a cool light falls over the target, washing a few motes of white upward as it clears.
    "purify": anim(2, {
        seconds: true,
        audio: [sfx(0.1, 'healSfx', { volume: 1, pitch: 1.2 }), sfx(0.9, 'purifySfx', { volume: 0.6, pitch: 1.3 })],
        actor: { flash: flash(0, 0.6, 'brightness(180%) sepia(50%) hue-rotate(180deg) saturate(200%)') },
        vfx: [
            spawn(0.4, 'purifyAnimation', { life: 1.2, move: 'float_up_and_pop', scale: 1.5 }),
            ...repeat(0.5, 8, 0.1, t => burst(t, { count: 3, color: '#d8f4ff', scale: 0.5, area: [100, 30], offsetY: 40, angle: 270, cone: 20, minSpeed: 90, maxSpeed: 180, minLife: 0.6, maxLife: 0.9, envelope: true })),
            burst(1.0, { count: 14, color: '#ffffff', scale: 0.5, minSpeed: 40, maxSpeed: 140, minLife: 0.3, maxLife: 0.6, gravity: -50, offsetY: -30 })
        ],
        target: { flash: flash(0.4, 2.0, 'brightness(200%) sepia(30%) hue-rotate(180deg) saturate(150%) drop-shadow(0 0 10px white)') }
    }),
    // Rapid shot: a fast arrow (the ability's icon already carries its speed lines) trailed by two faint copies.
    "quick_draw": anim(1.8, (() => { const arrow = { life: 0.3, hold: 1.2, scale: 0.9, blend: 'source-over', aim: true, fadeOut: false }; return {
        seconds: true,
        hit: 0.4,
        audio: [
            sfx(0, 'bowReleaseSfx', { volume: 1, pitch: 1.2 }),
            sfx('hit', 'arrowImpactSfx', { volume: 0.9, pitch: 1.1 })
        ],
        actor: lunge(0, 0.1, -8),
        vfx: [
            travel(0.1, 'quickDrawAnimation', arrow),
            travel(0.13, 'quickDrawAnimation', { ...arrow, hold: undefined, alpha: 0.35 }),
            travel(0.16, 'quickDrawAnimation', { ...arrow, hold: undefined, alpha: 0.18 }),
            spawn('hit', 'quickDrawImpactAnimation', { life: 0.4, frames: 4, scale: 0.7, blend: 'source-over' })
        ],
        target: { shake: shake('hit', 'hit+0.25', 12), flash: flash('hit', 'hit+0.2', 'brightness(150%)') }
    }; })()),
    // Not used by any ability (kept in case another file references it).
    "quick_shock": anim(1, {
        audio: [sfx(0.05, 'shockZapSfx', { volume: 1, pitch: 1.4 })],
        actor: { flash: flash(0, 0.15, 'brightness(180%) sepia(50%) hue-rotate(45deg) saturate(400%)') },
        vfx: [
            spawn(0.05, 'shockAnimation', { life: 0.25, move: 'static', scale: 1.4 })
        ],
        target: { shake: shake(0.05, 0.35, 18), flash: flash(0.05, 0.25, 'brightness(250%) sepia(100%) hue-rotate(45deg) saturate(500%)') }
    }),
    "quick_stab": anim(0.8, {
        audio: [sfx(0.05, 'quickStabSfx', { volume: 1, pitch: 1.3 })],
        actor: lunge(0, 0.1, 100),
        vfx: [
            spawn(0.05, 'quickStabAnimation', { life: 0.15, move: 'expand_and_fade', scale: 1 })
        ],
        target: { shake: shake(0.05, 0.2, 15), flash: flash(0.05, 0.15, 'brightness(200%)') }
    }),
    // Raise Skeleton: the ground darkens and cracks, green wisps rise, and a shower of bone breaks out of it.
    "raise_skeleton": anim(2.6, {
        seconds: true,
        audio: [
            sfx(0.1, 'spiritReapSfx', { volume: 0.8, pitch: 0.7 }),
            sfx(0.8, 'earthquake2Sfx', { volume: 0.9, pitch: 0.5 }),
            sfx(1.5, 'crunchSfx', { volume: 0.8, pitch: 0.6 })
        ],
        background: background(0.1, 2.2, 'arcaneVortexBg', 'brightness(40%) sepia(100%) hue-rotate(100deg) saturate(250%)'),
        actor: wobble(0.1, 1.2, 8, { flash: flash(0.1, 1.6, 'brightness(70%) sepia(100%) hue-rotate(250deg) saturate(300%)') }),
        vfx: [
            spawn(0.6, 'earthquakeAnimation', { life: 1.4, scale: 2.4, move: 'static', blend: 'multiply' }),
            ...repeat(0.7, 8, 0.12, t => burst(t, { count: 3, color: '#7dff9a', scale: 0.6, area: [140, 20], offsetY: 40, angle: 270, cone: 15, minSpeed: 90, maxSpeed: 200, minLife: 0.7, maxLife: 1.0, gravity: -20, envelope: true })),
            spawn(1.0, 'spiritReapAnimation', { life: 1.4, scale: 2.0, move: 'float_up_and_pop' }),
            burst(1.5, { count: 16, color: '#e8e2cc', scale: 1.2, minSpeed: 140, maxSpeed: 340, gravity: 700, blend: 'source-over', offsetY: 30 }),
            burst(1.5, { count: 10, color: '#7dff9a', scale: 0.7, minSpeed: 40, maxSpeed: 130, minLife: 0.6, maxLife: 1.0, gravity: -70, offsetY: -20 })
        ]
    }),
    "rally": anim(2, {
        audio: [sfx(0.1, 'rallySfx', { volume: 1, pitch: 1 })],
        actor: { flash: flash(0, 0.5, 'brightness(180%) sepia(80%) hue-rotate(35deg) saturate(300%)') },
        vfx: [
            spawn(0.5, 'rallyAnimation', { life: 0.6, move: 'expand_and_fade', scale: 1.5 })
        ],
        target: { flash: flash(0.3, 1.2, 'brightness(150%) sepia(80%) hue-rotate(35deg) saturate(300%) drop-shadow(0 0 10px gold)') }
    }),
    "reckless_charge": anim(1.5, {
        audio: [
            sfx(0, 'recklessChargeApproachSfx', { volume: 0.8, pitch: 1 }),
            sfx(0.2, 'recklessChargeImpactSfx', { volume: 0.8, pitch: 1 })
        ],
        actor: lunge(0, 0.2, 160, { flash: flash(0.25, 0.55, 'brightness(130%) sepia(100%) hue-rotate(330deg) saturate(400%)') }),
        vfx: [
            spawn(0.2, 'impactAnimation', { life: 0.4, move: 'expand_and_fade', scale: 2.5 })
        ],
        target: { shake: shake(0.2, 0.6, 48), flash: flash(0.2, 0.4, 'brightness(250%)') }
    }),
    // Rest: a slow breath. Warm motes drift up, a pale glow settles, and it all fades gently.
    "rest": anim(2.6, {
        seconds: true,
        audio: [sfx(0.1, 'restSfx', { volume: 1 })],
        vfx: [
            ...repeat(0.2, 10, 0.2, t => burst(t, { count: 2, color: '#ffe9a8', scale: 0.55, area: [100, 30], offsetY: 40, angle: 270, cone: 30, minSpeed: 40, maxSpeed: 90, minLife: 1.0, maxLife: 1.5, gravity: -10, envelope: true })),
            ...[0, 3.1416].map(phase => orbit(0.3, { life: 1.8, turns: 0.75, radius: 70, squash: 0.35, phase, scale: 0.4, color: '#fff2b0', offsetY: -40, alpha: 0.7 })),
            burst(1.9, { count: 10, color: '#fff7d6', scale: 0.45, minSpeed: 20, maxSpeed: 70, minLife: 0.5, maxLife: 0.9, gravity: -40, offsetY: -30 })
        ],
        target: { flash: flash(0.1, 2.4, 'brightness(120%) sepia(40%) saturate(120%)') }
    }),
    "shield_bash": anim(1.3, {
        audio: [sfx(0.15, 'strikeSfx', { volume: 1, pitch: 0.7 })],
        actor: lunge(0, 0.2, 110),
        vfx: [
            spawn(0.15, 'impactAnimation', { life: 0.3, move: 'expand_and_fade', scale: 2, blend: 'normal' })
        ],
        target: { shake: shake(0.15, 0.5, 40), flash: flash(0.15, 0.4, 'brightness(150%) sepia(30%) saturate(50%)') }
    }),
    // Stream of 20 sprites 5ms apart so the bolt reads as one continuous arc. The target reacts as the first one lands (0.32s).
    "shock": anim(2.5, {
        audio: [sfx(0.1, 'shockSfx', { volume: 1 })],
        actor: { flash: flash(0, 0.35, 'brightness(200%) drop-shadow(0 0 5px yellow) drop-shadow(0 0 10px cyan)') },
        vfx: [
            ...stream(0.15, 20, 0.005, 'shockAnimation', { life: 0.2, frames: 4, scale: 1.2, filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' })
        ],
        target: { shake: shake(0.32, 0.8, 45), flash: flash(0.32, 0.7, 'brightness(300%) drop-shadow(0 0 10px yellow) drop-shadow(0 0 15px cyan)') }
    }),
    "slash": anim(1.5, {
        audio: [sfx(0.067, 'slashSfx', { volume: 1 })],
        actor: lunge(0, 0.133, 120),
        vfx: [
            spawn(0.1, 'slashAnimation', { life: 0.2, move: 'swipe_diagonal', scale: 1.8 })
        ],
        target: { shake: shake(0.1, 0.233, 24), flash: flash(0.1, 0.167, 'brightness(250%)') }
    }),
    // Status effect animation.
    "sluggish": anim(1.5, {
        audio: [sfx(0.1, 'strikeSfx', { volume: 1, pitch: 0.7 })],
        vfx: [
            spawn(0.1, 'sluggishAnimation', { life: 0.6, move: 'shrink_and_fade', scale: 1.8, blend: 'multiply' })
        ],
        target: { shake: shake(0.1, 0.5, 10), flash: flash(0.1, 0.8, 'brightness(60%) grayscale(60%) drop-shadow(0 10px 5px black)') }
    }),
    // Solar Beam: light gathers into the caster from every side, then a golden beam is driven into the target and the whole thing flares.
    "solar_beam": anim(2.6, {
        seconds: true,
        hit: 1.35,
        audio: [
            sfx(0.05, 'spiteCastSfx', { volume: 1, pitch: 0.8 }),
            sfx(0.95, 'fireballCastSfx', { volume: 1.2, pitch: 0.7 }),
            sfx('hit', 'shockSfx', { volume: 0.7, pitch: 0.7 })
        ],
        actor: wobble(0, 1.0, 8, { flash: flash(0, 1.9, tint('gold', { bright: 260, sat: 400, glow: 'gold', glowSize: 15 })) }),
        vfx: [
            // motes of sunlight spiral in while the caster gathers
            ...[0, 2.094, 4.189].flatMap(phase => [
                orbit(0.05, { at: 'source', life: 0.95, turns: 1.5, radius: 130, squash: 0.55, phase, scale: 0.55, color: '#ffe680', offsetY: -30 }),
                orbit(0.05, { at: 'source', life: 0.95, turns: 1.5, radius: 130, squash: 0.55, phase: phase - 0.35, scale: 0.3, color: '#ffffff', alpha: 0.4, offsetY: -30 })
            ]),
            spawn(0.4, 'spiteAnimation', { at: 'source', life: 0.55, scale: 2.2, move: 'shrink_and_fade' }),
            ...stream(0.95, 40, 0.02, 'flamethrowerAnimation', { life: 0.3, scale: 1.8, jitter: 6, filter: tint('gold', { bright: 260, sat: 300 }) }),
            ...stream(0.95, 20, 0.04, 'flamethrowerAnimation', { life: 0.3, scale: 2.6, jitter: 6, alpha: 0.35, filter: tint('gold', { bright: 260, sat: 300 }) }),
            spawn('hit', 'spiteAnimation', { life: 0.8, scale: 4 }),
            burst('hit', { count: 22, color: '#ffe680', scale: 1.2, minSpeed: 180, maxSpeed: 440 })
        ],
        target: {
            shake: shake('hit', 'hit+0.8', 36),
            flash: flash('hit', 'hit+1.0', tint('gold', { bright: 350, sat: 300, glow: 'gold', glowSize: 20 }))
        }
    }),
    // The dark hand: drawn solid ('normal'; a dark purple hand all but vanishes on the glowing 'screen' blend). It is a slow, long cast on purpose: the hand
    // starts small and faint and swells over the target for about four seconds ('loom_over'), stays there, and thins away at the end. The sound is played
    // slowed down (pitch 0.65, about 6 seconds) so it lasts as long as the hand does, and the target trembles only lightly until the hand has grown.
    "spirit_reap": anim(6.6, {
        seconds: true,
        audio: [sfx(0, 'spiritReapSfx', { volume: 1, pitch: 0.65 })],
        actor: lunge(0, 0.15, 80, { flash: flash(5.6, 6.3, 'brightness(180%) saturate(200%) hue-rotate(120deg)') }),
        vfx: [
            spawn(0.2, 'spiritReapAnimation', { life: 6.2, move: 'loom_over', scale: 2.5, blend: 'normal' })
        ],
        target: { shake: shake(2.4, 5.8, 14), flash: flash(0.4, 6.0, 'brightness(130%) sepia(60%) hue-rotate(270deg) saturate(80%)') }
    }),
    "spite": anim(1.5, {
        audio: [
            sfx(0, 'spiteCastSfx', { volume: 1 }),
            sfx(0.133, 'strikeSfx', { volume: 1, pitch: 1.2 })
        ],
        actor: lunge(0, 0.2, 96, { flash: flash(0, 0.3, 'brightness(200%) sepia(100%) hue-rotate(35deg) saturate(300%)') }),
        vfx: [
            spawn(0.133, 'spiteAnimation', { life: 0.3, move: 'expand_and_fade', scale: 2.5 })
        ],
        target: { shake: shake(0.133, 0.333, 29), flash: flash(0.133, 0.4, 'brightness(300%) sepia(100%) hue-rotate(35deg) saturate(300%) drop-shadow(0 0 15px gold)') }
    }),
    "strike": anim(1.5, {
        audio: [sfx(0.133, 'strikeSfx', { volume: 1 })],
        actor: lunge(0, 0.2, 96),
        vfx: [
            spawn(0.133, 'strikeAnimation', { life: 0.3, move: 'expand_and_fade', scale: 1.44 })
        ],
        target: { shake: shake(0.133, 0.333, 29), flash: flash(0.133, 0.267, 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)') }
    }),
    // Swapping places: a puff of smoke and a flicker.
    "switch_combatant": anim(0.8, {
        seconds: true,
        audio: [sfx(0.05, 'smokeSfx', { volume: 0.5, pitch: 1.6 })],
        actor: { flash: flash(0, 0.4, 'brightness(150%) blur(2px)') },
        vfx: [
            spawn(0.05, 'smokeAnimation', { at: 'source', life: 0.5, scale: 1 }),
            burst(0.05, { at: 'source', count: 8, color: '#ffffff', scale: 0.5, minSpeed: 60, maxSpeed: 180, minLife: 0.2, maxLife: 0.4, offsetY: -30 })
        ]
    }),
    // Uses the new "hop" actor motion (BattleAnimationModel).
    "take_flight": anim(1.7, {
        audio: [
            sfx(0.1, 'bowReleaseSfx', { volume: 0.7, pitch: 0.6 }),
            sfx(0.2, 'smokeSfx', { volume: 0.6, pitch: 1.5 })
        ],
        actor: hop(0, 0.9, 70, { flash: flash(0.2, 1.2, 'brightness(140%) saturate(60%) drop-shadow(0 0 8px white)') }),
        vfx: [
            spawn(0.1, 'smokeAnimation', { life: 0.6, scale: 1.5, blend: 'normal' }),
            burst(0.3, { count: 10, color: '#ffffff', scale: 0.7, minSpeed: 50, maxSpeed: 150, minLife: 0.5, maxLife: 0.9, gravity: -60 }),
            burst(0.15, { count: 10, color: '#e8f0ff', scale: 0.9, minSpeed: 60, maxSpeed: 180, gravity: 120 })
        ]
    }),
    "thrust": anim(1.5, {
        audio: [sfx(0.133, 'thrustSfx', { volume: 1 })],
        actor: lunge(0, 0.2, 96),
        vfx: [
            spawn(0.133, 'thrustAnimation', { life: 0.2, move: 'shrink_and_fade', scale: 2 })
        ],
        target: { shake: shake(0.133, 0.333, 29), flash: flash(0.133, 0.267, 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)') }
    }),
    // Trait trigger flash (onBattleStart / onDeath). Not an ability animation.
    "trait_activate": anim(1.2, {
        target: { shake: shake(0, 0.3, 10), flash: flash(0, 0.4, 'brightness(250%) saturate(150%)') }
    }),
    "uppercut": anim(1.4, {
        audio: [sfx(0.2, 'punchSfx', { volume: 1, pitch: 0.8 })],
        actor: lunge(0, 0.2, 90),
        vfx: [
            spawn(0.2, 'uppercutAnimation', { life: 0.4, move: 'float_up_and_pop', scale: 1.8 })
        ],
        target: { shake: shake(0.2, 0.6, 35), flash: flash(0.2, 0.4, 'brightness(250%) sepia(50%) hue-rotate(330deg)') }
    }),
    "vine_lash": anim(1.4, {
        audio: [sfx(0.1, 'vineLashSfx', { volume: 1 })],
        actor: lunge(0, 0.15, 60),
        vfx: [
            spawn(0.1, 'vineLashAnimation', { life: 0.35, move: 'swipe_diagonal', scale: 1.8, blend: 'normal' })
        ],
        target: { shake: shake(0.1, 0.4, 26), flash: flash(0.1, 0.35, 'brightness(130%) sepia(80%) hue-rotate(90deg) saturate(250%)') }
    }),
    // Stream of 20 sprites; the first reaches the target at 0.55s, which is when the target reacts.
    "water_blast": anim(2.5, {
        audio: [sfx(0.1, 'waterBlastSfx', { volume: 1 })],
        actor: { flash: flash(0, 0.35, 'brightness(200%) sepia(100%) hue-rotate(200deg) saturate(300%) drop-shadow(0 0 10px blue)') },
        vfx: [
            ...stream(0.15, 20, 0.005, 'waterBlastAnimation', { life: 0.4, scale: 1.2, filter: 'brightness(150%) sepia(100%) hue-rotate(200deg) saturate(300%)' })
        ],
        target: { shake: shake(0.55, 1, 35), flash: flash(0.55, 0.95, 'brightness(250%) sepia(100%) hue-rotate(200deg) saturate(400%) drop-shadow(0 0 10px cyan)') }
    }),
    "waterfall": anim(2, {
        audio: [sfx(0.1, 'waterBlastSfx', { volume: 1.2, pitch: 0.8 })],
        actor: { flash: flash(0, 0.3, 'brightness(150%) sepia(100%) hue-rotate(200deg) saturate(300%)') },
        vfx: [
            spawn(0.2, 'waterfallAnimation', { life: 0.6, frames: 4, move: 'shrink_and_fade', scale: 2.5, drop: [0, 400] })
        ],
        target: { shake: shake(0.5, 1, 30), flash: flash(0.5, 0.8, 'brightness(200%) sepia(100%) hue-rotate(200deg) saturate(300%) drop-shadow(0 0 10px blue)') }
    }),
    // Weather animation (WeatherDefinitions BLIZZARD). Plays on everyone in the fight, so it uses no actor motion.
    "weatherBlizzard": anim(2.8, {
        audio: [sfx(0, 'spookyWind', { volume: 0.9, pitch: 1.3 })],
        background: background(0, 2.8, 'current', 'brightness(135%) saturate(35%) hue-rotate(195deg) contrast(90%)'),
        vfx: [
            // wind-driven snow, fast and fine
            repeat(0, 20, 0.13, t => burst(t, { glow: false, count: 16, color: '#ffffff', scale: 0.2, angle: 158, cone: 24, minSpeed: 650, maxSpeed: 1000, minLife: 0.45, maxLife: 0.7, gravity: 150, area: [200, 520], offsetX: 380, alpha: 0.9 })),
            // big slow flakes tumbling through
            repeat(0.05, 9, 0.28, t => burst(t, { glow: false, count: 3, color: '#e4f4ff', scale: 0.45, angle: 150, cone: 40, minSpeed: 250, maxSpeed: 450, minLife: 0.8, maxLife: 1.2, gravity: 90, area: [500, 400], offsetX: 200, alpha: 0.8 })),
            // ice-blue shimmer on each combatant as the cold bites
            burst(0.4, { count: 12, color: '#9fe3ff', scale: 0.5, minSpeed: 40, maxSpeed: 130, minLife: 0.4, maxLife: 0.8, gravity: -30 })
        ],
        target: { shake: shake(0.2, 2.5, 3), flash: flash(0.3, 2.4, 'brightness(125%) saturate(60%) hue-rotate(185deg)') }
    }),
    // Weather animation (WeatherDefinitions FOG). Plays on everyone in the fight, so it uses no actor motion.
    "weatherFog": anim(2.6, {
        audio: [sfx(0, 'weatherFog', { volume: 0.6, pitch: 0.85 })],
        background: background(0, 2.6, 'current', 'brightness(115%) saturate(30%) contrast(75%) sepia(10%)'),
        vfx: [
            // banks of mist rolling over each combatant
            spawn(0.0, 'smokeAnimation', { life: 1.6, scale: 4.5, blend: 'normal', move: 'expand_and_fade', alpha: 0.45, offsetX: -50 }),
            spawn(0.5, 'smokeAnimation', { life: 1.6, scale: 5, blend: 'normal', move: 'expand_and_fade', alpha: 0.4, offsetX: 60, offsetY: 30 }),
            spawn(1.0, 'smokeAnimation', { life: 1.4, scale: 4.2, blend: 'normal', move: 'expand_and_fade', alpha: 0.4, offsetX: -20, offsetY: -30 }),
            // slow drifting wisps
            repeat(0, 6, 0.4, t => burst(t, { count: 4, color: '#d5dbe1', scale: 2.2, angle: 0, cone: 40, minSpeed: 15, maxSpeed: 40, minLife: 1.2, maxLife: 1.8, area: [320, 160], alpha: 0.25 }))
        ],
        target: { flash: flash(0.3, 2.2, 'brightness(112%) saturate(55%) contrast(90%)') }
    }),
    // Weather animation (WeatherDefinitions RAIN). Plays on everyone in the fight, so it uses no actor motion.
    "weatherRain": anim(2.5, {
        audio: [sfx(0.04, 'weatherRainShort', { volume: 0.8 })],
        background: background(0, 2.5, 'current', 'brightness(70%) saturate(80%) sepia(20%) hue-rotate(170deg)'),
        vfx: [
            // sheets of drops falling over every combatant, slightly slanted by the wind
            repeat(0, 12, 0.19, t => burst(t, { glow: false, count: 14, color: '#9cc2ff', scale: 0.22, angle: 102, cone: 8, minSpeed: 500, maxSpeed: 700, minLife: 0.45, maxLife: 0.6, gravity: 500, area: [420, 40], offsetY: -250, alpha: 0.85 })),
            // splashes where they land
            repeat(0.2, 10, 0.22, t => burst(t, { glow: false, count: 5, color: '#dff0ff', scale: 0.18, angle: 270, cone: 140, minSpeed: 60, maxSpeed: 160, minLife: 0.2, maxLife: 0.35, gravity: 600, area: [260, 20], offsetY: 90 }))
        ],
        target: { flash: flash(0.08, 0.88, 'brightness(80%) saturate(70%) sepia(30%) hue-rotate(180deg)') }
    }),
    // Weather animation (WeatherDefinitions SANDSTORM). Plays on everyone in the fight, so it uses no actor motion.
    "weatherSandstorm": anim(2.6, {
        audio: [sfx(0, 'spookyWind', { volume: 0.7, pitch: 0.9 })],
        background: background(0, 2.6, 'current', 'sepia(85%) saturate(190%) brightness(88%) hue-rotate(-8deg)'),
        vfx: [
            // grit blown hard from right to left across the whole field
            repeat(0, 18, 0.13, t => burst(t, { glow: false, count: 16, color: '#d9b36a', scale: 0.3, angle: 172, cone: 14, minSpeed: 900, maxSpeed: 1300, minLife: 0.4, maxLife: 0.6, area: [200, 520], offsetX: 380, blend: 'source-over', alpha: 0.9 })),
            // heavier dust that hangs in the air
            repeat(0.1, 7, 0.33, t => burst(t, { glow: false, count: 4, color: '#b98f4a', scale: 1.6, angle: 175, cone: 20, minSpeed: 150, maxSpeed: 300, minLife: 0.8, maxLife: 1.2, area: [300, 260], blend: 'source-over', alpha: 0.35 }))
        ],
        target: { shake: shake(0.2, 2.3, 5), flash: flash(0.3, 2.2, 'sepia(100%) saturate(220%) brightness(105%)') }
    }),
    "wild_swing": anim(1.3, {
        audio: [sfx(0.1, 'wildSwingSfx', { volume: 1, pitch: 0.8 })],
        actor: lunge(0, 0.25, 140, { flash: flash(0, 0.3, 'brightness(150%) sepia(50%) hue-rotate(15deg) saturate(200%)') }),
        vfx: [
            spawn(0.25, 'wildSwingAnimation', { life: 0.25, move: 'swipe_diagonal', scale: 3 })
        ],
        target: { shake: shake(0.25, 0.75, 45), flash: flash(0.25, 0.45, 'brightness(250%)') }
    })
};