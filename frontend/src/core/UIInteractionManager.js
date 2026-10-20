/**
 * core/UIInteractionManager.js
 *
 * Turns raw mouse state into semantic UI events (hover / click / right-click / drag / drop) for the active controller, and makes sure
 * every one of them is answered by exactly one sound.
 *
 * SOUND RULE (the same for every screen):
 *   1. The controller handles the event first. If it plays a sound while doing so (playConfirmSound, playErrorSound, playSfx ...)
 *      it has told us how it wants to sound, and we add nothing.
 *   2. If the controller played nothing, we add the default for the event: hover tick, confirm, cancel, drag, drop. A hitbox can ask
 *      for a different one with hoverSfx / clickSfx.
 *   3. If the controller returns `false` from onClick / onRightClick, nothing happened (there was nothing to cancel, ...): silence.
 * The keyboard goes through the same controller helpers, so a click and a key press sound the same.
 *
 * Controllers count the sounds they play in `sfxCount` (see BaseController). A screen that is not a BaseController simply has no
 * count, and then we always add the default (the old behaviour).
 */
import { events } from './eventBus.js';
import { UI_SFX, UI_SFX_VOLUME, uiPitch } from '../ui/uiSfx.js';
import { UIPointer } from '../ui/UITheme.js';

export class UIInteractionManager {
    constructor() {
        this.mouseDownPos = null;
        this.activeHitboxDown = null;
        this.isDragging = false;
        this.dragThreshold = 5;
        // Track hover state so we don't spam the SFX every frame
        this.lastHoveredId = null;
        this.lastScreen = null;
    }

    /** The sound count of a screen (0 if it does not keep one). */
    _count(screen) {
        return typeof screen.sfxCount === 'number' ? screen.sfxCount : 0;
    }

    _play(kind, id) {
        events.emit('PLAY_SFX', { id: id || UI_SFX[kind], volume: UI_SFX_VOLUME[kind], pitch: uiPitch() });
    }

    /** Make a hitbox silent with `silent: true`, or by naming its sound 'none'. */
    _isSilent(hitbox, sfxId) {
        return !!(hitbox && hitbox.silent) || sfxId === 'none';
    }

    /**
     * @returns {Object} { handledClick, handledRightClick }
     */
    update(input, activeScreen) {
        // A different screen took over: forget the previous screen's hover / drag so nothing leaks across scenes.
        if (activeScreen !== this.lastScreen) {
            this.lastScreen = activeScreen;
            this.lastHoveredId = null;
            this.mouseDownPos = null;
            this.activeHitboxDown = null;
            this.isDragging = false;
            UIPointer.pressedId = null;
        }

        const mousePos = input.getMousePosition();
        const isMouseDown = input.getIsMouseDown ? input.getIsMouseDown() : false;
        const click = input.getAndResetClick();
        const rightClick = input.getAndResetRightClick();

        const hitboxes = activeScreen.getHitboxes ? activeScreen.getHitboxes() : [];
        hitboxes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        let handledClick = false;
        let handledRightClick = false;

        // Any real pointer action gives control back to the mouse (a screen that is in keyboard mode stops showing its keyboard cursor).
        if ((click || rightClick || this.isDragging) && activeScreen.notePointerInput) activeScreen.notePointerInput();

        // --- 1. HOVER ---
        if (mousePos && activeScreen.onHover) {
            const hoveredHitbox = this._findHitbox(mousePos.x, mousePos.y, hitboxes);
            const currentHoverId = hoveredHitbox ? hoveredHitbox.id : null;
            const changed = currentHoverId !== this.lastHoveredId;
            const before = this._count(activeScreen);

            this.lastHoveredId = currentHoverId;
            activeScreen.onHover(currentHoverId);

            // The tick belongs to the mouse: it is not played while the keyboard is driving, or while something is being dragged.
            if (changed && hoveredHitbox && !this.isDragging && activeScreen.inputMode !== 'keyboard'
                && this._count(activeScreen) === before) {
                const sfxId = hoveredHitbox.hoverSfx;
                if (!this._isSilent(hoveredHitbox, sfxId)) this._play('hover', sfxId);
            }
        }

        // --- 2. RIGHT CLICK = BACK ---
        if (rightClick) {
            const hit = this._findHitbox(rightClick.x, rightClick.y, hitboxes);
            const before = this._count(activeScreen);
            let result;

            if (activeScreen.onRightClick) result = activeScreen.onRightClick(hit ? hit.id : null);

            // A screen with nothing to go back to sets cancelSfxOnRightClick = false (title, overworld ...).
            if (result !== false && activeScreen.cancelSfxOnRightClick !== false && this._count(activeScreen) === before) {
                this._play('cancel');
            }
            handledRightClick = true;
        }

        // --- 3. DRAG vs CLICK ---
        if (isMouseDown) {
            if (!this.mouseDownPos && mousePos) {
                this.mouseDownPos = { x: mousePos.x, y: mousePos.y };
                this.activeHitboxDown = this._findHitbox(mousePos.x, mousePos.y, hitboxes) || null;
            } else if (this.mouseDownPos && mousePos && !this.isDragging) {
                const dx = mousePos.x - this.mouseDownPos.x;
                const dy = mousePos.y - this.mouseDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > this.dragThreshold && this.activeHitboxDown) {
                    this.isDragging = true;
                    if (activeScreen.onDragStart) {
                        const before = this._count(activeScreen);
                        activeScreen.onDragStart(this.activeHitboxDown.id);
                        if (this._count(activeScreen) === before) this._play('dragStart');
                    }
                }
            } else if (this.isDragging && mousePos) {
                if (activeScreen.onDragMove) {
                    activeScreen.onDragMove(mousePos.x, mousePos.y);
                }
            }
        } else {
            if (this.isDragging) {
                const targetHitbox = mousePos ? this._findHitbox(mousePos.x, mousePos.y, hitboxes) : null;
                const before = this._count(activeScreen);
                let result;

                if (activeScreen.onDrop && this.activeHitboxDown) {
                    result = activeScreen.onDrop(this.activeHitboxDown.id, targetHitbox ? targetHitbox.id : null);
                }
                if (result !== false && this._count(activeScreen) === before) this._play('drop');
                handledClick = true;
            } else if (click) {
                const hit = this._findHitbox(click.x, click.y, hitboxes);
                const before = this._count(activeScreen);
                let result;

                if (hit && hit.sharedBack) {
                    // The shared Back button: the same as a right-click on this screen (which plays its own sound when it closes something)
                    if (activeScreen.onRightClick) result = activeScreen.onRightClick('btn_back');
                    if (result !== false && this._count(activeScreen) === before) this._play('cancel');
                    handledClick = true;
                    this.mouseDownPos = null; this.activeHitboxDown = null; this.isDragging = false;
                    UIPointer.pressedId = null;
                    return { handledClick, handledRightClick };
                }
                if (activeScreen.onClick) result = activeScreen.onClick(hit ? hit.id : null);

                // Only a click that landed on something makes a sound (a click on empty space is silent).
                if (hit && result !== false && this._count(activeScreen) === before) {
                    const sfxId = hit.clickSfx;
                    if (!this._isSilent(hit, sfxId)) this._play('confirm', sfxId);
                }
                handledClick = true;
            }

            // Reset drag state
            this.mouseDownPos = null;
            this.activeHitboxDown = null;
            this.isDragging = false;
        }

        // Tell the renderers which element the button is held on, so every screen draws "pressed" the same way
        UIPointer.pressedId = (isMouseDown && this.activeHitboxDown && !this.isDragging) ? this.activeHitboxDown.id : null;

        return { handledClick, handledRightClick };
    }

    _findHitbox(x, y, hitboxes) {
        return hitboxes.find(box =>
            x >= box.x && x <= box.x + box.w &&
            y >= box.y && y <= box.y + box.h
        );
    }
}
