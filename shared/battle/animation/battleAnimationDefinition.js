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

export const BattleAnimationDefinitions = {
    // Scripted boss ability. Not used by any player ability.
    "abyssal_void": anim(3, {
        audio: [sfx(0.033, 'darkMagicSFX', { volume: 1 })],
        background: background(0.067, 0.933, 'voidBackground', 'brightness(80%) sepia(50%) hue-rotate(250deg)'),
        actor: { flash: flash(0.067, 0.933, 'brightness(150%) hue-rotate(250deg)') },
        target: { shake: shake(0.333, 0.833, 36), flash: flash(0.333, 0.833, 'invert(100%)') }
    }),
    "acid_pool": anim(2.6, {
        audio: [sfx(0.05, 'acidPoolSfx', { volume: 1 })],
        vfx: [
            // the pool splashes down small and spreads outwards; a fainter second wave rolls out past it
            spawn(0, 'acidPoolAnimation', { life: 2.2, move: 'spread_and_fade', scale: 2.6, blend: 'normal' }),
            spawn(0.15, 'acidPoolAnimation', { life: 1.4, move: 'spread_and_fade', scale: 3.2, blend: 'normal', alpha: 0.45 }),
            // bubbles pop up as it spreads, and fumes rise off the surface
            ...repeat(0.25, 6, 0.28, t => burst(t, { count: 3, color: '#9be84a', scale: 1.2, minSpeed: 10, maxSpeed: 40, minLife: 0.4, maxLife: 0.7, gravity: -90, glow: false, area: [150, 40], offsetY: 20 })),
            ...repeat(0.5, 4, 0.4, t => spawn(t, 'acidicSmogAnimation', { life: 0.7, move: 'float_up_and_pop', scale: 1.2, blend: 'source-over', offsetX: ((t * 100) % 3 - 1) * 40 }))
        ],
        target: { shake: shake(0.1, 0.8, 8), flash: flash(0.05, 1.5, 'hue-rotate(70deg) saturate(180%) brightness(110%)') }
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
    "baton_pass": anim(1.2, {
        audio: [sfx(0.05, 'rallySfx', { volume: 0.8, pitch: 1.4 })],
        actor: lunge(0, 0.2, -60, { flash: flash(0, 0.5, tint('gold', { glow: 'gold' })) }),
        vfx: [
            spawn(0.05, 'rallyAnimation', { at: 'source', life: 0.5, scale: 1.3, move: 'float_up_and_pop', filter: tint('gold', { bright: 130, sat: 200 }) }),
            burst(0.1, { at: 'source', count: 10, color: '#ffd24a', scale: 1.2, minSpeed: 80, maxSpeed: 220, gravity: -120 })
        ]
    }),
    "bear_form": anim(2.2, {
        audio: [
            sfx(0.1, 'wolfCry', { volume: 0.8, pitch: 0.5 }),
            sfx(0.5, 'crunchSfx', { volume: 1, pitch: 0.5 })
        ],
        actor: wobble(0.1, 0.9, 16, { flash: flash(0, 1.4, 'brightness(70%) sepia(100%) hue-rotate(10deg) saturate(300%)') }),
        vfx: [
            spawn(0.15, 'smokeAnimation', { life: 0.8, scale: 2.8, blend: 'normal' }),
            spawn(0.5, 'smokeAnimation', { life: 0.8, scale: 3.4, blend: 'normal' }),
            spawn(0.7, 'clawAnimation', { life: 0.4, scale: 2, move: 'swipe_diagonal', blend: 'normal' }),
            burst(0.2, { count: 14, color: '#7a5230', scale: 1.4, gravity: 260, blend: 'source-over' })
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
        audio: [sfx(0.1, 'slashSfx', { volume: 0.6, pitch: 0.7 })],
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
        audio: [sfx(0.1, 'strike', { volume: 0.7, pitch: 0.5 })],
        vfx: [
            spawn(0.15, 'boundAnimation', { life: 1, move: 'static', scale: 1.5, blend: 'multiply' })
        ],
        target: { shake: shake(0.1, 0.5, 4), flash: flash(0.1, 1.2, 'brightness(70%) sepia(60%) hue-rotate(80deg) saturate(120%)') }
    }),
    "brew_of_madness": anim(1.9, {
        audio: [
            sfx(0.1, 'crunchSfx', { volume: 0.7, pitch: 1.4 }),
            sfx(0.7, 'darkMagicSFX', { volume: 0.9, pitch: 1.3 })
        ],
        actor: wobble(0.6, 1.4, 14, { flash: flash(0, 1.6, 'brightness(120%) sepia(100%) hue-rotate(280deg) saturate(500%)') }),
        vfx: [
            spawn(0.5, 'intimidateAnimation', { life: 0.9, scale: 1.8, blend: 'multiply' }),
            spawn(0.7, 'burnAnimation', { life: 0.7, scale: 1.2, move: 'float_up_and_pop', filter: tint('pink') }),
            burst(0.8, { count: 14, color: '#c0305a', scale: 1.3, gravity: -160 })
        ]
    }),
    // Status effect animation.
    "burn": anim(2, {
        audio: [sfx(0.1, 'fireballCastSfx', { volume: 0.5, pitch: 1.3 })],
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
    "counter_stance": anim(1, {
        audio: [sfx(0.1, 'strikeSfx', { volume: 0.9, pitch: 1.3 })],
        actor: lunge(0, 0.15, -24, { flash: flash(0, 0.6, tint('fire', { bright: 140, sat: 250, glow: 'orange', glowSize: 8 })) }),
        vfx: [
            spawn(0.1, 'impactAnimation', { life: 0.35, scale: 1.1, move: 'static', filter: tint('fire') }),
            spawn(0.2, 'impactAnimation', { life: 0.4, scale: 1.8, move: 'expand_and_fade', filter: tint('fire') })
        ]
    }),
    // Fallback used when an ability has no animationId.
    "default_attack": anim(0.5, {
        audio: [sfx(0.2, 'strikeSfx')],
        target: { flash: flash(0.2, 0.6, 'brightness(200%)') }
    }),
    "drain_life": anim(2.2, {
        hit: 0.15,
        audio: [
            sfx('hit-0.05', 'spiritReapSfx', { volume: 0.8, pitch: 0.8 }),
            sfx(1, 'healSfx', { volume: 0.6, pitch: 0.7 })
        ],
        actor: { flash: flash(1, 1.8, tint('red', { bright: 150, sat: 350, glow: 'crimson' })) },
        vfx: [
            spawn('hit', 'bleedAnimation', { life: 0.9, scale: 1.6, move: 'float_up_and_pop' }),
            spawn('hit+0.35', 'bleedAnimation', { life: 0.7, scale: 1.1, move: 'shrink_and_fade' }),
            burst('hit+0.2', { count: 10, color: '#a01030', scale: 1.1, gravity: -140 }),
            spawn(1, 'bleedAnimation', { at: 'source', life: 0.8, scale: 1.3, move: 'float_up_and_pop' }),
            burst(1, { at: 'source', count: 10, color: '#e0405a', scale: 1.1, gravity: -140 })
        ],
        target: {
            shake: shake('hit', 1, 14),
            flash: flash('hit', 1.2, 'brightness(60%) sepia(100%) hue-rotate(330deg) saturate(300%)')
        }
    }),
    "earthquake": anim(4, {
        audio: [
            sfx(0.063, 'earthquake1Sfx', { volume: 1 }),
            sfx(0.125, 'earthquake2Sfx', { volume: 1 }),
            sfx(0.2, 'earthquake3Sfx', { volume: 1 })
        ],
        vfx: [
            spawn(0.2, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 2, blend: 'source-over' }),
            spawn(0.4, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 2.5, blend: 'source-over' }),
            spawn(0.6, 'earthquakeAnimation', { life: 0.8, move: 'expand_and_fade', scale: 1.8, blend: 'source-over' })
        ],
        target: { shake: shake(0.063, 3.6, 72), flash: flash(0.2, 0.8, 'sepia(80%) brightness(60%) saturate(120%)') }
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
            // fog: the body's grey breath, pale clouds first and darker ones after
            ...repeat(0.04, 10, 0.09, (t, i) => burst(t, {
                count: 3, shape: 'puff', color: i % 2 ? '#8d929c' : '#b9bcc4', scale: 0.75, scaleJitter: 0.5, grow: 0.55, area: [100, 120], offsetY: 6,
                minSpeed: 10, maxSpeed: 50, angle: 300, cone: 140, wind: [260, -40], windJitter: 0.55, windPull: 0.8, sway: 90, swayRate: 2.2,
                minLife: 1.2, maxLife: 2.1, alpha: 0.55, envelope: true, glow: false, blend: 'source-over'
            })),
            // ash: grey and black flakes, lifted and carried off
            ...repeat(0.08, 10, 0.08, (t, i) => burst(t, {
                count: 4, shape: 'fleck', color: ['#1f1e1d', '#3b3935', '#6f6a62'][i % 3], scale: 1.7, scaleJitter: 0.5, spinJitter: 7, area: [90, 110], offsetY: 4,
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
        audio: [sfx(0, 'fireballCastSfx', { volume: 1 })],
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
    "gravity": anim(2.4, {
        audio: [
            sfx(0.1, 'darkMagicSFX', { volume: 1, pitch: 0.6 }),
            sfx(0.9, 'earthquake1Sfx', { volume: 1, pitch: 0.4 })
        ],
        background: background(0, 1.9, 'voidBackground', 'brightness(40%) sepia(100%) hue-rotate(250deg) saturate(300%)'),
        actor: { flash: flash(0.1, 0.8, 'brightness(130%) sepia(100%) hue-rotate(250deg) saturate(300%)') },
        vfx: [
            spawn(0.4, 'intimidateAnimation', { life: 1.2, scale: 2.4, move: 'shrink_and_fade', blend: 'multiply' }),
            spawn(0.9, 'earthquakeAnimation', { life: 1, scale: 2.2, move: 'static', blend: 'multiply' }),
            burst(0.9, { count: 16, color: '#5a2a8a', scale: 1.6, minSpeed: 40, maxSpeed: 140, gravity: 500 })
        ],
        target: {
            shake: shake(0.9, 1.8, 10),
            flash: flash(0.4, 1.9, 'brightness(45%) sepia(100%) hue-rotate(250deg) saturate(250%) invert(10%)')
        }
    }),
    "healing_rain": anim(2.6, {
        audio: [
            sfx(0.1, 'weatherRainShort', { volume: 0.6, pitch: 1.2 }),
            sfx(0.5, 'healSfx', { volume: 1, pitch: 1 })
        ],
        actor: { flash: flash(0, 0.5, 'brightness(160%) sepia(60%) hue-rotate(160deg) saturate(200%)') },
        vfx: [
            spawn(0.2, 'waterfallAnimation', { life: 0.9, frames: 4, scale: 1.6, offsetX: -45, move: 'shrink_and_fade', filter: 'hue-rotate(-40deg) brightness(130%)' }),
            spawn(0.4, 'waterfallAnimation', { life: 0.9, frames: 4, scale: 1.8, move: 'shrink_and_fade', filter: 'hue-rotate(-40deg) brightness(130%)' }),
            spawn(0.6, 'waterfallAnimation', { life: 0.9, frames: 4, scale: 1.6, offsetX: 45, move: 'shrink_and_fade', filter: 'hue-rotate(-40deg) brightness(130%)' }),
            burst(0.4, { count: 16, color: '#7dff9a', scale: 0.9, minSpeed: 20, maxSpeed: 100, gravity: 300 }),
            spawn(0.9, 'purifyAnimation', { life: 1, scale: 1.6, move: 'float_up_and_pop' })
        ],
        target: { flash: flash(0.4, 1.8, 'brightness(150%) sepia(60%) hue-rotate(95deg) saturate(160%)') }
    }),
    "hide": anim(1.5, {
        audio: [sfx(0.1, 'smokeSfx', { volume: 1, pitch: 1.1 })],
        actor: wobble(0.1, 0.3, 5),
        vfx: [
            spawn(0.1, 'smokeAnimation', { life: 0.6, move: 'expand_and_fade', scale: 1.5, blend: 'normal' })
        ],
        target: { flash: flash(0.1, 1.5, 'brightness(40%) grayscale(50%) blur(1px) drop-shadow(0 0 8px #111)') }
    }),
    // Uses an actor motion list (BattleAnimationModel): strike, then fall back.
    "hit_and_run": anim(1.3, {
        audio: [
            sfx(0.1, 'slashSfx', { volume: 1, pitch: 1.3 }),
            sfx(0.35, 'smokeSfx', { volume: 0.5, pitch: 1.5 })
        ],
        actor: [
            lunge(0, 0.12, 150),
            lunge(0.35, 0.8, -90, { flash: flash(0.35, 0.8, 'brightness(80%) blur(2px)') })
        ],
        vfx: [
            spawn(0.1, 'slashAnimation', { life: 0.2, scale: 1.4, move: 'swipe_diagonal_alt' }),
            spawn(0.3, 'smokeAnimation', { at: 'source', life: 0.6, scale: 1.4, blend: 'normal' })
        ],
        target: { shake: shake(0.1, 0.3, 22), flash: flash(0.1, 0.2, 'brightness(220%)') }
    }),
    "howl": anim(2, {
        audio: [sfx(0.05, 'wolfCry', { volume: 1, pitch: 1 })],
        actor: wobble(0.05, 0.6, 10, { flash: flash(0, 0.6, 'brightness(150%) sepia(100%) hue-rotate(340deg) saturate(400%)') }),
        vfx: [],
        target: { shake: shake(0.4, 0.8, 12), flash: flash(0.4, 1.4, 'brightness(160%) sepia(100%) hue-rotate(340deg) saturate(400%) drop-shadow(0 0 12px red)') }
    }),
    // Charge (0 to 0.7s), beam stream, impact at `hit`.
    "hyper_beam": anim(2.8, {
        hit: 1.05,
        audio: [
            sfx(0, 'arcaneDartSfx', { volume: 1.2, pitch: 0.5 }),
            sfx(0.7, 'shockSfx', { volume: 1.1, pitch: 0.5 }),
            sfx('hit', 'earthquake1Sfx', { volume: 1.1, pitch: 0.6 })
        ],
        background: background(0, 2, 'arcaneVortexBg'),
        actor: wobble(0, 0.7, 10, { flash: flash(0, 1.3, tint('violet', { bright: 250, sat: 400, glow: 'violet', glowSize: 15 })) }),
        vfx: [
            spawn(0.2, 'arcaneDartAnimation', { at: 'source', life: 0.6, frames: 4, scale: 2.4, move: 'static' }),
            ...stream(0.7, 18, 0.025, 'flamethrowerAnimation', { life: 0.35, scale: 2.4, jitter: 10, filter: tint('violet', { bright: 220, sat: 500 }) }),
            spawn('hit', 'impactAnimation', { life: 0.7, scale: 4.5, filter: tint('violet') }),
            burst('hit', { count: 24, color: '#b080ff', scale: 1.6, minSpeed: 200, maxSpeed: 520 })
        ],
        target: {
            shake: shake('hit', 'hit+0.85', 60),
            flash: flash('hit', 'hit+0.85', tint('violet', { bright: 350, sat: 500, glow: 'violet', glowSize: 20 }))
        }
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
    "item_bear_trap": anim(1.3, {
        audio: [
            sfx(0.1, 'strikeSfx', { volume: 0.9, pitch: 0.5 }),
            sfx(0.4, 'strikeSfx', { volume: 1, pitch: 0.4 })
        ],
        actor: wobble(0, 0.35, 6),
        vfx: [
            spawn(0.15, 'boundAnimation', { life: 0.9, scale: 1.2, move: 'static', blend: 'normal' }),
            spawn(0.4, 'impactAnimation', { life: 0.3, scale: 1, filter: 'brightness(120%) sepia(60%)' }),
            burst(0.4, { count: 8, color: '#d9d2c3', scale: 0.8, minSpeed: 120, maxSpeed: 300, gravity: 500 })
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
    "item_smoke_bomb": anim(1.8, {
        audio: [
            sfx(0.05, 'strikeSfx', { volume: 0.5, pitch: 1.6 }),
            sfx(0.3, 'smokeSfx', { volume: 1, pitch: 0.8 })
        ],
        actor: lunge(0, 0.12, -12),
        vfx: [
            travel(0.05, 'particles', { life: 0.25, scale: 0.7, blend: 'normal', move: 'arc', arc: -90 }),
            spawn(0.3, 'smokeAnimation', { life: 1, scale: 2.8, blend: 'normal' }),
            spawn(0.45, 'smokeAnimation', { life: 1, scale: 2.2, move: 'float_up_and_pop', blend: 'normal' })
        ],
        target: { flash: flash(0.35, 1.7, 'brightness(55%) grayscale(50%) blur(1px)') }
    }),
    "item_throw_net": anim(1.6, {
        hit: 0.4,
        audio: [
            sfx(0.05, 'vineLashSfx', { volume: 0.8, pitch: 0.8 }),
            sfx('hit', 'strikeSfx', { volume: 0.8, pitch: 0.6 })
        ],
        actor: lunge(0, 0.15, -20),
        vfx: [
            travel(0.1, 'boundAnimation', { life: 0.3, scale: 1.6, blend: 'normal', move: 'arc', arc: -45, spin: 5 }),
            spawn('hit', 'boundAnimation', { life: 1, scale: 2, move: 'static', blend: 'normal' })
        ],
        target: {
            shake: shake('hit', 'hit+0.3', 14),
            flash: flash('hit', 'hit+1', 'brightness(80%) sepia(60%) saturate(120%)')
        }
    }),
    // Throw Dagger: the throwing knife's own icon (consumables sheet, cell 7,0: it points down-right, so facing 45) flies straight at the target, buries itself in it, and
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
            travel(0.12, 'consumables', { cell: [7, 0], size: 64, life: 0.28, hold: 1.3, scale: 0.6, blend: 'source-over', aim: true, facing: 45, fadeOut: false }),
            travel(0.15, 'consumables', { cell: [7, 0], size: 64, life: 0.28, scale: 0.6, blend: 'source-over', aim: true, facing: 45, fadeOut: false, alpha: 0.25 }),
            burst('hit', { count: 7, color: '#e8e8f0', scale: 0.3, minSpeed: 60, maxSpeed: 180, gravity: 320, minLife: 0.25, maxLife: 0.5, glow: false })
        ],
        target: { shake: shake('hit', 'hit+0.2', 14), flash: flash('hit', 'hit+0.12', 'brightness(190%)') }
    }),
    // Throw Poison Dagger: the same throw with the coated knife (cell 8,0). It sticks, drips poison for a while, and the target is shaded sickly green.
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
            travel(0.12, 'consumables', { cell: [8, 0], size: 64, life: 0.28, hold: 1.7, scale: 0.6, blend: 'source-over', aim: true, facing: 45, fadeOut: false }),
            travel(0.15, 'consumables', { cell: [8, 0], size: 64, life: 0.28, scale: 0.6, blend: 'source-over', aim: true, facing: 45, fadeOut: false, alpha: 0.25 }),
            spawn('hit+0.05', 'poisonAnimation', { life: 0.8, scale: 0.7, move: 'expand_and_fade', blend: 'multiply' }),
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
    // The arrow is the ability's own icon, turned to fly along its path (the icon art points down-right = facing 45).
    // Arrows (loose_arrow, quick_draw, poisoned_arrow, triple_shot) fly for a visible moment and then STAY in the target for about a second (travel `hold`),
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
            travel(0.1, 'looseArrowAnimation', { life: 0.45, hold: 1.4, scale: 1.0, blend: 'source-over', aim: true, facing: 45, fadeOut: false }),
            spawn('hit', 'looseArrowImpactAnimation', { life: 0.5, frames: 4, scale: 1.1, blend: 'source-over' })
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
    "minor_channel": anim(1.4, {
        audio: [sfx(0.1, 'purifySfx', { volume: 0.7, pitch: 1.4 })],
        vfx: [
            spawn(0.1, 'particles', { life: 0.7, scale: 0.9, move: 'float_up_and_pop', filter: tint('blue') }),
            burst(0.15, { count: 6, color: '#6ab4ff', scale: 0.9, minSpeed: 40, maxSpeed: 120, gravity: -160 })
        ],
        target: { flash: flash(0.1, 0.8, 'brightness(135%) sepia(60%) hue-rotate(195deg) saturate(160%)') }
    }),
    "minor_heal": anim(1.4, {
        audio: [sfx(0.1, 'healSfx', { volume: 0.7, pitch: 1.3 })],
        vfx: [
            spawn(0.1, 'particles', { life: 0.7, scale: 0.9, move: 'float_up_and_pop', filter: tint('green') }),
            burst(0.15, { count: 6, color: '#7dff9a', scale: 0.9, minSpeed: 40, maxSpeed: 120, gravity: -160 })
        ],
        target: { flash: flash(0.1, 0.8, 'brightness(135%) sepia(60%) hue-rotate(95deg) saturate(160%)') }
    }),
    "minor_recover": anim(1.4, {
        audio: [sfx(0.1, 'restSfx', { volume: 0.7, pitch: 1.4 })],
        vfx: [
            spawn(0.1, 'particles', { life: 0.7, scale: 0.9, move: 'float_up_and_pop', filter: tint('gold') }),
            burst(0.15, { count: 6, color: '#ffd24a', scale: 0.9, minSpeed: 40, maxSpeed: 120, gravity: -160 })
        ],
        target: { flash: flash(0.1, 0.8, 'brightness(135%) sepia(60%) hue-rotate(40deg) saturate(160%)') }
    }),
    "moderate_channel": anim(1.9, {
        audio: [sfx(0.1, 'purifySfx', { volume: 1, pitch: 0.9 })],
        vfx: [
            spawn(0.1, 'purifyAnimation', { life: 0.9, scale: 1.4, move: 'float_up_and_pop', filter: tint('blue', { bright: 130, sat: 200 }) }),
            spawn(0.3, 'particles', { life: 0.8, scale: 1.1, move: 'float_up_and_pop', filter: tint('blue') }),
            spawn(0.5, 'particles', { life: 0.8, scale: 1.4, filter: tint('blue') }),
            burst(0.3, { count: 14, color: '#6ab4ff', scale: 1.1, minSpeed: 60, maxSpeed: 180, gravity: -200 })
        ],
        target: { flash: flash(0.1, 1.4, 'brightness(160%) sepia(60%) hue-rotate(195deg) saturate(200%) drop-shadow(0 0 8px dodgerblue)') }
    }),
    "moderate_heal": anim(1.9, {
        audio: [sfx(0.1, 'healSfx', { volume: 1, pitch: 1 })],
        vfx: [
            spawn(0.1, 'purifyAnimation', { life: 0.9, scale: 1.4, move: 'float_up_and_pop', filter: tint('green', { bright: 130, sat: 200 }) }),
            spawn(0.3, 'particles', { life: 0.8, scale: 1.1, move: 'float_up_and_pop', filter: tint('green') }),
            spawn(0.5, 'particles', { life: 0.8, scale: 1.4, filter: tint('green') }),
            burst(0.3, { count: 14, color: '#7dff9a', scale: 1.1, minSpeed: 60, maxSpeed: 180, gravity: -200 })
        ],
        target: { flash: flash(0.1, 1.4, 'brightness(160%) sepia(60%) hue-rotate(95deg) saturate(200%) drop-shadow(0 0 8px limegreen)') }
    }),
    "moderate_recover": anim(1.9, {
        audio: [sfx(0.1, 'restSfx', { volume: 1, pitch: 1 })],
        vfx: [
            spawn(0.1, 'purifyAnimation', { life: 0.9, scale: 1.4, move: 'float_up_and_pop', filter: tint('gold', { bright: 130, sat: 200 }) }),
            spawn(0.3, 'particles', { life: 0.8, scale: 1.1, move: 'float_up_and_pop', filter: tint('gold') }),
            spawn(0.5, 'particles', { life: 0.8, scale: 1.4, filter: tint('gold') }),
            burst(0.3, { count: 14, color: '#ffd24a', scale: 1.1, minSpeed: 60, maxSpeed: 180, gravity: -200 })
        ],
        target: { flash: flash(0.1, 1.4, 'brightness(160%) sepia(60%) hue-rotate(40deg) saturate(200%) drop-shadow(0 0 8px gold)') }
    }),
    "osmose": anim(2, {
        audio: [
            sfx(0.1, 'arcaneDartSfx', { volume: 0.7, pitch: 0.6 }),
            sfx(0.9, 'spiritReapSfx', { volume: 0.5, pitch: 1.4 })
        ],
        actor: { flash: flash(0.9, 1.6, 'brightness(150%) sepia(100%) hue-rotate(200deg) saturate(300%)') },
        vfx: [
            spawn(0.1, 'particles', { life: 0.8, scale: 1.3, move: 'float_up_and_pop', filter: tint('blue') }),
            spawn(0.4, 'particles', { life: 0.8, scale: 0.9, move: 'shrink_and_fade', filter: tint('blue') }),
            burst(0.2, { count: 12, color: '#3a7ad8', scale: 1, minSpeed: 60, maxSpeed: 200, gravity: -60 }),
            spawn(0.9, 'particles', { at: 'source', life: 0.8, scale: 1.2, move: 'float_up_and_pop', filter: tint('blue') })
        ],
        target: {
            shake: shake(0.1, 0.9, 8),
            flash: flash(0.1, 1, 'brightness(70%) sepia(100%) hue-rotate(200deg) saturate(250%)')
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
            spawn(0.1, 'particles', { life: 0.2, move: 'static', scale: 1.2 }),
            spawn(0.5, 'particles', { life: 0.2, move: 'static', scale: 0.8 })
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
            travel(0.1, 'poisonedArrowAnimation', { life: 0.5, hold: 1.8, scale: 1.0, blend: 'source-over', aim: true, facing: 45, fadeOut: false }),
            spawn('hit', 'poisonedArrowImpactAnimation', { life: 0.5, frames: 4, scale: 1.1, blend: 'source-over' }),
            spawn('hit+0.1', 'poisonAnimation', { life: 1.2, move: 'expand_and_fade', scale: 1.5, blend: 'multiply' }),
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
    "purify": anim(2, {
        audio: [sfx(0.1, 'healSfx', { volume: 1, pitch: 1.2 })],
        actor: { flash: flash(0, 0.3, 'brightness(180%) sepia(50%) hue-rotate(180deg) saturate(200%)') },
        vfx: [
            spawn(0.2, 'purifyAnimation', { life: 1, move: 'float_up_and_pop', scale: 1.5 }),
            spawn(0.4, 'particles', { life: 0.8, move: 'expand_and_fade', scale: 1.2 })
        ],
        target: { flash: flash(0.2, 1.2, 'brightness(200%) sepia(30%) hue-rotate(180deg) saturate(150%) drop-shadow(0 0 10px white)') }
    }),
    // Rapid shot: a fast arrow (the ability's icon already carries its speed lines) trailed by two faint copies.
    "quick_draw": anim(1.8, (() => { const arrow = { life: 0.3, hold: 1.2, scale: 1.0, blend: 'source-over', aim: true, facing: 45, fadeOut: false }; return {
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
            spawn('hit', 'quickDrawImpactAnimation', { life: 0.4, frames: 4, scale: 1.0, blend: 'source-over' })
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
    "raise_skeleton": anim(2.6, {
        audio: [
            sfx(0.1, 'darkMagicSFX', { volume: 1, pitch: 0.9 }),
            sfx(0.5, 'earthquake2Sfx', { volume: 0.9, pitch: 0.5 }),
            sfx(1.2, 'crunchSfx', { volume: 0.8, pitch: 0.6 })
        ],
        background: background(0.1, 2, 'voidBackground', 'brightness(45%) sepia(100%) hue-rotate(110deg) saturate(250%)'),
        actor: wobble(0.1, 1, 8, { flash: flash(0.1, 1.4, 'brightness(70%) sepia(100%) hue-rotate(250deg) saturate(300%)') }),
        vfx: [
            spawn(0.4, 'earthquakeAnimation', { life: 1.4, scale: 2.4, move: 'static', blend: 'multiply' }),
            spawn(0.8, 'spiritReapAnimation', { life: 1.4, scale: 2.2, move: 'float_up_and_pop' }),
            burst(1.1, { count: 14, color: '#e8e2cc', scale: 1.2, minSpeed: 120, maxSpeed: 320, gravity: 700, blend: 'source-over' }),
            spawn(1.1, 'particles', { life: 1, scale: 1.6, move: 'float_up_and_pop', filter: tint('green') })
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
    "rest": anim(2.6, {
        audio: [sfx(0.1, 'restSfx', { volume: 1 })],
        vfx: [
            spawn(0.2, 'particles', { life: 1, scale: 0.7, offsetX: -20, move: 'float_up_and_pop' }),
            spawn(0.7, 'particles', { life: 1, scale: 0.9, offsetX: 10, move: 'float_up_and_pop' }),
            spawn(1.2, 'particles', { life: 1, scale: 1.1, offsetX: 30, move: 'float_up_and_pop' }),
            spawn(0.3, 'purifyAnimation', { life: 1.6, scale: 1, move: 'static', filter: 'hue-rotate(40deg)' }),
            burst(0.5, { count: 8, color: '#fff2b0', scale: 0.8, minSpeed: 20, maxSpeed: 70, gravity: -50 })
        ],
        target: { flash: flash(0.1, 2, 'brightness(120%) sepia(40%) saturate(120%)') }
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
    // Gather light (0 to 0.7s), beam stream, impact at `hit`.
    "solar_beam": anim(2.6, {
        hit: 1,
        audio: [
            sfx(0, 'spiteCastSfx', { volume: 1, pitch: 0.8 }),
            sfx(0.7, 'fireballCastSfx', { volume: 1.2, pitch: 0.7 })
        ],
        actor: wobble(0, 0.7, 8, { flash: flash(0, 1.2, tint('gold', { bright: 260, sat: 400, glow: 'gold', glowSize: 15 })) }),
        vfx: [
            spawn(0.1, 'spiteAnimation', { at: 'source', life: 0.6, scale: 2.4, move: 'shrink_and_fade' }),
            ...stream(0.7, 16, 0.025, 'flamethrowerAnimation', { life: 0.3, scale: 2.2, jitter: 8, filter: tint('gold', { bright: 260, sat: 300 }) }),
            spawn('hit', 'spiteAnimation', { life: 0.8, scale: 4 }),
            burst('hit', { count: 20, color: '#ffe680', scale: 1.4, minSpeed: 180, maxSpeed: 440 })
        ],
        target: {
            shake: shake('hit', 'hit+0.8', 40),
            flash: flash('hit', 'hit+0.8', tint('gold', { bright: 350, sat: 300, glow: 'gold', glowSize: 20 }))
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
    "switch_combatant": anim(0.8, {
        audio: [sfx(0.05, 'smokeSfx', { volume: 0.5, pitch: 1.6 })],
        actor: { flash: flash(0, 0.4, 'brightness(150%) blur(2px)') },
        vfx: [spawn(0.05, 'smokeAnimation', { at: 'source', life: 0.5, scale: 1 })]
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
            spawn(0.3, 'particles', { life: 0.9, scale: 1.2, move: 'float_up_and_pop' }),
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
    // One volley: the icon shows three arrows side by side, so three arrows fly together and three punctures land a beat apart.
    "triple_shot": anim(2.4, {
        seconds: true,
        hit: 0.55,
        audio: [
            sfx(0.05, 'bowReleaseSfx', { volume: 0.9, pitch: 1.1 }),
            sfx('hit', 'arrowImpactSfx', { volume: 0.9 }),
            sfx('hit+0.1', 'arrowImpactSfx', { volume: 0.8, pitch: 1.1 }),
            sfx('hit+0.2', 'arrowImpactSfx', { volume: 0.8, pitch: 0.95 })
        ],
        actor: lunge(0, 0.2, -10),
        vfx: [
            travel(0.1, 'tripleShotAnimation', { life: 0.45, hold: 1.6, scale: 1.0, blend: 'source-over', aim: true, facing: 45, fadeOut: false }),
            spawn('hit', 'tripleShotImpactAnimation', { life: 0.6, frames: 4, scale: 1.1, blend: 'source-over' }),
            burst('hit', { count: 5, color: '#ff9a3c', scale: 0.7, minSpeed: 120, maxSpeed: 260 }),
            burst('hit+0.1', { count: 4, color: '#ffd27a', scale: 0.6, minSpeed: 100, maxSpeed: 220 })
        ],
        target: [
            { shake: shake('hit', 'hit+0.15', 14), flash: flash('hit', 'hit+0.1', 'brightness(170%)') },
            { shake: shake('hit+0.1', 'hit+0.25', 14), flash: flash('hit+0.1', 'hit+0.2', 'brightness(170%)') },
            { shake: shake('hit+0.2', 'hit+0.4', 14), flash: flash('hit+0.2', 'hit+0.3', 'brightness(170%)') }
        ]
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