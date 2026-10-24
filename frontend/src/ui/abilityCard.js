import { UITheme } from './UITheme.js';
import { AbilityPreview } from './abilityPreview.js';

/*
 * The ability card: one picture of a skill, wherever it is listed (the character summary's Skills view, an item's skills, the workshop).
 * It used to be drawn three times with three different paddings; this is the only copy.
 *
 *   +--------+  Name ..................................... 15 STM        header: icon, name, what it costs
 *   |  icon  |  [Physical]  Single Enemy · Innate                         the type, who it hits, where it comes from
 *   +--------+
 *   ---------------------------------------------------------------
 *   Dmg    24                                                            what it does (one line each: damage, healing)
 *   Heal   25% Max stamina
 *   Acc 100%    Spd 0     Rng Melee    Tgts 1                            the plain numbers, in an even grid
 *   ---------------------------------------------------------------
 *   What it looks like, in the game's own words.                         the description, left aligned and muted
 */

export const ABILITY_CARD = {
    pad: 20,          // between the card's edge and its content
    icon: 64,         // the ability's picture (the sheet's cells are 64 px: drawn 1:1, on whole pixels)
    iconGap: 16,
    effectRowH: 30,   // a line of "what it does"
    statRowH: 30,     // a row of the number grid
    descLineH: 28,
    sectionGap: 14,   // above and below a hairline
    gap: 14           // between two cards stacked in a list
};

const SRC_CELL = 64;

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The colour and name of the ability's damage type ('physical' when it has none). */
export function abilityTheme(ab) {
    let rawType = ab.damageType || (ab.type ? String(ab.type).toLowerCase() : 'physical');
    if (!ab.damageType && Array.isArray(ab.effects) && ab.effects.length > 0) {
        const dmg = ab.effects.find(e => e.type === 'damage');
        if (dmg && dmg.damageType) rawType = String(dmg.damageType).toLowerCase();
    }
    const color = (UITheme.colors.types && UITheme.colors.types[rawType]) || UITheme.colors.textMuted;
    return { rawType, color, label: titleCase(rawType) };
}

/** "15 STM", "Free" and the colour to write it in: what THIS character pays (AbilityPreview.getCost scales it to their pools). */
export function abilityCostLabel(ab, member, derivedStats) {
    const cost = AbilityPreview.getCost(ab, member, derivedStats);
    if (cost) {
        if (cost.hp) return { text: `${cost.hp} HP`, color: UITheme.colors.hp };
        if (cost.mana) return { text: `${cost.mana} MP`, color: UITheme.colors.ins };
        if (cost.stamina) return { text: `${cost.stamina} STM`, color: UITheme.colors.stm };
        if (cost.insight) return { text: `${cost.insight} INS`, color: UITheme.colors.ins };
    }
    return { text: 'Free', color: UITheme.colors.textMuted };
}

/** Sizes the card without drawing it (so a list can know where the next card starts, or how far it scrolls). */
export function layoutAbilityCard(ui, ab, w, opts = {}) {
    const P = ABILITY_CARD;
    const cardW = AbilityPreview.getCardWidth(w);
    const innerW = cardW - P.pad * 2;
    const chips = AbilityPreview.getStatChips(ab, opts.member || null, opts.derivedStats || null);
    // "what it does" (damage, healing: the chips drawn in the type's colour) go one to a line; the plain numbers share a grid
    const effects = chips.filter(c => c.tone === 'accent');
    const stats = chips.filter(c => c.tone !== 'accent');
    const cols = innerW >= 520 ? 4 : innerW >= 330 ? 3 : 2;
    const statRows = Math.ceil(stats.length / cols);
    const descLines = ab.description ? ui.getWrappedLines(ab.description, innerW, UITheme.fonts.cardItalic) : [];

    let h = P.pad + P.icon;
    if (effects.length || statRows) h += P.sectionGap * 2;
    h += effects.length * P.effectRowH;
    if (effects.length && statRows) h += 6;
    h += statRows * P.statRowH;
    if (descLines.length) h += P.sectionGap * 2 + descLines.length * P.descLineH - 6;
    h += P.pad;
    return { cardW, innerW, effects, stats, cols, statRows, descLines, h };
}

/**
 * Draws one card and returns the y where the next one can start.
 * @param {CanvasUI} ui
 * @param {{get:Function}|null} loader  the asset loader (the ability icon sheet)
 * @param {object} ab  the ability definition
 * @param {object} opts  x, y, w (the width available: the card is AbilityPreview.CARD_WIDTH at most)
 *                       name, source ('Innate' or the item that grants it), member + derivedStats (for the real cost and damage),
 *                       center (true: centre the card in `w`; false: left aligned)
 */
export function drawAbilityCard(ui, loader, ab, opts) {
    const P = ABILITY_CARD;
    const ctx = ui.ctx;
    const lay = layoutAbilityCard(ui, ab, opts.w, opts);
    const { cardW, innerW, effects, stats, cols, descLines, h } = lay;
    const x = opts.center ? opts.x + Math.floor((opts.w - cardW) / 2) : opts.x;
    const y = opts.y;
    const theme = abilityTheme(ab);
    const color = theme.color;
    const left = x + P.pad;
    const right = x + cardW - P.pad;

    // the plate, with a wash of the type's colour along the top and a thin frame in it
    ui.drawPanel(x, y, cardW, h, UITheme.colors.panelBg);
    ctx.save();
    const wash = ctx.createLinearGradient(x, y, x, y + h);
    wash.addColorStop(0, `${color}22`);
    wash.addColorStop(0.45, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(x + 2, y + 2, cardW - 4, h - 4);
    ctx.restore();

    // --- header: icon | name and cost | type, target, source ---
    const iconX = left, iconY = y + P.pad;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(iconX, iconY, P.icon, P.icon);
    const sheet = loader && (loader.get('abilities') || loader.get('items'));
    if (sheet) {
        const ic = ab.icon || { col: 0, row: 0 };
        ctx.imageSmoothingEnabled = false;
        ui.drawSprite(sheet, ic.col * SRC_CELL, ic.row * SRC_CELL, SRC_CELL, SRC_CELL, iconX, iconY, P.icon, P.icon);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(iconX + 0.5, iconY + 0.5, P.icon - 1, P.icon - 1);

    const textX = iconX + P.icon + P.iconGap;
    const nameY = iconY + 18;
    const cost = abilityCostLabel(ab, opts.member, opts.derivedStats);
    ui.drawText(cost.text, right, nameY, UITheme.fonts.cardSmall, cost.color, 'right', 'middle');
    const costW = (ctx.font = UITheme.fonts.cardSmall, ctx.measureText(cost.text).width);
    ui.drawText(ab.name || opts.name || ab.id || 'Ability', textX, nameY, UITheme.fonts.cardTitle, UITheme.colors.textMain, 'left', 'middle',
        right - textX - costW - 12);

    // the type as a small tag, then who it hits and where it comes from
    const subY = iconY + P.icon - 16;
    ctx.font = UITheme.fonts.cardSmall;
    const tagW = ctx.measureText(theme.label).width + 20;
    ctx.fillStyle = `${color}33`;
    ctx.fillRect(textX, subY - 14, tagW, 28);
    ctx.strokeStyle = `${color}99`;
    ctx.strokeRect(textX + 0.5, subY - 13.5, tagW - 1, 27);
    ui.drawText(theme.label, textX + tagW / 2, subY, UITheme.fonts.cardSmall, color, 'center', 'middle');
    const source = opts.source || 'Innate';
    const meta = `${AbilityPreview.getTargetText(ab.targeting)}  ·  ${source}`;
    ui.drawText(meta, textX + tagW + 12, subY, UITheme.fonts.cardSmall, UITheme.colors.textMuted, 'left', 'middle', right - (textX + tagW + 12));

    let cy = iconY + P.icon;
    const hairline = (yy) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(left, Math.round(yy) + 0.5);
        ctx.lineTo(right, Math.round(yy) + 0.5);
        ctx.stroke();
        ctx.restore();
    };

    // --- what it does, then the numbers ---
    if (effects.length || stats.length) {
        cy += P.sectionGap;
        hairline(cy);
        cy += P.sectionGap;
        const labelW = effects.length ? Math.max(...effects.map(c => (ctx.font = UITheme.fonts.cardSmall, ctx.measureText(c.label.replace(/:$/, '')).width))) + 14 : 0;
        for (const c of effects) {
            const mid = cy + P.effectRowH / 2;
            ui.drawText(c.label.replace(/:$/, ''), left, mid, UITheme.fonts.cardSmall, UITheme.colors.textMuted, 'left', 'middle');
            ui.drawText(c.value, left + labelW, mid, UITheme.fonts.cardSmall, color, 'left', 'middle', innerW - labelW);
            cy += P.effectRowH;
        }
        if (effects.length && stats.length) cy += 6;
        const cellW = innerW / cols;
        stats.forEach((c, i) => {
            const cx = left + (i % cols) * cellW;
            const mid = cy + Math.floor(i / cols) * P.statRowH + P.statRowH / 2;
            const label = c.label.replace(/:$/, '');
            ctx.font = UITheme.fonts.cardSmall;
            const lw = ctx.measureText(label).width + 8;
            ui.drawText(label, cx, mid, UITheme.fonts.cardSmall, UITheme.colors.textMuted, 'left', 'middle');
            ui.drawText(c.value, cx + lw, mid, UITheme.fonts.cardSmall, UITheme.colors.textMain, 'left', 'middle', cellW - lw - 6);
        });
        cy += lay.statRows * P.statRowH;
    }

    // --- the description ---
    if (descLines.length) {
        cy += P.sectionGap - 6;
        hairline(cy);
        cy += P.sectionGap;
        descLines.forEach((line, i) => {
            ui.drawText(line, left, cy + i * P.descLineH + P.descLineH / 2, UITheme.fonts.cardItalic, UITheme.colors.textMuted, 'left', 'middle');
        });
    }

    return y + h + P.gap;
}
