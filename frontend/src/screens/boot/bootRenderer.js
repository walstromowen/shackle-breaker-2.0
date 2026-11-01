import { drawLoadingScreen, pickSplash } from '../../ui/loadingScreen.js';

// The boot screen, while the game's pictures and sounds download: the same loading screen as building the world (ui/loadingScreen.js), with a
// piece of the world's lore chosen once per launch.
export class BootRenderer {
    constructor(canvas, loader = null) {
        this.canvas = canvas;
        this.loader = loader;
        this.splash = pickSplash();
        this.startedAt = null;
    }

    render(ctx, state) {
        const now = performance.now();
        if (this.startedAt === null) this.startedAt = now;
        drawLoadingScreen(ctx, {
            W: this.canvas.width, H: this.canvas.height,
            alpha: 1,
            progress: Math.max(0, Math.min(1, state.progress || 0)),
            label: 'Waking the world',
            splash: this.splash,
            loader: this.loader,
            shown: (now - this.startedAt) / 1000,
        });
    }
}
