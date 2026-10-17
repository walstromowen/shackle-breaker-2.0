/**
 * ui/uiSfx.js
 *
 * The one place that names the UI sounds. BaseController's helpers, UIInteractionManager's default sounds and any hitbox that
 * does not name its own all use these, so changing a sound is a one-line change here.
 *
 *   hover    moving the cursor / mouse onto something selectable
 *   confirm  choosing, pressing a button, advancing
 *   cancel   closing, going back
 *   error    the action is not possible (not enough money, nothing to do, a full list...)
 *   step / pickup / reward / success   the few one-off sounds screens used to hard-code
 *
 * Every id here must be a key of ASSET_MANIFEST (main.js). AudioManager only warns, and plays nothing, for an unknown key.
 * A hitbox that wants the default hover / click sound simply does not name one (hoverSfx / clickSfx are only for exceptions;
 * 'none' silences that one sound).
 */
export const UI_SFX = {
    hover: 'hoverTick',
    confirm: 'cinematicBoom',
    cancel: 'cinematicBoomCancel',
    error: 'cinematicBoomCancel', // no dedicated error sound in the manifest yet: add one and point this at it
    dragStart: 'hoverTick',
    drop: 'cinematicBoom',
    step: 'hoverTick',            // a light click: stepping a value with an arrow, picking a small option
    pickup: 'pickupSound',        // an item goes into the bag
    reward: 'coinsJingle',        // money changes hands
    success: 'craftingSuccess'    // something was made / finished
};

/* One volume per sound, the same whether the mouse or the keyboard caused it. */
export const UI_SFX_VOLUME = {
    hover: 0.4,
    confirm: 0.6,
    cancel: 0.5,
    error: 0.5,
    dragStart: 0.5,
    drop: 0.5
};

/* A slight random pitch (0.9x - 1.1x) so repeated sounds do not feel mechanical. */
export const uiPitch = () => 0.9 + Math.random() * 0.2;
