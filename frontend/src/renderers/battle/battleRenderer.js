import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class BattleRenderer {
    constructor(ctx, config, loader) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        
        this.ui = new CanvasUI(ctx);

        // --- VISUAL CONFIG ---
        this.SPRITE_SCALE = 2;   // 128px native -> 256px rendered
        this.FRAME_SIZE = 128;   
        
        // --- LAYOUT CONFIGURATION ---
        // Ally shifted LEFT, Enemy shifted RIGHT
        // Values adjusted to keep large sprites on-screen
        this.LAYOUT = {
            PLAYER: [
                // Front: Pulled back from the center (0.45 -> 0.38)
                { x: 0.38, y: 0.62 }, 
                // Mid: Shifted left (0.30 -> 0.24)
                { x: 0.24, y: 0.54 }, 
                // Back: Pushed to the far left edge (0.16 -> 0.10)
                { x: 0.10, y: 0.46 }  
            ],
            ENEMY: [
                // Front: Pulled back from the center (0.55 -> 0.62)
                { x: 0.62, y: 0.25 }, 
                // Mid: Shifted right (0.68 -> 0.76)
                { x: 0.76, y: 0.33 }, 
                // Back: Pushed to the far right edge (0.82 -> 0.90)
                { x: 0.90, y: 0.41 }  
            ]
        };
    }

    render(state) {
        if (!state) return;
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = this.config;

        this.ctx.imageSmoothingEnabled = false;

        // 1. Solid Background
        this.ctx.fillStyle = "#212121"; 
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Draw Units
        this.drawGroup(state.enemies, false);
        this.drawGroup(state.party, true);

        // 3. Dialogue Box
        if (state.message) {
            this.drawDialogueBox(state.message);
        }
    }

    drawGroup(entities, isPlayer) {
        if (!entities) return;

        let renderables = entities.map((entity, index) => {
            if (entity.hp <= 0 || index >= 3) return null;
            
            const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
            if (!layout) return null;

            const x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            const y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);

            return { entity, x, y, size };
        }).filter(item => item !== null);

        // Depth sorting
        renderables.sort((a, b) => a.y - b.y);

        renderables.forEach(item => {
            const { entity, x, y, size } = item;
            const assetKey = entity.spritePortrait || entity.spriteOverworld;
            const img = this.loader.get ? this.loader.get(assetKey) : this.loader.getAsset(assetKey);

            if (img) {
                // Enemy = Row 0 (Portrait), Ally = Row 1 (Battle View)
                const srcY = isPlayer ? this.FRAME_SIZE : 0;

                this.ui.drawSprite(
                    img, 
                    0, srcY, this.FRAME_SIZE, this.FRAME_SIZE, 
                    x - size/2, y - size/2,                   
                    size, size                                
                );
            } else {
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp;
                this.ui.drawRect(x - size/2, y - size/2, size, size, color, true);
            }
        });
    }

    drawDialogueBox(text) {
        const w = this.config.CANVAS_WIDTH;
        const h = 80; 
        const x = 0;
        const y = this.config.CANVAS_HEIGHT - h;

        this.ui.drawPanel(x, y, w, h);
        this.ui.drawWrappedText(
            text, 
            x + 20, 
            y + 15, 
            w - 40,             
            20,                 
            UITheme.fonts.body, 
            UITheme.colors.textMain
        );
    }
}