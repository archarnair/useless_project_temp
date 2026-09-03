/**
 * App Coordinator
 * Glues HeadTiltTracker, FlappyGame, SoundEffects, and the UI together.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Components
  const tracker = new window.HeadTiltTracker();
  const game = new window.FlappyGame('gameCanvas');
  const sound = window.gameSound;

  // 2. Cache DOM Elements
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnRestartGame = document.getElementById('btnRestartGame');
  const btnCalibrateHero = document.getElementById('btnCalibrateHero');
  const btnCalibrate = document.getElementById('btnCalibrate');
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const btnResetSettings = document.getElementById('btnResetSettings');

  // HUD & Gauge Elements
  const flightVectorIndicator = document.getElementById('flightVectorIndicator');
  const flightArrow = document.getElementById('flightArrow');
  const flightActionText = document.getElementById('flightActionText');
  const flightAngleDegrees = document.getElementById('flightAngleDegrees');
  const levelBubble = document.getElementById('levelBubble');
  const statRawAngle = document.getElementById('statRawAngle');
  const statCalibratedAngle = document.getElementById('statCalibratedAngle');
  const statAngularSpeed = document.getElementById('statAngularSpeed');
  const neckStatusTag = document.getElementById('neckStatusTag');
  const neckHumorText = document.getElementById('neckHumorText');
  const neckSnapCounter = document.getElementById('neckSnapCounter');
  const cameraStatusHero = document.getElementById('cameraStatusHero');
  const cameraStatusHeroText = document.getElementById('cameraStatusHeroText');

  // Game Over Board Elements
  const finalScoreEl = document.getElementById('finalScore');
  const bestScoreEl = document.getElementById('bestScore');
  const medalEarnedEl = document.getElementById('medalEarned');
  const finalSnapsEl = document.getElementById('finalSnaps');
  const chiroDiagnosisEl = document.getElementById('chiroDiagnosis');

  // Settings Controls
  const sliderSpeed = document.getElementById('sliderSpeed');
  const valSpeed = document.getElementById('valSpeed');
  const sliderSensitivity = document.getElementById('sliderSensitivity');
  const valSensitivity = document.getElementById('valSensitivity');
  const sliderDeadzone = document.getElementById('sliderDeadzone');
  const valDeadzone = document.getElementById('valDeadzone');
  const selectControlMode = document.getElementById('selectControlMode');
  const checkInvertTilt = document.getElementById('checkInvertTilt');
  const checkAudio = document.getElementById('checkAudio');
  const checkNeckSnaps = document.getElementById('checkNeckSnaps');

  // Humor lines based on tilt & action
  const humorQuotes = [
    "Tilt left: Up, up, and away! 🦅",
    "Snap right to dive under the pipe! 🔻",
    "Keep your eyes on the horizon. Neck snapping is optional but encouraged.",
    "Fun fact: Your sternocleidomastoid muscle is working overtime.",
    "Bobblehead mode: ENGAGED.",
    "Dodge that green pipe with surgical head agility!"
  ];

  // 3. Connect Tracker Callbacks
  tracker.onStatusChange = (text, type) => {
    if (cameraStatusHeroText) cameraStatusHeroText.textContent = text;
    if (cameraStatusHero) {
      const dot = cameraStatusHero.querySelector('.status-dot');
      if (dot) {
        dot.className = `status-dot ${type}`;
      }
    }
  };

  tracker.onTiltUpdate = (data) => {
    // Feed tilt input into the game engine
    game.applyTiltInput(data.effectiveAngle);

    // Update Numerical HUD Stats
    if (statRawAngle) statRawAngle.textContent = `${data.rawAngle.toFixed(1)}°`;
    if (statCalibratedAngle) statCalibratedAngle.textContent = `${data.calibratedAngle.toFixed(1)}°`;
    if (statAngularSpeed) statAngularSpeed.textContent = `${data.angularSpeed}°/s`;

    // Update Spirit Level Bubble Position
    // Track range is approx +/- 45px
    if (levelBubble) {
      const clamped = Math.max(-30, Math.min(30, data.calibratedAngle));
      const bubbleOffset = (clamped / 30) * 48; // px offset
      levelBubble.style.transform = `translateX(calc(-50% + ${bubbleOffset}px))`;
    }

    // Update Flight HUD Pill on Game Canvas
    if (flightVectorIndicator) {
      flightAngleDegrees.textContent = `${Math.abs(data.calibratedAngle).toFixed(0)}°`;

      if (data.direction === 'LEFT') {
        flightVectorIndicator.className = 'flight-hud-pill flying-up';
        flightArrow.textContent = '🚀';
        flightActionText.textContent = 'TILTING LEFT: FLY UP';
      } else if (data.direction === 'RIGHT') {
        flightVectorIndicator.className = 'flight-hud-pill diving-down';
        flightArrow.textContent = '🔻';
        flightActionText.textContent = 'TILTING RIGHT: DIVE';
      } else {
        flightVectorIndicator.className = 'flight-hud-pill';
        flightArrow.textContent = '⏸️';
        flightActionText.textContent = 'LEVEL: GLIDING';
      }
    }

    // Dynamic Neck Status Tag
    if (neckStatusTag) {
      if (data.angularSpeed > 180) {
        neckStatusTag.textContent = 'WHIPLASH! ⚡';
        neckStatusTag.className = 'status-tag severe';
      } else if (Math.abs(data.calibratedAngle) > 22) {
        neckStatusTag.textContent = 'EXTREME TILT';
        neckStatusTag.className = 'status-tag severe';
      } else {
        neckStatusTag.textContent = 'NORMAL';
        neckStatusTag.className = 'status-tag';
      }
    }
  };

  // On Neck Snap (Aggressive sudden tilt direction change)
  tracker.onNeckSnap = (speed, totalSnaps) => {
    if (neckSnapCounter) neckSnapCounter.textContent = totalSnaps.toString();
    if (sound) sound.playNeckSnap();
    game.triggerNeckSnapEffect(speed);

    if (neckHumorText) {
      const snapJokes = [
        "🦴 CRACK! That's 100 extra style points.",
        "⚡ Rapid neck snap detected! Spine agility +1.",
        "💥 Aggressive neck movement! Chiropractor on speed-dial.",
        "🌪️ Pure bobblehead energy!"
      ];
      neckHumorText.textContent = snapJokes[Math.floor(Math.random() * snapJokes.length)];
    }
  };

  // 4. Connect Game Callbacks
  game.onGameOver = (score, bestScore, neckSnaps) => {
    // Show game over overlay
    if (gameOverOverlay) {
      gameOverOverlay.classList.remove('hidden');
    }

    if (finalScoreEl) finalScoreEl.textContent = score.toString();
    if (bestScoreEl) bestScoreEl.textContent = bestScore.toString();
    if (finalSnapsEl) finalSnapsEl.textContent = neckSnaps.toString();

    // Determine Medal
    let medal = '🥉 Bronze Neck';
    if (score >= 30) medal = '💎 Titanium Spine';
    else if (score >= 15) medal = '🥇 Gold Vertebra';
    else if (score >= 5) medal = '🥈 Silver Cervical';
    if (medalEarnedEl) medalEarnedEl.textContent = medal;

    // Generate humorous diagnosis
    if (chiroDiagnosisEl) {
      let diag = '';
      if (score === 0) {
        diag = `"Diagnosis: Stiff cervical posture. Tilt your head further to gain altitude!"`;
      } else if (score < 5) {
        diag = `"Diagnosis: Moderate neck mobility. A promising rookie bobblehead."`;
      } else if (score < 15) {
        diag = `"Diagnosis: Highly agile cervical vertebrae. Pipes fear your neck tilt."`;
      } else {
        diag = `"Diagnosis: Supersonic neck snapping. You have attained Flappy Nirvana."`;
      }
      chiroDiagnosisEl.textContent = diag;
    }
  };

  // 5. Setup Action Handlers
  const handleStartGame = () => {
    sound.ensureContext();
    if (startOverlay) startOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    game.start();
  };

  btnStartGame.addEventListener('click', handleStartGame);
  btnRestartGame.addEventListener('click', handleStartGame);

  // Calibration handlers
  const handleCalibrate = () => {
    tracker.calibrateZero();
    if (neckHumorText) {
      neckHumorText.textContent = "🎯 Resting pose calibrated! Sit straight and snap away.";
    }
  };

  btnCalibrate.addEventListener('click', handleCalibrate);
  btnCalibrateHero.addEventListener('click', handleCalibrate);

  btnToggleCamera.addEventListener('click', () => {
    tracker.initCamera();
  });

  // Spacebar to start / restart
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (game.state === 'READY' || game.state === 'GAMEOVER') {
        e.preventDefault();
        handleStartGame();
      }
    }
  });

  // Settings listeners
  sliderSpeed.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    game.setSpeedMultiplier(val);
    let label = `${val.toFixed(1)}x`;
    if (val <= 0.7) label += ' (Chill)';
    else if (val <= 1.0) label += ' (Brisk)';
    else if (val <= 1.4) label += ' (Fast)';
    else label += ' (Neck-Breaker 🔥)';
    valSpeed.textContent = label;
  });

  sliderSensitivity.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    tracker.sensitivity = val;
    valSensitivity.textContent = `${val.toFixed(1)}x`;
  });

  sliderDeadzone.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    tracker.deadzone = val;
    valDeadzone.textContent = `${val.toFixed(1)}°`;
  });

  selectControlMode.addEventListener('change', (e) => {
    game.controlMode = e.target.value;
  });

  checkInvertTilt.addEventListener('change', (e) => {
    tracker.invertTilt = e.target.checked;
  });

  checkAudio.addEventListener('change', (e) => {
    sound.enabled = e.target.checked;
  });

  checkNeckSnaps.addEventListener('change', (e) => {
    sound.neckSnapEnabled = e.target.checked;
  });

  btnResetSettings.addEventListener('click', () => {
    sliderSpeed.value = 1.0;
    game.setSpeedMultiplier(1.0);
    valSpeed.textContent = '1.0x (Brisk)';

    sliderSensitivity.value = 1.0;
    tracker.sensitivity = 1.0;
    valSensitivity.textContent = '1.0x';

    sliderDeadzone.value = 3.0;
    tracker.deadzone = 3.0;
    valDeadzone.textContent = '3.0°';

    selectControlMode.value = 'velocity';
    game.controlMode = 'velocity';

    checkInvertTilt.checked = false;
    tracker.invertTilt = false;

    checkAudio.checked = true;
    sound.enabled = true;

    checkNeckSnaps.checked = true;
    sound.neckSnapEnabled = true;
  });

  // 6. Start Main Animation Loop
  function gameLoop() {
    game.update();
    game.render();
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  // 7. Start Face Mesh Tracking
  tracker.initCamera();
});
