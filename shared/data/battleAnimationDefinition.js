export const BattleAnimationDefinitions = {
    "heavy_spell": {
        duration: 5, // Total animation time remains 2.5 seconds
        actor: {
            type: 'lunge',
            start: 0.48, // Lunges forward at 48% completion (about 1.2 seconds in)
            end: 0.60,   // Finishes lunge at 60% completion (1.5 seconds)
            distance: 25,
            flash: {
                start: 0.0,
                end: 0.48, // Glows while charging, stops glowing right as they lunge
                filter: 'brightness(150%) saturate(200%) hue-rotate(270deg)' 
            }
        },
        target: {
            shake: { 
                start: 0.56, // Shake hits exactly at the peak of the lunge (1.4 seconds)
                end: 0.84,   // Shakes until 84% completion (2.1 seconds)
                intensity: 18 
            },
            flash: { 
                start: 0.56, 
                end: 0.72,   // Flashes for slightly shorter than the shake
                filter: 'brightness(300%) invert(20%) hue-rotate(270deg) saturate(400%)' 
            }
        }
    },
    "melee_lunge": {
        duration: 1.5,
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
        actor: {
            flash: { 
                start: 0.0, 
                end: 0.3, // Glows while casting
                filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' 
            }
        },
        projectiles: [
            // Staggered launches. Arc is negative because Canvas Y=0 is at the top.
            { start: 0.2, end: 0.6, arc: -40, color: '#3498db', size: 6 },
            { start: 0.3, end: 0.7, arc: -60, color: '#85c1e9', size: 4 },
            { start: 0.4, end: 0.8, arc: -20, color: '#2980b9', size: 8 }
        ],
        target: {
            shake: { start: 0.6, end: 0.9, intensity: 10 },
            flash: { start: 0.6, end: 0.8, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
        }
    },
    "default_attack": {
        duration: 0.5,
        target: {
            flash: { start: 0.1, end: 0.3, filter: 'brightness(200%)' }
        }
    }
};