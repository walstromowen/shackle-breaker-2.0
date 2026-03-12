export const BattleAnimationDefinitions = {
    "slash": {
        duration: 1.0, 
        audio: [{ start: 0.1, key: 'swordSlashSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 50 },
        projectiles: [
            {
                start: 0.15, end: 0.35,
                type: 'overlay',
                sheetKey: 'battleProjectiles', 
                frame: { col: 0, row: 0 },
                frameSize: 32,
                movement: 'swipe_diagonal',
                scale: 1.5,
                rotation: 15,
                blendMode: 'screen'
            }
        ],
        target: {
            shake: { start: 0.15, end: 0.35, intensity: 10 },
            flash: { start: 0.15, end: 0.25, filter: 'brightness(250%)' }
        }
    },
    "strike": {
        duration: 1.5,
        audio: [{ start: 0.2, key: 'strikeSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.3, distance: 40 },
        projectiles: [
            {
                start: 0.2, end: 0.5,
                type: 'overlay',
                sheetKey: 'battleProjectiles',
                frame: { col: 0, row: 0 },
                frameSize: 32,
                movement: 'expand_and_fade',
                scale: 1.2,
                blendMode: 'screen'
            }
        ],
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { start: 0.2, end: 0.4, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "stab": {
        duration: 1.5,
        audio: [{ start: 0.2, key: 'spearStabSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.3, distance: 40 },
        projectiles: [
            {
                start: 0.2, end: 0.4,
                type: 'swipe_diagonal',
                sheetKey: 'battleProjectiles',
                frame: { col: 0, row: 0 },
                frameSize: 32,
                movement: 'expand_and_fade',
                scale: 1.0,
                blendMode: 'screen'
            }
        ],
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { start: 0.2, end: 0.4, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "bite": {
        duration: 1.5,
        audio: [{ start: 0.2, key: 'crunchSFX', volume: 1.0 }],
        actor: { type: 'lunge', start: 0.0, end: 0.3, distance: 40 },
        projectiles: [
            {
                start: 0.2, end: 0.6,
                type: 'overlay',
                sheetKey: 'battleProjectiles',
                frame: { col: 0, row: 0 },
                frameSize: 32,
                movement: 'expand_and_fade',
                scale: 1.3,
                blendMode: 'multiply'
            }
        ],
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { start: 0.2, end: 0.4, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "magic_missile": {
        duration: 1.5,
        audio: [{ start: 0.0, key: 'magicCast1SFX' }, { start: 0.8, key: 'arcaneDartSFX' }],
        actor: {
            flash: { start: 0.0, end: 0.3, filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' }
        },
        projectiles: [
            { 
                start: 0.3, end: 0.7, 
                type: 'travel', 
                sheetKey: 'battleProjectiles',
                frame: { col: 1, row: 1 },
                frameSize: 32,
                arc: -60,
                rotation: 'auto',
                scale: 1.0,
                blendMode: 'screen' 
            }
        ],
        target: {
            shake: { start: 0.6, end: 0.9, intensity: 10 },
            flash: { start: 0.6, end: 0.8, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
        }
    },
    "poison": {
        duration: 2.0,
        audio: [
            { start: 0.2, key: 'bubbleSFX', volume: 0.6, pitch: 1.2 },
            
        ],
        projectiles: [
            { start: 0.1, end: 0.5, type: 'overlay', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'float_up_and_pop', scale: 1.2 },
            { start: 0.2, end: 0.6, type: 'overlay', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'float_up_and_pop', scale: 1.5 },
            { start: 0.3, end: 0.7, type: 'overlay', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, movement: 'float_up_and_pop', scale: 0.9 }
        ],
        target: {
            flash: { start: 0.0, end: 1.5, filter: 'brightness(110%) saturate(160%) hue-rotate(100deg)' }
        }
    },
    "earthquake": {
        duration: 4.0, 
        audio: [
            { start: 2.0, key: 'earthquake1SFX', volume: 1.0 },    
            
        ],
        projectiles: [
            { start: 1.2, end: 2.0, type: 'travel', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, arc: 300, rotation: 45, scale: 1.2 },
            { start: 1.5, end: 2.3, type: 'travel', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, arc: -250, rotation: 120, scale: 1.5 },
            { start: 1.8, end: 2.6, type: 'travel', sheetKey: 'battleProjectiles', frame: { col: 0, row: 0 }, frameSize: 32, arc: 350, rotation: -45, scale: 1.0 }
        ],
        target: {
            shake: { start: 0.5, end: 3.5, intensity: 25 },
            flash: { start: 0.8, end: 3.2, filter: 'sepia(80%) brightness(60%) saturate(120%)' }
        }
    },
    "melee_lunge": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'swordSlashSFX', pitch: 1.1 },
            { start: 0.2, key: 'swordSlashSFX', volume: 1.0 }
        ],
        actor: { type: 'lunge', start: 0.0, end: 0.3, distance: 40 },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { start: 0.2, end: 0.4, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
        }
    },
    "default_attack": {
        duration: 0.5,
        audio: [{ start: 0.1, key: 'SFX_BLUNT_HIT' }],
        target: {
            flash: { start: 0.1, end: 0.3, filter: 'brightness(200%)' }
        }
    }
};