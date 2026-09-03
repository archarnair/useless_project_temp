/**
 * Eye-Tilt Tracker using MediaPipe Face Mesh
 * Tracks facial landmarks to compute head tilt angle from eye corners.
 * Includes smoothing, zero-calibration, neck snap detection, and keyboard fallback.
 */

class HeadTiltTracker {
  constructor() {
    this.videoElement = document.getElementById('webcamVideo');
    this.canvasElement = document.getElementById('trackerCanvas');
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;

    this.faceMesh = null;
    this.camera = null;
    this.isCameraRunning = false;
    this.hasCameraPermission = false;
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    // Tilt angle states (degrees)
    this.rawAngle = 0;
    this.neutralAngle = 0; // Calibrated offset
    this.currentAngle = 0; // (rawAngle - neutralAngle) * sensitivity
    this.smoothedAngle = 0;
    this.smoothingFactor = 0.85; // Ultra-responsive near-instant tracking

    // Angular velocity & neck snap detection
    this.lastAngleForSpeed = 0;
    this.lastAngleTime = performance.now();
    this.angularSpeed = 0; // deg/sec
    this.neckSnapCooldown = 0;
    this.totalNeckSnaps = 0;

    // Configurable settings
    this.sensitivity = 1.0;
    this.deadzone = 2.0; // tighter deadzone for instant reaction
    this.invertTilt = false;

    // Simulated tilt (keyboard fallback: ArrowLeft/Right or A/D)
    this.simulatedAngle = 0;
    this.keysPressed = { left: false, right: false };

    // Event callbacks
    this.onTiltUpdate = null;
    this.onNeckSnap = null;
    this.onStatusChange = null;

    this.initKeyboardFallback();
  }

  /** Initialize MediaPipe Face Mesh */
  async initCamera() {
    this.updateStatus('Initializing Face Mesh...', 'pulsing');

    if (typeof FaceMesh === 'undefined') {
      console.warn('FaceMesh CDN not yet loaded. Will retry in 500ms...');
      setTimeout(() => this.initCamera(), 500);
      return;
    }

    try {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false, // Disabled heavy iris models for max FPS & zero latency
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45
      });

      this.faceMesh.onResults((results) => this.onFaceMeshResults(results));

      // Check available media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isCameraRunning && this.faceMesh) {
            await this.faceMesh.send({ image: this.videoElement });
          }
        },
        width: 320,
        height: 240
      });

      await this.camera.start();
      this.isCameraRunning = true;
      this.hasCameraPermission = true;
      this.updateStatus('Camera Active & Tracking', 'active');
      console.log('MediaPipe Camera started successfully');
    } catch (err) {
      console.error('Camera initialization error:', err);
      this.hasCameraPermission = false;
      this.isCameraRunning = false;
      this.updateStatus('Camera Unavailable (Keyboard Mode Active)', 'error');
      this.startKeyboardSimulationLoop();
    }
  }

  /** Update status indicators in UI */
  updateStatus(text, type = 'pulsing') {
    if (this.onStatusChange) {
      this.onStatusChange(text, type);
    }
  }

  /** MediaPipe Results Callback */
  onFaceMeshResults(results) {
    this.calculateFps();

    const canvas = this.canvasElement;
    const ctx = this.canvasCtx;
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video feed mirrored so it acts like a natural mirror
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Key Eye Landmarks:
      // Landmark 33: Right eye outer corner (viewer's left in mirror)
      // Landmark 133: Right eye inner corner
      // Landmark 263: Left eye outer corner (viewer's right in mirror)
      // Landmark 362: Left eye inner corner
      const rightEyeOuter = landmarks[33];
      const rightEyeInner = landmarks[133];
      const leftEyeOuter = landmarks[263];
      const leftEyeInner = landmarks[362];

      // Calculate eye center approximations
      const rightEye = {
        x: (rightEyeOuter.x + rightEyeInner.x) / 2 * canvas.width,
        y: (rightEyeOuter.y + rightEyeInner.y) / 2 * canvas.height
      };
      const leftEye = {
        x: (leftEyeOuter.x + leftEyeInner.x) / 2 * canvas.width,
        y: (leftEyeOuter.y + leftEyeInner.y) / 2 * canvas.height
      };

      // In camera coordinate space (unmirrored video input):
      // rightEye is anatomical right eye (x around 0.35)
      // leftEye is anatomical left eye (x around 0.65)
      const dx = leftEye.x - rightEye.x;
      const dy = leftEye.y - rightEye.y;

      // When person tilts head to their LEFT (left ear to left shoulder):
      // Their left eye is lower in the image -> dy > 0 -> angle > 0.
      // We standardize: Left Tilt = Negative Angle, Right Tilt = Positive Angle.
      const calculatedAngle = -Math.atan2(dy, dx) * (180 / Math.PI);
      this.rawAngle = calculatedAngle;

      // Draw Eye Tracking visuals
      this.drawEyeOverlays(ctx, rightEye, leftEye, landmarks);

      // Process calibrated angle
      this.processAngleUpdate(this.rawAngle);
    } else {
      // If no face is detected, gently decay angle towards 0
      this.rawAngle = this.rawAngle * 0.9;
      this.processAngleUpdate(this.rawAngle);
    }

    ctx.restore();

    // Draw HUD on top of un-inverted canvas coordinate space
    this.drawTrackerHud(ctx);
  }

  /** Draw eye tracking points, axis line, and level guide */
  drawEyeOverlays(ctx, rightEye, leftEye, landmarks) {
    // 1. Line connecting eye centers
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rightEye.x, rightEye.y);
    ctx.lineTo(leftEye.x, leftEye.y);
    ctx.stroke();

    // 2. Eye points
    const points = [rightEye, leftEye];
    points.forEach((p, idx) => {
      ctx.fillStyle = idx === 0 ? '#39ff14' : '#ffe600';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Nose bridge center anchor (landmark 168)
    if (landmarks[168]) {
      const noseX = landmarks[168].x * ctx.canvas.width;
      const noseY = landmarks[168].y * ctx.canvas.height;
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.arc(noseX, noseY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draw angle readout and horizon on the PIP canvas */
  drawTrackerHud(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Center horizon crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small angle badge at bottom
    ctx.fillStyle = 'rgba(15, 20, 35, 0.8)';
    ctx.fillRect(8, h - 32, 130, 24);
    ctx.strokeStyle = '#2b3960';
    ctx.strokeRect(8, h - 32, 130, 24);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '11px monospace';
    const angleText = `TILT: ${this.currentAngle >= 0 ? '+' : ''}${this.currentAngle.toFixed(1)}°`;
    ctx.fillText(angleText, 16, h - 16);
  }

  /** Process angle updates, smoothing, angular velocity & neck snap */
  processAngleUpdate(raw) {
    const now = performance.now();
    const dt = (now - this.lastAngleTime) / 1000;

    // Apply zero-calibration
    let calibrated = (raw - this.neutralAngle) * this.sensitivity;

    // Invert if configured
    if (this.invertTilt) {
      calibrated = -calibrated;
    }

    // Adaptive instant smoothing: follow fast head snaps immediately, filter minor tremors
    const delta = Math.abs(calibrated - this.smoothedAngle);
    const dynamicFactor = delta > 1.8 ? 0.96 : this.smoothingFactor;
    this.smoothedAngle = this.smoothedAngle * (1 - dynamicFactor) + calibrated * dynamicFactor;
    this.currentAngle = this.smoothedAngle;

    // Calculate angular velocity (deg / sec)
    if (dt > 0.03) {
      const angleDiff = Math.abs(this.currentAngle - this.lastAngleForSpeed);
      this.angularSpeed = Math.round(angleDiff / dt);
      this.lastAngleForSpeed = this.currentAngle;
      this.lastAngleTime = now;

      // Detect aggressive "neck snap" (e.g. > 160°/sec and crossing zero or high delta)
      if (this.angularSpeed > 170 && now > this.neckSnapCooldown) {
        this.totalNeckSnaps++;
        this.neckSnapCooldown = now + 400; // 400ms debounce
        if (this.onNeckSnap) {
          this.onNeckSnap(this.angularSpeed, this.totalNeckSnaps);
        }
      }
    }

    // Fire callback
    if (this.onTiltUpdate) {
      const isDeadzone = Math.abs(this.currentAngle) < this.deadzone;
      const effectiveAngle = isDeadzone ? 0 : this.currentAngle;
      this.onTiltUpdate({
        rawAngle: raw,
        calibratedAngle: this.currentAngle,
        effectiveAngle: effectiveAngle,
        isDeadzone: isDeadzone,
        direction: effectiveAngle < 0 ? 'LEFT' : effectiveAngle > 0 ? 'RIGHT' : 'LEVEL',
        angularSpeed: this.angularSpeed
      });
    }
  }

  /** Calibrate current head pose as 0.0 degrees neutral */
  calibrateZero() {
    this.neutralAngle = this.rawAngle;
    console.log(`Calibrated neutral angle to: ${this.neutralAngle.toFixed(2)}°`);
  }

  /** Keyboard fallback simulation */
  initKeyboardFallback() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keysPressed.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keysPressed.right = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keysPressed.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keysPressed.right = false;
      }
    });
  }

  startKeyboardSimulationLoop() {
    const loop = () => {
      if (!this.isCameraRunning) {
        // Target angle based on keys
        let target = 0;
        if (this.keysPressed.left && !this.keysPressed.right) target = -22;
        if (this.keysPressed.right && !this.keysPressed.left) target = 22;

        this.simulatedAngle += (target - this.simulatedAngle) * 0.25;
        this.rawAngle = this.simulatedAngle;
        this.processAngleUpdate(this.rawAngle);

        // Render simulated tracker canvas
        this.renderSimulatedCanvas();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderSimulatedCanvas() {
    const canvas = this.canvasElement;
    const ctx = this.canvasCtx;
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#111728';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simulated head avatar
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((this.currentAngle * Math.PI) / 180);

    // Head oval
    ctx.fillStyle = '#223254';
    ctx.beginPath();
    ctx.ellipse(0, 0, 45, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(-18, -10, 6, 0, Math.PI * 2);
    ctx.arc(18, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eye bar
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(18, -10);
    ctx.stroke();

    ctx.restore();

    // Overlay hint
    ctx.fillStyle = '#8b9bb4';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Keyboard Simulation (A/D or ←/→)', canvas.width / 2, canvas.height - 12);
    this.drawTrackerHud(ctx);
  }

  calculateFps() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      const fpsEl = document.getElementById('fpsDisplay');
      if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    }
  }
}

window.HeadTiltTracker = HeadTiltTracker;
