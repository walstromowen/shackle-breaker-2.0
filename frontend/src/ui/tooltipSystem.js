import { UITheme } from './UITheme.js';
import { TRAIT_DEFINITIONS } from '../../../shared/abilities/traitDefinitions.js';
import { Formatting } from '../../../shared/core/formatting.js';
import { ItemDefinitions } from '../../../shared/items/itemDefinitions.js';
import { AbilityDefinitions } from '../../../shared/abilities/abilityDefinitions.js';

export class TooltipSystem {
  constructor(ui, loader = null) {
    this.ui = ui;
    this.loader = loader;

    this.WIDTH = 528;
    this.PADDING = 29;
    this.ICON_SRC_SIZE = 64; // Icon sprite sheet cell size (upgraded from 32)
    this.ROW_H = 30;         // one row of the item card's tables
  }

  render(state, hitboxes) {
    if (state && state.loader) {
      this.loader = state.loader;
    }

    let hovered = null;

    // 1. PRIORITIZE KEYBOARD STATE: Grab the actively focused hitbox ID from the controller
    if (state && state.hoveredHitboxId) {
      hovered = hitboxes.find(b => b.id === state.hoveredHitboxId);
    }

    // 2. FALLBACK TO MOUSE: If no active ID, check physical mouse collision
    if (!hovered && state.mouse) {
      const mx = state.mouse.x;
      const my = state.mouse.y;
      for (let i = hitboxes.length - 1; i >= 0; i--) {
        const b = hitboxes[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          hovered = b;
          break;
        }
      }
    }

    if (!hovered) return;

    let content = null;

    if (hovered.type === 'trait') {
      content = this._getTraitContent(hovered.id);
    } else if (hovered.type === 'inventory') {
      const item = state.filteredInventory[hovered.index];
      if (item) content = this._getItemContent(item);
    } else if (hovered.type === 'hotbar') {
      if (hovered.defId) content = this._getItemContent({ defId: hovered.defId });
    } else if (hovered.type === 'slot') {
      const equip = (state.member.state && state.member.state.equipment) ? state.member.state.equipment : state.member.equipment;
      const item = equip ? equip[hovered.slotId] : null;
      content = this._getItemContent(item, hovered.slotId);
    }

    if (content) {
      // Anchor to the top-right corner of the actual slot
      const anchorX = hovered.x + hovered.w;
      const anchorY = hovered.y;
      this._drawTooltip(content, anchorX, anchorY, hovered);
    }
  }

  _chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // Helper: Formats numbers, adding + signs if requested, and converts decimals to percentages.
  _formatValue(val, forceSign = false) {
    if (typeof val !== 'number') return val;

    let isDecimal = val % 1 !== 0;
    let displayVal = isDecimal ? +(val * 100).toFixed(1) : val;

    let str = '';
    if (forceSign && displayVal > 0) str += '+';
    str += displayVal;
    if (isDecimal) str += '%';

    return str;
  }

  // Helper: Gets color based on stat key/name
  _getStatColor(rawKey) {
    if (!rawKey) return UITheme.colors.textMain;
    const k = rawKey.toLowerCase();

    // Exact matches
    if (UITheme.colors[k]) return UITheme.colors[k];
    if (UITheme.colors.types && UITheme.colors.types[k]) return UITheme.colors.types[k];

    // Fuzzy matches for common attributes and resources
    if (k.includes('hp') || k.includes('health')) return UITheme.colors.hp || "#8c1c1c";
    if (k.includes('stm') || k.includes('stamina')) return UITheme.colors.stm || "#4a5d4e";
    if (k.includes('ins') || k.includes('insight')) return UITheme.colors.ins || "#4a5b70";
    if (k.includes('atk') || k.includes('attack') || k.includes('damage')) return UITheme.colors.attack || "#9e1a1a";
    if (k.includes('def') || k.includes('block')) return UITheme.colors.defense || "#4a5b70";
    if (k.includes('res')) return UITheme.colors.resistance || "#8a8578";

    return UITheme.colors.textMain;
  }

  _getTraitContent(traitId) {
    const def = TRAIT_DEFINITIONS[traitId] || { name: traitId, description: "Unknown trait." };
    const lines = [];

    // Pairs the stat blocks into a 2-column grid; returns the number of rows pushed
    const pushStatGrid = (items) => {
      this._chunkArray(items, 2).forEach(chunk => lines.push({ type: 'row', items: chunk }));
    };

    // Description first so the card reads "what it is" -> "what it does"
    if (def.description) {
      lines.push({ text: def.description, font: UITheme.fonts.cardItalic, color: UITheme.colors.textMuted });
    }

    const baseStats = this._collectTraitStats(def);
    if (baseStats.length > 0) {
      if (lines.length > 0) lines.push({ type: 'spacer' });
      pushStatGrid(baseStats);
    }

    if (def.conditionalStats) {
      if (lines.length > 0) lines.push({ type: 'spacer' });
      lines.push({
        text: this._formatCondition(def.conditionalStats.condition),
        font: UITheme.fonts.cardItalic,
        color: UITheme.colors.textHighlight
      });
      const condStats = this._collectTraitStats(def.conditionalStats);
      if (condStats.length > 0) pushStatGrid(condStats);
    }

    if (def.triggers) {
      for (const [triggerName, effectObj] of Object.entries(def.triggers)) {
        if (lines.length > 0) lines.push({ type: 'spacer' });
        const cleanTrigger = triggerName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        lines.push({ text: cleanTrigger, font: UITheme.fonts.cardItalic, color: UITheme.colors.textHighlight });
        const castAb = effectObj && typeof effectObj === 'object' && effectObj.ability ? (AbilityDefinitions && AbilityDefinitions[effectObj.ability]) : null;
        lines.push({ text: this._formatEffect(effectObj), color: UITheme.colors.textMain, ...(castAb ? { ability: castAb.icon || { col: 0, row: 0 } } : {}) });
      }
    }

    return {
      title: def.name,
      type: "Trait",
      color: UITheme.colors.borderHighlight,
      roomy: true,
      lines: lines
    };
  }

  // Flattens attributes + stats (combat/resources/attack/defense/resistance) into label/value pairs
  _collectTraitStats(src) {
    const statItems = [];

    if (src.attributes) {
      for (const [key, val] of Object.entries(src.attributes)) {
        if (typeof val !== 'number' || val === 0) continue;
        statItems.push({
          label: Formatting.getAbbreviation(key).toUpperCase(),
          val: this._formatValue(val, true),
          color: this._getStatColor(key)
        });
      }
    }

    if (src.stats) {
      const categories = ['combat', 'resources', 'attack', 'defense', 'resistance'];
      categories.forEach(cat => {
        if (!src.stats[cat]) return;
        for (const [key, val] of Object.entries(src.stats[cat])) {
          if (typeof val !== 'number' || val === 0) continue;
          let label = Formatting.getAbbreviation(key).toUpperCase();
          if (cat === 'attack') label = `${label} ATK`;
          if (cat === 'defense') label = `${label} DEF`;
          if (cat === 'resistance') label = `${label} RES`;

          statItems.push({
            label: label,
            val: this._formatValue(val, true),
            color: this._getStatColor(key)
          });
        }
      });
    }

    return statItems;
  }

  _formatCondition(condition) {
    if (!condition) return "Conditional";
    const m = String(condition).match(/^hp_below_(\d+)_percent$/);
    if (m) return `While HP is below ${m[1]}%`;
    if (condition === 'hp_full') return "While at full HP";
    const clean = String(condition).replace(/_/g, ' ').replace(/\bpercent\b/g, '%');
    return `While ${clean}`;
  }

  _titleCase(str) {
    return String(str).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  _formatEffect(effectObj) {
    if (typeof effectObj === 'string') return effectObj;
    if (!effectObj) return '';

    // Trigger traits cast an ability - say which one and who it lands on
    if (effectObj.ability) {
      const abDef = AbilityDefinitions ? AbilityDefinitions[effectObj.ability] : null;
      const abName = (abDef && abDef.name) ? abDef.name : this._titleCase(effectObj.ability);
      const target = effectObj.target ? ` on a ${String(effectObj.target).replace(/_/g, ' ')}` : '';
      return `Casts ${abName}${target}.`;
    }

    const name = effectObj.effect ? this._titleCase(effectObj.effect) : 'Effect';
    const val = effectObj.value ? ` (${effectObj.value})` : '';
    return `${name}${val}`;
  }

  /* An item's numbers, laid out the way the character sheet lays out a character's: one TYPE / ATK / DEF / RES table with a row for each damage type the
     item touches, then short two-column blocks for what has no damage type (Attributes, Resources, Combat, Tool). Returns
     { table: { cols: ['atk', 'def', 'res'] (only those with a number), rows: [{ type, label, atk, def, res }] } | null,
       blocks: [{ title, items: [{ label, val, color }] }] }. */
  _groupStatSections(items) {
    const ORDER = ['blunt', 'slash', 'pierce', 'fire', 'ice', 'lightning', 'water', 'earth', 'wind', 'light', 'dark', 'arcane'];
    const COL = { attack: 'atk', defense: 'def', resistance: 'res' };
    const plain = (i) => ({ label: i.abbr || i.label, val: i.val, color: i.color });
    const byType = new Map();
    for (const i of items) {
      const col = COL[i.group];
      if (!col || !i.typeKey) continue;
      if (!byType.has(i.typeKey)) byType.set(i.typeKey, { type: i.typeKey, label: Formatting.getAbbreviation(i.typeKey).toUpperCase(), name: this._titleCase(i.typeKey) });
      const row = byType.get(i.typeKey);
      if (row[col] === undefined) row[col] = i.val;   // a shield's block shares the DEF column with its defense: the first figure stays
    }
    const rows = [...byType.values()].sort((x, y) => (ORDER.indexOf(x.type) + 1 || 99) - (ORDER.indexOf(y.type) + 1 || 99));
    const cols = ['atk', 'def', 'res'].filter(c => rows.some(r => r[c] !== undefined));
    const by = (g) => items.filter(i => i.group === g);
    const blocks = [];
    const add = (title, list) => { if (list.length) blocks.push({ title, items: list }); };
    add('Combat', items.filter(i => (i.group === 'attack' || i.group === 'defense' || i.group === 'resistance') && !i.typeKey).map(plain));
    add('Attributes', by('attribute').map(plain));
    add('Resources', by('resource').map(plain));
    add('Tool', by('tool').map(plain));
    return { table: rows.length ? { cols, rows } : null, blocks };
  }

  _getItemContent(item, slotName) {
    if (!item) {
      if (slotName) {
        return {
          title: "Empty Slot",
          type: slotName.toUpperCase(),
          color: UITheme.colors.textMuted,
          lines: ["No item equipped."]
        };
      }
      return null;
    }

    let def = item;
    if (item.defId) def = ItemDefinitions[item.defId];
    else if (item.definition) def = item.definition;
    if (!def) return null;

    const lines = [];

    // Who is wearing it (only set for equipped gear listed in the workshop)
    if (item.equippedBy) {
      const slotLabel = item.equippedSlot
        ? ` (${String(item.equippedSlot).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())})`
        : '';
      lines.push({ text: `Equipped by ${item.equippedBy}${slotLabel}`, font: UITheme.fonts.cardItalic, color: UITheme.colors.textHighlight });
      lines.push({ type: 'spacer' });
    }

    // 1. Title Meta Parsing
    let typeText = (def.type || "Item").toUpperCase();
    if (def.slot) typeText += ` - ${def.slot.toUpperCase()}`;

    const itemLevel = item.level || def.level || def.itemLevel;

    // 2. Data Gathering (Stats)
    const statItems = [];

    const getStatVal = (key) => {
      if (typeof item[key] === 'function') return item[key];
      if (item.stats && item.stats[key] !== undefined) return item.stats[key];
      if (item[key] !== undefined) return item[key];
      if (def.stats && def.stats[key] !== undefined) return def.stats[key];
      if (def[key] !== undefined) return def[key];
      return undefined;
    };

    // Abbreviated labels only (ATK / DEF / BLK) - never the spelled-out "ATTACK" / "DEFENSE"
    const primaryStats = [
      { key: 'damage', label: 'ATK' },
      { key: 'attack', label: 'ATK' },
      { key: 'defense', label: 'DEF' },
      { key: 'block', label: 'BLK' }
    ];

    primaryStats.forEach(stat => {
      const val = getStatVal(stat.key);
      if (val === undefined || val === null) return;
      if (typeof val === 'object' && typeof val.min === 'undefined' && Object.keys(val).length === 0) return;

      if (typeof val === 'object' && val.min === undefined) {
        // Per-type attack/defense tables are listed by the category pass below ("SLA ATK", "BLU DEF"),
        // so skip them here or every value would appear twice.
        if (stat.key === 'attack' || stat.key === 'defense') return;

        Object.keys(val).forEach(typeKey => {
          const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(typeKey) : typeKey.substring(0, 3)).toUpperCase();
          statItems.push({
            label: `${typeAbbr} ${stat.label}`,
            val: this._formatValue(val[typeKey]),
            color: this._getStatColor(typeKey),
            group: stat.key === 'block' || stat.key === 'defense' ? 'defense' : 'attack', typeKey, abbr: typeAbbr
          });
        });
        return;
      }

      let valStr = val;
      if (typeof val === 'object' && val.min !== undefined) {
        valStr = `${this._formatValue(val.min)}-${this._formatValue(val.max)}`;
      } else {
        valStr = this._formatValue(val);
      }

      statItems.push({ label: stat.label, val: valStr, color: this._getStatColor(stat.key),
        group: stat.key === 'block' || stat.key === 'defense' ? 'defense' : 'attack', abbr: stat.label });
    });

    ['attack', 'defense', 'resistance'].forEach(category => {
      const catObj = getStatVal(category);
      if (!catObj || typeof catObj !== 'object') return;

      Object.keys(catObj).forEach(k => {
        if (k === 'min' || k === 'max' || catObj[k] === 0) return;

        const typeAbbr = (Formatting.getAbbreviation ? Formatting.getAbbreviation(k) : k.substring(0, 3)).toUpperCase();
        const catAbbr = category === 'resistance' ? 'RES' : (category === 'defense' ? 'DEF' : 'ATK');

        statItems.push({
          label: `${typeAbbr} ${catAbbr}`,
          val: this._formatValue(catObj[k]),
          color: this._getStatColor(k),
          group: category, typeKey: k, abbr: typeAbbr
        });
      });
    });

    const baseAttrs = def.attributes || (def.stats ? def.stats.attributes : {}) || {};
    const itemAttrs = item.attributes || (item.stats ? item.stats.attributes : {}) || {};
    const attributes = { ...baseAttrs, ...itemAttrs };

    const baseRes = def.resources || {};
    const itemRes = item.resources || {};
    const resources = { ...baseRes, ...itemRes };

    Object.keys(attributes).forEach(key => {
      const val = attributes[key];
      if (val === 0) return;
      const label = (Formatting.getAbbreviation ? Formatting.getAbbreviation(key) : key.substring(0, 3)).toUpperCase();
      statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key), group: 'attribute', abbr: label });
    });

    Object.keys(resources).forEach(key => {
      const val = resources[key];
      if (val === 0) return;

      let label = key.toUpperCase();
      if (key === 'maxHp') label = "MAX HP";
      else if (key === 'maxStamina') label = "MAX STM";
      else if (key === 'maxInsight') label = "MAX INS";
      else if (key === 'hpRecovery') label = "HP REC";
      else if (key === 'staminaRecovery') label = "STM REC";
      else if (key === 'insightRecovery') label = "INS REC";

      statItems.push({ label: label, val: this._formatValue(val, true), color: this._getStatColor(key), group: 'resource', abbr: label });
    });

    // ==========================================
    // Harvest Tool Extraction (harvestTool Array)
    // ==========================================
    const rawHarvestTools = item.harvestTool || def.harvestTool;
    if (rawHarvestTools && Array.isArray(rawHarvestTools) && rawHarvestTools.length > 0) {
      const formattedTools = rawHarvestTools
        .map(t => String(t).replace(/_/g, ' ').toUpperCase())
        .join(', ');

      statItems.push({
        label: 'Harvests',
        val: this._titleCase(formattedTools.toLowerCase()),
        color: UITheme.colors.textHighlight || "#ffd700",
        group: 'tool', abbr: 'Harvests'
      });
    }

    // 3. Data Gathering (Abilities)
    const abilityLines = [];
    const rawAbilities = item.grantedAbilities || def.grantedAbilities || item.abilities || def.abilities || (def.useAbility ? [def.useAbility] : null);

    if (rawAbilities && rawAbilities.length > 0) {
      rawAbilities.forEach(ab => {
        let name = "";
        let icon = null;
        let abColor = UITheme.colors.textMain;
        let abDef = null;

        if (typeof ab === 'object' && ab !== null) {
          name = ab.name || ab.id;
          icon = ab.icon || null;
          if (ab.id && AbilityDefinitions) abDef = AbilityDefinitions[ab.id];
        } else if (typeof ab === 'string') {
          if (AbilityDefinitions) abDef = AbilityDefinitions[ab];
          name = abDef?.name || ab;
          icon = abDef?.icon || null;
        }

        let typeFound = null;
        const sources = [abDef, ab];

        for (const src of sources) {
          if (!src) continue;

          if (src.damageType) { typeFound = src.damageType; break; }
          if (src.element) { typeFound = src.element; break; }

          if (src.effects && Array.isArray(src.effects)) {
            for (const eff of src.effects) {
              if (eff.damageType) { typeFound = eff.damageType; break; }
              if (eff.element) { typeFound = eff.element; break; }
            }
          }
          if (typeFound) break;
        }

        if (!typeFound) {
          for (const src of sources) {
            if (src && src.type) {
              typeFound = src.type;
              break;
            }
          }
        }

        if (typeFound && typeof typeFound === 'string') {
          const key = typeFound.toLowerCase();
          if (UITheme.colors.types && UITheme.colors.types[key]) {
            abColor = UITheme.colors.types[key];
          } else if (UITheme.colors.damageTypes && UITheme.colors.damageTypes[key]) {
            abColor = UITheme.colors.damageTypes[key];
          } else if (UITheme.colors[key]) {
            abColor = UITheme.colors[key];
          }
        }

        if (name) abilityLines.push({ name: name, icon: icon, color: abColor });
      });
    }

    // 4. Implement Stats (Left) / Abilities (Right) Split Grid
    if (statItems.length > 0 || abilityLines.length > 0) {
      lines.push({ type: 'sections', sections: this._groupStatSections(statItems), abilities: abilityLines });
      lines.push({ type: 'spacer' });
    }

    // 5. Descriptions
    if (def.effectDescription) {
      lines.push({ text: def.effectDescription, color: UITheme.colors.textMain });
    }
    if (def.description) {
      lines.push({ text: `"${def.description}"`, font: UITheme.fonts.cardItalic, color: UITheme.colors.textMuted });
    }

    return {
      title: def.name || item.name,
      type: typeText,
      color: this._getRarityColor(def.rarity),
      weight: def.weight,
      value: item.value !== undefined ? item.value : def.value,
      level: itemLevel,
      lines: lines
    };
  }

  _drawTooltip(content, anchorX, anchorY, hoveredHitbox) {
    const { title, type, color, weight, value, level, lines } = content;

    const headerFont = UITheme.fonts.cardTitle;
    const typeFont = UITheme.fonts.cardItalic;
    const bodyFont = UITheme.fonts.cardSmall;
    // "roomy" cards (traits) get looser leading, real gaps between sections and bottom padding
    const roomy = !!content.roomy;
    const lineHeight = roomy ? 33 : 28;
    const spacerHeight = roomy ? 16 : 8;

    this.ui.ctx.font = bodyFont;

    // 1. Calculate Height & Wrap Objects
    let contentHeight = 108 + (roomy ? 16 : 0);   // the header (title, type line, rule) and the padding under the last line
    const wrappedLines = [];

    lines.forEach(rawLine => {
      if (rawLine.type === 'row') {
        wrappedLines.push({ ...rawLine, isRow: true });
        contentHeight += lineHeight;
      } else if (rawLine.type === 'sections') {
        // the item's numbers in short labelled blocks, then its skills (see _drawSections)
        let gridHeight = 0;
        if (rawLine.sections.table) gridHeight += this._blockHeight(rawLine.sections.table.rows.length, this.ROW_H);
        for (const blk of rawLine.sections.blocks) gridHeight += this._blockHeight(Math.ceil(blk.items.length / 2), this.ROW_H);
        if (rawLine.abilities.length) gridHeight += this._blockHeight(Math.ceil(rawLine.abilities.length / 2), this.ROW_H + 2);
        wrappedLines.push({ ...rawLine });
        contentHeight += gridHeight;
      } else if (rawLine.type === 'spacer') {
        // Pushed so the gap is applied between sections (it used to only grow the card's bottom edge)
        wrappedLines.push({ isSpacer: true });
        contentHeight += spacerHeight;
      } else {
        let textStr = typeof rawLine === 'string' ? rawLine : rawLine.text;
        let f = (typeof rawLine === 'object' && rawLine.font) ? rawLine.font : bodyFont;
        let c = (typeof rawLine === 'object' && rawLine.color) ? rawLine.color : UITheme.colors.textMain;

        const iconed = typeof rawLine === 'object' && rawLine.ability;   // a line about an ability: its picture sits to the left
        const wLines = this.ui.getWrappedLines(textStr, this.WIDTH - (this.PADDING * 2) - (iconed ? 40 : 0), f);
        wLines.forEach((l, k) => {
          wrappedLines.push({ text: l, font: f, color: c, ...(iconed ? { indent: 40, icon: k === 0 ? rawLine.ability : null } : {}) });
          contentHeight += lineHeight;
        });
      }
    });

    // 2. Smart Dynamic Positioning
    const screenW = this.ui.ctx.canvas.width;
    const screenH = this.ui.ctx.canvas.height;
    const gap = 16;

    let tx = anchorX + gap;
    let ty = anchorY;

    if (tx + this.WIDTH > screenW) {
      tx = hoveredHitbox.x - this.WIDTH - gap;
    }
    if (ty + contentHeight > screenH) {
      ty = screenH - contentHeight - 24;
    }
    if (ty < 24) ty = 24;

    // 3. Draw Gothic Panel
    this.ui.ctx.save();
    this.ui.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    this.ui.ctx.shadowBlur = 29;
    this.ui.ctx.shadowOffsetX = 10;
    this.ui.ctx.shadowOffsetY = 10;
    this.ui.drawPanel(tx, ty, this.WIDTH, contentHeight, "rgba(15, 15, 18, 0.98)");
    this.ui.ctx.restore();

    // 4. Draw Header Banner Background
    const inset = 10;
    this.ui.ctx.save();
    this.ui.ctx.fillStyle = color;
    this.ui.ctx.globalAlpha = 0.12;
    this.ui.ctx.fillRect(tx + inset + 2, ty + inset + 2, this.WIDTH - (inset * 2) - 4, 68);
    this.ui.ctx.restore();

    // 5. Draw Header Text
    this.ui.drawText(title, tx + this.PADDING, ty + 42, headerFont, color, "left");

    if (level !== undefined) {
      this.ui.drawText(`Lv. ${level}`, tx + this.WIDTH - this.PADDING, ty + 42, headerFont, UITheme.colors.textHighlight, "right");
    }

    this.ui.drawText(type, tx + this.PADDING, ty + 70, typeFont, UITheme.colors.textMuted, "left");

    if (weight !== undefined || value !== undefined) {
      const rightMeta = [];
      if (weight !== undefined) rightMeta.push(`Wt: ${weight}`);
      if (value !== undefined) rightMeta.push(`Val: ${value}`);
      this.ui.drawText(rightMeta.join("   "), tx + this.WIDTH - this.PADDING, ty + 70, bodyFont, UITheme.colors.textMuted, "right");
    }

    // Header Bottom Border Line
    this.ui.ctx.save();
    this.ui.ctx.strokeStyle = color;
    this.ui.ctx.globalAlpha = 0.6;
    this.ui.ctx.beginPath();
    this.ui.ctx.moveTo(tx + inset + 2, ty + 82);
    this.ui.ctx.lineTo(tx + this.WIDTH - inset - 2, ty + 82);
    this.ui.ctx.stroke();
    this.ui.ctx.restore();

    // 6. Draw Body Text & Grid Layout
    let curY = ty + 112;

    wrappedLines.forEach(lineObj => {
      if (lineObj.isSpacer) {
        curY += spacerHeight;
      } else if (lineObj.isRow) {
        const numCols = 2;
        const fullWidth = this.WIDTH - (this.PADDING * 2);
        // A lone item spans the whole card so its label and value can't collide in a half-width column
        const colWidth = lineObj.items.length === 1 ? fullWidth : fullWidth / numCols;

        lineObj.items.forEach((item, idx) => {
          const startX = tx + this.PADDING + (idx * colWidth);
          let endX = startX + colWidth;
          if (idx < numCols - 1 && lineObj.items.length > 1) endX -= 24;

          this.ui.drawText(item.label, startX, curY, bodyFont, item.color || UITheme.colors.textMuted, "left");
          this.ui.drawText(item.val.toString(), endX, curY, bodyFont, item.color || UITheme.colors.textMain, "right");
        });
        curY += lineHeight;
      } else if (lineObj.type === 'sections') {
        curY = this._drawSections(lineObj, tx, curY, bodyFont);
      } else if (lineObj.text) {
        this.ui.ctx.font = lineObj.font || bodyFont;
        if (lineObj.icon) this._drawAbilityIcon(lineObj.icon, tx + this.PADDING, curY - 24, 30);
        this.ui.drawText(lineObj.text, tx + this.PADDING + (lineObj.indent || 0), curY, lineObj.font || bodyFont, lineObj.color || UITheme.colors.textMain, "left");
        curY += lineHeight;
      }
    });
  }

  /* An ability's picture from the ability sheet (the same cells the ability cards use), `size` px square at x, y: a thin frame round it so the sheet's own
     dark corners read as an icon. An ability with no icon of its own gets the sheet's first cell, as on the cards. */
  _drawAbilityIcon(icon, x, y, size) {
    const sheet = this.loader && (this.loader.get('abilities') || this.loader.get('items'));
    if (!sheet) return;
    const ic = (icon && typeof icon === 'object' && icon.col !== undefined) ? icon : { col: 0, row: 0 };
    const ctx = this.ui.ctx, src = this.ICON_SRC_SIZE;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, size, size);
    ctx.drawImage(sheet, ic.col * src, ic.row * src, src, src, x, y, size, size);
    ctx.strokeStyle = 'rgba(194, 161, 79, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    ctx.restore();
  }

  // Height of one block of the item card: its heading and rule, `rows` rows, and the gap under it
  _blockHeight(rows, rowH) {
    return 38 + (rows - 1) * rowH + 36;
  }

  /* The item's numbers and skills, laid out like the character sheet's stat table. A block is a muted capitalised heading over a faint rule, then its rows:
       TYPE            ATK     DEF     RES          ATTRIBUTES
       Slash            3       -       -           STR            +2      VIG    +1
       Fire             -       2      5%
     Only the columns an item uses are shown, in the same places the sheet puts them. Skills follow, two to a row, each with its icon. */
  _drawSections(lineObj, tx, y, font) {
    const ctx = this.ui.ctx;
    const left = tx + this.PADDING;
    const inner = this.WIDTH - this.PADDING * 2;
    const mono = UITheme.fonts.cardMono;
    const ROW_H = this.ROW_H;
    const colX = { atk: left + inner * 0.5, def: left + inner * 0.7, res: left + inner * 0.9 };
    const colName = { atk: 'Atk', def: 'Def', res: 'Res' };
    const colColor = { atk: UITheme.colors.attack, def: UITheme.colors.defense, res: UITheme.colors.resistance };
    const header = (cy, title, cols) => {
      this.ui.drawStyled('tableHeader', title, left, cy + 4, { font, tracking: 2 });
      for (const c of cols || []) this.ui.drawStyled('tableHeader', colName[c], colX[c], cy + 4, { font, tracking: 2, color: colColor[c], align: 'center' });
      this.ui.drawLineWithGothicFlourish(left, cy + 14, inner, UITheme.colors.borderHighlight);
    };
    const rowY = (cy, i, rowH = ROW_H) => cy + 38 + i * rowH;
    let cy = y;
    const sec = lineObj.sections;
    if (sec.table) {
      header(cy, 'Type', sec.table.cols);
      sec.table.rows.forEach((r, i) => {
        const by = rowY(cy, i);
        this.ui.drawText(r.label, left, by, mono, UITheme.colors.textMuted, 'left');
        for (const c of sec.table.cols) {
          const v = r[c];
          this.ui.drawText(v === undefined ? '-' : String(v), colX[c], by, mono, v === undefined ? UITheme.colors.textMuted : (c === 'res' ? UITheme.colors.textMain : colColor[c]), 'center');
        }
      });
      cy += this._blockHeight(sec.table.rows.length, ROW_H);
    }
    const colW = inner / 2;
    for (const blk of sec.blocks) {
      header(cy, blk.title);
      blk.items.forEach((it, i) => {
        const x = left + (i % 2) * colW, by = rowY(cy, Math.floor(i / 2));
        this.ui.drawText(it.label, x, by, mono, UITheme.colors.textMuted, 'left');
        this.ui.drawText(String(it.val), x + colW - 28, by, mono, UITheme.colors.textMain, 'right');
      });
      cy += this._blockHeight(Math.ceil(blk.items.length / 2), ROW_H);
    }
    if (lineObj.abilities.length) {
      header(cy, 'Skills');
      lineObj.abilities.forEach((ab, i) => {
        const x = left + (i % 2) * colW;
        const by = rowY(cy, Math.floor(i / 2), ROW_H + 2);
        const textX = x + 40;
        this._drawAbilityIcon(ab.icon, x, by - 25, 30);
        this.ui.drawText(ab.name, textX, by, font, ab.color, 'left', 'alphabetic', colW - 40 - 8);
      });
      cy += this._blockHeight(Math.ceil(lineObj.abilities.length / 2), ROW_H + 2);
    }
    return cy;
  }

  _getRarityColor(rarity) {
    switch ((rarity || "").toLowerCase()) {
      case 'common':    return "#ffffff";
      case 'uncommon':  return "#1eff00";
      case 'rare':      return "#0070dd";
      case 'epic':      return "#a335ee";
      case 'legendary': return "#ff8000";
      default:          return UITheme.colors.textMuted;
    }
  }
}