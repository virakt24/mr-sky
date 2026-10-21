import * as THREE from 'three';
import {
  STEPS,
  STEP_THOUGHTS,
  MR_SKY_LINES,
  SKY_STATIONS,
  BALLOON_X,
  BALLOON_BASE_Y,
  TARGET_SKY_ALTITUDE,
  MR_SKY_START_X,
  MR_SKY_END_X
} from './config.js';
import {
  scene,
  camera,
  renderer,
  loadingManager,
  mouseParallax
} from './scene.js';
import { updateWorld, endCloudPerch } from './world.js';
import {
  playerGroup,
  charVisual,
  girlMixer,
  balloonGroup,
  balloonRig,
  mrSkyGroup,
  mrSkyRig,
  mrCloudMat,
  mrCloudEyeMat,
  mrCloudColorGray,
  mrCloudColorBlue
} from './entities.js';

// ============================================================================
// 1. 3-SECOND LOADING SCREEN GATE
// ============================================================================
const loadingScreen = document.getElementById('loading-screen');
let assetsLoaded = false;
let minTimeElapsed = false;

function tryHideLoadingScreen() {
  if (assetsLoaded && minTimeElapsed) {
    loadingScreen.classList.add('hidden');
  }
}

loadingManager.onLoad = () => {
  assetsLoaded = true;
  tryHideLoadingScreen();
};

setTimeout(() => {
  minTimeElapsed = true;
  assetsLoaded = true;
  tryHideLoadingScreen();
}, 3000);

// ============================================================================
// 2. UI, HUD CONTROLS & GLOBAL NAVIGATION ELEMENTS
// ============================================================================
const thoughtEl = document.getElementById('thought-text');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');

const controlsHud = document.getElementById('controls-hud');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnSpace = document.getElementById('btn-space');
const spaceLabel = document.getElementById('space-label');

const navButtons = document.querySelectorAll('.nav-step');
const questionOverlay = document.getElementById('question-overlay');
const questionForm = document.getElementById('question-form');
const violetInput = document.getElementById('violet-input');
const violetFeedback = document.getElementById('violet-feedback');

let currentThought = '';
function setThought(text) {
  if (currentThought === text) return;
  currentThought = text;
  thoughtEl.classList.add('fade-out');
  setTimeout(() => {
    thoughtEl.textContent = text;
    if (text) thoughtEl.classList.remove('fade-out');
  }, 250);
}

// Updates which transparent control buttons are shown & highlights active Top Nav pill
function updateHUDForStage(stageNum, mode) {
  navButtons.forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.stage) === stageNum);
  });

  if (mode === 'WALK_JUMP') {
    // Stage 1: Show A/Left, SPACE, and D/Right
    controlsHud.classList.remove('hidden');
    btnLeft.classList.remove('ctrl-hidden');
    btnRight.classList.remove('ctrl-hidden');
    btnSpace.classList.remove('ctrl-hidden');
    spaceLabel.textContent = 'SPACE · JUMP';
  } else if (mode === 'BALLOON_ONLY_SPACE') {
    // Stage 2: Show ONLY SPACE button to lift balloon
    controlsHud.classList.remove('hidden');
    btnLeft.classList.add('ctrl-hidden');
    btnRight.classList.add('ctrl-hidden');
    btnSpace.classList.remove('ctrl-hidden');
    spaceLabel.textContent = 'HOLD SPACE · LIFT';
  } else if (mode === 'CLOUD_ONLY_AD') {
    // Stage 3: Show ONLY A and D buttons during Mr. Sky walkthrough
    controlsHud.classList.remove('hidden');
    btnLeft.classList.remove('ctrl-hidden');
    btnRight.classList.remove('ctrl-hidden');
    btnSpace.classList.add('ctrl-hidden');
  } else if (mode === 'END_QUESTION') {
    // Stage 4: Hide movement HUD while answering the question
    controlsHud.classList.add('hidden');
  }
}

// ============================================================================
// 3. GAME STATE & PHYSICS VARIABLES
// ============================================================================
const keys = { KeyA: false, KeyD: false, Space: false };
let gameState = 'PLATFORMING';
let hasMetMrSky = false;

const vel = new THREE.Vector3(0, 0, 0);
let isGrounded = true;
let coyoteTimer = 0;
let jumpBufferTimer = 0;
let squashScaleY = 1.0;

let balloonVelY = 0;
let burnerHeat = 0;
let basketSpringY = 0;
let basketSpringVel = 0;

let hopProgress = 0;
const hopStartPos = new THREE.Vector3();
const hopTargetPos = new THREE.Vector3();
let cloudVelX = 0;
let cloudSpringY = 0;
let cloudSpringVel = 0;
let dialogueIndex = 0;

const camBasePos = new THREE.Vector3(-1.5, 2.7, 14.5);
const camLookTarget = new THREE.Vector3(-1.5, 2.2, 0);

function getStepAtX(x) {
  for (const s of STEPS) {
    if (x >= s.minX && x <= s.maxX) return s;
  }
  return STEPS[0];
}

// ============================================================================
// 4. GLOBAL NAVIGATION STAGE SWITCHER (STAGES 1, 2, 3, 4)
// ============================================================================
function goToStage(stageNumber) {
  dialogueBox.classList.remove('active');
  questionOverlay.classList.remove('active');

  // Reset Mr. Sky visibility & opacity in case we are leaving Stage 4
  mrCloudMat.opacity = 1.0;
  mrCloudEyeMat.opacity = 1.0;
  mrSkyGroup.visible = true;

  if (stageNumber === 1) {
    gameState = 'PLATFORMING';
    scene.add(playerGroup);
    playerGroup.position.set(-4.2, 0.0, 0);
    vel.set(0, 0, 0);
    charVisual.rotation.y = 0;
    charVisual.scale.set(1, 1, 1);

    balloonGroup.position.set(BALLOON_X, BALLOON_BASE_Y, 0);
    balloonVelY = 0;
    mrSkyGroup.position.set(MR_SKY_START_X, TARGET_SKY_ALTITUDE + 0.15, 0);
    mrCloudMat.color.copy(mrCloudColorGray);

    setThought(STEP_THOUGHTS[0]);
    updateHUDForStage(1, 'WALK_JUMP');

  } else if (stageNumber === 2) {
    gameState = 'BALLOON_FLIGHT';
    balloonGroup.position.set(BALLOON_X, BALLOON_BASE_Y, 0);
    balloonVelY = 0;
    burnerHeat = 0;

    balloonRig.add(playerGroup);
    playerGroup.position.set(0, 0.22, 0);
    charVisual.rotation.y = 0;
    charVisual.scale.set(1, 1, 1);
    basketSpringVel = -3.5;

    mrSkyGroup.position.set(MR_SKY_START_X, TARGET_SKY_ALTITUDE + 0.15, 0);
    mrCloudMat.color.copy(mrCloudColorGray);

    setThought("hold space (or the button below) to lift the balloon!");
    updateHUDForStage(2, 'BALLOON_ONLY_SPACE');

  } else if (stageNumber === 3) {
    hasMetMrSky = true;
    gameState = 'CLOUD_RIDE';
    balloonGroup.position.set(BALLOON_X, TARGET_SKY_ALTITUDE, 0);
    mrSkyGroup.position.set(MR_SKY_START_X, TARGET_SKY_ALTITUDE + 0.15, 0);
    cloudVelX = 0;

    mrSkyRig.add(playerGroup);
    playerGroup.position.set(0, 1.0, 0);
    charVisual.rotation.y = 0;
    charVisual.scale.set(1, 1, 1);
    cloudSpringVel = -3.8;

    setThought("move right with D—watch mr. cloud turn from gray to blue!");
    updateHUDForStage(3, 'CLOUD_ONLY_AD');

  } else if (stageNumber === 4) {
    hasMetMrSky = true;
    gameState = 'END_STAGE';
    balloonGroup.position.set(BALLOON_X, TARGET_SKY_ALTITUDE, 0);

    // Place Mr. Sky near the end in full blue so we watch him float away
    mrSkyGroup.position.set(MR_SKY_END_X, TARGET_SKY_ALTITUDE + 0.5, 0);
    mrCloudMat.color.copy(mrCloudColorBlue);

    // Place the girl safely on the end cloud perch
    endCloudPerch.add(playerGroup);
    playerGroup.position.set(0, 0.85, 0);
    charVisual.rotation.y = 0;
    charVisual.scale.set(1, 1, 1);

    setThought("bye mr. sky! thanks for the ride...");
    updateHUDForStage(4, 'END_QUESTION');
    questionOverlay.classList.add('active');
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const stage = Number(btn.dataset.stage);
    goToStage(stage);
  });
});

// ============================================================================
// 5. STAGE 4 QUESTION FORM ("Why is the sky not violet?")
// ============================================================================
questionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const userAnswer = violetInput.value.trim();
  if (!userAnswer) return;

  const lower = userAnswer.toLowerCase();
  const mentionedEyes = lower.includes('eye') || lower.includes('see') || lower.includes('cone') || lower.includes('human') || lower.includes('vision');
  const mentionedSun = lower.includes('sun') || lower.includes('less violet') || lower.includes('more blue') || lower.includes('amount');

  let prefix = "I love how you thought about that! ";
  if (mentionedEyes || mentionedSun) {
    prefix = "Spot on! You nailed the secret! ";
  }

  violetFeedback.innerHTML =
    `<strong>${prefix}</strong><br>` +
    `Even though violet light scatters slightly more than blue, two things happen: ` +
    `first, the Sun naturally sends out <em>much more blue light</em> than violet light. ` +
    `Second, our human eyes have color receptors (cones) that are way more sensitive to blue than violet—so our brains see a soft, bright blue sky!`;
  violetFeedback.classList.remove('hidden');
});

// ============================================================================
// 6. DIALOGUE & HOP TRANSITIONS (STONES <-> BALLOON <-> MR. SKY -> END)
// ============================================================================
function startDialogue() {
  if (hasMetMrSky) {
    triggerJumpOntoCloud();
    return;
  }
  gameState = 'TALKING';
  setThought('');
  dialogueIndex = 0;
  dialogueText.textContent = MR_SKY_LINES[0];
  dialogueBox.classList.add('active');
}

function advanceDialogue() {
  dialogueIndex++;
  if (dialogueIndex < MR_SKY_LINES.length) {
    dialogueText.textContent = MR_SKY_LINES[dialogueIndex];
  } else {
    hasMetMrSky = true;
    dialogueBox.classList.remove('active');
    triggerJumpOntoCloud();
  }
}

function triggerJumpOntoCloud() {
  gameState = 'JUMPING_TO_CLOUD';
  hopProgress = 0;
  basketSpringVel = -3.4;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = 0;
  squashScaleY = 1.25;
  updateHUDForStage(3, 'CLOUD_ONLY_AD');
}

function triggerJumpBackToBalloon() {
  gameState = 'JUMPING_TO_BALLOON';
  hopProgress = 0;
  cloudSpringVel = -3.5;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = Math.PI;
  squashScaleY = 1.25;
  updateHUDForStage(2, 'BALLOON_ONLY_SPACE');
}

function triggerJumpBackToStones() {
  gameState = 'JUMPING_TO_STONES';
  hopProgress = 0;
  basketSpringVel = -3.6;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = Math.PI;
  squashScaleY = 1.24;

  const topStoneX = (STEPS[4].minX + Math.min(STEPS[4].maxX, BALLOON_X - 0.4)) * 0.5;
  hopTargetPos.set(topStoneX, STEPS[4].topY, 0);
  updateHUDForStage(1, 'WALK_JUMP');
}

function triggerHopToEndStage() {
  if (gameState === 'JUMPING_TO_END' || gameState === 'END_STAGE') return;
  gameState = 'JUMPING_TO_END';
  hopProgress = 0;
  cloudSpringVel = -3.4;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = 0;
  squashScaleY = 1.22;

  hopTargetPos.set(endCloudPerch.position.x, endCloudPerch.position.y + 0.85, 0);
  setThought("bye mr. sky! thanks for showing us the light...");
  updateHUDForStage(4, 'END_QUESTION');
}

dialogueBox.addEventListener('click', () => {
  if (gameState === 'TALKING') advanceDialogue();
});

// ============================================================================
// 7. KEYBOARD & CLICKABLE ON-SCREEN BUTTON INPUTS
// ============================================================================
function setKeyState(code, isDown) {
  if (code === 'KeyA') {
    keys.KeyA = isDown;
    btnLeft.classList.toggle('pressed', isDown);
  } else if (code === 'KeyD') {
    keys.KeyD = isDown;
    btnRight.classList.toggle('pressed', isDown);
  } else if (code === 'Space') {
    keys.Space = isDown;
    btnSpace.classList.toggle('pressed', isDown);
  }

  if (isDown) {
    if (code === 'Space') {
      if (gameState === 'PLATFORMING') {
        jumpBufferTimer = 0.16;
      } else if (gameState === 'TALKING') {
        advanceDialogue();
      }
    }

    // Bidirectional hop shortcuts (Space + A or Space + D)
    if (keys.Space && keys.KeyA) {
      if (gameState === 'BALLOON_FLIGHT' && balloonGroup.position.y <= BALLOON_BASE_Y + 2.8) {
        triggerJumpBackToStones();
      } else if (gameState === 'CLOUD_RIDE' && mrSkyGroup.position.x <= MR_SKY_START_X + 2.2) {
        triggerJumpBackToBalloon();
      }
    }
    if (keys.Space && keys.KeyD && gameState === 'BALLOON_FLIGHT' && balloonGroup.position.y >= TARGET_SKY_ALTITUDE - 2.2) {
      triggerJumpOntoCloud();
    }
  }
}

// Bind clickable transparent HUD buttons (Mouse + Touch)
function bindHudButton(buttonEl, keyCode) {
  const start = (e) => {
    e.preventDefault();
    setKeyState(keyCode, true);
  };
  const end = (e) => {
    e.preventDefault();
    setKeyState(keyCode, false);
  };
  buttonEl.addEventListener('mousedown', start);
  buttonEl.addEventListener('mouseup', end);
  buttonEl.addEventListener('mouseleave', end);
  buttonEl.addEventListener('touchstart', start, { passive: false });
  buttonEl.addEventListener('touchend', end, { passive: false });
}

bindHudButton(btnLeft, 'KeyA');
bindHudButton(btnRight, 'KeyD');
bindHudButton(btnSpace, 'Space');

window.addEventListener('keydown', (e) => {
  // Let the user type normally when answering the Stage 4 question
  if (document.activeElement === violetInput) return;

  if (e.code === 'KeyA' || e.code === 'ArrowLeft') setKeyState('KeyA', true);
  if (e.code === 'KeyD' || e.code === 'ArrowRight') setKeyState('KeyD', true);
  if (e.code === 'Space') {
    e.preventDefault();
    setKeyState('Space', true);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') setKeyState('KeyA', false);
  if (e.code === 'KeyD' || e.code === 'ArrowRight') setKeyState('KeyD', false);
  if (e.code === 'Space') setKeyState('Space', false);
});

// Initialize HUD for Stage 1
updateHUDForStage(1, 'WALK_JUMP');

// ============================================================================
// 8. MAIN ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  if (girlMixer) girlMixer.update(dt);
  updateWorld(elapsed);

  // Spring physics for Balloon & Mr. Cloud
  const bSpringForce = -28.0 * basketSpringY - 6.5 * basketSpringVel;
  basketSpringVel += bSpringForce * dt;
  basketSpringY += basketSpringVel * dt;
  balloonRig.position.y = basketSpringY + Math.sin(elapsed * 1.8) * 0.04;

  const cSpringForce = -26.0 * cloudSpringY - 6.0 * cloudSpringVel;
  cloudSpringVel += cSpringForce * dt;
  cloudSpringY += cloudSpringVel * dt;
  mrSkyRig.position.y = cloudSpringY + Math.sin(elapsed * 2.0) * 0.12;

  if (gameState === 'PLATFORMING') {
    let inputX = 0;
    if (keys.KeyD) inputX += 1;
    if (keys.KeyA) inputX -= 1;

    const maxSpeed = 4.6;
    vel.x = THREE.MathUtils.damp(vel.x, inputX * maxSpeed, 12, dt);

    if (inputX > 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, 0, 14, dt);
    if (inputX < 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, Math.PI, 14, dt);

    if (isGrounded) coyoteTimer = 0.12;
    else coyoteTimer -= dt;

    if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

    if (jumpBufferTimer > 0 && coyoteTimer > 0) {
      vel.y = 9.2;
      isGrounded = false;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      squashScaleY = 1.24;
    }

    const prevY = playerGroup.position.y;
    vel.y -= 21.0 * dt;
    playerGroup.position.y += vel.y * dt;

    // Strict horizontal wall check against manual stone boxes in config.js
    const charRadius = 0.22;
    let proposedX = THREE.MathUtils.clamp(playerGroup.position.x + vel.x * dt, -9.5, 6.2);

    if (Math.abs(vel.x) > 0.001) {
      const leadingEdgeX = proposedX + (vel.x > 0 ? charRadius : -charRadius);
      const aheadStep = getStepAtX(leadingEdgeX);

      if (aheadStep.topY > playerGroup.position.y + 0.08) {
        if (vel.x > 0) {
          proposedX = Math.min(proposedX, aheadStep.minX - charRadius - 0.002);
        } else {
          proposedX = Math.max(proposedX, aheadStep.maxX + charRadius + 0.002);
        }
        vel.x = 0;
      }
    }

    playerGroup.position.x = proposedX;
    playerGroup.position.z = 0;

    const underStep = getStepAtX(playerGroup.position.x);
    if (vel.y <= 0 && prevY >= underStep.topY - 0.15 && playerGroup.position.y <= underStep.topY) {
      if (!isGrounded && vel.y < -2.0) squashScaleY = 0.82;
      playerGroup.position.y = underStep.topY;
      vel.y = 0;
      isGrounded = true;

      if (STEP_THOUGHTS[underStep.stepId]) {
        setThought(STEP_THOUGHTS[underStep.stepId]);
      }
    } else if (playerGroup.position.y <= 0.0) {
      playerGroup.position.y = 0.0;
      vel.y = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 14, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    // Board Hot Air Balloon from Stone 4
    const distToBasket = Math.abs(playerGroup.position.x - balloonGroup.position.x);
    if (distToBasket < 0.95 && playerGroup.position.y >= STEPS[4].topY - 0.25 && vel.x >= 0) {
      gameState = 'BALLOON_FLIGHT';
      balloonRig.add(playerGroup);
      playerGroup.position.set(0, 0.22, 0);
      charVisual.rotation.y = 0;
      charVisual.scale.set(1, 1, 1);

      basketSpringVel = -3.8;
      setThought("hold space to lift the balloon!");
      updateHUDForStage(2, 'BALLOON_ONLY_SPACE');
    }

    const camTargetX = THREE.MathUtils.clamp(playerGroup.position.x + 1.4, -2.5, 5.0);
    const camTargetY = THREE.MathUtils.clamp(playerGroup.position.y + 2.4, 2.4, 6.5);
    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, camTargetX, 4, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, camTargetY, 4, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 14.5, 4, dt);
    camLookTarget.set(camBasePos.x, camBasePos.y - 0.5, 0);

  } else if (gameState === 'BALLOON_FLIGHT') {
    const targetHeat = keys.Space ? 1.0 : 0.0;
    burnerHeat = THREE.MathUtils.damp(burnerHeat, targetHeat, keys.Space ? 3.2 : 2.0, dt);

    const netLiftAccel = (burnerHeat * 9.2) - 2.6;
    balloonVelY += netLiftAccel * dt;
    balloonVelY *= Math.pow(0.42, dt);

    balloonGroup.position.y += balloonVelY * dt;

    if (balloonGroup.position.y <= BALLOON_BASE_Y) {
      balloonGroup.position.y = BALLOON_BASE_Y;
      if (balloonVelY < 0) balloonVelY = 0;
    }

    const targetSway = Math.sin(elapsed * 1.5) * 0.035 * (0.3 + burnerHeat * 0.7);
    balloonRig.rotation.z = THREE.MathUtils.damp(balloonRig.rotation.z, targetSway, 4, dt);

    if (balloonGroup.position.y > 10.0 && balloonGroup.position.y < TARGET_SKY_ALTITUDE - 2.5) {
      setThought("floating up through the quiet air...");
    }

    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, BALLOON_X + 1.5, 3, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, balloonGroup.position.y + 2.3, 3.5, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 12.2, 2.5, dt);
    camLookTarget.set(BALLOON_X + 1.5, balloonGroup.position.y + 1.9, 0);

    if (balloonGroup.position.y >= TARGET_SKY_ALTITUDE) {
      balloonGroup.position.y = TARGET_SKY_ALTITUDE;
      balloonVelY = 0;
      startDialogue();
    }

  } else if (gameState === 'TALKING') {
    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, BALLOON_X + 2.2, 3, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, TARGET_SKY_ALTITUDE + 1.8, 3, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 11.2, 3, dt);
    camLookTarget.set(BALLOON_X + 2.2, TARGET_SKY_ALTITUDE + 1.4, 0);

  } else if (gameState === 'JUMPING_TO_CLOUD') {
    hopProgress = Math.min(1, hopProgress + dt * 2.0);
    const targetPos = new THREE.Vector3(mrSkyGroup.position.x, mrSkyGroup.position.y + 1.0, 0);

    playerGroup.position.lerpVectors(hopStartPos, targetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.5;

    if (hopProgress >= 1) {
      gameState = 'CLOUD_RIDE';
      mrSkyRig.add(playerGroup);
      playerGroup.position.set(0, 1.0, 0);
      squashScaleY = 0.80;
      cloudSpringVel = -4.2;
      setThought("use A and D to glide with mr. cloud!");
    }

  } else if (gameState === 'JUMPING_TO_BALLOON') {
    hopProgress = Math.min(1, hopProgress + dt * 2.0);
    const targetPos = new THREE.Vector3(balloonGroup.position.x, balloonGroup.position.y + 0.22, 0);

    playerGroup.position.lerpVectors(hopStartPos, targetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.5;

    if (hopProgress >= 1) {
      gameState = 'BALLOON_FLIGHT';
      balloonRig.add(playerGroup);
      playerGroup.position.set(0, 0.22, 0);
      squashScaleY = 0.82;
      basketSpringVel = -4.0;
      balloonGroup.position.y = TARGET_SKY_ALTITUDE - 0.5;
      setThought("back in the balloon!");
    }

  } else if (gameState === 'JUMPING_TO_STONES') {
    hopProgress = Math.min(1, hopProgress + dt * 2.2);
    playerGroup.position.lerpVectors(hopStartPos, hopTargetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.25;

    if (hopProgress >= 1) {
      gameState = 'PLATFORMING';
      playerGroup.position.copy(hopTargetPos);
      vel.set(0, 0, 0);
      isGrounded = true;
      squashScaleY = 0.82;
      setThought("back on the stones!");
    }

  } else if (gameState === 'CLOUD_RIDE') {
    let cloudInputX = 0;
    if (keys.KeyD) cloudInputX += 1;
    if (keys.KeyA) cloudInputX -= 1;

    const maxCloudSpeed = 5.8;
    cloudVelX = THREE.MathUtils.damp(cloudVelX, cloudInputX * maxCloudSpeed, 6.5, dt);
    mrSkyGroup.position.x = THREE.MathUtils.clamp(
      mrSkyGroup.position.x + cloudVelX * dt,
      MR_SKY_START_X,
      MR_SKY_END_X
    );

    const colorProgress = THREE.MathUtils.clamp(
      (mrSkyGroup.position.x - MR_SKY_START_X) / (MR_SKY_END_X - MR_SKY_START_X),
      0,
      1
    );
    mrCloudMat.color.lerpColors(mrCloudColorGray, mrCloudColorBlue, colorProgress);

    if (cloudInputX > 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, 0, 12, dt);
    if (cloudInputX < 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, Math.PI, 12, dt);

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 12, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    const targetTilt = -cloudVelX * 0.022;
    mrSkyRig.rotation.z = THREE.MathUtils.damp(mrSkyRig.rotation.z, targetTilt, 6, dt);

    let activeCaption = "gliding through the sky...";
    for (const st of SKY_STATIONS) {
      if (Math.abs(mrSkyGroup.position.x - st.x) < 4.6) {
        activeCaption = st.caption;
        break;
      }
    }
    setThought(activeCaption);

    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, mrSkyGroup.position.x, 4, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, TARGET_SKY_ALTITUDE + 2.5, 4, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 13.5, 3, dt);
    camLookTarget.set(camBasePos.x, TARGET_SKY_ALTITUDE + 2.2, 0);

    // When reaching the last point (MR_SKY_END_X), transition to Stage 4 where Mr. Sky leaves!
    if (mrSkyGroup.position.x >= MR_SKY_END_X - 0.15) {
      triggerHopToEndStage();
    }

  } else if (gameState === 'JUMPING_TO_END') {
    hopProgress = Math.min(1, hopProgress + dt * 2.0);
    playerGroup.position.lerpVectors(hopStartPos, hopTargetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.35;

    if (hopProgress >= 1) {
      gameState = 'END_STAGE';
      endCloudPerch.add(playerGroup);
      playerGroup.position.set(0, 0.85, 0);
      questionOverlay.classList.add('active');
    }

  } else if (gameState === 'END_STAGE') {
    // Mr. Sky gently floats away upward and to the right, fading out into the sky!
    mrSkyGroup.position.x += dt * 1.8;
    mrSkyGroup.position.y += dt * 1.4;
    mrCloudMat.opacity = THREE.MathUtils.damp(mrCloudMat.opacity, 0.0, 1.5, dt);
    mrCloudEyeMat.opacity = mrCloudMat.opacity;

    if (mrCloudMat.opacity < 0.02) {
      mrSkyGroup.visible = false;
    }

    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, endCloudPerch.position.x, 3, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, TARGET_SKY_ALTITUDE + 2.2, 3, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 12.8, 3, dt);
    camLookTarget.set(endCloudPerch.position.x, TARGET_SKY_ALTITUDE + 1.8, 0);
  }

  // ============================================================================
  // 9. MOUSE PARALLAX TILT & OFFSET
  // ============================================================================
  mouseParallax.currentX = THREE.MathUtils.damp(mouseParallax.currentX, mouseParallax.targetX, 5, dt);
  mouseParallax.currentY = THREE.MathUtils.damp(mouseParallax.currentY, mouseParallax.targetY, 5, dt);

  camera.position.set(
    camBasePos.x + mouseParallax.currentX * 0.65,
    camBasePos.y + mouseParallax.currentY * 0.45,
    camBasePos.z
  );
  camera.lookAt(
    camLookTarget.x + mouseParallax.currentX * 0.25,
    camLookTarget.y + mouseParallax.currentY * 0.2,
    camLookTarget.z
  );
  camera.rotation.z += -mouseParallax.currentX * 0.018;

  renderer.render(scene, camera);
}

animate();