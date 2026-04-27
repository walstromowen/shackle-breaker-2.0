import { events } from './eventBus.js';

// Helper to create slight audio variations (0.9x to 1.1x pitch)
const getVariation = () => 0.9 + Math.random() * 0.2;

export class UIInteractionManager {
    constructor() {
        this.mouseDownPos = null;
        this.activeHitboxDown = null;
        this.isDragging = false;
        this.dragThreshold = 5;
        // Track hover state so we don't spam the SFX every frame
        this.lastHoveredId = null;
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

        let handledClick = false;
        let handledRightClick = false;

        // --- 3. HOVER TRANSLATION & AUDIO ---
        if (mousePos && activeScreen.onHover) {
            const hoveredHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
            const currentHoverId = hoveredHitbox ? hoveredHitbox.id : null;

            // Trigger audio only when the hovered element changes
            if (currentHoverId !== this.lastHoveredId) {
                if (hoveredHitbox) {
                    // Allow hitboxes to dictate their own sounds, or fallback to a global default
                    const sfxId = hoveredHitbox.hoverSfx || 'ui_hover';
                    events.emit('PLAY_SFX', { id: sfxId, volume: 0.5, pitch: getVariation() });
                }
                this.lastHoveredId = currentHoverId;
            }

            activeScreen.onHover(currentHoverId);
        }

        // --- 4. RIGHT CLICK (CANCEL) TRANSLATION & AUDIO ---
        if (rightClick) {
            const hit = this._findHitbox(rightClick.x, rightClick.y, hitboxes);

            // Universal Back/Cancel Sound
            events.emit('PLAY_SFX', { id: 'ui_cancel', volume: 0.7, pitch: getVariation() });

            if (activeScreen.onRightClick) {
                activeScreen.onRightClick(hit ? hit.id : null);
            }
            handledRightClick = true;
        }

        // --- 5. DRAG VS CLICK MATH & AUDIO ---
        if (isMouseDown) {
            if (!this.mouseDownPos && mousePos) {
                this.mouseDownPos = { x: mousePos.x, y: mousePos.y };
                this.activeHitboxDown = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
            } else if (this.mouseDownPos && mousePos && !this.isDragging) {
                const dx = mousePos.x - this.mouseDownPos.x;
                const dy = mousePos.y - this.mouseDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.dragThreshold && this.activeHitboxDown) {
                    this.isDragging = true;
                    if (activeScreen.onDragStart) {
                        events.emit('PLAY_SFX', { id: 'ui_drag_start', volume: 0.6, pitch: getVariation() });
                        activeScreen.onDragStart(this.activeHitboxDown.id);
                    }
                }
            } else if (this.isDragging && mousePos) {
                if (activeScreen.onDragMove) {
                    activeScreen.onDragMove(mousePos.x, mousePos.y);
                }
            }
        } else {
            if (this.isDragging) {
                const targetHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes);

                events.emit('PLAY_SFX', { id: 'ui_drop', volume: 0.6, pitch: getVariation() });

                if (activeScreen.onDrop) {
                    activeScreen.onDrop(this.activeHitboxDown.id, targetHitbox ? targetHitbox.id : null);
                }
                handledClick = true;
            } else if (click) {
                const hit = this._findHitbox(click.x, click.y, hitboxes);

                // Play click sound if we hit a valid UI element
                if (hit) {
                    const sfxId = hit.clickSfx || 'ui_select';
                    events.emit('PLAY_SFX', { id: sfxId, volume: 0.8, pitch: getVariation() });
                }

                if (activeScreen.onClick) {
                    activeScreen.onClick(hit ? hit.id : null);
                }
                handledClick = true;
            }

            // Reset drag state
            this.mouseDownPos = null;
            this.activeHitboxDown = null;
            this.isDragging = false;
        }

        return { handledClick, handledRightClick };
    }

    _findHitbox(x, y, hitboxes) {
        return hitboxes.find(box =>
            x >= box.x && x <= box.x + box.w &&
            y >= box.y && y <= box.y + box.h
        );
    }
}