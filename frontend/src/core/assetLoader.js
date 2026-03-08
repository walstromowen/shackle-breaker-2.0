export class AssetLoader {
    constructor() {
        this.assets = {};
        this.totalToLoad = 0;
        this.loadedCount = 0;
        
        // Create an AudioContext specifically for decoding audio data during the load phase
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext(); 
    }

    async loadAll(manifest) {
        const keys = Object.keys(manifest);
        this.totalToLoad = keys.length;
        this.loadedCount = 0;

        // Route the loading logic based on file extension
        const promises = keys.map(key => {
            const url = manifest[key];
            if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) {
                return this.loadAudio(key, url);
            } else {
                return this.loadImage(key, url);
            }
        });

        return Promise.all(promises);
    }

    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;

            img.onload = () => {
                this.assets[key] = img;
                this.loadedCount++;
                resolve(img);
            };

            img.onerror = () => {
                reject(new Error(`Failed to load image at: ${url}`));
            };
        });
    }

    async loadAudio(key, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            
            // Decode the raw binary into a playable AudioBuffer
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            
            this.assets[key] = audioBuffer;
            this.loadedCount++;
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load audio at: ${url}`, error);
            throw error;
        }
    }

    get(key) {
        return this.assets[key];
    }

    isDone() {
        return this.totalToLoad > 0 && this.loadedCount === this.totalToLoad;
    }
}