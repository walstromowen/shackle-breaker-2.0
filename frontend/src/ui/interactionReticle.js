/**
 * Canvas-based Interaction Reticle
 * Shows a subtle gothic-style targeting reticle over interactable objects
 */
export class InteractionReticle {
    constructor(config) {
        this.config = config;
        
        // Gothic color palette
        this.baseColor = '200, 200, 210'; // Pale stone silver
        this.animSpeed = 1.5; // Animation speed
    }

    /**
     * Render the reticle over a target object
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} object - The target object to highlight
     * @param {Object} camera - Camera position {x, y}
     */
    render(ctx, object, camera) {
        if (!object) return;
        
        const { TILE_SIZE, GAME_SCALE } = this.config;
        
        // Calculate object's screen position
        const objScreenX = Math.floor((object.col * TILE_SIZE - camera.x) * GAME_SCALE);
        const objScreenY = Math.floor((object.row * TILE_SIZE - camera.y) * GAME_SCALE);
        
        const tileDrawSize = TILE_SIZE * GAME_SCALE;
        
        // Calculate the full dimensions of the object
        const objectWidth = (object.w || 1) * tileDrawSize;
        const objectHeight = (object.h || 1) * tileDrawSize;
        
        // CRITICAL FIX: Tall objects are drawn UPWARD from their anchor
        // So we need to shift the reticle UP by (height - 1 tile)
        const heightOffset = objectHeight - tileDrawSize;
        
        // Center position of the entire object (accounting for upward rendering)
        const centerX = objScreenX + objectWidth / 2;
        const centerY = objScreenY + objectHeight / 2 - heightOffset;
        
        // Bounding box for the reticle
        const boxWidth = objectWidth;
        const boxHeight = objectHeight;
        
        ctx.save();
        
        // Draw animated corner brackets
        this.drawCornerBrackets(ctx, centerX, centerY, boxWidth, boxHeight);
        
        ctx.restore();
    }

    /**
     * Draw corner triangles at the edges of the object with animation
     */
    drawCornerBrackets(ctx, centerX, centerY, boxWidth, boxHeight) {
        // Subtle pulse animation - corners extend slightly in and out
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * this.animSpeed) * 0.5 + 0.5; // 0 to 1
        
        // Base corner size, grows slightly with pulse (larger and bolder)
        const baseCornerSize = Math.min(12, boxWidth / 4, boxHeight / 4);
        const cornerSize = baseCornerSize + (pulse * 3); // Extends 0-3 pixels
        
        const halfWidth = boxWidth / 2;
        const halfHeight = boxHeight / 2;
        
        // Opacity pulses gently (more bold, higher opacity)
        const opacity = 0.7 + (pulse * 0.2); // 0.7 to 0.9
        
        ctx.fillStyle = `rgba(${this.baseColor}, ${opacity})`;
        
        // Top-left corner triangle (points outward and up-left)
        ctx.beginPath();
        ctx.moveTo(centerX - halfWidth, centerY - halfHeight); // Corner point
        ctx.lineTo(centerX - halfWidth - cornerSize, centerY - halfHeight); // Horizontal edge (outward)
        ctx.lineTo(centerX - halfWidth, centerY - halfHeight - cornerSize); // Vertical edge (outward)
        ctx.closePath();
        ctx.fill();
        
        // Top-right corner triangle (points outward and up-right)
        ctx.beginPath();
        ctx.moveTo(centerX + halfWidth, centerY - halfHeight); // Corner point
        ctx.lineTo(centerX + halfWidth, centerY - halfHeight - cornerSize); // Vertical edge (outward)
        ctx.lineTo(centerX + halfWidth + cornerSize, centerY - halfHeight); // Horizontal edge (outward)
        ctx.closePath();
        ctx.fill();
        
        // Bottom-left corner triangle (points outward and down-left)
        ctx.beginPath();
        ctx.moveTo(centerX - halfWidth, centerY + halfHeight); // Corner point
        ctx.lineTo(centerX - halfWidth, centerY + halfHeight + cornerSize); // Vertical edge (outward)
        ctx.lineTo(centerX - halfWidth - cornerSize, centerY + halfHeight); // Horizontal edge (outward)
        ctx.closePath();
        ctx.fill();
        
        // Bottom-right corner triangle (points outward and down-right)
        ctx.beginPath();
        ctx.moveTo(centerX + halfWidth, centerY + halfHeight); // Corner point
        ctx.lineTo(centerX + halfWidth + cornerSize, centerY + halfHeight); // Horizontal edge (outward)
        ctx.lineTo(centerX + halfWidth, centerY + halfHeight + cornerSize); // Vertical edge (outward)
        ctx.closePath();
        ctx.fill();
    }
}