export class AssetLoader {
    constructor() {
        this.assets = {};
        this.totalToLoad = 0;
        this.loadedCount = 0;
    }

    async loadAll(manifest) {
        const keys = Object.keys(manifest);
        this.totalToLoad = keys.length;
        this.loadedCount = 0;

        const promises = keys.map(key => this.loadImage(key, manifest[key]));

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

    get(key) {
        return this.assets[key];
    }

    isDone() {
        return this.totalToLoad > 0 && this.loadedCount === this.totalToLoad;
    }
}