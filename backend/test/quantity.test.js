// backend/test/quantity.test.js: `npm test`. The "how many?" slider (selling, buying and dropping part of a stack) and the Settings tabs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuantityPrompt } from '../../frontend/src/ui/quantityPrompt.js';
import { ShopLogic } from '../../frontend/src/screens/shop/shopLogic.js';
import { CharacterSummaryLogic } from '../../frontend/src/screens/characterSummary/characterSummaryLogic.js';
import { TIP_SCENES } from '../../frontend/src/ui/tutorialData.js';
import { gameState } from '../../shared/core/gameState.js';
import { InventorySystem } from '../../shared/items/inventorySystem.js';

/** A controller stand-in that records the sounds the prompt asks for. */
function fakeOwner(pointerX = 0) {
    const log = [];
    return {
        log,
        input: { getMousePosition: () => ({ x: pointerX, y: 0 }) },
        mouse: { x: pointerX, y: 0 },
        playNavSound: () => log.push('nav'),
        playConfirmSound: () => log.push('confirm'),
        playCancelSound: () => log.push('cancel'),
        playErrorSound: () => log.push('error'),
        claimSfx: () => log.push('claim')
    };
}

test('the slider opens only when there is something to choose, and starts where it was told', () => {
    const p = new QuantityPrompt();
    assert.equal(p.open({ title: 't', max: 0, onConfirm() {} }), false);
    assert.equal(p.isOpen, false);
    assert.equal(p.open({ title: 't', max: 40, value: 1, onConfirm() {} }), true);
    assert.equal(p.amount, 1);
    p.close();
    p.open({ title: 't', max: 40, onConfirm() {} });
    assert.equal(p.amount, 40, 'no value given: starts at the most');
    p.close();
    p.open({ title: 't', max: 5, value: 99, onConfirm() {} });
    assert.equal(p.amount, 5, 'a start past the end is held to the end');
});

test('keys: sideways by one, up and down by ten, held inside 1..max; Enter confirms and Esc cancels', () => {
    const owner = fakeOwner();
    const p = new QuantityPrompt({ owner });
    let got = null;
    p.open({ title: 't', max: 25, value: 1, onConfirm: n => { got = n; } });
    p.handleIntent('RIGHT'); assert.equal(p.amount, 2);
    p.handleIntent('UP');    assert.equal(p.amount, 12);
    p.handleIntent('UP');    assert.equal(p.amount, 22);
    p.handleIntent('UP');    assert.equal(p.amount, 25, 'stops at the most');
    p.handleIntent('UP');    assert.equal(p.amount, 25);
    assert.ok(owner.log.includes('error'), 'pressing into the end is a quiet error tick');
    p.handleIntent('DOWN');  assert.equal(p.amount, 15);
    for (let i = 0; i < 5; i++) p.handleIntent('DOWN');
    assert.equal(p.amount, 1, 'stops at the least');
    p.handleIntent('RIGHT');
    assert.equal(p.handleIntent('CONFIRM'), true);
    assert.equal(got, 2);
    assert.equal(p.isOpen, false);

    let called = false;
    p.open({ title: 't', max: 9, onConfirm: () => { called = true; } });
    p.handleIntent('CANCEL');
    assert.equal(p.isOpen, false);
    assert.equal(called, false, 'cancelling does nothing');
    assert.equal(owner.log.at(-1), 'cancel');
});

test('while it is open it takes every key, so the screen underneath cannot be reached', () => {
    const p = new QuantityPrompt({ owner: fakeOwner() });
    p.open({ title: 't', max: 9, onConfirm() {} });
    assert.equal(p.handleIntent('SWAP'), true);
    assert.equal(p.isOpen, true);
    p.close();
    assert.equal(p.handleIntent('RIGHT'), false, 'closed: the keys go back to the screen');
});

test('mouse: the - and + buttons, All, the confirm button and a click outside', () => {
    const owner = fakeOwner();
    const p = new QuantityPrompt({ owner });
    let got = null;
    p.open({ title: 't', max: 12, value: 5, onConfirm: n => { got = n; } });
    p.onClick('QTY_PLUS');  assert.equal(p.amount, 6);
    p.onClick('QTY_MINUS'); p.onClick('QTY_MINUS'); assert.equal(p.amount, 4);
    p.onClick('QTY_MAX');   assert.equal(p.amount, 12);
    p.onClick('QTY_OK');
    assert.equal(got, 12);
    assert.equal(p.isOpen, false);

    p.open({ title: 't', max: 12, onConfirm: () => { got = 'wrong'; } });
    assert.equal(p.onClick('QTY_BG'), true);
    assert.equal(p.isOpen, false, 'a click outside the panel cancels');
    assert.equal(got, 12);
    p.open({ title: 't', max: 12, onConfirm() {} });
    p.onClick('QTY_PANEL');
    assert.equal(p.isOpen, true, 'a click on the panel itself does nothing');
    p.onRightClick();
    assert.equal(p.isOpen, false, 'right-click cancels');
});

test('mouse: clicking and dragging the bar sets the amount from the pointer position', () => {
    const owner = fakeOwner();
    const p = new QuantityPrompt({ owner });
    p.open({ title: 't', max: 101, value: 1, onConfirm() {} });
    const L = p.layout(1920, 1080);
    p._trackBox = L.track;   // render() records this
    const at = (frac) => L.track.x + L.track.w * frac;

    owner.input.getMousePosition = () => ({ x: at(0.5), y: 0 });
    p.onClick('QTY_TRACK');
    assert.equal(p.amount, 51, 'halfway along 1..101');

    owner.input.getMousePosition = () => ({ x: at(0.25), y: 0 });
    p.onDragStart('QTY_TRACK');
    assert.equal(p.amount, 26);
    p.onDragMove(at(1) + 500);
    assert.equal(p.amount, 101, 'dragged past the end: the most');
    p.onDragMove(at(0) - 500);
    assert.equal(p.amount, 1, 'dragged past the start: the least');
    p.onDrop();
    p.onDragMove(at(0.9));
    assert.equal(p.amount, 1, 'after the drop the bar no longer follows the mouse');
    assert.ok(owner.log.includes('claim'), 'the bar is silent, UIInteractionManager must not add a click on top');
});

test('every part of the slider sits inside the screen, buttons do not overlap, the bar is long enough to be useful', () => {
    const p = new QuantityPrompt();
    const L = p.layout(1920, 1080);
    const rects = ['minus', 'plus', 'track', 'ok', 'max', 'cancel'];
    for (const k of rects) {
        const r = L[k];
        assert.ok(r.x >= L.panel.x && r.x + r.w <= L.panel.x + L.panel.w, `${k} is inside the panel across`);
        assert.ok(r.y >= L.panel.y && r.y + r.h <= L.panel.y + L.panel.h, `${k} is inside the panel down`);
    }
    for (const a of rects) for (const b of rects) {
        if (a >= b) continue;
        const A = L[a], B = L[b];
        const overlap = A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h;
        assert.equal(overlap, false, `${a} and ${b} must not overlap`);
    }
    assert.ok(L.track.w >= 400);
});

// ------------------------------------------------------------
// What the slider does to the party's things
// ------------------------------------------------------------
function resetParty(inventory, currency = 0) {
    gameState.party.inventory = inventory;
    gameState.party.currency = currency;
}

test('selling many at once: coins paid, the stack shrinks, the merchant stocks them, and the last ones remove the stack', () => {
    resetParty([], 0);
    InventorySystem.addItem('plant_fibers', 60);
    const stack = gameState.party.inventory[0];
    const shop = new ShopLogic({ shopId: 'qty_test_shop_1', wares: [] });
    const each = shop.sellValue(stack);
    assert.equal(each, 1, 'plant fibers are worth 3, a merchant pays half rounded down');

    assert.equal(shop.sellItem(stack, 25), true);
    assert.equal(gameState.party.currency, each * 25);
    assert.equal(stack.qty, 35);
    assert.equal(shop.vendorWares.find(w => w.defId === 'plant_fibers').qty, 25);

    assert.equal(shop.sellItem(stack, 35), true);
    assert.equal(gameState.party.currency, each * 60);
    assert.equal(gameState.party.inventory.length, 0, 'the emptied stack is gone');
    assert.equal(shop.vendorWares.find(w => w.defId === 'plant_fibers').qty, 60);
});

test('buying many at once: coins taken, the items arrive, the merchant has fewer, and it cannot be bought on credit', () => {
    resetParty([], 100);
    const shop = new ShopLogic({ shopId: 'qty_test_shop_2', wares: [{ defId: 'plant_fibers', qty: 30, cost: 4 }] });
    const ware = shop.vendorWares[0];
    assert.equal(shop.buyItem(ware, 20), true);
    assert.equal(gameState.party.currency, 100 - 80);
    assert.equal(gameState.party.inventory.reduce((n, i) => n + i.qty, 0), 20);
    assert.equal(ware.qty, 10);
    assert.equal(shop.buyItem(ware, 10), false, '40 coins for 20 on hand');
    assert.equal(gameState.party.currency, 20);
    assert.equal(shop.buyItem(ware, 5), true);
    assert.equal(ware.qty, 5);
});

test('dropping many at once removes that many, and all of them removes the stack', () => {
    resetParty([], 0);
    InventorySystem.addItem('plant_fibers', 80);
    const stack = gameState.party.inventory[0];
    const logic = new CharacterSummaryLogic({ memberIndex: 0 });
    assert.equal(logic.dropItem(stack, 30), true);
    assert.equal(stack.qty, 50);
    assert.equal(logic.dropItem(stack, 50), true);
    assert.equal(gameState.party.inventory.length, 0);
});

// ------------------------------------------------------------
// Settings tabs
// ------------------------------------------------------------
// The sound engine wants a browser; a few empty stand-ins are enough to load the screen and drive its keys
for (const name of ['window', 'document']) {
    if (typeof globalThis[name] === 'undefined') globalThis[name] = { addEventListener() {}, removeEventListener() {}, createElement: () => ({}) };
}
const { SettingsController } = await import('../../frontend/src/screens/settings/settingsController.js');

const fakeInput = () => ({
    getMousePosition: () => ({ x: 0, y: 0 }), getAndResetClick: () => null, getAndResetRightClick: () => null,
    getAndResetScroll: () => 0, getIsMouseDown: () => false, reset() {}
});
const key = (c, code) => c.handleKeyDown(code, { code, preventDefault() {} });

test('Settings opens on Sound; Q / E switch to Controls and back, and the Controls tab has a page for every tutorial card', () => {
    const s = new SettingsController(fakeInput());
    s.init({ from: 'title' });
    let st = s.getState();
    assert.equal(st.tab, 'sound');
    assert.equal(st.channels.length, 4);
    assert.equal(st.pages.length, 0);
    assert.ok(st.buttons.some(b => b.id === 'btn_test'));
    assert.ok(!st.buttons.some(b => b.id === 'btn_tips'), 'Replay Tips lives on the Controls tab');

    key(s, 'KeyE');
    st = s.getState();
    assert.equal(st.tab, 'controls');
    assert.equal(st.channels.length, 0);
    assert.equal(st.pages.length, TIP_SCENES.length);
    assert.deepEqual(st.pages.map(p => p.sceneId), TIP_SCENES);
    assert.ok(st.buttons.some(b => b.id === 'btn_tips'));
    assert.ok(!st.buttons.some(b => b.id === 'btn_test'));

    key(s, 'KeyQ');
    assert.equal(s.getState().tab, 'sound');
});

test('Controls: clicking a page shows it, the keyboard cursor opens the page it lands on, and nothing overlaps or leaves the panel', () => {
    const s = new SettingsController(fakeInput());
    s.init({ from: 'game', tab: 'controls' });
    let st = s.getState();
    assert.equal(st.page, 0);
    s.onClick('page_4');
    st = s.getState();
    assert.equal(st.page, 4);
    assert.equal(st.pageSceneId, TIP_SCENES[4]);

    s.kbFocus = 'tab_controls';
    key(s, 'ArrowDown');
    assert.equal(s.kbFocus, 'page_0');
    assert.equal(s.getState().page, 0);
    key(s, 'ArrowDown'); key(s, 'ArrowDown');
    assert.equal(s.getState().page, 2);
    key(s, 'ArrowUp'); key(s, 'ArrowUp'); key(s, 'ArrowUp');
    assert.equal(s.kbFocus, 'tab_controls');

    const L = st.layout;
    const boxes = st.hitboxes.filter(h => h.id !== 'btn_done');
    for (const b of boxes) {
        assert.ok(b.x >= L.panelX && b.x + b.w <= L.panelX + L.panelW, `${b.id} is inside the panel across`);
        assert.ok(b.y >= L.panelY && b.y + b.h <= L.panelY + L.panelH, `${b.id} is inside the panel down`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        const overlap = A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h;
        assert.equal(overlap, false, `${A.id} and ${B.id} overlap`);
    }
});

test('Settings: the Sound tab layout also fits, and Replay Tips forgets the seen cards', async () => {
    const s = new SettingsController(fakeInput());
    s.init({ from: 'title' });
    const st = s.getState();
    const L = st.layout;
    const boxes = st.hitboxes.filter(h => h.id !== 'btn_done');
    for (const b of boxes) assert.ok(b.y + b.h <= L.panelY + L.panelH && b.x >= L.panelX - 20 && b.x + b.w <= L.panelX + L.panelW + 20, `${b.id} fits`);
    const tabs = boxes.filter(b => b.id.startsWith('tab_'));
    const firstSlider = boxes.find(b => b.id === 'slider_master');
    assert.ok(tabs.every(t => t.y + t.h < firstSlider.y), 'the tabs sit above the first slider');

    const { tipStore } = await import('../../frontend/src/ui/tutorialOverlay.js');
    tipStore.markSeen('shop');
    s.onClick('tab_controls');
    s.onClick('btn_tips');
    assert.equal(tipStore.hasSeen('shop'), false);
    assert.equal(s.getState().buttons.find(b => b.id === 'btn_tips').label, 'Tips Reset');
});
