import { CanvasUI } from '../../ui/canvasUI.js';
import { UITheme } from '../../ui/UITheme.js';

export class BattleDebuggerRenderer {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.ui = new CanvasUI(ctx);
    }

    render(state) {
        if (!state) return;

        const width = this.config.CANVAS_WIDTH || 1920;
        const height = this.config.CANVAS_HEIGHT || 1080;

        // Draw semi-transparent background over the battle
        this.ui.drawRect(0, 0, width, height, 'rgba(0, 0, 0, 0.85)', true);

        const margin = 24; 
        const columnWidth = (width / 2) - (margin * 1.5);
        const leftX = margin;
        const rightX = (width / 2) + (margin / 2);

        const startY = 48; 

        // Cyan/Blue for Allies, Failure Red for Enemies
        this._renderTeamTable('ALLIES (ACTIVE PARTY)', state.activeParty, leftX, startY, columnWidth, '#00ffff');
        this._renderTeamTable('ENEMIES', state.activeEnemies, rightX, startY, columnWidth, UITheme.colors.failure);

        // Render header at the bottom now
        this._renderGlobalHeader(state, width, height);
    }

    _renderGlobalHeader(state, screenWidth, screenHeight) {
        const actionName = state.selectedAction ? state.selectedAction.name : 'None';
        const targetCount = state.selectedTargets?.length || 0;
        const headerText = `[ BATTLE DEBUG ]  PHASE: ${state.phase}  |  TIMER: ${state.timer?.toFixed(2) || 0}s  |  QUEUE: ${state.turnQueue?.length || 0}  |  ACTION: ${actionName}  |  TARGETS: ${targetCount}`;

        const yPos = screenHeight - 60; 
        this.ui.drawText(headerText, screenWidth / 2, yPos, 'bold 26px monospace', UITheme.colors.textHighlight, 'center', 'top'); 
        this.ui.drawLine(48, yPos - 12, screenWidth - 48, yPos - 12, UITheme.colors.textHighlight, 1); 
    }

    // --- Helpers ---

    _getEqLines(c) {
        const eqObj = c.originalEntity?.equipment || c.equipment;
        if (!eqObj) return ['EQ: None'];
        const keys = Object.keys(eqObj);
        if (keys.length === 0) return ['EQ: None'];

        const eqParts = keys.map(slot => {
            const item = eqObj[slot];
            if (!item) return null;

            let prefix = slot.substring(0, 2).toUpperCase(); 
            if (slot === 'mainhand') prefix = 'MH';
            if (slot === 'offhand') prefix = 'OH';
            if (slot === 'ring1') prefix = 'R1';
            if (slot === 'ring2') prefix = 'R2';
            if (slot === 'head') prefix = 'HD';
            if (slot === 'chest') prefix = 'CH';
            if (slot === 'legs') prefix = 'LG';
            if (slot === 'feet') prefix = 'FT';
            if (slot === 'neck') prefix = 'NK';

            const itemName = typeof item === 'string' ? item : (item.name || 'Unknown');
            return `[${prefix}] ${itemName}`;
        }).filter(Boolean);

        if (eqParts.length === 0) return ['EQ: None'];

        const lines = [];
        let currentLine = 'EQ: ';
        const MAX_CHARS_PER_LINE = 70; // Slightly wider tolerance

        eqParts.forEach(part => {
            if (currentLine.length + part.length + 2 > MAX_CHARS_PER_LINE && currentLine !== 'EQ: ') {
                lines.push(currentLine);
                currentLine = '    '; // Indent continuation lines
            }
            currentLine += part + '  ';
        });

        if (currentLine.trim().length > 0) {
            lines.push(currentLine);
        }

        return lines;
    }

    _unwrapStat(statObj) {
        if (statObj === undefined || statObj === null) return undefined;
        if (typeof statObj === 'object' && statObj.total !== undefined) return statObj.total;
        return statObj;
    }

    _getDamageType(c, type) {
        const typeMap = {
            'BLT': 'blunt', 'SLS': 'slash', 'PRC': 'pierce',
            'FIR': 'fire', 'ICE': 'ice', 'LNG': 'lightning',
            'WAT': 'water', 'ERT': 'earth', 'WND': 'wind',
            'LGT': 'light', 'DRK': 'dark', 'ARC': 'arcane'
        };

        const actualKey = typeMap[type] || type.toLowerCase();
        let atk = typeof c.getAttack === 'function' ? c.getAttack(actualKey) : '-';
        let def = typeof c.getDefense === 'function' ? c.getDefense(actualKey) : '-';
        
        atk = this._unwrapStat(atk) ?? '-';
        def = this._unwrapStat(def) ?? '-';

        let resRaw = c.stats?.resistance?.[actualKey] || 0;
        let resVal = this._unwrapStat(resRaw);

        if (atk === 0) atk = '-';
        if (def === 0) def = '-';
        
        let resStr = '-';
        if (typeof resVal === 'number' && !isNaN(resVal)) {
            if (resVal === 0) {
                resStr = '0%';
            } else {
                resStr = `${Number((resVal * 100).toFixed(1))}%`;
            }
        }

        return { atk, def, res: resStr };
    }

    _renderTeamTable(title, combatants, x, y, width, titleColor) {
        if (!combatants || combatants.length === 0) return;

        this.ui.drawText(title, x, y, 'bold 29px monospace', titleColor, 'left', 'top'); 
        y += 36; 

        // REDUCED height to 290 so 3 cards easily fit on a 1080p screen
        const cardHeight = 290; 
        const lineH = 24; // Tightened line height

        combatants.forEach((c, index) => {
            if (!c) return;
            if (index >= 3) return;

            const isDead = c.isDead();
            const bgColor = isDead ? 'rgba(30, 0, 0, 0.6)' : UITheme.colors.panelBg;
            
            this.ui.drawPanel(x, y, width, cardHeight - 10, bgColor); 
            if (isDead) {
                this.ui.drawRect(x, y, width, cardHeight - 10, UITheme.colors.failure, false);
            }

            let cy = y + 10; // Tightened top padding
            const cx = x + 14; 
            const innerWidth = width - 29; 
            const tColor = isDead ? UITheme.colors.textMuted : UITheme.colors.textMain;

            // --- 1. HEADER ---
            const lvl = c.originalEntity?.level || c.level || 1;
            this.ui.drawText(`${c.name || c.id || 'Unknown'} (Lv.${lvl})`, cx, cy, 'bold 22px monospace', tColor, 'left', 'top'); 
            
            const xp = c.originalEntity?.xp || 0;
            const nextXp = c.originalEntity?.nextLevelXp || 100;
            this.ui.drawText(`XP: ${xp}/${nextXp}`, x + width - 14, cy, 'bold 22px monospace', UITheme.colors.textHighlight, 'right', 'top'); 
            cy += lineH + 4; // Tightened gap

            // --- 2. RESOURCES & BARS ---
            const barW = (innerWidth / 3) - 10; 
            
            const hpColor = isDead ? UITheme.colors.textMuted : UITheme.colors.hp;
            this.ui.drawText(`HP: ${Math.round(c.hp)}/${c.maxHp}`, cx, cy, '20px monospace', hpColor, 'left', 'top'); 
            this.ui.drawBar(cx, cy + 20, barW, 6, c.hp, c.maxHp, UITheme.colors.hp, UITheme.colors.hpDim); 

            const stmColor = isDead ? UITheme.colors.textMuted : UITheme.colors.stm;
            this.ui.drawText(`STM: ${Math.round(c.stamina)}/${c.maxStamina}`, cx + barW + 14, cy, '20px monospace', stmColor, 'left', 'top'); 
            this.ui.drawBar(cx + barW + 14, cy + 20, barW, 6, c.stamina, c.maxStamina, UITheme.colors.stm, UITheme.colors.stmDim); 

            const insColor = isDead ? UITheme.colors.textMuted : UITheme.colors.ins;
            this.ui.drawText(`INS: ${Math.round(c.insight)}/${c.maxInsight}`, cx + (barW * 2) + 29, cy, '20px monospace', insColor, 'left', 'top'); 
            this.ui.drawBar(cx + (barW * 2) + 29, cy + 20, barW, 6, c.insight, c.maxInsight, UITheme.colors.ins, UITheme.colors.insDim); 
            cy += lineH + 8; 

            // --- 3. CORE ATTRIBUTES & CBT ---
            const baseAttrs = c.originalEntity?.attributes || {};
            const stats = c.stats || {};
            
            const getAttr = (fullWord, abbr) => {
                return this._unwrapStat(stats[fullWord]) ?? this._unwrapStat(stats[abbr]) ?? baseAttrs[fullWord] ?? 0;
            };

            const vig = getAttr('vigor', 'vig');
            const str = getAttr('strength', 'str');
            const dex = getAttr('dexterity', 'dex');
            const int = getAttr('intelligence', 'int');
            const atn = getAttr('attunement', 'atn');

            const spd = this._unwrapStat(stats.speed) ?? '?';
            const eva = this._unwrapStat(stats.evasion) ?? 100;
            
            let crt = this._unwrapStat(stats.critChance) ?? 0;
            crt = Number((crt * 100).toFixed(1));
            let crtDmg = this._unwrapStat(stats.critDamage) ?? 1.5;
            crtDmg = Number(crtDmg.toFixed(2));

            const attrStr = `VIG:${vig} STR:${str} DEX:${dex} INT:${int} ATN:${atn}`;
            const cbtStr = `SPD:${spd} EVA:${eva} CRT:${crt}% DMG:x${crtDmg}`;

            this.ui.drawText(`${attrStr} | ${cbtStr}`, cx, cy, '20px monospace', tColor, 'left', 'top'); 
            cy += lineH + 4; 

            // --- 4. DAMAGE MATRIX ---
            const allTypes = ['BLT', 'SLS', 'PRC', 'FIR', 'ICE', 'LNG', 'WAT', 'ERT', 'WND', 'LGT', 'DRK', 'ARC'];
            const labelW = 48; 
            const colW = (innerWidth - labelW) / 12;

            const tableBg = isDead ? 'rgba(20,20,20,0.5)' : UITheme.colors.bgScale[0];
            this.ui.drawRect(cx, cy - 2, innerWidth, (lineH * 4) + 2, tableBg, true); 

            allTypes.forEach((type, i) => {
                this.ui.drawText(type, cx + labelW + (i * colW) + (colW / 2), cy, '18px monospace', tColor, 'center', 'top'); 
            });
            cy += lineH;

            const tableRows = [
                { label: 'ATK', key: 'atk', color: isDead ? UITheme.colors.textMuted : UITheme.colors.attack, bg: 'rgba(255, 140, 0, 0.05)' },
                { label: 'DEF', key: 'def', color: isDead ? UITheme.colors.textMuted : UITheme.colors.defense, bg: 'transparent' },
                { label: 'RES', key: 'res', color: isDead ? UITheme.colors.textMuted : UITheme.colors.resistance, bg: 'rgba(149, 165, 166, 0.05)' }
            ];

            tableRows.forEach(row => {
                if (row.bg !== 'transparent') {
                    this.ui.drawRect(cx, cy - 2, innerWidth, lineH, row.bg, true); 
                }
                this.ui.drawText(row.label, cx + 5, cy, '18px monospace', row.color, 'left', 'top'); 
                allTypes.forEach((type, i) => {
                    const dt = this._getDamageType(c, type);
                    this.ui.drawText(String(dt[row.key]), cx + labelW + (i * colW) + (colW / 2), cy, '18px monospace', tColor, 'center', 'top'); 
                });
                cy += lineH;
            });
            cy += 4; 

            // --- 5. EQUIPMENT & FX ---
            const eqLines = this._getEqLines(c);
            eqLines.forEach((line) => {
                this.ui.drawText(line, cx, cy, '18px monospace', tColor, 'left', 'top');
                cy += 20; // Specific tight padding for equipment lines
            });
            
            cy += 2; 

            const fxArr = c.statusEffects || [];
            const fxStr = fxArr.length > 0 ? fxArr.map(fx => fx.name || fx.id).join(', ') : 'None';
            this.ui.drawText(`FX: ${fxStr}`, cx, cy, '18px monospace', tColor, 'left', 'top'); 
            
            y += cardHeight;
        });
    }
}