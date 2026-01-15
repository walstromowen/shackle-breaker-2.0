// 1. Import the source of truth
import { gameState } from '../state/gameState.js'; 

export class TimeSystem {
    constructor() {
        // --- CONFIGURATION (Static, doesn't need saving) ---
        this.GAME_MINUTES_PER_REAL_SEC = 10; 
        this.MAX_TIME = 24 * 60; 

        // 2. SYNC ON LOAD
        // If the state is 0 (New Game), set the default starting time (8:00).
        // If we loaded a save file, this line skips, preserving the saved time.
        if (gameState.world.time === 0) {
            gameState.world.time = 8 * 60; 
        }

        // --- COLOR PALETTE ---
        this.palette = {
            NIGHT:   { r: 15,  g: 15,  b: 20,  a: 1.0 }, 
            DAWN:    { r: 80,  g: 70,  b: 90,  a: 0.50 }, 
            DAY:     { r: 255, g: 255, b: 255, a: 0.00 }, 
            GOLDEN:  { r: 255, g: 190, b: 60,  a: 0.05 },
            DUSK:    { r: 200, g: 80,  b: 40,  a: 0.05 }  
        };

        this.keyframes = [
            { time: 0,   color: this.palette.NIGHT }, 
            { time: 5,   color: this.palette.NIGHT }, 
            { time: 6,   color: this.palette.DAWN  }, 
            { time: 9,   color: this.palette.DAY   }, 
            { time: 16,    color: this.palette.DAY    }, 
            { time: 17.5,  color: this.palette.GOLDEN }, 
            { time: 18.5,  color: this.palette.DUSK   }, 
            { time: 20,    color: this.palette.NIGHT  }, 
            { time: 24,  color: this.palette.NIGHT }  
        ];
    }

    update(dt) {
        gameState.world.time += dt * this.GAME_MINUTES_PER_REAL_SEC;
        
        // If we pass 24 hours (1440 minutes)
        if (gameState.world.time >= this.MAX_TIME) {
            gameState.world.time -= this.MAX_TIME;
            
            // Increment the Day Counter
            gameState.world.day++; 
            console.log(`🌞 A new day dawns. Day ${gameState.world.day}`);
        }
    }

    getCurrentColorData() {
        // 4. READ FROM STATE
        const hour = gameState.world.time / 60;

        let startFrame = this.keyframes[0];
        let endFrame = this.keyframes[this.keyframes.length - 1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (hour >= this.keyframes[i].time && hour < this.keyframes[i + 1].time) {
                startFrame = this.keyframes[i];
                endFrame = this.keyframes[i + 1];
                break;
            }
        }

        const duration = endFrame.time - startFrame.time;
        const progress = (hour - startFrame.time) / duration;

        return {
            r: Math.floor(this.lerp(startFrame.color.r, endFrame.color.r, progress)),
            g: Math.floor(this.lerp(startFrame.color.g, endFrame.color.g, progress)),
            b: Math.floor(this.lerp(startFrame.color.b, endFrame.color.b, progress)),
            a: this.lerp(startFrame.color.a, endFrame.color.a, progress)
        };
    }

    getFormattedTime() {
        // 4. READ FROM STATE
        const h = Math.floor(gameState.world.time / 60);
        const m = Math.floor(gameState.world.time % 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const mStr = m < 10 ? `0${m}` : m;
        return `${h12}:${mStr} ${ampm}`;
    }

    lerp(start, end, t) {
        return start + (end - start) * t;
    }
}