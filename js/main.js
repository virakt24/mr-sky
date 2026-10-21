import * as THREE from 'three';
import {
  STEPS,
  STEP_THOUGHTS,
  MR_SKY_LINES,
  SKY_STATIONS,
  BALLOON_BASE_Y,
  TARGET_SKY_ALTITUDE,
  MR_SKY_START_X
} from './config.js';
import { scene, camera, renderer } from './scene.js';
import { updateWorld } from './world.js';
import {
  playerGroup,
  charVisual,
  leftLeg,
  rightLeg,
  girlMixer,
  balloonGroup,
  balloonRig,
  burnerFlame,
  envelopeMesh,
  mrSkyGroup,
  mrSkyRig
} from './entities.js';

// ============================================================================
// 1. UI ELEMENTS & THOUGHT HELPERS
// ============================================================================
const thoughtEl = document.getElementById('thought-text');
const whisperEl = document.getElementById('whisper-hint');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');

let currentThought = '';
function setThought(text) {
  if (currentThought === text) return;
  currentThought = text;
  thoughtEl.classList.add('fade-out');
  setTimeout(() => {
    thoughtEl.textContent = text;
    if (text) thoughtEl.classList.remove('fade-out');
  }, 360);
}

// ============================================================================
// 2. STATE & PHYSICS VARIABLES
// ============================================================================
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false };
let gameState = 'PLATFORMING';

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
let cloudVelX = 0;
let cloudSpringY = 0;
let cloudSpringVel = 0;

let dialogueIndex = 0;

function getStepAtX(x) {
  for (const s of STEPS) {
    if (x >= s.minX && x <= s.maxX) return s;
  }
  return STEPS[0];
}

// ============================================================================
// 3. DIALOGUE & CLOUD HOP TRIGGERS
// ============================================================================
function startDialogue() {
  gameState = 'TALKING';
  setThought('');
  whisperEl.style.opacity = '0';
  dialogueIndex = 0;
  dialogueText.textContent = MR_SKY_LINES[0];
  dialogueBox.classList.add('active');
}

function advanceDialogue() {
  dialogueIndex++;
  if (dialogueIndex < MR_SKY_LINES.length) {
    dialogueText.textContent = MR_SKY_LINES[dialogueIndex];
  } else {
    dialogueBox.classList.remove('active');
    gameState = 'READY_TO_HOP_CLOUD';
    setThought("“let’s hop onto mr. sky’s soft cloud!”");
    whisperEl.textContent = "press space or d to jump onto mr. sky’s cloud";
    whisperEl.style.opacity = '0.85';
  }
}

function triggerJumpOntoCloud() {
  if (gameState !== 'READY_TO_HOP_CLOUD') return;
  gameState = 'JUMPING_TO_CLOUD';
  hopProgress = 0;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  squashScaleY = 1.25;
  whisperEl.textContent = '';
}

dialogueBox.addEventListener('click', () => {
  if (gameState === 'TALKING') advanceDialogue();
});

// ============================================================================
// 4. KEYBOARD LISTENERS
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (Object.prototype.hasOwnProperty.call(keys, e.code)) keys[e.code] = true;
  if (e.code === 'ArrowLeft') keys.KeyA = true;
  if (e.code === 'ArrowRight') keys.KeyD = true;
  if (e.code === 'ArrowUp') keys.KeyW = true;
  if (e.code === 'ArrowDown') keys.KeyS = true;

  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState === 'PLATFORMING') {
      jumpBufferTimer = 0.16;
    } else if (gameState === 'TALKING') {
      advanceDialogue();
    } else if (gameState === 'READY_TO_HOP_CLOUD') {
      triggerJumpOntoCloud();
    } else if (gameState === 'CLOUD_RIDE') {
      cloudSpringVel = -3.2;
      squashScaleY = 1.2;
    }
  }

  if (e.code === 'KeyD' && gameState === 'READY_TO_HOP_CLOUD') {
    triggerJumpOntoCloud();
  }
});

window.addEventListener('keyup', (e) => {
  if (Object.prototype.hasOwnProperty.call(keys, e.code)) keys[e.code] = false;
  if (e.code === 'ArrowLeft') keys.KeyA = false;
  if (e.code === 'ArrowRight') keys.KeyD = false;
  if (e.code === 'ArrowUp') keys.KeyW = false;
  if (e.code === 'ArrowDown') keys.KeyS = false;
});

// ============================================================================
// 5. MAIN ANIMATION & PHYSICS LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  if (girlMixer) girlMixer.update(dt);
  updateWorld(elapsed);

  if (gameState === 'PLATFORMING') {
    let inputX = 0;
    let inputZ = 0;
    if (keys.KeyD) inputX += 1;
    if (keys.KeyA) inputX -= 1;
    if (keys.KeyW) inputZ -= 1;
    if (keys.KeyS) inputZ += 1;

    const maxSpeed = 4.6;
    vel.x = THREE.MathUtils.damp(vel.x, inputX * maxSpeed, 12, dt);
    vel.z = THREE.MathUtils.damp(vel.z, inputZ * maxSpeed * 0.65, 12, dt);

    if (inputX > 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, 0, 14, dt);
    if (inputX < 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, Math.PI, 14, dt);

    if (isGrounded) coyoteTimer = 0.12;
    else coyoteTimer -= dt;

    if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

    if (jumpBufferTimer > 0 && coyoteTimer > 0) {
      vel.y = 8.4;
      isGrounded = false;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      squashScaleY = 1.24;
    }

    vel.y -= 21.0 * dt;

    const nextX = THREE.MathUtils.clamp(playerGroup.position.x + vel.x * dt, -9.5, 6.2);
    const charRadius = 0.26;
    const targetStep = getStepAtX(nextX + (vel.x >= 0 ? charRadius : -charRadius));

    if (targetStep.topY > playerGroup.position.y + 0.18) {
      vel.x = 0;
    } else {
      playerGroup.position.x = nextX;
    }

    playerGroup.position.z = THREE.MathUtils.clamp(playerGroup.position.z + vel.z * dt, -0.85, 0.85);
    playerGroup.position.y += vel.y * dt;

    const currentStep = getStepAtX(playerGroup.position.x);
    if (playerGroup.position.y <= currentStep.topY) {
      if (!isGrounded && vel.y < -2.0) squashScaleY = 0.82;
      playerGroup.position.y = currentStep.topY;
      vel.y = 0;
      isGrounded = true;

      if (STEP_THOUGHTS[currentStep.stepId]) {
        setThought(STEP_THOUGHTS[currentStep.stepId]);
      }
    } else {
      isGrounded = false;
    }

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 14, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    const speedMag = Math.hypot(vel.x, vel.z);
    if (speedMag > 0.2 && isGrounded) {
      leftLeg.rotation.x = Math.sin(elapsed * 15) * 0.5;
      rightLeg.rotation.x = -Math.sin(elapsed * 15) * 0.5;
      charVisual.position.y = Math.abs(Math.sin(elapsed * 15)) * 0.04;
    } else {
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 12, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 12, dt);
      charVisual.position.y = THREE.MathUtils.damp(charVisual.position.y, 0, 12, dt);
    }

    // Hop into the Hot Air Balloon Basket
    const distToBasket = Math.abs(playerGroup.position.x - balloonGroup.position.x);
    if (distToBasket < 0.92 && playerGroup.position.y >= 2.75) {
      gameState = 'BALLOON_FLIGHT';
      balloonRig.add(playerGroup);
      playerGroup.position.set(0, 0.22, 0);
      charVisual.rotation.y = 0;
      charVisual.scale.set(1, 1, 1);
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;

      basketSpringVel = -3.8;
      setThought("“hold spacebar to fire the burner and lift off...”");
      whisperEl.textContent = "hold spacebar to heat the balloon and rise";
    }

    const camTargetX = THREE.MathUtils.clamp(playerGroup.position.x + 1.4, -2.5, 5.0);
    const camTargetY = THREE.MathUtils.clamp(playerGroup.position.y + 2.4, 2.4, 6.5);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetX, 4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetY, 4, dt);
    camera.lookAt(camera.position.x, camera.position.y - 0.5, 0);

  } else if (gameState === 'BALLOON_FLIGHT') {
    const springForce = -28.0 * basketSpringY - 6.5 * basketSpringVel;
    basketSpringVel += springForce * dt;
    basketSpringY += basketSpringVel * dt;

    const targetHeat = keys.Space ? 1.0 : 0.0;
    burnerHeat = THREE.MathUtils.damp(burnerHeat, targetHeat, keys.Space ? 3.2 : 2.0, dt);

    const flameFlicker = 1.0 + Math.sin(elapsed * 18) * 0.12;
    const flameScale = (0.45 + burnerHeat * 1.15) * flameFlicker;
    burnerFlame.scale.set(flameScale * 0.85, flameScale * 1.35, flameScale * 0.85);

    const swell = 1.0 + burnerHeat * 0.045;
    envelopeMesh.scale.set(swell, 1.15 * swell, swell);

    const netLiftAccel = (burnerHeat * 9.2) - 2.6;
    balloonVelY += netLiftAccel * dt;
    balloonVelY *= Math.pow(0.42, dt);

    balloonGroup.position.y += balloonVelY * dt;

    if (balloonGroup.position.y <= BALLOON_BASE_Y) {
      balloonGroup.position.y = BALLOON_BASE_Y;
      if (balloonVelY < 0) balloonVelY = 0;
    }

    balloonRig.position.y = basketSpringY + Math.sin(elapsed * 1.8) * 0.05;
    const targetSway = Math.sin(elapsed * 1.5) * 0.035 * (0.3 + burnerHeat * 0.7);
    balloonRig.rotation.z = THREE.MathUtils.damp(balloonRig.rotation.z, targetSway, 4, dt);

    if (balloonGroup.position.y > 10.0 && balloonGroup.position.y < 19.0) {
      setThought("“look how soft and blue the air feels up here...”");
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, 6.8, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, balloonGroup.position.y + 2.3, 3.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 12.2, 2.5, dt);
    camera.lookAt(6.8, balloonGroup.position.y + 1.9, 0);

    if (balloonGroup.position.y >= TARGET_SKY_ALTITUDE) {
      balloonGroup.position.y = TARGET_SKY_ALTITUDE;
      balloonVelY = 0;
      startDialogue();
    }

  } else if (gameState === 'TALKING' || gameState === 'READY_TO_HOP_CLOUD') {
    balloonGroup.position.y = THREE.MathUtils.damp(
      balloonGroup.position.y,
      TARGET_SKY_ALTITUDE + Math.sin(elapsed * 1.3) * 0.14,
      3,
      dt
    );
    mrSkyGroup.position.y = TARGET_SKY_ALTITUDE + 0.15 + Math.sin(elapsed * 1.5) * 0.16;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, 7.5, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, TARGET_SKY_ALTITUDE + 1.8, 3, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 11.2, 3, dt);
    camera.lookAt(7.5, TARGET_SKY_ALTITUDE + 1.4, 0);

  } else if (gameState === 'JUMPING_TO_CLOUD') {
    hopProgress = Math.min(1, hopProgress + dt * 1.85);
    const targetPos = new THREE.Vector3(
      mrSkyGroup.position.x,
      mrSkyGroup.position.y + 1.08,
      0
    );

    playerGroup.position.lerpVectors(hopStartPos, targetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.65;

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 10, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    if (hopProgress >= 1) {
      gameState = 'CLOUD_RIDE';
      mrSkyRig.add(playerGroup);
      playerGroup.position.set(0, 1.08, 0);
      squashScaleY = 0.80;
      cloudSpringVel = -4.2;
      whisperEl.textContent = "hold d / a to glide on mr. sky’s cloud through the story";
      setThought("“glide right with mr. sky to meet mama light and her 7 kids...”");
    }

  } else if (gameState === 'CLOUD_RIDE') {
    const springF = -26.0 * cloudSpringY - 6.0 * cloudSpringVel;
    cloudSpringVel += springF * dt;
    cloudSpringY += cloudSpringVel * dt;

    let cloudInputX = 0;
    if (keys.KeyD) cloudInputX += 1;
    if (keys.KeyA) cloudInputX -= 1;

    const maxCloudSpeed = 5.4;
    cloudVelX = THREE.MathUtils.damp(cloudVelX, cloudInputX * maxCloudSpeed, 6.5, dt);
    mrSkyGroup.position.x = THREE.MathUtils.clamp(
      mrSkyGroup.position.x + cloudVelX * dt,
      MR_SKY_START_X,
      53.0
    );

    if (cloudInputX > 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, 0, 12, dt);
    if (cloudInputX < 0) charVisual.rotation.y = THREE.MathUtils.damp(charVisual.rotation.y, Math.PI, 12, dt);

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 12, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    mrSkyRig.position.y = cloudSpringY + Math.sin(elapsed * 2.0) * 0.14;
    const targetTilt = -cloudVelX * 0.025;
    mrSkyRig.rotation.z = THREE.MathUtils.damp(mrSkyRig.rotation.z, targetTilt, 6, dt);

    let activeCaption = "“glide with a and d to explore mama light’s story in the clouds...”";
    for (const st of SKY_STATIONS) {
      if (Math.abs(mrSkyGroup.position.x - st.x) < 4.8) {
        activeCaption = st.caption;
        break;
      }
    }
    setThought(activeCaption);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, mrSkyGroup.position.x, 4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, TARGET_SKY_ALTITUDE + 2.5, 4, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 13.5, 3, dt);
    camera.lookAt(camera.position.x, TARGET_SKY_ALTITUDE + 2.2, 0);
  }

  renderer.render(scene, camera);
}

animate();