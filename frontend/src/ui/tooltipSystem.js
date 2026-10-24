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
    this.TITLE_W = 128;      // the width of a block's heading in the item card
    this.CELL_H = 32;        // one row of the item card's number cells
    this.SECTION_GAP = 18;   // between the blocks of the item card
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
        lines.push({ text: this._formatEffect(effectObj), color: UITheme.colors.textMain });
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

  /* An item's numbers, grouped the way a player reads them: Attack, Defense, Resist, Attributes, Resources. Types with the same value are folded
     into one cell ("Physical 3%", "Magic 1%", or "All types 3%") so armour no longer prints twelve resistance lines. Returns
     [{ title, items: [{ label, val, color }] }]. */
  _groupStatSections(items) {
    const PHYS = ['blunt', 'slash', 'pierce'];
    const plain = (i) => ({ label: i.abbr || i.label, val: i.val, color: i.color });
    const same = (list) => list.length > 0 && list.every(i => i.val === list[0].val);
    // typed rows (one per damage type) fold by family; anything else keeps its own cell
    const fold = (list) => {
      if (list.length >= 4 && same(list)) return [{ label: 'All types', val: list[0].val, color: UITheme.colors.textMain }];
      const phys = list.filter(i => PHYS.includes(i.typeKey));
      const magic = list.filter(i => i.typeKey && !PHYS.includes(i.typeKey));
      const rest = list.filter(i => !i.typeKey);
      const out = [];
      if (phys.length >= 3 && same(phys)) out.push({ label: 'Physical', val: phys[0].val, color: UITheme.colors.textMain });
      else out.push(...phys.map(plain));
      if (magic.length >= 3 && same(magic)) out.push({ label: 'Magic', val: magic[0].val, color: UITheme.colors.textMain });
      else out.push(...magic.map(plain));
      out.push(...rest.map(plain));
      return out;
    };
    const by = (g) => items.filter(i => i.group === g);
    const sections = [];
    const add = (title, list) => { if (list.length) sections.push({ title, items: list }); };
    add('Attack', fold(by('attack')));
    add('Defense', fold(by('defense')));
    add('Resist', fold(by('resistance')));
    add('Attributes', by('attribute').map(plain));
    add('Resources', by('resource').map(plain));
    add('Tool', by('tool').map(plain));
    return sections;
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
        label: 'TOOL',
        val: formattedTools,
        color: UITheme.colors.textHighlight || "#ffd700",
        group: 'tool', abbr: 'TOOL'
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
        for (const sec of rawLine.sections) gridHeight += this._sectionHeight(sec.items.length, this._sectionCols(sec.items));
        if (rawLine.abilities.length) gridHeight += this._sectionHeight(rawLine.abilities.length, 2);
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

        const wLines = this.ui.getWrappedLines(textStr, this.WIDTH - (this.PADDING * 2), f);
        wLines.forEach(l => {
          wrappedLines.push({ text: l, font: f, color: c });
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
        this.ui.drawText(lineObj.text, tx + this.PADDING, curY, lineObj.font || bodyFont, lineObj.color || UITheme.colors.textMain, "left");
        curY += lineHeight;
      }
    });
  }

  // How many columns a block's cells can have: three when every "label value" fits in a third, else two, else one
  _sectionCols(items) {
    const inner = this.WIDTH - this.PADDING * 2 - this.TITLE_W;
    this.ui.ctx.font = UITheme.fonts.cardSmall;
    const need = Math.max(...items.map(it => this.ui.ctx.measureText(it.label).width + this.ui.ctx.measureText(String(it.val)).width + 22));
    for (const cols of [3, 2]) if (need <= (inner - 16 * (cols - 1)) / cols) return cols;
    return 1;
  }

  // Height of one block of the item card: `count` cells in `cols` columns, plus the gap under it
  _sectionHeight(count, cols) {
    return Math.ceil(count / cols) * this.CELL_H + this.SECTION_GAP;
  }

  /* The item's numbers and skills: each block is a small muted heading on the left and its cells in three even columns beside it
       Defense   BLT 4     SLS 4     PRC 3
       Resist    Physical 3%         Magic 1%
     with a faint line above each block, so a long card stays easy to scan. The skills follow, two to a row, each with its icon. */
  _drawSections(lineObj, tx, y, font) {
    const ctx = this.ui.ctx;
    const left = tx + this.PADDING;
    const inner = this.WIDTH - this.PADDING * 2;
    const TITLE_W = this.TITLE_W, GAP_X = 16;
    const hairline = (yy) => {
      ctx.save();
      ctx.strokeStyle = UITheme.colors.textMuted;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(left, Math.round(yy) + 0.5);
      ctx.lineTo(left + inner, Math.round(yy) + 0.5);
      ctx.stroke();
      ctx.restore();
    };
    let cy = y;
    const mid = (row) => cy + row * this.CELL_H + 4;   // baseline of a row of cells
    lineObj.sections.forEach((sec, si) => {
      const COLS = this._sectionCols(sec.items);
      const cellW = (inner - TITLE_W - GAP_X * (COLS - 1)) / COLS;
      if (si > 0) hairline(cy - this.SECTION_GAP / 2 - 12);
      this.ui.drawText(sec.title, left, mid(0), font, UITheme.colors.textMuted, 'left');
      sec.items.forEach((it, i) => {
        const x = left + TITLE_W + (i % COLS) * (cellW + GAP_X);
        const by = mid(Math.floor(i / COLS));
        this.ui.drawText(it.label, x, by, font, it.color || UITheme.colors.textMuted, 'left');
        // wide cells keep the value next to its label; narrow ones line the values up on the right
        if (COLS >= 3) this.ui.drawText(String(it.val), x + cellW, by, font, UITheme.colors.textMain, 'right');
        else this.ui.drawText(String(it.val), x + (ctx.font = font, ctx.measureText(it.label).width) + 14, by, font, UITheme.colors.textMain, 'left');
      });
      cy += this._sectionHeight(sec.items.length, COLS);
    });
    if (lineObj.abilities.length) {
      if (lineObj.sections.length) hairline(cy - this.SECTION_GAP / 2 - 12);
      this.ui.drawText('Skills', left, mid(0), font, UITheme.colors.textMuted, 'left');
      const colW = (inner - TITLE_W) / 2;
      lineObj.abilities.forEach((ab, i) => {
        const x = left + TITLE_W + (i % 2) * colW;
        const by = mid(Math.floor(i / 2));
        let textX = x;
        const sheet = this.loader && (this.loader.get('abilities') || this.loader.get('icons') || this.loader.get('items'));
        if (ab.icon && sheet && typeof ab.icon === 'object' && ab.icon.col !== undefined) {
          const src = this.ICON_SRC_SIZE;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sheet, ab.icon.col * src, ab.icon.row * src, src, src, x, by - 21, 26, 26);
          textX += 34;
        }
        this.ui.drawText(ab.name, textX, by, font, ab.color, 'left', 'alphabetic', colW - (textX - x) - 8);
      });
      cy += this._sectionHeight(lineObj.abilities.length, 2);
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