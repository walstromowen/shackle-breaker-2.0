import { UITheme } from '../../ui/UITheme.js';

export class BattleCombatantRenderer {
    constructor(ctx, config, loader, ui) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = ui;

        // --- VISUAL CONFIG ---
        this.SPRITE_SCALE = 1;   
        this.FRAME_SIZE = 128;

        // --- LAYOUT CONFIGURATION ---
        this.LAYOUT = {
            PLAYER: [
                { x: 0.30, y: 0.55 }, // Lead: Raised up higher on the screen
                { x: 0.45, y: 0.65 }, // Slot 3 (Right)
                { x: 0.15, y: 0.65 }, // Slot 2 (Left)
            ],
            ENEMY: [
                { x: 0.70, y: 0.45 }, // Lead: Lowered further down toward the midline
                { x: 0.55, y: 0.35 }, // Slot 3 (Left)
                { x: 0.85, y: 0.35 }, // Slot 2 (Right)
            ]
        };
    }

    isEntityVisible(entity, state) {
        if (!entity) return false;
        if (entity.hp > 0) return true;
        
        return state.turnQueue.some(
            turn => turn.type === 'DEATH_MESSAGE' && turn.message.includes(entity.name)
        );
    }

    getEntityPosition(entity, state) {
        let isPlayer = true;
        let index = state.activeParty ? state.activeParty.indexOf(entity) : -1;
        
        if (index === -1) {
            index = state.activeEnemies ? state.activeEnemies.indexOf(entity) : -1;
            isPlayer = false;
        }
        if (index === -1) return null;
        
        const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
        if (!layout) return null;

        return {
            x: Math.floor(layout.x * this.config.CANVAS_WIDTH),
            y: Math.floor(layout.y * this.config.CANVAS_HEIGHT)
        };
    }

    drawShadow(x, y, size) {
        this.ctx.save();
        // Semi-transparent black for the shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
        this.ctx.beginPath();
        
        // Calculate the shadow's dimensions based on the sprite size
        const shadowWidth = size * 0.35; 
        const shadowHeight = size * 0.1; // Squashed to look isometric/perspective
        
        // Offset Y slightly so the shadow rests at the "feet" of the sprite 
        const shadowY = y + (size * 0.45);

        // Draw an ellipse (x, y, radiusX, radiusY, rotation, startAngle, endAngle)
        this.ctx.ellipse(x, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a slight blur to soften the edges 
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.fill(); 

        this.ctx.restore();
    }

    drawGroup(entities, isPlayer, state) {
        if (!entities) return;

        const anim = state.activeAnimation;
        const progress = anim && state.timer ? Math.min(state.timer / anim.duration, 1) : 0;

        let renderables = entities.map((entity, index) => {
            if (!this.isEntityVisible(entity, state) || index >= 3) return null;
            
            const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
            if (!layout) return null;

            let x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            let y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);
            const size = Math.floor(this.FRAME_SIZE * this.SPRITE_SCALE);
            let filter = 'none';

            if (anim && typeof anim.getTransform === 'function') {
                const transform = anim.getTransform(entity, progress, isPlayer);
                x += transform.xOffset || 0;
                y += transform.yOffset || 0;
                filter = transform.filter || 'none';
            }

            return { entity, x, y, size, filter };
        }).filter(item => item !== null);

        // Draw furthest back first (pseudo-depth sorting)
        renderables.sort((a, b) => a.y - b.y);

        renderables.forEach(item => {
            const { entity, x, y, size, filter } = item;
            const assetKey = entity.spritePortrait || entity.spriteOverworld;
            const img = this.loader.get ? this.loader.get(assetKey) : this.loader.getAsset(assetKey);

            this.drawShadow(x, y, size);

            this.ctx.save();

            if (filter !== 'none') {
                this.ctx.filter = filter;
            }

            if (img) {
                const srcY = isPlayer ? this.FRAME_SIZE : 0;
                this.ui.drawSprite(img, 0, srcY, this.FRAME_SIZE, this.FRAME_SIZE, x - size/2, y - size/2, size, size);
            } else {
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp;
                this.ui.drawRect(x - size/2, y - size/2, size, size, color, true);
            }
            
            this.ctx.restore();
        });
    }
}