export const BattleAnimationDefinitions = {
    "slash": {
        duration: 1.5,
        audio: [{ start: 0.067, key: 'slashSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.133, distance: 120 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'slashAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 1.8, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.233, intensity: 24 },
            flash: { start: 0.1, end: 0.167, filter: 'brightness(250%)' }
        }
    },
    "strike": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'strikeSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
        vfx: [
            { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'strikeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.44, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 29 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "stab": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'stabSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
        vfx: [
            { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'stabAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.2, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 29 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "bite": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'crunchSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
        vfx: [
            { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'biteAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.56, blendMode: 'multiply' } }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 29 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "arcane_dart": {
        duration: 1.5,
        audio: [{ start: 0.533, key: 'arcaneDartSfx' }],
        actor: { flash: { start: 0.0, end: 0.2, filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' } },
        background: { start: 0.0, end: 1.0, key: 'arcaneVortexBg' },
        vfx: [
            { start: 0.2, type: 'travel', origin: 'source', config: { life: 0.4, sheetKey: 'arcaneDartAnimation', frameCount: 4, frameSize: 64, scale: 2, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.4, end: 0.6, intensity: 24 },
            flash: { start: 0.4, end: 0.533, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
        }
    },
    "poison": {
        duration: 2.0,
        audio: [{ start: 0.1, key: 'poisonSfx', volume: 0.6, pitch: 1.2 }],
        vfx: [
            { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6 } },
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.75 } },
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.45 } }
        ],
        target: { flash: { start: 0.0, end: 0.75, filter: 'brightness(110%) saturate(160%) hue-rotate(100deg)' } }
    },
    "earthquake": {
        duration: 4.0,
        audio: [
            { start: 0.063, key: 'earthquake1Sfx', volume: 1.0 },
            { start: 0.125, key: 'earthquake2Sfx', volume: 1.0 },
            { start: 0.2, key: 'earthquake3Sfx', volume: 1.0 }
        ],
        vfx: [
            { start: 0.2, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.0 } },
            { start: 0.4, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.5 } },
            { start: 0.6, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.8 } }
        ],
        target: {
            shake: { start: 0.063, end: 3.6, intensity: 72 },
            flash: { start: 0.2, end: 0.8, filter: 'sepia(80%) brightness(60%) saturate(120%)' }
        }
    },
    "trait_activate": {
        duration: 1.2,
        target: {
            shake: { start: 0.0, end: 0.3, intensity: 10 },
            flash: { start: 0.0, end: 0.4, filter: 'brightness(250%) saturate(150%)' }
        }
    },
    "melee_lunge": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'slashSfx', pitch: 1.1 },
            { start: 0.133, key: 'slashSfx', volume: 1.0 }
        ],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 29 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "default_attack": {
        duration: 0.5,
        audio: [{ start: 0.2, key: 'strikeSfx' }],
        target: { flash: { start: 0.2, end: 0.6, filter: 'brightness(200%)' } }
    },
    "weatherRain": {
        duration: 2.5,
        audio: [{ start: 0.04, key: 'weatherRainShort', volume: 0.8 }],
        target: { flash: { start: 0.08, end: 0.88, filter: 'brightness(80%) saturate(70%) sepia(30%) hue-rotate(180deg)' } }
    },
    "faint": {
        duration: 2.0,
        actor: {
            type: 'shake', start: 0.0, end: 0.75, intensity: 19,
            fade: { start: 0.1, end: 0.9 },
            flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' }
        },
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.3, blendMode: 'screen' } },
            { start: 0.25, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6, blendMode: 'screen' } },
            { start: 0.3, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.4, blendMode: 'screen' } },
            { start: 0.4, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 0.2, blendMode: 'screen' } },
            { start: 0.5, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.5, blendMode: 'screen' } }
        ],
        target: { flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' } }
    },
    "enter_battle": {
        duration: 1.5,
        audio: [],
        actor: {
            type: 'slide_in', start: 0.0, end: 0.5, distance: 240,
            fadeIn: { start: 0.0, end: 0.4 },
            flash: { start: 0.4, end: 0.7, filter: 'brightness(200%)' }
        }
    },
    "flee": {
        duration: 1.5,
        audio: [{ start: 0.0, key: 'retreatSfx', volume: 1.0 }],
        actor: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } },
        target: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } }
    },
    "punch": {
        duration: 1.0,
        audio: [{ start: 0.1, key: 'punchSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 80 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.25, sheetKey: 'punchAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.3, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.25, intensity: 18 },
            flash: { start: 0.1, end: 0.2, filter: 'brightness(180%)' }
        }
    },
    "quick_stab": {
        duration: 0.8,
        audio: [{ start: 0.05, key: 'stabSfx', volume: 1.0, pitch: 1.3 }],
        actor: { type: 'lunge', start: 0.0, end: 0.1, distance: 100 },
        vfx: [
            { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.15, sheetKey: 'stabAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.0, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.05, end: 0.2, intensity: 15 },
            flash: { start: 0.05, end: 0.15, filter: 'brightness(200%)' }
        }
    },
    "uppercut": {
        duration: 1.4,
        audio: [{ start: 0.2, key: 'punchSfx', volume: 1.0, pitch: 0.8 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 90 },
        vfx: [
            { start: 0.2, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'uppercutAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 1.8, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.2, end: 0.6, intensity: 35 },
            flash: { start: 0.2, end: 0.4, filter: 'brightness(250%) sepia(50%) hue-rotate(330deg)' }
        }
    },
    "shield_bash": {
        duration: 1.3,
        audio: [{ start: 0.15, key: 'strikeSfx', volume: 1.0, pitch: 0.7 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 110 },
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'strikeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.2, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.15, end: 0.5, intensity: 40 },
            flash: { start: 0.15, end: 0.4, filter: 'brightness(150%) sepia(30%) saturate(50%)' }
        }
    },
    "execute": {
        duration: 2.0,
        audio: [{ start: 0.15, key: 'eviscerateSfx', volume: 1.0, pitch: 0.8 }],
        actor: {
            type: 'lunge', start: 0.0, end: 0.15, distance: 150,
            flash: { start: 0.0, end: 0.2, filter: 'brightness(50%) sepia(100%) hue-rotate(330deg) saturate(500%)' }
        },
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'eviscerateAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.5, blendMode: 'multiply' } }
        ],
        target: {
            shake: { start: 0.15, end: 0.7, intensity: 50 },
            flash: { start: 0.15, end: 0.8, filter: 'brightness(120%) sepia(100%) hue-rotate(330deg) saturate(400%) invert(20%)' }
        }
    },
    "cleave": {
        duration: 1.5,
        audio: [{ start: 0.08, key: 'cleaveSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 130 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'slashAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 2.6, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.35, intensity: 32 },
            flash: { start: 0.1, end: 0.25, filter: 'brightness(200%) sepia(30%)' }
        }
    },
    "acid_pool": {
        duration: 2.2,
        audio: [{ start: 0.05, key: 'acidPoolSfx', volume: 1.0 }],
        vfx: [
            { start: 0.0, type: 'spawn', origin: 'target', config: { life: 1.8, sheetKey: 'acidPoolAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 2.0, blendMode: 'normal' } },
            { start: 0.3, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'acidicSmogAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 1.2 } }
        ],
        target: {
            shake: { start: 0.1, end: 0.8, intensity: 8 },
            flash: { start: 0.05, end: 1.5, filter: 'hue-rotate(70deg) saturate(180%) brightness(110%)' }
        }
    },
    "fireball": {
        duration: 1.5,
        audio: [{ start: 0.0, key: 'fireballCastSfx', volume: 1.0 }],
        actor: { flash: { start: 0.0, end: 0.2, filter: 'brightness(250%) sepia(100%) hue-rotate(10deg)' } },
        vfx: [
            { start: 0.2, type: 'travel', origin: 'source', config: { life: 0.4, sheetKey: 'fireballAnimation', frameCount: 4, frameSize: 64, scale: 2.0, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.4, end: 0.6, intensity: 28 },
            flash: { start: 0.4, end: 0.6, filter: 'brightness(250%) sepia(100%) hue-rotate(350deg) saturate(500%)' }
        }
    },
    "ice_bolt": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'iceBoltCastSfx', volume: 1.0 },
            { start: 1.0, key: 'iceBoltImpactSfx', volume: 1.0 }
        ],
        actor: { flash: { start: 0.0, end: 0.2, filter: 'brightness(200%) sepia(100%) hue-rotate(190deg) saturate(300%)' } },
        vfx: [
            { start: 0.2, type: 'travel', origin: 'source', config: { life: 0.4, sheetKey: 'iceBoltAnimation', frameCount: 4, frameSize: 64, scale: 1.0, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.4, end: 0.6, intensity: 28 },
            flash: { start: 0.4, end: 0.6, filter: 'brightness(250%) sepia(100%) hue-rotate(190deg) saturate(500%)' }
        }
    },
    "reckless_charge": {
        duration: 1.6,
        audio: [{ start: 0.0, key: 'recklessChargeSfx', volume: 0.8, pitch: 1.0 }],
        actor: {
            type: 'lunge', start: 0.0, end: 0.12, distance: 160,
            flash: { start: 0.15, end: 0.45, filter: 'brightness(130%) sepia(100%) hue-rotate(330deg) saturate(400%)' }
        },
        vfx: [
            { start: 0.12, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'strikeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.4, blendMode: 'screen' } },
            { start: 0.15, type: 'spawn', origin: 'source', config: { life: 0.3, sheetKey: 'bleedAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.1, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.12, end: 0.55, intensity: 48 },
            flash: { start: 0.12, end: 0.32, filter: 'brightness(250%)' }
        }
    },
    "eviscerate": {
        duration: 1.5,
        audio: [
            { start: 0.1, key: 'slashSfx', volume: 1.0 },
            { start: 0.2, key: 'eviscerateSfx', volume: 1.0 }
        ],
        actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 140 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.35, sheetKey: 'eviscerateAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 2.2, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.5, intensity: 38 },
            flash: { start: 0.1, end: 0.6, filter: 'brightness(160%) sepia(100%) hue-rotate(330deg) saturate(500%)' }
        }
    },
    "spirit_reap": {
        duration: 3,
        audio: [{ start: 0.0, key: 'spiritReapSfx', volume: 1.0 }],
        actor: {
            type: 'lunge', start: 0.0, end: 0.15, distance: 80,
            flash: { start: 2.5, end: 3, filter: 'brightness(180%) saturate(200%) hue-rotate(120deg)' }
        },
        vfx: [
            { start: 0.12, type: 'spawn', origin: 'target', config: { life: 2.5, sheetKey: 'spiritReapAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.5, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.12, end: 3, intensity: 25 },
            flash: { start: 0.12, end: 3, filter: 'brightness(130%) sepia(60%) hue-rotate(270deg) saturate(80%)' }
        }
    },
    "shock": {
        duration: 2.5, 
        audio: [
            { start: 0.1, key: 'shockSfx', volume: 1.0 }
        ],
        actor: {
            // Caster maintains the glow while channeling the stream
            flash: { start: 0.0, end: 0.35, filter: 'brightness(200%) drop-shadow(0 0 5px yellow) drop-shadow(0 0 10px cyan)' }
        },
        vfx: [
            // Scale reduced to 1.2. 
            // Spawn rate increased to every 0.005s to perfectly stitch the smaller sprites together.
            { start: 0.150, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.155, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.160, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.165, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.170, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            
            { start: 0.175, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.180, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.185, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.190, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.195, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            
            { start: 0.200, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.205, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.210, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.215, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.220, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },

            { start: 0.225, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.230, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.235, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.240, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } },
            { start: 0.245, type: 'travel', origin: 'source', config: { life: 0.2, sheetKey: 'shockAnimation', frameCount: 4, frameSize: 64, scale: 1.2, blendMode: 'screen', filter: 'brightness(200%) sepia(60%) hue-rotate(180deg) saturate(300%) drop-shadow(0 0 8px yellow)' } }
        ],
        target: {
            // Impact synced to the new tighter cluster (0.35s to 0.445s)
            shake: { start: 0.32, end: 0.8, intensity: 45 },
            flash: { start: 0.32, end: 0.7, filter: 'brightness(300%) drop-shadow(0 0 10px yellow) drop-shadow(0 0 15px cyan)' }
        }
    },
    "claw": {
        duration: 1.2,
        audio: [{ start: 0.1, key: 'clawSfx', volume: 1.0, pitch: 1.1 }],
        actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 100 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'clawAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 1.6, blendMode: 'normal' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.3, intensity: 22 },
            flash: { start: 0.1, end: 0.3, filter: 'brightness(150%) sepia(100%) hue-rotate(330deg) saturate(300%)' }
        }
    },
    "fire_punch": {
        duration: 1.5,
        audio: [{ start: 0.15, key: 'firePunchSfx', volume: 1.0 }],
        actor: {
            type: 'lunge', start: 0.0, end: 0.2, distance: 110,
            flash: { start: 0.0, end: 0.2, filter: 'brightness(150%) sepia(100%) hue-rotate(15deg) saturate(400%)' }
        },
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'firePunchAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.0, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.15, end: 0.5, intensity: 35 },
            flash: { start: 0.15, end: 0.5, filter: 'brightness(200%) sepia(100%) hue-rotate(15deg) saturate(400%)' }
        }
    },
    "quick_shock": { // Renamed from "shock" so it doesn't overwrite your primary ability
        duration: 1.0,
        audio: [{ start: 0.05, key: 'shockZapSfx', volume: 1.0, pitch: 1.4 }],
        actor: { flash: { start: 0.0, end: 0.15, filter: 'brightness(180%) sepia(50%) hue-rotate(45deg) saturate(400%)' } },
        vfx: [
            { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.25, sheetKey: 'shockAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.4, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.05, end: 0.35, intensity: 18 },
            flash: { start: 0.05, end: 0.25, filter: 'brightness(250%) sepia(100%) hue-rotate(45deg) saturate(500%)' }
        }
    },
    "vine_lash": {
        duration: 1.4,
        audio: [{ start: 0.1, key: 'vineLashSfx', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 60 },
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.35, sheetKey: 'vineLashAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 1.8, blendMode: 'normal' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.4, intensity: 26 },
            flash: { start: 0.1, end: 0.35, filter: 'brightness(130%) sepia(80%) hue-rotate(90deg) saturate(250%)' }
        }
    },
    "abyssal_void": {
        duration: 3.0,
        audio: [{ start: 0.033, key: 'darkMagicSFX', volume: 1.0 }],
        background: { start: 0.067, end: 0.933, key: 'voidBackground', filter: 'brightness(80%) sepia(50%) hue-rotate(250deg)' },
        actor: { flash: { start: 0.067, end: 0.933, filter: 'brightness(150%) hue-rotate(250deg)' } },
        target: {
            shake: { start: 0.333, end: 0.833, intensity: 36 },
            flash: { start: 0.333, end: 0.833, filter: 'invert(100%)' }
        }
    },
    "bleed": {
        duration: 1.5,
        audio: [{ start: 0.1, key: 'slashSfx', volume: 0.6, pitch: 0.7 }],
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'bleedAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 0.8, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.3, intensity: 10 },
            flash: { start: 0.1, end: 0.6, filter: 'brightness(120%) sepia(100%) hue-rotate(330deg) saturate(400%)' }
        }
    },
    "burn": {
        duration: 2.0,
        audio: [{ start: 0.1, key: 'fireballCastSfx', volume: 0.5, pitch: 1.3 }],
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.6, sheetKey: 'burnAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.9, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.6, intensity: 8 },
            flash: { start: 0.05, end: 0.8, filter: 'brightness(180%) sepia(100%) hue-rotate(15deg) saturate(350%)' }
        }
    },
    "paralyzed": {
        duration: 1.5,
        audio: [
            { start: 0.1, key: 'paralyzedSfx', volume: 0.6, pitch: 1.8 },
            { start: 0.5, key: 'paralyzedSfx', volume: 0.4, pitch: 1.9 }
        ],
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.2, blendMode: 'screen' } },
            { start: 0.5, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'static', scale: 0.8, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.8, intensity: 12 },
            flash: { start: 0.1, end: 0.8, filter: 'brightness(250%) sepia(100%) hue-rotate(45deg) saturate(500%)' }
        }
    },
    "bound": {
        duration: 1.5,
        audio: [{ start: 0.1, key: 'strike', volume: 0.7, pitch: 0.5 }],
        vfx: [
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'boundAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.5, blendMode: 'multiply' } }
        ],
        target: {
            shake: { start: 0.1, end: 0.5, intensity: 4 },
            flash: { start: 0.1, end: 1.2, filter: 'brightness(70%) sepia(60%) hue-rotate(80deg) saturate(120%)' }
        }
    },
    "frozen": {
        duration: 2.0,
        audio: [{ start: 0.05, key: 'stabSfx', volume: 0.8, pitch: 2.0 }],
        vfx: [
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 1.5, sheetKey: 'frozenAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.8, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.05, end: 0.2, intensity: 10 },
            flash: { start: 0.05, end: 1.8, filter: 'brightness(140%) sepia(100%) hue-rotate(190deg) saturate(250%)' }
        }
    },
    "bolster": {
        duration: 1.2,
        audio: [{ start: 0.05, key: 'strikeSfx', volume: 1.0 }],
        actor: { flash: { start: 0.0, end: 0.2, filter: 'brightness(180%) saturate(150%)' } },
        vfx: [
            { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'shieldActivationAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.2, blendMode: 'screen' } }
        ],
        target: {
            shake: { start: 0.05, end: 0.2, intensity: 15 },
            flash: { start: 0.05, end: 1.0, filter: 'brightness(130%) sepia(100%) hue-rotate(190deg) saturate(300%)' }
        }
    }
};