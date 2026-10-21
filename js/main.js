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
import { updateWorld, rocksGroup } from './world.js';
import {
  playerGroup,
  charVisual,
  girlMixer,
  balloonGroup,
  balloonRig,
  mrSkyGroup,
  mrSkyRig,
  mrCloudMat,
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

// Fallback in case no external textures/models are queued
setTimeout(() => {
  minTimeElapsed = true;
  assetsLoaded = true;
  tryHideLoadingScreen();
}, 3000);

// ============================================================================
// 2. UI HELPERS
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
  }, 280);
}

// ============================================================================
// 3. GAME STATE & PHYSICS VARIABLES (A & D ONLY)
// ============================================================================
const keys = { KeyA: false, KeyD: false, Space: false };
// States:
// PLATFORMING | BALLOON_FLIGHT | TALKING | READY_TO_HOP_CLOUD |
// JUMPING_TO_CLOUD | CLOUD_RIDE | JUMPING_TO_BALLOON | JUMPING_TO_STONES
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

// Base camera target before mouse parallax is applied
const camBasePos = new THREE.Vector3(-1.5, 2.7, 14.5);
const camLookTarget = new THREE.Vector3(-1.5, 2.2, 0);

// ============================================================================
// 4. 3-POINT FOOT RAYCASTER FOR ROCK LANDING AREAS
// ============================================================================
const downRaycaster = new THREE.Raycaster();
const downDir = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();
const normalMatrix = new THREE.Matrix3();
const worldNormal = new THREE.Vector3();

function getStepAtX(x) {
  for (const s of STEPS) {
    if (x >= s.minX && x <= s.maxX) return s;
  }
  return STEPS[0];
}

function getRockSurfaceAt(x, y, z) {
  const stepData = getStepAtX(x);
  let bestY = stepData.topY;

  const footOffsets = [-0.24, 0.0, 0.24];
  let highestMeshHitY = -Infinity;

  for (const ox of footOffsets) {
    rayOrigin.set(x + ox, y + 1.2, z);
    downRaycaster.set(rayOrigin, downDir);
    downRaycaster.far = 4.0;

    const hits = downRaycaster.intersectObjects(rocksGroup.children, true);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      if (hit.face) {
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        worldNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
        if (worldNormal.y < 0.45) continue;
      }
      if (hit.point.y <= y + 0.45 && hit.point.y > highestMeshHitY) {
        highestMeshHitY = hit.point.y;
      }
    }
  }

  if (highestMeshHitY > -Infinity) {
    bestY = Math.max(highestMeshHitY, stepData.topY * 0.85);
  }

  return { topY: bestY, stepId: stepData.stepId };
}

// ============================================================================
// 5. DIALOGUE & BIDIRECTIONAL HOPPING (STONES <-> BALLOON <-> MR. CLOUD)
// ============================================================================
function startDialogue() {
  if (hasMetMrSky) {
    gameState = 'READY_TO_HOP_CLOUD';
    setThought("press space + d to hop onto mr. cloud, or space + a when down by the stones");
    whisperEl.textContent = "space + d → hop onto mr. cloud";
    whisperEl.style.opacity = '0.8';
    return;
  }
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
    hasMetMrSky = true;
    dialogueBox.classList.remove('active');
    gameState = 'READY_TO_HOP_CLOUD';
    setThought("let's hop onto mr. cloud!");
    whisperEl.textContent = "press space + d to jump onto mr. cloud";
    whisperEl.style.opacity = '0.8';
  }
}

// Hop: Balloon -> Mr. Cloud
function triggerJumpOntoCloud() {
  gameState = 'JUMPING_TO_CLOUD';
  hopProgress = 0;
  // Reaction dip on the balloon basket as she pushes off!
  basketSpringVel = -3.4;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = 0;
  squashScaleY = 1.25;
}

// Hop Back: Mr. Cloud -> Balloon Basket
function triggerJumpBackToBalloon() {
  gameState = 'JUMPING_TO_BALLOON';
  hopProgress = 0;
  // Reaction push-off squish on Mr. Cloud!
  cloudSpringVel = -3.5;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = Math.PI;
  squashScaleY = 1.25;
}

// Hop Back: Balloon Basket -> Top Stone
function triggerJumpBackToStones() {
  gameState = 'JUMPING_TO_STONES';
  hopProgress = 0;
  // Reaction bounce on the balloon basket as she jumps out!
  basketSpringVel = -3.6;

  playerGroup.getWorldPosition(hopStartPos);
  scene.add(playerGroup);
  playerGroup.position.copy(hopStartPos);
  charVisual.rotation.y = Math.PI;
  squashScaleY = 1.24;

  const topStoneX = Math.min(STEPS[4].maxX - 1.1, BALLOON_X - 1.35);
  hopTargetPos.set(topStoneX, STEPS[4].topY, 0);
}

dialogueBox.addEventListener('click', () => {
  if (gameState === 'TALKING') advanceDialogue();
});

// ============================================================================
// 6. KEYBOARD LISTENERS (A, D, SPACE ONLY)
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.KeyA = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.KeyD = true;

  if (e.code === 'Space') {
    e.preventDefault();
    keys.Space = true;

    if (gameState === 'PLATFORMING') {
      jumpBufferTimer = 0.16;
    } else if (gameState === 'TALKING') {
      advanceDialogue();
    } else if (gameState === 'BALLOON_FLIGHT' || gameState === 'READY_TO_HOP_CLOUD') {
      // Hop back onto stones if near the bottom and pressing A
      if (keys.KeyA && balloonGroup.position.y <= BALLOON_BASE_Y + 2.8) {
        triggerJumpBackToStones();
      }
      // Hop onto Mr. Cloud if near the top and pressing D (or in READY_TO_HOP_CLOUD)
      else if (
        (keys.KeyD || gameState === 'READY_TO_HOP_CLOUD') &&
        balloonGroup.position.y >= TARGET_SKY_ALTITUDE - 2.2
      ) {
        triggerJumpOntoCloud();
      }
    } else if (gameState === 'CLOUD_RIDE') {
      // If near the balloon on the left edge and pressing Space + A, hop back into the balloon!
      if (keys.KeyA && mrSkyGroup.position.x <= MR_SKY_START_X + 2.2) {
        triggerJumpBackToBalloon();
      } else {
        // Playful hop on Mr. Cloud
        cloudSpringVel = -3.2;
        squashScaleY = 1.2;
      }
    }
  }

  // Also allow pressing A or D while Space is already held
  if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && keys.Space) {
    if (
      (gameState === 'BALLOON_FLIGHT' || gameState === 'READY_TO_HOP_CLOUD') &&
      balloonGroup.position.y <= BALLOON_BASE_Y + 2.8
    ) {
      triggerJumpBackToStones();
    } else if (gameState === 'CLOUD_RIDE' && mrSkyGroup.position.x <= MR_SKY_START_X + 2.2) {
      triggerJumpBackToBalloon();
    }
  }

  if ((e.code === 'KeyD' || e.code === 'ArrowRight') && (gameState === 'READY_TO_HOP_CLOUD' || (gameState === 'BALLOON_FLIGHT' && keys.Space && balloonGroup.position.y >= TARGET_SKY_ALTITUDE - 2.2))) {
    triggerJumpOntoCloud();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.KeyA = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.KeyD = false;
  if (e.code === 'Space') keys.Space = false;
});

// ============================================================================
// 7. MAIN LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  if (girlMixer) girlMixer.update(dt);
  updateWorld(elapsed);

  // Always update balloon basket spring reaction
  const bSpringForce = -28.0 * basketSpringY - 6.5 * basketSpringVel;
  basketSpringVel += bSpringForce * dt;
  basketSpringY += basketSpringVel * dt;
  balloonRig.position.y = basketSpringY + Math.sin(elapsed * 1.8) * 0.04;

  // Always update Mr. Cloud spring reaction
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
      vel.y = 8.6;
      isGrounded = false;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      squashScaleY = 1.24;
    }

    vel.y -= 21.0 * dt;

    const nextX = THREE.MathUtils.clamp(playerGroup.position.x + vel.x * dt, -9.5, 6.2);
    const charRadius = 0.26;
    const aheadStep = getStepAtX(nextX + (vel.x >= 0 ? charRadius : -charRadius));

    if (aheadStep.topY > playerGroup.position.y + 0.32) {
      vel.x = 0;
    } else {
      playerGroup.position.x = nextX;
    }

    playerGroup.position.z = 0;
    playerGroup.position.y += vel.y * dt;

    const surface = getRockSurfaceAt(playerGroup.position.x, playerGroup.position.y, 0);

    if (playerGroup.position.y <= surface.topY) {
      if (!isGrounded && vel.y < -2.0) squashScaleY = 0.82;
      playerGroup.position.y = THREE.MathUtils.damp(playerGroup.position.y, surface.topY, 28, dt);
      if (Math.abs(playerGroup.position.y - surface.topY) < 0.05) {
        playerGroup.position.y = surface.topY;
      }
      vel.y = 0;
      isGrounded = true;

      if (STEP_THOUGHTS[surface.stepId]) {
        setThought(STEP_THOUGHTS[surface.stepId]);
      }
    } else {
      isGrounded = false;
    }

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 14, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    // Step or hop into the Hot Air Balloon
    const distToBasket = Math.abs(playerGroup.position.x - balloonGroup.position.x);
    if (distToBasket < 1.05 && playerGroup.position.y >= STEPS[4].topY - 0.35 && vel.x >= 0) {
      gameState = 'BALLOON_FLIGHT';
      balloonRig.add(playerGroup);
      playerGroup.position.set(0, 0.22, 0);
      charVisual.rotation.y = 0;
      charVisual.scale.set(1, 1, 1);

      basketSpringVel = -3.8;
      setThought("hold space to fly up · or space + a to hop back");
      whisperEl.textContent = "hold space to rise · space + a to hop back onto stones";
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

    if (balloonGroup.position.y <= BALLOON_BASE_Y + 2.5) {
      whisperEl.textContent = "hold space to fly up · space + a to hop back onto stones";
    } else if (balloonGroup.position.y < TARGET_SKY_ALTITUDE - 2.5) {
      setThought("floating up through the quiet air...");
      whisperEl.textContent = "hold space to rise · release to float down";
    }

    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, 6.8, 3, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, balloonGroup.position.y + 2.3, 3.5, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 12.2, 2.5, dt);
    camLookTarget.set(6.8, balloonGroup.position.y + 1.9, 0);

    if (balloonGroup.position.y >= TARGET_SKY_ALTITUDE) {
      balloonGroup.position.y = TARGET_SKY_ALTITUDE;
      balloonVelY = 0;
      startDialogue();
    }

  } else if (gameState === 'TALKING' || gameState === 'READY_TO_HOP_CLOUD') {
    // Allow descending back down if the player holds A or wants to go down
    if (gameState === 'READY_TO_HOP_CLOUD' && !keys.Space) {
      balloonGroup.position.y = THREE.MathUtils.damp(
        balloonGroup.position.y,
        TARGET_SKY_ALTITUDE + Math.sin(elapsed * 1.3) * 0.14,
        3,
        dt
      );
    }

    camBasePos.x = THREE.MathUtils.damp(camBasePos.x, 7.5, 3, dt);
    camBasePos.y = THREE.MathUtils.damp(camBasePos.y, TARGET_SKY_ALTITUDE + 1.8, 3, dt);
    camBasePos.z = THREE.MathUtils.damp(camBasePos.z, 11.2, 3, dt);
    camLookTarget.set(7.5, TARGET_SKY_ALTITUDE + 1.4, 0);

  } else if (gameState === 'JUMPING_TO_CLOUD') {
    hopProgress = Math.min(1, hopProgress + dt * 2.0);
    const targetPos = new THREE.Vector3(mrSkyGroup.position.x, mrSkyGroup.position.y + 1.0, 0);

    playerGroup.position.lerpVectors(hopStartPos, targetPos, hopProgress);
    playerGroup.position.y += Math.sin(hopProgress * Math.PI) * 1.5;

    squashScaleY = THREE.MathUtils.damp(squashScaleY, 1.0, 10, dt);
    const invScale = 1 / Math.sqrt(squashScaleY);
    charVisual.scale.set(invScale, squashScaleY, invScale);

    if (hopProgress >= 1) {
      gameState = 'CLOUD_RIDE';
      mrSkyRig.add(playerGroup);
      playerGroup.position.set(0, 1.0, 0);
      squashScaleY = 0.80;
      cloudSpringVel = -4.2;
      whisperEl.textContent = "a / d to move mr. cloud · space + a at left edge to hop back in balloon";
      setThought("move right with D—watch mr. cloud turn blue!");
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
      // Nudge balloon slightly below target altitude so it can float down or hop back
      balloonGroup.position.y = TARGET_SKY_ALTITUDE - 0.4;
      setThought("back in the basket! release space to float down, or space + d for mr. cloud");
      whisperEl.textContent = "space + d → hop onto mr. cloud · release space → float down to stones";
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
      whisperEl.textContent = "a / d to move · space to jump";
    }

  } else if (gameState === 'CLOUD_RIDE') {
    let cloudInputX = 0;
    if (keys.KeyD) cloudInputX += 1;
    if (keys.KeyA) cloudInputX -= 1;

    const maxCloudSpeed = 5.6;
    cloudVelX = THREE.MathUtils.damp(cloudVelX, cloudInputX * maxCloudSpeed, 6.5, dt);
    mrSkyGroup.position.x = THREE.MathUtils.clamp(
      mrSkyGroup.position.x + cloudVelX * dt,
      MR_SKY_START_X,
      MR_SKY_END_X
    );

    // Smoothly transition Mr. Cloud's color from Gray (left) to Blue (right)!
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

    // Update short humanlike caption near each placeholder
    let activeCaption = mrSkyGroup.position.x <= MR_SKY_START_X + 2.2
      ? "press D to glide right · or space + A to hop back into the balloon"
      : "gliding through the sky...";

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
  }

  // ============================================================================
  // 8. APPLY MOUSE PARALLAX TILT & OFFSET TO CAMERA
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