export class AssetLoader {
    constructor() {
        this.assets = {};
        this.totalToLoad = 0;
        this.loadedCount = 0;
        this.failed = [];   // urls that could not be loaded (see loadImage / loadAudio)
        
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
                // One missing file must not freeze the boot screen at 99% for everyone (the loader only finishes when EVERY asset has been counted).
                // The game gets a visible "missing texture" tile instead, and the url is listed in the console and in this.failed.
                console.warn(`[AssetLoader] Failed to load image at: ${url} (using a placeholder)`);
                this.failed.push(url);
                this.assets[key] = this._placeholderImage();
                this.loadedCount++;
                resolve(this.assets[key]);
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
            console.warn(`[AssetLoader] Failed to load audio at: ${url} (playing silence instead)`, error);
            this.failed.push(url);
            this.assets[key] = this.audioCtx.createBuffer(1, 1, 22050);   // a silent one-sample buffer
            this.loadedCount++;
            return this.assets[key];
        }
    }

    /** A magenta / black checker, drawn in place of an image that did not load. */
    _placeholderImage() {
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const g = c.getContext('2d');
        g.fillStyle = '#000000'; g.fillRect(0, 0, 32, 32);
        g.fillStyle = '#ff00ff'; g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16);
        return c;
    }

    get(key) {
        return this.assets[key];
    }

    getProgress() {
        if (this.totalToLoad === 0) return 0;
        return this.loadedCount / this.totalToLoad;
    }

    isDone() {
        return this.totalToLoad > 0 && this.loadedCount === this.totalToLoad;
    }
}