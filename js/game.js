/**
 * Flappy Bird Canvas 2D Engine
 * Featuring dynamic head-tilt flight physics, parallax backgrounds,
 * procedural retro pipes, particle effects, and arcade score tracking.
 */

class FlappyGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Game state: 'READY', 'PLAYING', 'GAMEOVER'
    this.state = 'READY';

    // Physics parameters
    this.gravity = 0.32;
    this.liftMultiplier = 0.56;
    this.diveMultiplier = 0.72;
    this.maxUpVelocity = -9.5;
    this.maxDownVelocity = 11.0;
    this.groundY = this.height - 70;

    // Speed configuration
    this.speedMultiplier = 1.0;
    this.basePipeSpeed = 3.3; // Increased base speed (was 2.4)
    this.pipeSpeed = this.basePipeSpeed * this.speedMultiplier;
    this.baseSpawnInterval = 84; // Scaled so pipe spacing remains consistent
    this.pipeSpawnInterval = this.baseSpawnInterval;
    this.pipeGap = 150; // pixels

    // Bird state
    this.bird = {
      x: 90,
      y: 260,
      radius: 17,
      vy: 0,
      rotation: 0,
      targetRotation: 0,
      wingFrame: 0,
      wingDir: 1,
      expression: 'normal' // 'normal', 'flap', 'dive', 'dead'
    };

    // Environment & Entities
    this.pipes = [];
    this.clouds = [];
    this.particles = [];
    this.floatingTexts = [];
    this.groundOffset = 0;
    this.frameCount = 0;

    // Score
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('headtilt_flappy_best') || '0', 10);
    this.neckSnapsInGame = 0;

    // Flight input from head tracker
    this.currentTiltAngle = 0; // Negative = Left/Up, Positive = Right/Down
    this.controlMode = 'velocity'; // 'velocity' or 'direct'

    // Callbacks
    this.onScoreUpdate = null;
    this.onGameOver = null;

    this.initEnvironment();
  }

  /** Initialize decorative cloud layer */
  initEnvironment() {
    this.clouds = [
      { x: 30, y: 80, speed: 0.35, scale: 0.9 },
      { x: 190, y: 140, speed: 0.25, scale: 0.7 },
      { x: 320, y: 60, speed: 0.45, scale: 1.1 }
    ];
  }

  /** Reset bird and world for a new run */
  reset() {
    this.bird.x = 90;
    this.bird.y = 260;
    this.bird.vy = 0;
    this.bird.rotation = 0;
    this.bird.expression = 'normal';
    this.pipes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.score = 0;
    this.frameCount = 0;
    this.neckSnapsInGame = 0;
    this.state = 'READY';
  }

  start() {
    this.reset();
    this.state = 'PLAYING';
    if (window.gameSound) window.gameSound.ensureContext();
  }

  /** Supply real-time tilt angle from head tracker */
  applyTiltInput(effectiveAngle) {
    this.currentTiltAngle = effectiveAngle;
  }

  /** Adjust bird & world speed multiplier */
  setSpeedMultiplier(mult) {
    this.speedMultiplier = mult;
    this.pipeSpeed = this.basePipeSpeed * mult;
    this.pipeSpawnInterval = Math.max(40, Math.round(this.baseSpawnInterval / mult));
  }

  /** Trigger neck snap particle & comedic floating text */
  triggerNeckSnapEffect(speed) {
    if (this.state !== 'PLAYING') return;
    this.neckSnapsInGame++;

    const messages = ['SNAP! 🦴', 'CHIROPRACTOR! ⚡', 'WHIPLASH! 💥', 'AGILE NECK! 🔥', '2.5G FORCE! 🌪️'];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    this.floatingTexts.push({
      x: this.bird.x + 15,
      y: this.bird.y - 20,
      text: msg,
      vy: -1.8,
      life: 55,
      maxLife: 55,
      color: '#ffe600'
    });

    // Burst of sparkle particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.bird.x,
        y: this.bird.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        radius: Math.random() * 3 + 2,
        color: '#00f0ff',
        life: 25,
        maxLife: 25
      });
    }
  }

  /** Main update loop */
  update() {
    this.frameCount++;
    this.updateParallax();

    if (this.state === 'READY') {
      // Gentle idle floating animation
      this.bird.y = 260 + Math.sin(this.frameCount * 0.08) * 8;
      this.bird.rotation = Math.sin(this.frameCount * 0.08) * 0.08;
      this.updateBirdWing();
      return;
    }

    if (this.state === 'PLAYING') {
      this.updateBirdPhysics();
      this.updatePipes();
      this.checkCollisions();
      this.updateParticles();
    } else if (this.state === 'GAMEOVER') {
      // Bird falls to ground
      if (this.bird.y < this.groundY - this.bird.radius) {
        this.bird.vy += 0.5;
        this.bird.y += this.bird.vy;
        this.bird.rotation = Math.min(Math.PI / 2, this.bird.rotation + 0.1);
      }
      this.updateParticles();
    }
  }

  /** Update bird physics based on tilt angle with zero-lag instant response */
  updateBirdPhysics() {
    const angle = this.currentTiltAngle;

    if (this.controlMode === 'velocity') {
      // Instant-Response Dynamic Flight Control:
      if (angle < 0) {
        // TILT LEFT: Instantly flap & climb!
        const tiltIntensity = Math.min(1.8, Math.abs(angle) / 12);
        const targetClimbSpeed = -4.0 - tiltIntensity * 6.5;

        // Immediately cancel downward falling momentum to eliminate input lag!
        if (this.bird.vy > 0) {
          this.bird.vy = targetClimbSpeed * 0.55; // instant upward snap!
        } else {
          this.bird.vy += (targetClimbSpeed - this.bird.vy) * 0.42;
        }
        this.bird.expression = 'flap';

        // Play flap sound periodically
        if (Math.abs(angle) > 3 && window.gameSound) {
          window.gameSound.playFlap(Math.min(2, Math.abs(angle) / 12));
        }

        // Emit feather puff particles
        if (this.frameCount % 4 === 0) {
          this.particles.push({
            x: this.bird.x - 12,
            y: this.bird.y + 6,
            vx: -this.pipeSpeed - Math.random() * 1.5,
            vy: Math.random() * 1.5,
            radius: Math.random() * 3 + 1.5,
            color: 'rgba(255, 255, 255, 0.7)',
            life: 20,
            maxLife: 20
          });
        }
      } else if (angle > 0) {
        // TILT RIGHT: Instantly dive!
        const tiltIntensity = Math.min(1.8, angle / 12);
        const targetDiveSpeed = 3.5 + tiltIntensity * 6.5;

        // Immediately cancel upward momentum to eliminate input lag!
        if (this.bird.vy < 0) {
          this.bird.vy = targetDiveSpeed * 0.55; // instant dive snap!
        } else {
          this.bird.vy += (targetDiveSpeed - this.bird.vy) * 0.42;
        }
        this.bird.expression = 'dive';
      } else {
        // Level -> Neutral gentle sink
        this.bird.vy += this.gravity * 0.75;
        this.bird.expression = 'normal';
      }

      // Clamp velocities
      this.bird.vy = Math.max(this.maxUpVelocity, Math.min(this.maxDownVelocity, this.bird.vy));
      this.bird.y += this.bird.vy;

      // Snappy rotation matching velocity
      const targetAngle = Math.max(-0.65, Math.min(1.25, this.bird.vy * 0.12));
      this.bird.rotation += (targetAngle - this.bird.rotation) * 0.35;

    } else {
      // Direct Altitude Mode:
      // Angle maps directly to Y position: -28° = top, +28° = bottom
      const clampedAngle = Math.max(-28, Math.min(28, angle));
      const normalized = (clampedAngle + 28) / 56; // 0 to 1
      const targetY = 90 + normalized * (this.groundY - 140);
      this.bird.y += (targetY - this.bird.y) * 0.35;
      this.bird.rotation = (clampedAngle / 28) * 0.6;
      this.bird.expression = angle < -3 ? 'flap' : angle > 3 ? 'dive' : 'normal';
    }

    // Wing flapping animation
    this.updateBirdWing();
  }

  updateBirdWing() {
    this.bird.wingFrame += 0.25 * this.bird.wingDir;
    if (this.bird.wingFrame > 1) {
      this.bird.wingFrame = 1;
      this.bird.wingDir = -1;
    } else if (this.bird.wingFrame < -1) {
      this.bird.wingFrame = -1;
      this.bird.wingDir = 1;
    }
  }

  /** Spawn and move retro pipes */
  updatePipes() {
    if (this.frameCount % this.pipeSpawnInterval === 0) {
      const minTop = 60;
      const maxTop = this.groundY - this.pipeGap - 60;
      const topHeight = Math.floor(Math.random() * (maxTop - minTop)) + minTop;

      this.pipes.push({
        x: this.width + 10,
        topHeight: topHeight,
        bottomY: topHeight + this.pipeGap,
        width: 58,
        passed: false
      });
    }

    // Move pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.pipeSpeed;

      // Check scoring
      if (!p.passed && p.x + p.width < this.bird.x) {
        p.passed = true;
        this.score++;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          localStorage.setItem('headtilt_flappy_best', this.bestScore.toString());
        }
        if (window.gameSound) window.gameSound.playScore();
        if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.bestScore);
      }

      // Remove off-screen pipes
      if (p.x + p.width < -20) {
        this.pipes.splice(i, 1);
      }
    }
  }

  /** Check bird collisions against pipes, ground, and ceiling */
  checkCollisions() {
    // Ceiling collision
    if (this.bird.y - this.bird.radius <= 0) {
      this.bird.y = this.bird.radius;
      this.bird.vy = 0;
    }

    // Ground collision
    if (this.bird.y + this.bird.radius >= this.groundY) {
      this.bird.y = this.groundY - this.bird.radius;
      this.handleDeath();
      return;
    }

    // Pipe collisions
    const bx = this.bird.x;
    const by = this.bird.y;
    const br = this.bird.radius - 3; // slight forgiving hitbox

    for (const p of this.pipes) {
      // Check horizontal overlap
      if (bx + br > p.x && bx - br < p.x + p.width) {
        // Top pipe collision
        if (by - br < p.topHeight) {
          this.handleDeath();
          return;
        }
        // Bottom pipe collision
        if (by + br > p.bottomY) {
          this.handleDeath();
          return;
        }
      }
    }
  }

  handleDeath() {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.bird.expression = 'dead';

    if (window.gameSound) {
      window.gameSound.playHit();
      setTimeout(() => {
        if (window.gameSound) window.gameSound.playGameOver();
      }, 250);
    }

    // Collision spark particles
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: this.bird.x,
        y: this.bird.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        radius: Math.random() * 3 + 2,
        color: i % 2 === 0 ? '#ff3366' : '#ffe600',
        life: 30,
        maxLife: 30
      });
    }

    if (this.onGameOver) {
      this.onGameOver(this.score, this.bestScore, this.neckSnapsInGame);
    }
  }

  /** Update clouds, ground parallax, and particles */
  updateParallax() {
    // Clouds
    for (const c of this.clouds) {
      c.x -= c.speed;
      if (c.x < -80) c.x = this.width + 40;
    }

    // Ground scroll
    if (this.state === 'PLAYING') {
      this.groundOffset = (this.groundOffset + this.pipeSpeed) % 24;
    }
  }

  updateParticles() {
    // Standard particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text pops
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life--;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /** Render loop */
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawSky(ctx);
    this.drawCitySkyline(ctx);
    this.drawClouds(ctx);
    this.drawPipes(ctx);
    this.drawGround(ctx);
    this.drawParticles(ctx);
    this.drawBird(ctx);
    this.drawFloatingTexts(ctx);

    if (this.state === 'PLAYING') {
      this.drawScoreHud(ctx);
    }
  }

  /** Background drawing methods */
  drawSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0, '#369ec2');
    grad.addColorStop(0.65, '#6cd5e8');
    grad.addColorStop(1, '#c8f2f6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.groundY);
  }

  drawCitySkyline(ctx) {
    const baseY = this.groundY;
    ctx.fillStyle = 'rgba(78, 140, 168, 0.45)';

    // Distant procedural buildings
    const buildings = [
      { x: 10, w: 35, h: 70 },
      { x: 50, w: 45, h: 100 },
      { x: 100, w: 40, h: 60 },
      { x: 145, w: 50, h: 110 },
      { x: 200, w: 38, h: 80 },
      { x: 242, w: 55, h: 95 },
      { x: 305, w: 42, h: 65 },
      { x: 350, w: 45, h: 85 }
    ];

    buildings.forEach(b => {
      ctx.fillRect(b.x, baseY - b.h, b.w, b.h);
      // Windows
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      for (let wy = baseY - b.h + 10; wy < baseY - 10; wy += 14) {
        ctx.fillRect(b.x + 8, wy, 4, 6);
        ctx.fillRect(b.x + b.w - 12, wy, 4, 6);
      }
      ctx.fillStyle = 'rgba(78, 140, 168, 0.45)';
    });
  }

  drawClouds(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const c of this.clouds) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.arc(15, -6, 22, 0, Math.PI * 2);
      ctx.arc(32, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draw retro green pipes with 3D bevels */
  drawPipes(ctx) {
    for (const p of this.pipes) {
      this.drawPipeSection(ctx, p.x, 0, p.width, p.topHeight, true);
      this.drawPipeSection(ctx, p.x, p.bottomY, p.width, this.groundY - p.bottomY, false);
    }
  }

  drawPipeSection(ctx, x, y, width, height, isTop) {
    const lipHeight = 24;
    const lipExtend = 4;

    // Body
    const bodyGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    bodyGrad.addColorStop(0, '#538c21');
    bodyGrad.addColorStop(0.2, '#74bf2e');
    bodyGrad.addColorStop(0.6, '#8be537');
    bodyGrad.addColorStop(0.85, '#68ab29');
    bodyGrad.addColorStop(1, '#3b6516');

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#2d4e11';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, width, height);

    // Lip Collar
    const lipY = isTop ? y + height - lipHeight : y;
    const lipX = x - lipExtend;
    const lipW = width + lipExtend * 2;

    const lipGrad = ctx.createLinearGradient(lipX, 0, lipX + lipW, 0);
    lipGrad.addColorStop(0, '#599623');
    lipGrad.addColorStop(0.2, '#82d334');
    lipGrad.addColorStop(0.6, '#9ef640');
    lipGrad.addColorStop(0.85, '#72bb2c');
    lipGrad.addColorStop(1, '#3b6516');

    ctx.fillStyle = lipGrad;
    ctx.fillRect(lipX, lipY, lipW, lipHeight);
    ctx.strokeRect(lipX, lipY, lipW, lipHeight);

    // Lip highlight stripe
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(lipX + 8, lipY + 3, 5, lipHeight - 6);
  }

  /** Draw scrolling ground with grass texture */
  drawGround(ctx) {
    const gy = this.groundY;
    const gh = this.height - gy;

    // Dirt base
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, gy, this.width, gh);

    // Top grass strip
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, gy, this.width, 14);

    // Grass border
    ctx.fillStyle = '#558022';
    ctx.fillRect(0, gy + 12, this.width, 3);

    // Diagonal ground stripes
    ctx.strokeStyle = '#c5bc75';
    ctx.lineWidth = 3;
    for (let x = -this.groundOffset; x < this.width + 30; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 15);
      ctx.lineTo(x - 12, this.height);
      ctx.stroke();
    }

    // Top edge border
    ctx.strokeStyle = '#2d4e11';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(this.width, gy);
    ctx.stroke();
  }

  /** Draw animated cute Bird */
  drawBird(ctx) {
    const b = this.bird;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    // 1. Bird Body (Golden yellow round shape)
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, b.radius);
    bodyGrad.addColorStop(0, '#fff45c');
    bodyGrad.addColorStop(0.7, '#f7c325');
    bodyGrad.addColorStop(1, '#d48800');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();

    // Body Outline
    ctx.strokeStyle = '#543805';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. White Belly
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2, 6, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Beak
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(20, 2);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Wing (with animated flap angle)
    ctx.save();
    ctx.translate(-5, 0);
    ctx.rotate(b.wingFrame * 0.45);
    ctx.fillStyle = '#fce54e';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9c6603';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 5. Big Cartoon Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -6, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pupil position changes with emotion/direction
    let pupilOffsetX = 1.5;
    let pupilOffsetY = 0;
    if (b.expression === 'flap') {
      pupilOffsetY = -1.5; // looking up
    } else if (b.expression === 'dive') {
      pupilOffsetY = 2.0; // looking down frantic
      pupilOffsetX = 2.0;
    } else if (b.expression === 'dead') {
      // X for dead eye
      ctx.strokeStyle = '#ff0033';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(3, -9);
      ctx.lineTo(9, -3);
      ctx.moveTo(9, -9);
      ctx.lineTo(3, -3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(6 + pupilOffsetX, -6 + pupilOffsetY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7.2 + pupilOffsetX, -7.5 + pupilOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Floating texts (Neck-snap comic banners) */
  drawFloatingTexts(ctx) {
    ctx.save();
    ctx.font = 'bold 13px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.fillStyle = `rgba(255, 230, 0, ${alpha})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  /** Render particles */
  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  /** Render Arcade In-Game Score Number */
  drawScoreHud(ctx) {
    ctx.save();
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.score.toString(), this.width / 2 + 2, 72);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.width / 2, 70);
    ctx.restore();
  }
}

window.FlappyGame = FlappyGame;
