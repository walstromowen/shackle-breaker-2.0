export class UIInteractionManager {
    constructor() {
        this.mouseDownPos = null;
        this.activeHitboxDown = null;
        this.isDragging = false;
        this.dragThreshold = 5; 
    }

    /**
     * @returns {Object} { handledClick, handledRightClick }
     */
    update(input, activeScreen) {
        const mousePos = input.getMousePosition();
        const isMouseDown = input.getIsMouseDown ? input.getIsMouseDown() : false;
        const click = input.getAndResetClick();             
        const rightClick = input.getAndResetRightClick();   

        const hitboxes = activeScreen.getHitboxes ? activeScreen.getHitboxes() : [];
        hitboxes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        // Track what we intercept to tell SceneManager
        let handledClick = false;
        let handledRightClick = false;

        // 3. HOVER TRANSLATION
        if (mousePos && activeScreen.onHover) {
            const hoveredHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
            activeScreen.onHover(hoveredHitbox ? hoveredHitbox.id : null);
        }

        // 4. RIGHT CLICK TRANSLATION
        if (rightClick) {
            const hit = this._findHitbox(rightClick.x, rightClick.y, hitboxes);
            if (hit) {
                if (activeScreen.onRightClick) activeScreen.onRightClick(hit.id);
                handledRightClick = true; // Consume the event
            }
        }

        // 5. DRAG VS CLICK MATH
        if (isMouseDown) {
            if (!this.mouseDownPos && mousePos) {
                this.mouseDownPos = { x: mousePos.x, y: mousePos.y };
                this.activeHitboxDown = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
            } 
            else if (this.mouseDownPos && mousePos && !this.isDragging) {
                const dx = mousePos.x - this.mouseDownPos.x;
                const dy = mousePos.y - this.mouseDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.dragThreshold && this.activeHitboxDown) {
                    this.isDragging = true;
                    if (activeScreen.onDragStart) {
                        activeScreen.onDragStart(this.activeHitboxDown.id);
                    }
                }
            }
        } 
        else {
            if (this.isDragging) {
                const targetHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
                if (activeScreen.onDrop) {
                    activeScreen.onDrop(this.activeHitboxDown.id, targetHitbox ? targetHitbox.id : null);
                }
            } 
            else if (click) {
                const hit = this._findHitbox(click.x, click.y, hitboxes);
                if (hit) {
                    if (activeScreen.onClick) activeScreen.onClick(hit.id);
                    handledClick = true; // Consume the event
                }
            }

            // Reset drag state
            this.mouseDownPos = null;
            this.activeHitboxDown = null;
            this.isDragging = false;
        }

        // Pass consumption state back up
        return { handledClick, handledRightClick };
    }

    _findHitbox(x, y, hitboxes) {
        return hitboxes.find(box => 
            x >= box.x && x <= box.x + box.w && 
            y >= box.y && y <= box.y + box.h
        );
    }
}