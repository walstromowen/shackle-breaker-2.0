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

        const width = this.config.CANVAS_WIDTH || 800;
        const height = this.config.CANVAS_HEIGHT || 800;

        // Draw semi-transparent background over the battle
        this.ui.drawRect(0, 0, width, height, 'rgba(0, 0, 0, 0.85)', true);

        const margin = 10;
        const columnWidth = (width / 2) - (margin * 1.5);
        const leftX = margin;
        const rightX = (width / 2) + (margin / 2);
        // Moved up since the header is gone from the top
        const startY = 20; 

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
        
        // Moved to bottom, changed color to theme highlight (amber)
        const yPos = screenHeight - 25;
        this.ui.drawText(headerText, screenWidth / 2, yPos, 'bold 11px monospace', UITheme.colors.textHighlight, 'center', 'top');
        this.ui.drawLine(20, yPos - 5, screenWidth - 20, yPos - 5, UITheme.colors.textHighlight, 1);
    }

    // --- Helpers ---
    
    // NEW: Dynamically parse equipment instead of hardcoding slots
    _getEqString(c) {
        const eqObj = c.originalEntity?.equipment || c.equipment;
        if (!eqObj) return 'None';
        
        const keys = Object.keys(eqObj);
        if (keys.length === 0) return 'None';

        const eqParts = keys.map(slot => {
            const item = eqObj[slot];
            if (!item) return null;
            
            // Get a short prefix for the slot (e.g., 'mainhand' -> 'M', 'head' -> 'H')
            const prefix = slot.charAt(0).toUpperCase();
            const itemName = typeof item === 'string' ? item : (item.name || 'Unknown');
            return `[${prefix}] ${itemName}`;
        }).filter(Boolean);

        return eqParts.length > 0 ? eqParts.join('  ') : 'None';
    }

    _unwrapStat(statObj) {
        if (statObj === undefined || statObj === null) return undefined;
        if (typeof statObj === 'object' && statObj.total !== undefined) return statObj.total;
        return statObj;
    }

    _getDamageType(c, type) {
        const typeMap = {
            'BLT': 'blunt', 'SLS': 'slashing', 'PRC': 'piercing', 'FIR': 'fire',
            'ICE': 'ice', 'LNG': 'lightning', 'WAT': 'water', 'ERT': 'earth',
            'WND': 'wind', 'LGT': 'light', 'DRK': 'dark', 'ARC': 'arcane'
        };

        const actualKey = typeMap[type] || type.toLowerCase();
        
        let atk = typeof c.getAttack === 'function' ? c.getAttack(actualKey) : '-';
        let def = typeof c.getDefense === 'function' ? c.getDefense(actualKey) : '-';

        atk = this._unwrapStat(atk) ?? '-';
        def = this._unwrapStat(def) ?? '-';

        const resRaw = c.stats?.resistances?.[actualKey] || c.stats?.resistances?.[type];
        let resVal = this._unwrapStat(resRaw);
        
        if (atk === 0) atk = '-';
        if (def === 0) def = '-';
        
        // FIXED: Round resistance to max 1 decimal place to stop repeating floats
        let resStr = '-';
        if (resVal && resVal !== 0) {
            resStr = `${Number(resVal.toFixed(1))}%`; 
        }

        return { atk, def, res: resStr };
    }

    _renderTeamTable(title, combatants, x, y, width, titleColor) {
        if (!combatants || combatants.length === 0) return;

        this.ui.drawText(title, x, y, 'bold 12px monospace', titleColor, 'left', 'top');
        y += 15;

        // Reduced height to fit 3 cards per column (125 * 3 = 375px)
        const cardHeight = 125; 
        // Slightly tighter line height to pack info
        const lineH = 11;

        combatants.forEach((c, index) => {
            if (!c) return;
            // Only draw up to 3 cards per column to prevent bleeding off the bottom
            if (index >= 3) return;

            const isDead = c.isDead();
            
            // --- CARD BACKGROUND ---
            const bgColor = isDead ? 'rgba(30, 0, 0, 0.6)' : UITheme.colors.panelBg;
            this.ui.drawPanel(x, y, width, cardHeight - 6, bgColor);
            
            if (isDead) {
                this.ui.drawRect(x, y, width, cardHeight - 6, UITheme.colors.failure, false);
            }

            let cy = y + 6;
            const cx = x + 6;
            const innerWidth = width - 12;
            const tColor = isDead ? UITheme.colors.textMuted : UITheme.colors.textMain;

            // --- 1. HEADER ---
            const lvl = c.originalEntity?.level || c.level || 1;
            this.ui.drawText(`${c.name || c.id || 'Unknown'} (Lv.${lvl})`, cx, cy, 'bold 10px monospace', tColor, 'left', 'top');
            
            const xp = c.originalEntity?.xp || 0;
            const nextXp = c.originalEntity?.nextLevelXp || 100;
            this.ui.drawText(`XP: ${xp}/${nextXp}`, x + width - 6, cy, 'bold 10px monospace', UITheme.colors.textHighlight, 'right', 'top');
            cy += lineH + 2;

            // --- 2. RESOURCES & BARS ---
            const barW = (innerWidth / 3) - 4;
            
            // HP
            const hpColor = isDead ? UITheme.colors.textMuted : UITheme.colors.hp;
            this.ui.drawText(`HP: ${Math.round(c.hp)}/${c.maxHp}`, cx, cy, '9px monospace', hpColor, 'left', 'top');
            this.ui.drawBar(cx, cy + 9, barW, 3, c.hp, c.maxHp, UITheme.colors.hp, UITheme.colors.hpDim);

            // STM
            const stmColor = isDead ? UITheme.colors.textMuted : UITheme.colors.stm;
            this.ui.drawText(`STM: ${Math.round(c.stamina)}/${c.maxStamina}`, cx + barW + 6, cy, '9px monospace', stmColor, 'left', 'top');
            this.ui.drawBar(cx + barW + 6, cy + 9, barW, 3, c.stamina, c.maxStamina, UITheme.colors.stm, UITheme.colors.stmDim);

            // INS
            const insColor = isDead ? UITheme.colors.textMuted : UITheme.colors.ins;
            this.ui.drawText(`INS: ${Math.round(c.insight)}/${c.maxInsight}`, cx + (barW * 2) + 12, cy, '9px monospace', insColor, 'left', 'top');
            this.ui.drawBar(cx + (barW * 2) + 12, cy + 9, barW, 3, c.insight, c.maxInsight, UITheme.colors.ins, UITheme.colors.insDim);
            cy += lineH + 4;

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
            
            // FIXED: Clean up floating point numbers for Criticals
            let crt = this._unwrapStat(stats.critChance) ?? 0;
            crt = Number(crt.toFixed(1)); 

            let crtDmg = this._unwrapStat(stats.critDamage) ?? 1.5;
            crtDmg = Number(crtDmg.toFixed(2)); 

            const attrStr = `VIG:${vig} STR:${str} DEX:${dex} INT:${int} ATN:${atn}`;
            const cbtStr = `SPD:${spd} CRT:${crt}% DMG:x${crtDmg}`;
            
            this.ui.drawText(`${attrStr} | ${cbtStr}`, cx, cy, '9px monospace', tColor, 'left', 'top');
            cy += lineH + 2;

            // --- 4. DAMAGE MATRIX ---
            const allTypes = ['BLT', 'SLS', 'PRC', 'FIR', 'ICE', 'LNG', 'WAT', 'ERT', 'WND', 'LGT', 'DRK', 'ARC'];
            const labelW = 20; 
            const colW = (innerWidth - labelW) / 12;

            // Matrix Background
            const tableBg = isDead ? 'rgba(20,20,20,0.5)' : UITheme.colors.bgScale[0];
            this.ui.drawRect(cx, cy - 1, innerWidth, (lineH * 4) + 2, tableBg, true);

            // Matrix Headers
            allTypes.forEach((type, i) => {
                this.ui.drawText(type, cx + labelW + (i * colW) + (colW / 2), cy, '8px monospace', tColor, 'center', 'top');
            });
            cy += lineH;

            // Matrix Rows
            const tableRows = [
                { label: 'ATK', key: 'atk', color: isDead ? UITheme.colors.textMuted : UITheme.colors.attack, bg: 'rgba(255, 140, 0, 0.05)' },
                { label: 'DEF', key: 'def', color: isDead ? UITheme.colors.textMuted : UITheme.colors.defense, bg: 'transparent' },
                { label: 'RES', key: 'res', color: isDead ? UITheme.colors.textMuted : UITheme.colors.resistance, bg: 'rgba(149, 165, 166, 0.05)' }
            ];

            tableRows.forEach(row => {
                if (row.bg !== 'transparent') {
                    this.ui.drawRect(cx, cy - 1, innerWidth, lineH, row.bg, true);
                }
                this.ui.drawText(row.label, cx + 2, cy, '8px monospace', row.color, 'left', 'top');
                
                allTypes.forEach((type, i) => {
                    const dt = this._getDamageType(c, type);
                    this.ui.drawText(String(dt[row.key]), cx + labelW + (i * colW) + (colW / 2), cy, '8px monospace', tColor, 'center', 'top');
                });
                cy += lineH;
            });
            cy += 2; 

            // --- 5. EQUIPMENT & FX ---
            // FIXED: Dynamically fetch all equipment string
            const eqStr = this._getEqString(c);
            
            const fxArr = c.statusEffects || [];
            const fxStr = fxArr.length > 0 ? fxArr.map(fx => fx.name || fx.id).join(', ') : 'None';

            this.ui.drawText(`EQ: ${eqStr}`, cx, cy, '9px monospace', tColor, 'left', 'top');
            cy += lineH;
            this.ui.drawText(`FX: ${fxStr}`, cx, cy, '9px monospace', tColor, 'left', 'top');

            y += cardHeight;
        });
    }
}