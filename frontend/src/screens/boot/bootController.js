import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';

// The boot screen is the loading screen (ui/loadingScreen.js): it stays up at least this long (seconds) so its piece of lore can be read, even
// when everything has already downloaded behind the login screen.
const BOOT_MIN_SHOWN = 1.4;

export class BootController extends BaseController {
    constructor(input, assetLoader) {
        super(input);
        this.loader = assetLoader;
        this.hasTransitioned = false;
    }

    update(dt) {
        this.shown = (this.shown || 0) + dt;
        // Check if the loader has finished all downloads (and the loading screen has been up long enough to read its lore)
        if (this.loader.isDone() && !this.hasTransitioned && this.shown >= BOOT_MIN_SHOWN) {
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