export const BattleAnimationDefinitions = { 
  "slash": { 
    duration: 1.5, 
    audio: [{ start: 0.067, key: 'swordSlashSFX', volume: 1.0 }], 
    actor: { type: 'lunge', start: 0.0, end: 0.133, distance: 120 }, 
    vfx: [ 
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'slashAbilityAnimaiton', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 1.8, rotation: 15, blendMode: 'screen' } } 
    ], 
    target: { shake: { start: 0.1, end: 0.233, intensity: 24 }, flash: { start: 0.1, end: 0.167, filter: 'brightness(250%)' } } 
  },
  "strike": { 
    duration: 1.5, 
    audio: [{ start: 0.133, key: 'strikeSFX', volume: 1.0 }], 
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 }, 
    vfx: [ 
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'strike', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.44, blendMode: 'screen' } } 
    ], 
    target: { shake: { start: 0.133, end: 0.333, intensity: 29 }, flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' } } 
  }, 
  "stab": { 
    duration: 1.5, 
    audio: [{ start: 0.133, key: 'spearStabSFX', volume: 1.0 }], 
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 }, 
    vfx: [ 
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'stab', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.2, blendMode: 'screen' } } 
    ], 
    target: { shake: { start: 0.133, end: 0.333, intensity: 29 }, flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' } } 
  }, 
  "bite": { 
    duration: 1.5, 
    audio: [{ start: 0.133, key: 'crunchSFX', volume: 1.0 }], 
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 }, 
    vfx: [ 
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'bite', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.56, blendMode: 'multiply' } } 
    ], 
    target: { shake: { start: 0.133, end: 0.333, intensity: 29 }, flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' } } 
  }, 
  "magic_missile": { 
    duration: 1.5, 
    audio: [{ start: 0.0, key: 'magicCast1SFX' }, { start: 0.533, key: 'arcaneDartSFX' }], 
    actor: { flash: { start: 0.0, end: 0.2, filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' } }, 
    background: { start: 0.0, end: 1.0, key: 'arcaneVortexBg' },
    vfx: [ 
      { start: 0.2, type: 'travel', origin: 'source', config: { life: 0.4, sheetKey: 'arcaneDart', frameCount: 1, frameSize: 64, arc: -144, rotation: 'auto', scale: 1.2, blendMode: 'screen' } } 
    ], 
    target: { shake: { start: 0.4, end: 0.6, intensity: 24 }, flash: { start: 0.4, end: 0.533, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' } } 
  }, 
  "poison": { 
    duration: 2.0, 
    audio: [ { start: 0.1, key: 'bubbleSFX', volume: 0.6, pitch: 1.2 } ], 
    vfx: [ 
      { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poison', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6 } }, 
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poison', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.75 } }, 
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poison', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.45 } } 
    ], 
    target: { flash: { start: 0.0, end: 0.75, filter: 'brightness(110%) saturate(160%) hue-rotate(100deg)' } } 
  }, 
  "earthquake": { 
    duration: 4.0, 
    background: { start: 0.063, end: 3.5, key: 'earthquakeFissureBg', filter: 'sepia(60%) brightness(75%) saturate(110%)' },
    audio: [ 
      { start: 0.063, key: 'earthquake1SFX', volume: 1.0 }, 
      { start: 0.125, key: 'earthquake2SFX', volume: 1.0 }, 
      { start: 0.2, key: 'earthquake3SFX', volume: 1.0 }, 
    ], 
    vfx: [ 
      { start: 0.3, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'earthquake', frameCount: 1, frameSize: 64, arc: 720, rotation: 45, scale: 0.6 } }, 
      { start: 0.375, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'earthquake', frameCount: 1, frameSize: 64, arc: -600, rotation: 120, scale: 0.75 } }, 
      { start: 0.45, type: 'travel', origin: 'source', config: { life: 0.8, sheetKey: 'earthquake', frameCount: 1, frameSize: 64, arc: 840, rotation: -45, scale: 0.5 } } 
    ], 
    target: { shake: { start: 0.063, end: 3.6, intensity: 72 }, flash: { start: 0.2, end: 0.8, filter: 'sepia(80%) brightness(60%) saturate(120%)' } } 
  }, 
  "trait_activate": { 
    duration: 1.2, 
    audio: [ { start: 0.0, key: 'bubbleSFX', volume: 0.8 } ], 
    target: { shake: { start: 0.0, end: 0.3, intensity: 10 }, flash: { start: 0.0, end: 0.4, filter: 'brightness(250%) saturate(150%)' } }, 
  }, 
  "melee_lunge": { 
    duration: 1.5, 
    audio: [ { start: 0.0, key: 'swordSlashSFX', pitch: 1.1 }, { start: 0.133, key: 'swordSlashSFX', volume: 1.0 } ], 
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 }, 
    target: { shake: { start: 0.133, end: 0.333, intensity: 29 }, flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' } } 
  }, 
  "default_attack": { 
    duration: 0.5, 
    audio: [{ start: 0.2, key: 'SFX_BLUNT_HIT' }], 
    target: { flash: { start: 0.2, end: 0.6, filter: 'brightness(200%)' } } 
  }, 
  "weatherRain": { 
    duration: 2.5, 
    audio: [ { start: 0.04, key: 'weatherRainShort', volume: 0.8 } ], 
    background: { start: 0.0, end: 1.0, key: 'current', filter: 'brightness(50%) saturate(60%) sepia(20%) hue-rotate(200deg)' }, 
    target: { flash: { start: 0.08, end: 0.88, filter: 'brightness(80%) saturate(70%) sepia(30%) hue-rotate(180deg)' } } 
  }, 
  "faint": { 
    duration: 2.0, 
    audio: [ { start: 0.0, key: 'faintDropSFX', volume: 0.8 }, { start: 0.1, key: 'windFaintSFX', volume: 1.0 } ], 
    actor: { type: 'shake', start: 0.0, end: 0.75, intensity: 19, fade: { start: 0.1, end: 0.9 }, flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' } }, 
    vfx: [ 
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.3, blendMode: 'screen' } }, 
      { start: 0.25, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6, blendMode: 'screen' } }, 
      { start: 0.3, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.4, blendMode: 'screen' } }, 
      { start: 0.4, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 0.2, blendMode: 'screen' } }, 
      { start: 0.5, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.5, blendMode: 'screen' } } 
    ], 
    target: { flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' } } 
  }, 
  "abyssal_void": { 
    duration: 3.0, 
    audio: [{ start: 0.033, key: 'darkMagicSFX', volume: 1.0 }], 
    background: { start: 0.067, end: 0.933, key: 'voidBackground', filter: 'brightness(80%) sepia(50%) hue-rotate(250deg)' }, 
    actor: { flash: { start: 0.067, end: 0.933, filter: 'brightness(150%) hue-rotate(250deg)' } }, 
    target: { shake: { start: 0.333, end: 0.833, intensity: 36 }, flash: { start: 0.333, end: 0.833, filter: 'invert(100%)' } } 
  }, 
  "enter_battle": { 
    duration: 1.5, 
    audio: [ { start: 0.1, key: 'summonSFX', volume: 0.8 }, { start: 0.4, key: 'landSFX', volume: 0.6 } ], 
    actor: { type: 'slide_in', start: 0.0, end: 0.5, distance: 240, fadeIn: { start: 0.0, end: 0.4 }, flash: { start: 0.4, end: 0.7, filter: 'brightness(200%)' } }, 
  }, 
  "flee": { 
    duration: 1.5, 
    audio: [ { start: 0.0, key: 'runAwaySFX', volume: 1.0 } ], 
    actor: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } }, 
    target: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } } 
  } 
};