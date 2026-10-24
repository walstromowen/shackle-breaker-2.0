export class Particle {
  constructor(config) {
    // Lifecycle
    this.age = 0;
    this.life = config.life || 1.0;
    this.maxLife = this.life;
    this.isDead = false;

    // Positioning (Targeted)
    this.startX = (config.startX || config.x || 0) + (config.offsetX || 0);
    this.startY = (config.startY || config.y || 0) + (config.offsetY || 0);
    this.endX = (config.endX || this.startX) + (config.offsetX || 0);
    this.endY = (config.endY || this.startY) + (config.offsetY || 0);
    this.movement = config.movement || null;

    // Scaled default arc height (-50 * 2.4)
    this.arcHeight = config.arc || config.arcHeight || -120;

    // Positioning (Physics/Burst)
    this.x = this.startX;
    this.y = this.startY;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.gravity = config.gravity || 0;
    this.drag = config.drag !== undefined ? config.drag : 1;

    // Visuals
    this.config = config;
    this.scale = config.scale || 1.0;
    this.scaleDelta = config.scaleDelta || 0;
    this.baseAlpha = config.alpha !== undefined ? config.alpha : 1.0;
    this.alpha = this.baseAlpha;
    this.fadeOut = config.fadeOut !== undefined ? config.fadeOut : true;
    this.rotation = config.rotation || 0;
    this.rotationDelta = config.rotationDelta || 0;
    this.color = config.color || '#ffffff';
    this.blendMode = config.blendMode || 'source-over';

    // Drifting things (fog, ash, smoke): `shape` 'puff' (a soft cloud) or 'fleck' (a flake of ash) instead of a glowing dot.
    // The wind pulls the velocity toward (windX, windY) px/s, `windPull` says how fast (per second); `sway` makes it wander on the way
    // (a gust that comes and goes), `envelope` fades it in and then thins it out smoothly instead of staying solid until the end.
    this.shape = config.shape || null;
    this.windX = config.windX || 0;
    this.windY = config.windY || 0;
    this.windPull = config.windPull || 0;
    this.sway = config.sway || 0;
    this.swayRate = config.swayRate || 3;
    this.swayPhase = config.swayPhase !== undefined ? config.swayPhase : Math.random() * Math.PI * 2;

    // Sprite/Animation configuration
    this.sheetKey = config.sheetKey || 'battleProjectiles';
    this.frame = config.frame || null;
    this.frameSize = config.frameSize || 32;
    this.frameCount = config.frameCount || 1;

    // Instantly calculate the correct starting position for Frame 0
    // so it doesn't flash at the target's center before updating.
    if (this.movement) {
      this.applyTargetedMovement(0);
    }
  }

  update(dt) {
    this.age += dt;
    const progress = Math.min(this.age / this.maxLife, 1.0);

    if (progress >= 1.0) {
      this.isDead = true;
      return;
    }

    // Route to the correct movement logic
    if (this.movement) {
      this.applyTargetedMovement(progress);
    } else {
      this.applyPhysicsMovement(dt);
    }

    // Apply shared transforms
    this.scale += this.scaleDelta * dt;
    if (this.scale < 0) this.scale = 0;

    // Auto-rotation (used for arcs) overrides standard rotationDelta
    if (this.config.rotation !== 'auto') {
      this.rotation += this.rotationDelta * dt;
    }

    // --- FIX: Prevent linear/arc projectiles from fading out mid-flight ---
    // Added 'linear', 'arc', and 'diagonal_drop' so they crash into the target at full opacity.
    const customAlphas = ['spread_and_fade', 'expand_and_fade', 'rise_and_hold', 'float_up_and_pop', 'swipe_diagonal', 'swipe_diagonal_alt', 'shrink_and_fade', 'linear', 'arc', 'diagonal_drop'];
    
    if (this.config.envelope) {
      const fadeIn = Math.min(1, progress / 0.18);
      this.alpha = this.baseAlpha * fadeIn * Math.pow(1 - progress, 1.3);
    } else if (this.fadeOut && !customAlphas.includes(this.movement)) {
      // Changed from 0.5 to 0.85 so standard particles only fade in the last 15% of life
      if (progress > 0.85) { 
        const fadeProgress = (progress - 0.85) / 0.15;
        this.alpha = this.baseAlpha * (1 - fadeProgress);
      }
    }
  }

  applyPhysicsMovement(dt) {
    if (this.windPull) {
      const k = Math.min(1, this.windPull * dt);
      this.vx += (this.windX - this.vx) * k;
      this.vy += (this.windY - this.vy) * k;
    }
    if (this.sway) {
      const t = this.age * this.swayRate + this.swayPhase;
      this.vx += Math.cos(t * 0.7) * this.sway * 0.5 * dt;
      this.vy += Math.sin(t) * this.sway * dt;
    }
    this.vy += this.gravity * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  applyTargetedMovement(progress) {
    switch (this.movement) {
      case 'linear':
        this.x = this.lerp(this.startX, this.endX, progress);
        this.y = this.lerp(this.startY, this.endY, progress);
        // Pointing the sprite along its flight path. rotationOffset (radians) says which way the art faces at rest: an arrow drawn
        // pointing down-right (45 degrees) needs rotationOffset = -PI/4 to fly true.
        if (this.config.rotation === 'auto') {
          this.rotation = Math.atan2(this.endY - this.startY, this.endX - this.startX) + (this.config.rotationOffset || 0);
        }
        break;
      case 'arc':
        this.x = this.lerp(this.startX, this.endX, progress);
        const baseLineY = this.lerp(this.startY, this.endY, progress);
        this.y = baseLineY + (Math.sin(progress * Math.PI) * this.arcHeight);
        
        if (this.config.rotation === 'auto') {
          const nextX = this.lerp(this.startX, this.endX, progress + 0.01);
          const nextBaseY = this.lerp(this.startY, this.endY, progress + 0.01);
          const nextY = nextBaseY + (Math.sin((progress + 0.01) * Math.PI) * this.arcHeight);
          this.rotation = Math.atan2(nextY - this.y, nextX - this.x) + (this.config.rotationOffset || 0);
        }
        break;
      case 'spread_and_fade': {
        // A pool spreading across the ground: it starts as a small puddle, flows outwards fast and then slows to a stop (ease-out),
        // stays at full strength while it sits there, and only thins away in the last quarter of its life.
        const grow = Math.min(1, progress / 0.6);
        const eased = 1 - Math.pow(1 - grow, 3);
        this.x = this.startX;
        this.y = this.startY;
        this.scale = (this.config.scale || 1.0) * (0.12 + 0.88 * eased);
        const fadeIn = Math.min(1, progress / 0.08);
        const fadeOutT = progress > 0.75 ? (1 - progress) / 0.25 : 1;
        this.alpha = this.baseAlpha * fadeIn * fadeOutT;
        break;
      }
      case 'rise_and_hold': {
        // Comes up from below and fades in over the first quarter of its life, then stays at FULL strength (just swelling a little) until the
        // last 30%, when it thins away. For things that should be looked at: the dark hand of Spirit Reap.
        const rise = Math.min(1, progress / 0.25);
        const eased = 1 - Math.pow(1 - rise, 3);
        this.x = this.startX;
        this.y = this.startY + (1 - eased) * 56;
        this.scale = (this.config.scale || 1.0) * (1.0 + 0.12 * progress);
        const fadeIn = Math.min(1, progress / 0.18);
        const fadeOutT = progress > 0.7 ? (1 - progress) / 0.3 : 1;
        this.alpha = this.baseAlpha * fadeIn * fadeOutT;
        break;
      }
      case 'expand_and_fade':
        this.x = this.startX;
        this.y = this.startY;
        this.scale = (this.config.scale || 1.0) * (1.0 + progress);
        this.alpha = this.baseAlpha * (1.0 - progress);
        break;
      case 'float_up_and_pop':
        this.x = this.startX;
        this.y = this.startY - (progress * 96);
        this.alpha = progress > 0.8 ? this.baseAlpha * ((1.0 - progress) / 0.2) : this.baseAlpha;
        this.scale = (this.config.scale || 1.0) + (progress * 0.2);
        break;
      case 'swipe_diagonal':
        this.x = this.startX + (progress * 144) - 72;
        this.y = this.startY + (progress * 144) - 72;
        this.alpha = this.baseAlpha * Math.sin(progress * Math.PI);
        break;
      case 'swipe_diagonal_alt':
        this.x = this.startX - (progress * 144) + 72;
        this.y = this.startY + (progress * 144) - 72;
        this.alpha = this.baseAlpha * Math.sin(progress * Math.PI);
        break;
      case 'diagonal_drop':
        const dropX = this.config.dropX || 1200;
        const dropY = this.config.dropY || 1200;
        this.x = this.startX + (dropX * (1 - progress));
        this.y = this.startY - (dropY * (1 - progress));
        this.alpha = progress < 0.1 ? this.baseAlpha * (progress / 0.1) : this.baseAlpha;
        break;
      case 'shrink_and_fade':
        this.x = this.startX;
        this.y = this.startY;
        this.scale = (this.config.scale || 1.0) * (1.0 - progress);
        this.alpha = this.baseAlpha * (1.0 - progress);
        break;
      default:
        this.x = this.startX;
        this.y = this.startY;
        break;
    }
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }
}