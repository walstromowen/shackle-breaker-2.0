export const BattleAnimationDefinitions = {
    "slash": {
        duration: 1.5, 
        audio: [{ start: 0.067, key: 'swordSlashSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.133, distance: 50 },
        vfx: [
            {
                start: 0.1,
                type: 'spawn',
                origin: 'target',
                config: {
                    life: 0.2, 
                    sheetKey: 'battleProjectiles', // Kept as battleProjectiles
                    frame: { col: 0, row: 0 },
                    frameSize: 32,
                    movement: 'swipe_diagonal',
                    scale: 1.5,
                    rotation: 15,
                    blendMode: 'screen'
                }
            }
        ],
        target: {
            shake: { start: 0.1, end: 0.233, intensity: 10 },
            flash: { start: 0.1, end: 0.167, filter: 'brightness(250%)' }
        }
    },
    "strike": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'strikeSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 40 },
        vfx: [
            {
                start: 0.133,
                type: 'spawn',
                origin: 'target',
                config: {
                    life: 0.3,
                    sheetKey: 'battleProjectiles', // Kept as battleProjectiles
                    frame: { col: 0, row: 0 },
                    frameSize: 32,
                    movement: 'expand_and_fade',
                    scale: 1.2,
                    blendMode: 'screen'
                }
            }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 12 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "stab": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'spearStabSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 40 },
        vfx: [
            {
                start: 0.133,
                type: 'spawn',
                origin: 'target',
                config: {
                    life: 0.2,
                    sheetKey: 'battleProjectiles', // Kept as battleProjectiles
                    frame: { col: 0, row: 0 },
                    frameSize: 32,
                    movement: 'expand_and_fade',
                    scale: 1.0,
                    blendMode: 'screen'
                }
            }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 12 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "bite": {
        duration: 1.5,
        audio: [{ start: 0.133, key: 'crunchSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 40 },
        vfx: [
            {
                start: 0.133,
                type: 'spawn',
                origin: 'target',
                config: {
                    life: 0.4,
                    sheetKey: 'battleProjectiles', // Kept as battleProjectiles
                    frame: { col: 0, row: 0 },
                    frameSize: 32,
                    movement: 'expand_and_fade',
                    scale: 1.3,
                    blendMode: 'multiply'
                }
            }
        ],
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 12 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "magic_missile": {
        duration: 1.5,
        audio: [{ start: 0.0, key: 'magicCast1SFX' }, { start: 0.533, key: 'arcaneDartSFX' }],
        actor: {
            flash: { start: 0.0, end: 0.2, filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' }
        },
        vfx: [
            { 
                start: 0.2,
                type: 'travel',
                origin: 'source',
                config: {
                    life: 0.4, 
                    sheetKey: 'battleProjectiles', // Kept as battleProjectiles
                    frame: { col: 1, row: 1 },
                    frameSize: 32,
                    arc: -60,
                    rotation: 'auto',
                    scale: 1.0,
                    blendMode: 'screen' 
                }
            }
        ],
        target: {
            shake: { start: 0.4, end: 0.6, intensity: 10 },
            flash: { start: 0.4, end: 0.533, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
        }
    },
    "poison": {
        duration: 2.0,
        audio: [
            { start: 0.1, key: 'bubbleSFX', volume: 0.6, pitch: 1.2 },
        ],
        vfx: [
            // CHANGED to 'particles'
            { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'particles', frame: { col: 2, row: 1 }, frameSize: 32, movement: 'float_up_and_pop', scale: 1.2 } },
            { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'particles', frame: { col: 2, row: 1 }, frameSize: 32, movement: 'float_up_and_pop', scale: 1.5 } },
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'particles', frame: { col: 2, row: 1 }, frameSize: 32, movement: 'float_up_and_pop', scale: 0.9 } }
        ],
        target: {
            flash: { start: 0.0, end: 0.75, filter: 'brightness(110%) saturate(160%) hue-rotate(100deg)' }
        }
    },
    "earthquake": {
        duration: 4.0, 
        audio: [
            { start: 0.063, key: 'earthquake1SFX', volume: 1.0 }, 
            { start: 0.125, key: 'earthquake2SFX', volume: 1.0 },    
            { start: 0.2, key: 'earthquake3SFX', volume: 1.0 },    
        ],
        vfx: [
            // CHANGED to 'particles'
            { start: 0.3, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, arc: 300, rotation: 45, scale: 1.2 } },
            { start: 0.375, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, arc: -250, rotation: 120, scale: 1.5 } },
            { start: 0.45, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, arc: 350, rotation: -45, scale: 1.0 } }
        ],
        target: {
            shake: { start: 0.125, end: 0.875, intensity: 25 },
            flash: { start: 0.2, end: 0.8, filter: 'sepia(80%) brightness(60%) saturate(120%)' }
        }
    },
    "melee_lunge": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'swordSlashSFX', pitch: 1.1 },
            { start: 0.133, key: 'swordSlashSFX', volume: 1.0 }
        ],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 40 },
        target: {
            shake: { start: 0.133, end: 0.333, intensity: 12 },
            flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "default_attack": {
        duration: 0.5,
        audio: [{ start: 0.2, key: 'SFX_BLUNT_HIT' }],
        target: {
            flash: { start: 0.2, end: 0.6, filter: 'brightness(200%)' }
        }
    },
    "weatherRain": {
        duration: 2.5, 
        audio: [
            { start: 0.04, key: 'weatherRainShort', volume: 0.8 } 
        ],
        background: { 
            start: 0.0, 
            end: 1.0, 
            key: 'current',
            filter: 'brightness(50%) saturate(60%) sepia(20%) hue-rotate(200deg)' 
        },
        vfx: [
            // CHANGED to 'particles'
            { start: 0.04, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.5, blendMode: 'screen' } },
            { start: 0.08, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.6, blendMode: 'screen' } },
            { start: 0.12, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.4, blendMode: 'screen' } },
            { start: 0.24, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.7, blendMode: 'screen' } },
            { start: 0.28, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.5, blendMode: 'screen' } },
            { start: 0.32, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.8, blendMode: 'screen' } },
            { start: 0.44, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.6, blendMode: 'screen' } },
            { start: 0.52, type: 'travel', origin: 'source', config: { life: 0.5, sheetKey: 'particles', frame: { col: 0, row: 1 }, frameSize: 32, movement: 'linear', arc: 0, rotation: 15, scale: 0.5, blendMode: 'screen' } }
        ],
        target: {
            flash: { start: 0.08, end: 0.88, filter: 'brightness(80%) saturate(70%) sepia(30%) hue-rotate(180deg)' }
        }
    },
    "faint": {
        duration: 2.0, 
        audio: [
            { start: 0.0, key: 'faintDropSFX', volume: 0.8 }, 
            { start: 0.1, key: 'windFaintSFX', volume: 1.0 } 
        ],
        actor: { 
            type: 'shake', 
            start: 0.0, 
            end: 0.75, 
            intensity: 8,
            fade: { start: 0.1, end: 0.9 },
            flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' }
        },
        vfx: [
            // CHANGED to 'particles'
            { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'swipe_diagonal', scale: 0.6, blendMode: 'screen' } },
            { start: 0.25, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'float_up_and_pop', scale: 1.2, blendMode: 'screen' } },
            { start: 0.3, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'swipe_diagonal', scale: 0.8, blendMode: 'screen' } },
            { start: 0.4, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'expand_and_fade', scale: 0.4, blendMode: 'screen' } },
            { start: 0.5, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'swipe_diagonal', scale: 1.0, blendMode: 'screen' } }
        ],
        target: {
            flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' }
        }
    },
    "abyssal_void": {
        duration: 3.0,
        audio: [{ start: 0.033, key: 'darkMagicSFX', volume: 1.0 }],
        background: { 
            start: 0.067, 
            end: 0.933, 
            key: 'voidBackground', 
            filter: 'brightness(80%) sepia(50%) hue-rotate(250deg)' 
        },
        actor: {
            flash: { start: 0.067, end: 0.933, filter: 'brightness(150%) hue-rotate(250deg)' }
        },
        target: {
            shake: { start: 0.333, end: 0.833, intensity: 15 },
            flash: { start: 0.333, end: 0.833, filter: 'invert(100%)' }
        }
    },
    "enter_battle": {
        duration: 1.5,
        audio: [
            { start: 0.1, key: 'summonSFX', volume: 0.8 },
            { start: 0.4, key: 'landSFX', volume: 0.6 }
        ],
        actor: { 
            // We'll add 'slide_in' and 'fadeIn' to the model below!
            type: 'slide_in', 
            start: 0.0, 
            end: 0.5, 
            distance: -100, // Start 100 pixels to the left/right and slide to 0
            fadeIn: { start: 0.0, end: 0.4 },
            flash: { start: 0.4, end: 0.7, filter: 'brightness(200%)' }
        },
        vfx: [
            // A puff of smoke or magical energy when they arrive
            { 
                start: 0.3, 
                type: 'spawn', 
                origin: 'source', // source is the entering actor here
                config: { 
                    life: 0.6, 
                    sheetKey: 'particles', 
                    frame: { col: 1, row: 0 }, // Adjust to your smoke/portal sprite
                    frameSize: 32, 
                    movement: 'expand_and_fade', 
                    scale: 2.0, 
                    blendMode: 'screen' 
                } 
            }
        ]
    },
    "flee": {
        duration: 1.0,
        audio: [
            { start: 0.0, key: 'runAwaySFX', volume: 1.0 }
        ],
        actor: { 
            type: 'slide_out', 
            start: 0.0, 
            end: 0.6, 
            distance: 150, // Distance to run away before disappearing
            fade: { start: 0.2, end: 0.6 } // Re-using your existing fade out!
        }
    },
};