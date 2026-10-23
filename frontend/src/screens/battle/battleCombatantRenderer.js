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
        this.FRAMES_PER_ROW = 16; // 16 frames per row (spans 2 rows for 32 total frames)
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
        const animId = anim ? (anim.id || anim.animationId) : null; 
        const isParticipant = anim && (anim.actor === entity || (anim.targets && anim.targets.includes(entity))); 
        
        if (isParticipant) { 
            if (animId === 'retreat' || animId === 'flee') { 
                entity._visuallyRetreated = true; 
            } else if (animId === 'enter_battle') { 
                entity._visuallyRetreated = false; 
            } 
        } 
        
        if (entity._visuallyRetreated) { 
            const isTransitioning = isParticipant && (animId === 'retreat' || animId === 'flee' || animId === 'enter_battle'); 
            if (!isTransitioning) return false; 
        } 
        
        if (entity.hasEnteredBattle === false) { 
            const isEnteringRightNow = anim && animId === 'enter_battle' && anim.actor === entity; 
            if (!isEnteringRightNow) return false; 
        } 
        
        if (entity.hp > 0) return true; 
        
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
            
            const frameSize = entity.frameSize || this.FRAME_SIZE; 
            const size = Math.floor(frameSize * this.SPRITE_SCALE); 
            
            let filter = 'none'; 
            let alpha = 1.0; 
            
            if (anim && typeof anim.getTransform === 'function') { 
                const animId = anim.id || anim.animationId; 
                const isFleeing = (animId === 'retreat' || animId === 'flee') && (anim.actor === entity || (anim.targets && anim.targets.includes(entity))); 
                const targetForTransform = isFleeing ? anim.actor : entity; 
                const transform = anim.getTransform(targetForTransform, progress, isPlayer); 
                x += transform.xOffset || 0; 
                y += transform.yOffset || 0; 
                filter = transform.filter || 'none'; 
                alpha = transform.alpha !== undefined ? transform.alpha : 1.0; 
            } 
            
            return { entity, x, y, size, filter, alpha, index, frameSize }; 
        }).filter(item => item !== null); 
        
        renderables.sort((a, b) => a.y - b.y); 
        
        renderables.forEach(item => { 
            const { entity, x, y, size, filter, index, frameSize } = item; 
            let { alpha } = item; 
            let isValidTarget = true; 
            
            if (state.phase === 'SELECT_TARGET') { 
                if (targetGroup === 'enemy' && isPlayer) isValidTarget = false; 
                if (targetGroup === 'party' && !isPlayer) isValidTarget = false; 
                if (targetGroup === 'self' && entity !== activeChar) isValidTarget = false; 
            } 
            
            const isAlreadySelected = state.selectedTargets?.includes(entity); 
            if (!isValidTarget && !isAlreadySelected && state.phase === 'SELECT_TARGET') { 
                alpha *= 0.4; 
            } 
            
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
            this.drawShadow(x, y, size); 
            
            if (filter !== 'none') { 
                this.ctx.filter = filter; 
            } 
            
            if (img) { 
                const framesPerRow = entity.framesPerRow || this.FRAMES_PER_ROW; 
                
                // Set to 32 frames to loop exactly through 2 rows of 16
                const DEFAULT_FRAMES_PER_FACING = 32; 
                const maxFrames = isPlayer ? (entity.battlePortraitFramesBack || DEFAULT_FRAMES_PER_FACING) : (entity.battlePortraitFramesFront || DEFAULT_FRAMES_PER_FACING); 
                
                const now = performance.now(); 
                if (entity.battleAnimOffset === undefined) { 
                    const randomStartFrame = Math.floor(Math.random() * maxFrames); 
                    entity.battleAnimOffset = randomStartFrame * this.ANIMATION_SPEED; 
                } 
                
                const currentFrame = Math.floor((now + entity.battleAnimOffset) / this.ANIMATION_SPEED) % maxFrames; 
                const srcX = (currentFrame % framesPerRow) * frameSize; 
                
                // --- 2 ROWS OF 16 LOGIC (Per Facing) --- 
                // Enemies (Front facing) use rows 0-1. Players (Back facing) use rows 4-5.
                const baseRow = isPlayer ? 4 : 0; 
                
                // Which of the 2 rows does this frame belong to? 
                const rowOffset = Math.floor(currentFrame / framesPerRow); 
                
                // Use custom row if supplied, otherwise calculate using baseRow + offset 
                const rowIndex = entity.customRowIndex !== undefined ? entity.customRowIndex : (baseRow + rowOffset); 
                const srcY = rowIndex * frameSize; 
                
                this.ui.drawSprite( 
                    img, 
                    srcX, 
                    srcY, 
                    frameSize, 
                    frameSize, 
                    x - size / 2, 
                    y - size / 2, 
                    size, 
                    size 
                ); 
            } else { 
                const color = isPlayer ? UITheme.colors.defense : UITheme.colors.hp; 
                this.ui.drawRect(x - size / 2, y - size / 2, size, size, color, true); 
            } 
            this.ctx.restore(); 
        }); 
    } 
}