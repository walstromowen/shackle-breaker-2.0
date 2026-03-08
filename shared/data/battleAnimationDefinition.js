export const BattleAnimationDefinitions = {
    "slash": {
        duration: 1.5,
        audio: [
            { start: 0.2, key: 'swordSlashSFX', volume: 1.0 }
        ],
        actor: {
            type: 'lunge',
            start: 0.0,
            end: 0.3,
            distance: 40
        },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { 
                start: 0.2, 
                end: 0.4, 
                filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' 
            }
        }
    },
     "strike": {
        duration: 1.5,
        audio: [
            { start: 0.2, key: 'strikeSFX', volume: 1.0 }
        ],
        actor: {
            type: 'lunge',
            start: 0.0,
            end: 0.3,
            distance: 40
        },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { 
                start: 0.2, 
                end: 0.4, 
                filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' 
            }
        }
    },
     "stab": {
        duration: 1.5,
        audio: [
            { start: 0.2, key: 'spearStabSFX', volume: 1.0 }
        ],
        actor: {
            type: 'lunge',
            start: 0.0,
            end: 0.3,
            distance: 40
        },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { 
                start: 0.2, 
                end: 0.4, 
                filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' 
            }
        }
    },
    "bite": {
        duration: 1.5,
        audio: [
            { start: 0.2, key: 'crunchSFX', volume: 1.0 }
        ],
        actor: {
            type: 'lunge',
            start: 0.0,
            end: 0.3,
            distance: 40
        },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { 
                start: 0.2, 
                end: 0.4, 
                filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' 
            }
        }
    },
    "magic_missile": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'magicCast1SFX' },
            { start: 0.8, key: 'arcaneDartSFX' } 
        ],
        actor: {
            flash: { 
                start: 0.0, 
                end: 0.3, 
                filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' 
            }
        },
        projectiles: [
            { start: 0.3, end: 0.7, arc: -60, color: '#85c1e9', size: 4 },
        ],
        target: {
            shake: { start: 0.6, end: 0.9, intensity: 10 },
            flash: { start: 0.6, end: 0.8, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
        }
    },
    
    
    
    
    "heavy_spell": {
        duration: 5, 
        // NEW: Audio timeline
        audio: [
            { start: 0.0, key: 'swordSlashSFX', volume: 0.8 }, 
            { start: 0.48, key: 'swordSlashSFX', pitch: 0.8 }, // Lunges
            { start: 0.56, key: 'swordSlashSFX', volume: 1.2 } // Target shake hits
        ],
        actor: {
            type: 'lunge',
            start: 0.48, 
            end: 0.60,   
            distance: 25,
            flash: {
                start: 0.0,
                end: 0.48, 
                filter: 'brightness(150%) saturate(200%) hue-rotate(270deg)' 
            }
        },
        target: {
            shake: { 
                start: 0.56, 
                end: 0.84,   
                intensity: 18 
            },
            flash: { 
                start: 0.56, 
                end: 0.72,   
                filter: 'brightness(300%) invert(20%) hue-rotate(270deg) saturate(400%)' 
            }
        }
    },
    "melee_lunge": {
        duration: 1.5,
        audio: [
            { start: 0.0, key: 'swordSlashSFX', pitch: 1.1 },
            { start: 0.2, key: 'swordSlashSFX', volume: 1.0 }
        ],
        actor: {
            type: 'lunge',
            start: 0.0,
            end: 0.3,
            distance: 40
        },
        target: {
            shake: { start: 0.2, end: 0.5, intensity: 12 },
            flash: { 
                start: 0.2, 
                end: 0.4, 
                filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' 
            }
        }
    },
    "default_attack": {
        duration: 0.5,
        audio: [
            { start: 0.1, key: 'SFX_BLUNT_HIT' }
        ],
        target: {
            flash: { start: 0.1, end: 0.3, filter: 'brightness(200%)' }
        }
    }
};