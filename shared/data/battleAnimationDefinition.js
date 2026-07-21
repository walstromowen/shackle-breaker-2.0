export const BattleAnimationDefinitions = {
  "slash": {
    duration: 1.5,
    audio: [{ start: 0.067, key: 'slashSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.133, distance: 120 },
    vfx: [
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'slashAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 1.8, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.1, end: 0.233, intensity: 24 },
      flash: { start: 0.1, end: 0.167, filter: 'brightness(250%)' }
    }
  },
  "strike": {
    duration: 1.5,
    audio: [{ start: 0.133, key: 'strikeSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
    vfx: [
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'strikeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.44, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.133, end: 0.333, intensity: 29 },
      flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
    }
  },
  "stab": {
    duration: 1.5,
    audio: [{ start: 0.133, key: 'stabSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
    vfx: [
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'stabAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.2, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.133, end: 0.333, intensity: 29 },
      flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
    }
  },
  "bite": {
    duration: 1.5,
    audio: [{ start: 0.133, key: 'crunchSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
    vfx: [
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'biteAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.56, blendMode: 'multiply' } }
    ],
    target: {
      shake: { start: 0.133, end: 0.333, intensity: 29 },
      flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
    }
  },
  "arcane_dart": {
    duration: 1.5,
    audio: [{ start: 0.533, key: 'arcaneDartSfx' }], // Omitted non-existent 'magicCast1SFX'
    actor: {
      flash: { start: 0.0, end: 0.2, filter: 'brightness(200%) hue-rotate(180deg) saturate(300%)' }
    },
    background: { start: 0.0, end: 1.0, key: 'arcaneVortexBg' },
    vfx: [
      { start: 0.2, type: 'travel', origin: 'source', config: { life: 0.4, sheetKey: 'arcaneDartAnimation', frameCount: 4, frameSize: 64, scale: 2, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.4, end: 0.6, intensity: 24 },
      flash: { start: 0.4, end: 0.533, filter: 'brightness(300%) sepia(50%) hue-rotate(180deg)' }
    }
  },
  "poison": {
    duration: 2.0,
    audio: [
      { start: 0.1, key: 'poisonSfx', volume: 0.6, pitch: 1.2 } // Swapped 'bubbleSFX' for valid 'poisonSfx'
    ],
    vfx: [
      { start: 0.05, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6 } },
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.75 } },
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.4, sheetKey: 'poisonAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.45 } }
    ],
    target: {
      flash: { start: 0.0, end: 0.75, filter: 'brightness(110%) saturate(160%) hue-rotate(100deg)' }
    }
  },
  "earthquake": {
    duration: 4.0, 
    audio: [
      { start: 0.063, key: 'earthquake1Sfx', volume: 1.0 },
      { start: 0.125, key: 'earthquake2Sfx', volume: 1.0 },
      { start: 0.2, key: 'earthquake3Sfx', volume: 1.0 },
    ],
    vfx: [
      // Spawns multiple expanding animations on the targets to simulate a rumbling eruption
      { start: 0.2, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.0 } },
      { start: 0.4, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 2.5 } },
      { start: 0.6, type: 'spawn', origin: 'target', config: { life: 0.8, sheetKey: 'earthquakeAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.8 } }
    ],
    target: {
      shake: { start: 0.063, end: 3.6, intensity: 72 },
      flash: { start: 0.2, end: 0.8, filter: 'sepia(80%) brightness(60%) saturate(120%)' }
    }
  },
  "trait_activate": {
    duration: 1.2, // Omitted 'bubbleSFX' (no audio array remaining)
    target: {
      shake: { start: 0.0, end: 0.3, intensity: 10 },
      flash: { start: 0.0, end: 0.4, filter: 'brightness(250%) saturate(150%)' }
    },
  },
  "melee_lunge": {
    duration: 1.5,
    audio: [
      { start: 0.0, key: 'slashSfx', pitch: 1.1 },
      { start: 0.133, key: 'slashSfx', volume: 1.0 }
    ],
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 96 },
    target: {
      shake: { start: 0.133, end: 0.333, intensity: 29 },
      flash: { start: 0.133, end: 0.267, filter: 'brightness(200%) sepia(100%) hue-rotate(300deg) saturate(300%)' }
    }
  },
  "default_attack": {
    duration: 0.5,
    audio: [{ start: 0.2, key: 'strikeSfx' }], // Swapped 'SFX_BLUNT_HIT' for valid 'strikeSfx'
    target: {
      flash: { start: 0.2, end: 0.6, filter: 'brightness(200%)' }
    }
  },
  "weatherRain": {
    duration: 2.5,
    audio: [
      { start: 0.04, key: 'weatherRainShort', volume: 0.8 }
    ],
    target: {
      flash: { start: 0.08, end: 0.88, filter: 'brightness(80%) saturate(70%) sepia(30%) hue-rotate(180deg)' }
    }
  },
  "faint": {
    duration: 2.0, // Omitted non-existent audio clips ('faintDropSFX' and 'windFaintSFX')
    actor: {
      type: 'shake', start: 0.0, end: 0.75, intensity: 19,
      fade: { start: 0.1, end: 0.9 },
      flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' }
    },
    vfx: [
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.3, blendMode: 'screen' } },
      { start: 0.25, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.6, blendMode: 'screen' } },
      { start: 0.3, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.4, blendMode: 'screen' } },
      { start: 0.4, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 0.2, blendMode: 'screen' } },
      { start: 0.5, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 0.5, blendMode: 'screen' } }
    ],
    target: {
      flash: { start: 0.0, end: 0.9, filter: 'sepia(80%) brightness(200%) blur(4px)' }
    }
  },
  "enter_battle": {
    duration: 1.5,
    audio: [
      
    ],
    actor: {
      type: 'slide_in', start: 0.0, end: 0.5, distance: 240,
      fadeIn: { start: 0.0, end: 0.4 },
      flash: { start: 0.4, end: 0.7, filter: 'brightness(200%)' }
    }
  },
  "flee": {
    duration: 1.5,
    audio: [
      { start: 0.0, key: 'retreatSfx', volume: 1.0 } // Swapped missing 'runAwaySFX' for valid 'retreatSfx'
    ],
    actor: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } },
    target: { type: 'slide_out', start: 0.0, end: 1.2, distance: 360, fade: { start: 0.4, end: 1.2 } }
  },
  "punch": {
    duration: 1.0,
    audio: [{ start: 0.1, key: 'punchSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 80 },
    vfx: [
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.25, sheetKey: 'punchAnimation', frameCount: 1, frameSize: 64, movement: 'expand_and_fade', scale: 1.3, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.1, end: 0.25, intensity: 18 },
      flash: { start: 0.1, end: 0.2, filter: 'brightness(180%)' }
    }
  },

  "uppercut": {
    duration: 1.2,
    audio: [{ start: 0.133, key: 'punchSfx', volume: 1.1, pitch: 0.9 }],
    actor: { type: 'lunge', start: 0.0, end: 0.2, distance: 90 },
    vfx: [
      { start: 0.133, type: 'spawn', origin: 'target', config: { life: 0.35, sheetKey: 'uppercutAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 1.5, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.133, end: 0.4, intensity: 26 },
      flash: { start: 0.133, end: 0.267, filter: 'brightness(220%)' }
    }
  },

  "cleave": {
    duration: 1.5,
    audio: [{ start: 0.08, key: 'cleaveSfx', volume: 1.0 }],
    actor: { type: 'lunge', start: 0.0, end: 0.15, distance: 130 },
    vfx: [
      // Uses slashAnimation scaled up broadly to simulate a sweeping cleave effect
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.3, sheetKey: 'slashAnimation', frameCount: 1, frameSize: 64, movement: 'swipe_diagonal', scale: 2.6, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.1, end: 0.35, intensity: 32 },
      flash: { start: 0.1, end: 0.25, filter: 'brightness(200%) sepia(30%)' }
    }
  },

  "acid_pool": {
    duration: 2.2,
    audio: [{ start: 0.05, key: 'acidPoolSfx', volume: 1.0 }],
    vfx: [
      { start: 0.0, type: 'spawn', origin: 'target', config: { life: 1.8, sheetKey: 'acidPoolAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 2.0, blendMode: 'normal' } },
      { start: 0.3, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'acidicSmogAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 1.2 } }
    ],
    target: {
      shake: { start: 0.1, end: 0.8, intensity: 8 },
      flash: { start: 0.05, end: 1.5, filter: 'hue-rotate(70deg) saturate(180%) brightness(110%)' }
    }
  },

  "fireball": {
    duration: 1.5, 
    audio: [
      { start: 0.0, key: 'fireballCastSfx', volume: 1.0 },
    ],
    actor: {
      // Caster lights up as they cast the fireball
      flash: { start: 0.0, end: 0.2, filter: 'brightness(250%) sepia(100%) hue-rotate(10deg)' }
    },
    vfx: [
      // Projectile travels from source to target
      { 
        start: 0.2, 
        type: 'travel', 
        origin: 'source', 
        config: { 
          life: 0.4, 
          sheetKey: 'fireballAnimation', 
          frameCount: 4, // Matched arcane_dart's frame count for a dynamic projectile
          frameSize: 64, 
          scale: 2.0, 
          blendMode: 'screen' 
        } 
      }
    ],
    target: {
      // Impact triggers exactly as the travel life hits the target
      shake: { start: 0.4, end: 0.6, intensity: 28 },
      flash: { start: 0.4, end: 0.6, filter: 'brightness(250%) sepia(100%) hue-rotate(350deg) saturate(500%)' }
    }
  },
  "ice_bolt": {
  duration: 1.5,
  audio: [
    { start: 0.0, key: 'iceBoltCastSfx', volume: 1.0 },
    { start: 1.0, key: 'iceBoltImpactSfx', volume: 1.0 }
  ],
  actor: {
    // Caster lights up with a cyan/icy blue glow as they channel the spell
    flash: { 
      start: 0.0, 
      end: 0.2, 
      filter: 'brightness(200%) sepia(100%) hue-rotate(190deg) saturate(300%)' 
    }
  },
  vfx: [
    { 
      // Dynamic 4-frame projectile traveling from source to target
      start: 0.2, 
      type: 'travel', 
      origin: 'source', 
      config: { 
        life: 0.4, 
        sheetKey: 'iceBoltAnimation', 
        frameCount: 4, 
        frameSize: 64, 
        scale: 2.0, 
        blendMode: 'screen' 
      } 
    }
  ],
  target: {
    // Impact triggers exactly as the travel life hits the target
    shake: { 
      start: 0.4, 
      end: 0.6, 
      intensity: 28 
    },
    flash: { 
      // A bright, freezing blast of cyan/blue upon impact
      start: 0.4, 
      end: 0.6, 
      filter: 'brightness(250%) sepia(100%) hue-rotate(190deg) saturate(500%)' 
    }
  }
},
  "reckless_charge": {
  duration: 1.6,
  audio: [
    { start: 0.0, key: 'recklessChargeSfx', volume: 0.8, pitch: 1.0 },     // Sudden burst of motion/charging speed
  ],
  actor: {
    type: 'lunge',
    start: 0.0,
    end: 0.12,
    distance: 160, // Massive momentum charging across the screen
    flash: { 
      start: 0.15, 
      end: 0.45, 
      filter: 'brightness(130%) sepia(100%) hue-rotate(330deg) saturate(400%)' // Flashes red to show recoil damage
    }
  },
  vfx: [
    { 
      // Large impact blast on the target enemy
      start: 0.12, 
      type: 'spawn', 
      origin: 'target', 
      config: { 
        life: 0.4, 
        sheetKey: 'strikeAnimation', 
        frameCount: 1, 
        frameSize: 64, 
        movement: 'expand_and_fade', 
        scale: 2.4, 
        blendMode: 'screen' 
      } 
    },
    { 
      // Recoil damage burst appearing directly on the user (source)
      start: 0.15, 
      type: 'spawn', 
      origin: 'source', 
      config: { 
        life: 0.3, 
        sheetKey: 'bleedAnimation', 
        frameCount: 1, 
        frameSize: 64, 
        movement: 'static', 
        scale: 1.1, 
        blendMode: 'screen' 
      } 
    }
  ],
  target: {
    shake: { start: 0.12, end: 0.55, intensity: 48 }, // Violent, high-intensity impact shake
    flash: { start: 0.12, end: 0.32, filter: 'brightness(250%)' }
  }
},
"eviscerate": {
  duration: 1.5,
  audio: [
    { start: 0.1, key: 'slashSfx', volume: 1.0 },
    { start: 0.2, key: 'eviscerateSfx', volume: 1.0 }
  ],
  actor: {
    type: 'lunge', 
    start: 0.0, 
    end: 0.15, 
    distance: 140 
  },
  vfx: [
    {
      start: 0.1, 
      type: 'spawn', 
      origin: 'target', 
      config: { 
        life: 0.35, 
        sheetKey: 'eviscerateAnimation', 
        frameCount: 1, 
        frameSize: 64, 
        movement: 'swipe_diagonal', 
        scale: 2.2, 
        blendMode: 'screen' 
      }
    }
  ],
  target: {
    shake: { 
      start: 0.1, 
      end: 0.5, 
      intensity: 38 
    },
    flash: { 
      start: 0.1, 
      end: 0.6, 
      filter: 'brightness(160%) sepia(100%) hue-rotate(330deg) saturate(500%)' 
    }
  }
},
"spirit_reap": {
  duration: 4,
  audio: [
    { start: 0.0, key: 'spiritReapSfx', volume: 1.0 } 
  ],
  actor: {
    type: 'lunge', 
    start: 0.0, 
    end: 0.15, 
    distance: 80, 
    flash: { 
      // Delayed the caster's stamina absorption flash to trigger after the long drain
      start: 3.5, 
      end: 4, 
      filter: 'brightness(180%) saturate(200%) hue-rotate(120deg)' 
    }
  },
  vfx: [
    {
      start: 0.12, 
      type: 'spawn', 
      origin: 'target', 
      config: { 
        life: 3, // Extended life to match the new duration
        sheetKey: 'spiritReapAnimation', 
        frameCount: 1, 
        frameSize: 64, 
        movement: 'expand_and_fade', // Causes the VFX to grow over its lifetime
        scale: 2.5, // Increased max scale for a more dramatic growth
        blendMode: 'screen' 
      }
    }
  ],
  target: {
    shake: { 
      // Extended the shake to last the entire 4.5 seconds the VFX is growing
      start: 0.12, 
      end: 4, 
      intensity: 25 
    },
    flash: { 
      // Extended the target's color drain to match the struggle
      start: 0.12, 
      end: 4, 
      filter: 'brightness(130%) sepia(60%) hue-rotate(270deg) saturate(80%)' 
    }
  }
},

  "abyssal_void": { 
    duration: 3.0, 
    audio: [{ start: 0.033, key: 'darkMagicSFX', volume: 1.0 }], 
    background: { start: 0.067, end: 0.933, key: 'voidBackground', filter: 'brightness(80%) sepia(50%) hue-rotate(250deg)' }, 
    actor: { flash: { start: 0.067, end: 0.933, filter: 'brightness(150%) hue-rotate(250deg)' } }, 
    target: { shake: { start: 0.333, end: 0.833, intensity: 36 }, flash: { start: 0.333, end: 0.833, filter: 'invert(100%)' } } 
  }, 
  "bleed": {
    duration: 1.5,
    audio: [
      // Lower pitch slash sound to simulate a squelch or tearing
      { start: 0.1, key: 'slashSfx', volume: 0.6, pitch: 0.7 } 
    ],
    vfx: [
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 0.5, sheetKey: 'bleedAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 0.8, blendMode: 'screen' } }
    ],
    target: {
      shake: { start: 0.1, end: 0.3, intensity: 10 },
      // Deep red flash
      flash: { start: 0.1, end: 0.6, filter: 'brightness(120%) sepia(100%) hue-rotate(330deg) saturate(400%)' } 
    }
  },

  "burn": {
    duration: 2.0,
    audio: [
      // Higher pitch fireball cast to simulate sizzling/crackling flames
      { start: 0.1, key: 'fireballCastSfx', volume: 0.5, pitch: 1.3 }
    ],
    vfx: [
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.6, sheetKey: 'burnAnimation', frameCount: 1, frameSize: 64, movement: 'float_up_and_pop', scale: 0.9, blendMode: 'screen' } },
    ],
    target: {
      shake: { start: 0.1, end: 0.6, intensity: 8 },
      // Bright orange/yellow flash
      flash: { start: 0.05, end: 0.8, filter: 'brightness(180%) sepia(100%) hue-rotate(15deg) saturate(350%)' } 
    }
  },
  "paralyzed": {
    duration: 1.5,
    audio: [
      // High-pitched crackle/zap sound
      { start: 0.1, key: 'shock', volume: 0.6, pitch: 1.8 },
      { start: 0.5, key: 'shock', volume: 0.4, pitch: 1.9 }
    ],
    vfx: [
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.2, blendMode: 'screen' } },
      { start: 0.5, type: 'spawn', origin: 'target', config: { life: 0.2, sheetKey: 'particles', frameCount: 1, frameSize: 64, movement: 'static', scale: 0.8, blendMode: 'screen' } }
    ],
    target: {
      // Jerky, sporadic shaking to simulate spasms
      shake: { start: 0.1, end: 0.8, intensity: 12 },
      // Bright yellow/white electric flashes
      flash: { start: 0.1, end: 0.8, filter: 'brightness(250%) sepia(100%) hue-rotate(45deg) saturate(500%)' } 
    }
  },

  "bound": {
    duration: 1.5,
    audio: [
      // Low-pitched crunch to simulate tightening ropes or vines
      { start: 0.1, key: 'strike', volume: 0.7, pitch: 0.5 }
    ],
    vfx: [
      { start: 0.15, type: 'spawn', origin: 'target', config: { life: 1.0, sheetKey: 'boundAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.5, blendMode: 'multiply' } }
    ],
    target: {
      // Very slight, muffled shake as if struggling
      shake: { start: 0.1, end: 0.5, intensity: 4 },
      // Darkish, muted tint to simulate being covered/entangled
      flash: { start: 0.1, end: 1.2, filter: 'brightness(70%) sepia(60%) hue-rotate(80deg) saturate(120%)' } 
    }
  },

  "frozen": {
    duration: 2.0,
    audio: [
      // High-pitched, abrupt sound to simulate ice snapping/freezing solid
      { start: 0.05, key: 'stabSfx', volume: 0.8, pitch: 2.0 }
    ],
    vfx: [
      { start: 0.1, type: 'spawn', origin: 'target', config: { life: 1.5, sheetKey: 'frozenAnimation', frameCount: 1, frameSize: 64, movement: 'static', scale: 1.8, blendMode: 'screen' } }
    ],
    target: {
      // Extremely brief, rigid shake (shiver) that stops abruptly
      shake: { start: 0.05, end: 0.2, intensity: 10 },
      // Persistent icy blue tint
      flash: { start: 0.05, end: 1.8, filter: 'brightness(140%) sepia(100%) hue-rotate(190deg) saturate(250%)' } 
    }
  },
  "bolster": {
    duration: 1.2,
    audio: [
      // A resonant, energetic hum or barrier activation sound
      { start: 0.05, key: 'strikeSfx', volume: 1.0 }
    ],
    actor: {
      // A quick brighten on the caster as the barrier is summoned
      flash: { start: 0.0, end: 0.2, filter: 'brightness(180%) saturate(150%)' }
    },
    vfx: [
      {
        // A large shield bubble appearing on the player
        start: 0.05,
        type: 'spawn',
        origin: 'target', // In context of a self-buff ability like Bolster, 'target' is the caster
        config: {
          life: 0.5, // Total duration of the visual flare
          sheetKey: 'shieldActivationAnimation', // A bubble or shield-shaped sprite
          frameCount: 1,
          frameSize: 64,
          movement: 'expand_and_fade', // Key request: starts at caster, grows rapidly, then fades
          scale: 2.2, // Large enough to visibly encompass the combatant sprite
          blendMode: 'screen' // Bright, glowing blue/white energy
        }
      }
    ],
    target: {
      // A quick 'snapping' shake on activation to provide physical feedback
      shake: { start: 0.05, end: 0.2, intensity: 15 },
      // Apply a cool blue/cyan defensive tint that persists longer than the flash
      flash: { start: 0.05, end: 1.0, filter: 'brightness(130%) sepia(100%) hue-rotate(190deg) saturate(300%)' }
    }
  }
};