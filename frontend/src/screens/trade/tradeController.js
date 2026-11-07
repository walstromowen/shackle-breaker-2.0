/**
 * frontend/src/screens/trade/tradeController.js
 *
 * Trading with another player (engine/multiplayerSocial.js holds the trade and talks to the other player). Three columns:
 *   Your bag       click an item to put it on the table (one at a time from a stack, a whole weapon or piece of armour)
 *   You offer      click an item to take one back; coin is added and taken back with the buttons under it
 *   They offer     what the other player has put on the table
 * Accept says yes to the table as it stands. Any change by either player takes both yeses back, so nobody can be surprised. When both
 * have accepted the same table, the items and coin change hands on both sides and the trade closes. Cancel (or Esc) calls it off.
 */
import { BaseController } from '../../engine/baseController.js';
import { events } from '../../../../shared/core/eventBus.js';
import { gameState } from '../../../../shared/core/gameState.js';
import { ItemDefinitions } from '../../../../shared/items/itemDefinitions.js';
import { multiplayerSocial } from '../../engine/multiplayerSocial.js';
import { UITheme } from '../../ui/UITheme.js';

export const TRADE_LAYOUT = {
    panelX: 110, panelY: 50, panelW: 1700, panelH: 900,
    colY: 230, rowH: 58, rowGap: 6, rows: 8,
    bag: { x: 160, w: 520 }, mine: { x: 720, w: 480 }, theirs: { x: 1240, w: 520 },
};
const GOLD_STEPS = [-10, -1, 1, 10];

export class TradeController extends BaseController {
    constructor(input) {
        super(input);
        this.page = 0;
        this.kbFocus = null;
        this.updateHitboxes([]);
    }

    init() {
        this.page = 0;
        this.kbFocus = 'btn_accept';
        this.startInKeyboardMode();
        if (!multiplayerSocial.trade) events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    getKeyboardFocusId() { return this.kbFocus; }
    setFocusFromPointer(id) { this.kbFocus = id; }

    _order() { return this.getHitboxes().map(h => h.id); }

    handleKeyDown(code, e) {
        const intent = this.resolveIntent(code, e);
        if (!intent) return;
        if (intent === 'CANCEL') { this.onRightClick(); return; }
        if (intent === 'CONFIRM') { if (this.kbFocus) this.onClick(this.kbFocus); return; }
        const next = this.findSpatialNeighbor(intent, this.kbFocus);
        if (next) { this.kbFocus = next; this.playNavSound(); }
        else {
            const order = this._order();
            if (order.length) { this.kbFocus = order[(order.indexOf(this.kbFocus) + 1 + order.length) % order.length]; this.playNavSound(); }
        }
    }

    onClick(id) {
        if (!id || !multiplayerSocial.trade) return;
        this.kbFocus = id;
        if (id.startsWith('bag_')) { if (multiplayerSocial.offerItem(id.slice(4))) this.playConfirmSound(); else this.playErrorSound(); return; }
        if (id.startsWith('mine_')) { if (multiplayerSocial.withdrawItem(id.slice(5))) this.playCancelSound(); return; }
        if (id.startsWith('gold_')) { if (multiplayerSocial.offerGold(Number(id.slice(5)))) this.playNavSound(); else this.playErrorSound(); return; }
        if (id === 'btn_prev') { this.page = Math.max(0, this.page - 1); this.playNavSound(); return; }
        if (id === 'btn_next') { this.page++; this.playNavSound(); return; }
        if (id === 'btn_accept') { multiplayerSocial.toggleAccept(); this.playConfirmSound(); return; }
        if (id === 'btn_cancel') this.onRightClick();
    }

    onRightClick() {
        this.playCancelSound();
        if (multiplayerSocial.trade) multiplayerSocial.cancelTrade();   // back to the world when it closes
        else events.emit('CHANGE_SCENE', { scene: 'overworld' });
    }

    getState() {
        const t = multiplayerSocial.trade;
        const L = TRADE_LAYOUT;
        const hitboxes = [];
        const rowBox = (col, i) => ({ x: col.x, y: L.colY + i * (L.rowH + L.rowGap), w: col.w, h: L.rowH });
        const describe = (o) => {
            const def = ItemDefinitions[o.defId] || {};
            const level = o.data && o.data.level > 1 ? ` +${o.data.level - 1}` : '';
            return { def, name: `${def.name || o.defId}${level}`, qty: o.qty, stackable: !!o.stackable };
        };

        const bagAll = t ? multiplayerSocial.tradeBag() : [];
        const pages = Math.max(1, Math.ceil(bagAll.length / L.rows));
        this.page = Math.min(this.page, pages - 1);
        const bag = bagAll.slice(this.page * L.rows, (this.page + 1) * L.rows).map((r, i) => {
            const box = { id: `bag_${r.iid}`, ...rowBox(L.bag, i), ...describe({ defId: r.defId, qty: r.qty, stackable: r.stackable, data: r.stackable ? null : r.item.toJSON() }) };
            hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
            return box;
        });
        const mine = (t ? t.mine : []).slice(0, L.rows).map((o, i) => {
            const box = { id: `mine_${o.iid}`, ...rowBox(L.mine, i), ...describe(o) };
            hitboxes.push({ id: box.id, x: box.x, y: box.y, w: box.w, h: box.h, zIndex: 10 });
            return box;
        });
        const theirs = (t ? t.theirs : []).slice(0, L.rows).map((o, i) => ({ ...rowBox(L.theirs, i), ...describe(o) }));

        const listBottom = L.colY + L.rows * (L.rowH + L.rowGap);
        const buttons = [];
        const add = (id, label, x, y, w, h, extra = {}) => { buttons.push({ id, label, x, y, w, h, ...extra }); hitboxes.push({ id, x, y, w, h, zIndex: 10 }); };
        if (this.page > 0) add('btn_prev', 'Prev', L.bag.x, listBottom + 10, 160, 52);
        if (this.page < pages - 1) add('btn_next', 'Next', L.bag.x + L.bag.w - 160, listBottom + 10, 160, 52);
        const gw = (L.mine.w - 3 * 10) / 4;
        GOLD_STEPS.forEach((step, i) => add(`gold_${step}`, step > 0 ? `+${step}` : `${step}`, L.mine.x + i * (gw + 10), listBottom + 62, gw, 52));
        const accepted = !!(t && t.iAccept);
        const back = UITheme.backButtonBox();
        add('btn_accept', accepted ? 'Take Back Yes' : 'Accept', 960 - 210, back.y, 420, back.h, { lit: accepted });
        add('btn_cancel', 'Cancel', back.x, back.y, back.w, back.h);

        this.updateHitboxes(hitboxes);
        return {
            layout: L, focusId: this.getFocusId(), open: !!t,
            partnerName: t ? t.partnerName : '', bag, mine, theirs, buttons, listBottom,
            page: this.page, pages,
            myGold: t ? t.myGold : 0, theirGold: t ? t.theirGold : 0, purse: gameState.party.currency || 0,
            iAccept: accepted, theyAccept: !!(t && t.theyAccept),
        };
    }
}
