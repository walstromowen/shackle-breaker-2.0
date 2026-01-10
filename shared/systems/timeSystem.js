export class TimeSystem {
    constructor() {
        // --- CONFIGURATION ---
        // 10 = 10 game minutes per real second
        this.GAME_MINUTES_PER_REAL_SEC = 1; 
        
        // Start at 17:00 (5:00 PM) to see the Golden Hour begin
        this.time = 19 * 60; 
        this.MAX_TIME = 24 * 60; 

        // --- COLOR PALETTE ---
        this.palette = {
            // NIGHT: Pitch Black
            NIGHT:   { r: 15,  g: 15,  b: 20,  a: 1.0 }, 
            
            // DAWN: Foggy grey/purple
            DAWN:    { r: 80,  g: 70,  b: 90,  a: 0.50 }, 
            
            // DAY: Crystal Clear
            DAY:     { r: 255, g: 255, b: 255, a: 0.00 }, 
            
            // GOLDEN HOUR: Bright, luminous yellow-orange. 
            // High RGB values (255) ensure we don't darken the map too much.
            GOLDEN:  { r: 255, g: 190, b: 60,  a: 0.05 },

            // DUSK: The "Red Sky" moment. Darker, deeper orange.
            DUSK:    { r: 200, g: 80,  b: 40,  a: 0.05 }  
        };

        this.keyframes = [
            { time: 0,   color: this.palette.NIGHT }, 
            { time: 5,   color: this.palette.NIGHT }, 
            
            // Dawn (6 AM - 9 AM)
            { time: 6,   color: this.palette.DAWN  }, 
            { time: 9,   color: this.palette.DAY   }, 

            // Sunset Sequence
            { time: 16,    color: this.palette.DAY    }, // 4:00 PM: Still bright
            { time: 17.5,  color: this.palette.GOLDEN }, // 5:30 PM: Golden Hour (Illuminating)
            { time: 18.5,  color: this.palette.DUSK   }, // 6:30 PM: Deep Sunset (Red/Darker)
            { time: 20,    color: this.palette.NIGHT  }, // 8:00 PM: Total Darkness
            
            { time: 24,  color: this.palette.NIGHT }  
        ];
    }

    update(dt) {
        this.time += dt * this.GAME_MINUTES_PER_REAL_SEC;
        if (this.time >= this.MAX_TIME) {
            this.time -= this.MAX_TIME;
        }
    }

    getCurrentColorData() {
        const hour = this.time / 60;

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
        const h = Math.floor(this.time / 60);
        const m = Math.floor(this.time % 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const mStr = m < 10 ? `0${m}` : m;
        return `${h12}:${mStr} ${ampm}`;
    }

    lerp(start, end, t) {
        return start + (end - start) * t;
    }
}