import { BaseController } from '../core/baseController.js';
import { events } from '../../core/eventBus.js';

export class BootController extends BaseController {
    constructor(input, assetLoader) {
        super(input);
        this.loader = assetLoader;
        this.hasTransitioned = false;
    }

    update(dt) {
        // Check if the loader has finished all downloads
        if (this.loader.isDone() && !this.hasTransitioned) {
            this.hasTransitioned = true;
            
            // A tiny delay makes the 100% bar visible for a split second 
            // before snapping to the Title Screen. It feels much smoother.
            setTimeout(() => {
                events.emit('CHANGE_SCENE', { scene: 'title' });
            }, 250); 
        }
    }

    getState() {
        // Pass the loader's current progress (e.g., 0.0 to 1.0) to the renderer
        return {
            progress: this.loader.getProgress ? this.loader.getProgress() : 0 
        };
    }
}