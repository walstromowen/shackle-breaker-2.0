import { UITheme } from '../../ui/UITheme.js';
import { CanvasUI } from '../../ui/canvasUI.js';
import { events } from '../../core/eventBus.js';

export class BootRenderer {
    constructor(canvas) {
        this.canvas = canvas;
    }

    render(ctx, state) {
        // Clamp progress between 0 and 1
        const safeProgress = Math.max(0, Math.min(1, state.progress || 0));
        const percentage = Math.floor(safeProgress * 100);

        // 1. Draw Deep Gothic Background
        ctx.fillStyle = UITheme.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw Loading Header Text
        ctx.fillStyle = UITheme.colors.textMain; // Aged bone white
        ctx.font = UITheme.fonts.header;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Thematic flavor text instead of standard "Loading..."
        ctx.fillText('Loading Assets...', this.canvas.width / 2, this.canvas.height / 2 - 80);

        // 3. Draw Percentage Text
        ctx.fillStyle = UITheme.colors.textMuted; 
        ctx.font = UITheme.fonts.body;
        ctx.fillText(`Loading assets: ${percentage}%`, this.canvas.width / 2, this.canvas.height / 2 - 20);

        // 4. Bar Dimensions
        const barWidth = 500;
        const barHeight = 40;
        const x = this.canvas.width / 2 - barWidth / 2;
        const y = this.canvas.height / 2 + 20;

        // 5. Draw Progress Bar Empty Track (Dimmed Gold/Brown)
        ctx.fillStyle = UITheme.colors.xpDim; 
        ctx.fillRect(x, y, barWidth, barHeight);

        // 6. Draw Progress Bar Outline (Tarnished Gold)
        ctx.strokeStyle = UITheme.colors.borderHighlight;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // 7. Draw the Progress Bar Fill
        // We leave a 4px inner padding so the fill doesn't touch the stark gold border
        const padding = 4;
        const fillWidth = barWidth * safeProgress;
        
        if (fillWidth > padding * 2) {
            ctx.fillStyle = UITheme.colors.borderHighlight; // Tarnished Gold fill
            ctx.fillRect(
                x + padding, 
                y + padding, 
                fillWidth - (padding * 2), 
                barHeight - (padding * 2)
            );
        }
    }
}
