import { UITheme } from '../../ui/UITheme.js';

export class BattleCombatantRenderer {
    constructor(ctx, config, loader, ui, vfxRenderer) {
        this.ctx = ctx;
        this.config = config;
        this.loader = loader;
        this.ui = ui;
        this.vfxRenderer = vfxRenderer;

        // --- VISUAL CONFIG ---
        this.SPRITE_SCALE = 2.0;
        this.FRAME_SIZE = 128;
        this.FRAMES_PER_ROW = 32;
        this.ANIMATION_SPEED = 100;

        // --- LAYOUT CONFIGURATION ---
        this.LAYOUT = {
            PLAYER: [
                { x: 0.30, y: 0.55 },
                { x: 0.45, y: 0.65 },
                { x: 0.15, y: 0.65 },
            ],
            ENEMY: [
                { x: 0.70, y: 0.45 },
                { x: 0.55, y: 0.35 },
                { x: 0.85, y: 0.35 },
            ]
        };
    }

    isEntityVisible(entity, state) {
        if (!entity) return false;
        const anim = state.activeAnimation;

        // Safely read both .id and .animationId property conventions
        const animId = anim ? (anim.id || anim.animationId) : null;

        // --- MODIFIED: Check if the entity is the actor OR a target of the animation ---
        const isParticipant = anim && (anim.actor === entity || (anim.targets && anim.targets.includes(entity)));

        if (isParticipant) {
            if (animId === 'retreat' || animId === 'flee') {
                entity._visuallyRetreated = true;
            } else if (animId === 'enter_battle') {
                entity._visuallyRetreated = false;
            }
        }

        // If they are marked as retreated, permanently hide them UNLESS they
        // are actively playing a transition animation (like fading out/in).
        if (entity._visuallyRetreated) {
            const isTransitioning = isParticipant && (animId === 'retreat' || animId === 'flee' || animId === 'enter_battle');
            if (!isTransitioning) return false;
        }

        // Fallback logic: If they logically haven't entered the battle yet
        if (entity.hasEnteredBattle === false) {
            const isEnteringRightNow = anim && animId === 'enter_battle' && anim.actor === entity;
            if (!isEnteringRightNow) return false;
        }

        // Standard visibility (Alive)
        if (entity.hp > 0) return true;

        // Special case visibility for dead entities (e.g., currently acting or about to faint)
        if (anim) {
            if (anim.actor === entity) return true;
            if (anim.targets && anim.targets.includes(entity)) return true;
        }

        const isFaintQueued = state.turnQueue && state.turnQueue.some(
            turn => turn.type === 'ANIMATION' && turn.actor === entity
        );

        if (isFaintQueued) return true;

        return false;
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
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        const shadowWidth = size * 0.35;
        const shadowHeight = size * 0.1;
        const shadowY = y + (size * 0.45);
        this.ctx.ellipse(x, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.restore();
    }

    drawGroup(entities, isPlayer, state, hitboxes = []) {
        if (!entities) return;

        const anim = state.activeAnimation;
        const progress = (anim && state.timer !== undefined && anim.duration) ? Math.min(state.timer / anim.duration, 1.0) : 0;
        const activeChar = state.activeParty?.[state.activePartyIndex];
        const selectedAbility = state.selectedAction || (activeChar?.abilities?.[state.menuIndex]);
        const targetGroup = selectedAbility?.targetGroup || state.targetGroup;

        let renderables = entities.map((entity, index) => {
            if (!this.isEntityVisible(entity, state) || index >= 3) return null;

            const layout = isPlayer ? this.LAYOUT.PLAYER[index] : this.LAYOUT.ENEMY[index];
            if (!layout) return null;

            let x = Math.floor(layout.x * this.config.CANVAS_WIDTH);
            let y = Math.floor(layout.y * this.config.CANVAS_HEIGHT);

            // --- SUPPORT FOR CUSTOM SPRITE SIZES ---
            const frameSize = entity.frameSize || this.FRAME_SIZE;
            const size = Math.floor(frameSize * this.SPRITE_SCALE);

            let filter = 'none';
            let alpha = 1.0;

            if (anim && typeof anim.getTransform === 'function') {
                // --- MODIFIED: Intercept the transform request ---
                const animId = anim.id || anim.animationId;
                const isFleeing = (animId === 'retreat' || animId === 'flee') && (anim.actor === entity || (anim.targets && anim.targets.includes(entity)));

                // If the party is fleeing, force EVERY fleeing entity to borrow the ACTOR'S transformation
                const targetForTransform = isFleeing ? anim.actor : entity;
                const transform = anim.getTransform(targetForTransform, progress, isPlayer);
                // -------------------------------------------------

                x += transform.xOffset || 0;
                y += transform.yOffset || 0;
                filter = transform.filter || 'none';
                alpha = transform.alpha !== undefined ? transform.alpha : 1.0;
            }

            // Return frameSize so it can be passed to the drawing loop
            return { entity, x, y, size, filter, alpha, index, frameSize };
        }).filter(item => item !== null);

        renderables.sort((a, b) => a.y - b.y);

        renderables.forEach(item => {
            // Extract the dynamic frameSize here
            const { entity, x, y, size, filter, index, frameSize } = item;
            let { alpha } = item;

            // --- TARGET VALIDATION & LOCKS ---
            let isValidTarget = true;
            if (state.phase === 'SELECT_TARGET') {
                if (targetGroup === 'enemy' && isPlayer) isValidTarget = false;
                if (targetGroup === 'party' && !isPlayer) isValidTarget = false;
                if (targetGroup === 'self' && entity !== activeChar) isValidTarget = false;
            }

            const isAlreadySelected = state.selectedTargets?.includes(entity);

            // Dim invalid targets, but spare them if they are already locked-in
            if (!isValidTarget && !isAlreadySelected && state.phase === 'SELECT_TARGET') {
                alpha *= 0.4;
            }

            // --- INJECT HITBOX FOR TARGETING ---
            const targetId = isPlayer ? `TARGET_PARTY_${index}` : `TARGET_ENEMY_${index}`;
            if (state.phase === 'SELECT_TARGET') {
                hitboxes.push({
                    id: targetId,
                    x: x - size / 2,
                    y: y - size / 2,
                    w: size,
                    h: size,
                    width: size,
                    height: size,
                    cursor: isValidTarget ? 'pointer' : 'not-allowed'
                });
            }

            const assetKey = entity.spritePortrait || entity.spriteOverworld;
            const img = this.loader.get ? this.loader.get(assetKey) : this.loader.getAsset(assetKey);

            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            // Shadows naturally scale with our dynamically calculated 'size'
            this.drawShadow(x, y, size);

            if (filter !== 'none') {
                this.ctx.filter = filter;
            }

            if (img) {
                // Determine sheet constraints safely without assuming a 32-frame horizontal strip
                const framesPerRow = entity.framesPerRow || this.FRAMES_PER_ROW;
                const maxFrames = isPlayer 
                    ? (entity.battlePortraitFramesBack || framesPerRow) 
                    : (entity.battlePortraitFramesFront || framesPerRow);

                // Replace performance.now() with state.time or state.globalTime if you have it!
                const now = performance.now();

                // 1. Lazily generate a random frame offset for this specific entity instance
                if (entity.battleAnimOffset === undefined) {
                    const randomStartFrame = Math.floor(Math.random() * maxFrames);
                    entity.battleAnimOffset = randomStartFrame * this.ANIMATION_SPEED;
                }

                // 2. Use the entity's unique offset instead of the layout index
                const currentFrame = Math.floor((now + entity.battleAnimOffset) / this.ANIMATION_SPEED) % maxFrames;
                
                // 3. Modulo the currentFrame by framesPerRow to wrap properly on non-32 width sheets
                const srcX = (currentFrame % framesPerRow) * frameSize;
                
                // 4. Safely calculate the row depending on entity layout overrides
                const rowIndex = entity.customRowIndex !== undefined 
                    ? entity.customRowIndex 
                    : (isPlayer ? 1 : 0);
                const srcY = rowIndex * frameSize;

                this.ui.drawSprite(
                    img,
                    srcX, srcY,
                    frameSize, frameSize,
                    x - size / 2, y - size / 2,
                    size, size
                );
            } else {
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp;
                this.ui.drawRect(x - size / 2, y - size / 2, size, size, color, true);
            }
            this.ctx.restore();
        });
    }
}