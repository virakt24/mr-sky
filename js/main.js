import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createScene } from './scene.js';
import { World } from './world.js';
import { Entities } from './entities.js';

const { scene, camera, renderer } = createScene();
const world = new World(scene);
const entities = new Entities(scene);

// Keyboard state (A, D, Spacebar) — locked until introCompleted is true
const keys = {
  left: false,
  right: false
};

let introCompleted = false;

// Active Stage & Dialogue State
let activeStageIndex = 0;
let activePlaceholderId = null;
let currentDialogues = [...CONFIG.stages[0].dialogues];
let currentSpeaker = CONFIG.stages[0].speaker;
let currentLineIndex = 0;

// DOM Elements
const helpBtn = document.getElementById('help-btn');
const controlsModal = document.getElementById('controls-modal');
const closeControlsBtn = document.getElementById('close-controls-btn');

const stagePills = document.querySelectorAll('.stage-pill');
const placeholderPills = document.querySelectorAll('.placeholder-pill');
const navDivider = document.getElementById('nav-divider');
const placeholderGroup = document.getElementById('placeholder-group');

const speechBubble = document.getElementById('girl-dialogue');
const speakerEl = document.getElementById('dialogue-speaker');
const dialogueTextEl = document.getElementById('dialogue-text');
const stepIndicatorEl = document.getElementById('dialogue-step-indicator');
const prevBtn = document.getElementById('dialogue-prev-btn');
const nextBtn = document.getElementById('dialogue-next-btn');

const replayBtn = document.getElementById('replay-btn');
const skipBtn = document.getElementById('skip-btn');

// =========================================================
// 1. DIALOGUE BOX LOGIC (Only Prev & Next — No Replay Inside)
// =========================================================
function renderDialogue() {
  speakerEl.textContent = currentSpeaker;
  dialogueTextEl.textContent = currentDialogues[currentLineIndex];
  stepIndicatorEl.textContent = `${currentLineIndex + 1} / ${currentDialogues.length}`;

  prevBtn.disabled = currentLineIndex === 0;
  nextBtn.textContent = 'Next →';

  // Disable Next button only if already at the last line AND intro is already finished
  const isLastLine = currentLineIndex === currentDialogues.length - 1;
  nextBtn.disabled = isLastLine && introCompleted;
}

function finishIntro() {
  introCompleted = true;
  renderDialogue();
}

prevBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentLineIndex > 0) {
    currentLineIndex--;
    renderDialogue();
  }
});

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentLineIndex < currentDialogues.length - 1) {
    currentLineIndex++;
    renderDialogue();
  } else if (!introCompleted) {
    // Clicking Next on the final intro line unlocks world movement and zooms camera out
    finishIntro();
  }
});

// =========================================================
// 2. BOTTOM-RIGHT REPLAY & SKIP BUTTONS
// =========================================================
replayBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentLineIndex = 0;
  // If replaying at the Starting Stage, zoom back in for the intro
  if (activeStageIndex === 0 && activePlaceholderId === null) {
    introCompleted = false;
    keys.left = false;
    keys.right = false;
    entities.moveToTargetX(0);
  }
  renderDialogue();
});

skipBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentLineIndex = currentDialogues.length - 1;
  finishIntro();
});

// =========================================================
// 3. GLOBAL NAVBAR: STAGES & CONDITIONAL 4 PLACEHOLDERS
// =========================================================
function updateNavHighlight() {
  stagePills.forEach((btn) => {
    const idx = Number(btn.dataset.stage);
    btn.classList.toggle('active', activePlaceholderId === null && idx === activeStageIndex);
  });

  placeholderPills.forEach((btn) => {
    const pid = Number(btn.dataset.placeholder);
    btn.classList.toggle('active', activePlaceholderId === pid);
  });

  // Show Placeholders 1, 2, 3, and 4 ONLY when Mr. Cloud Stage (index 2) or a placeholder is active
  const showPlaceholders = activeStageIndex === 2 || activePlaceholderId !== null;
  navDivider.classList.toggle('hidden-nav', !showPlaceholders);
  placeholderGroup.classList.toggle('hidden-nav', !showPlaceholders);
}

function selectStage(stageIdx, moveCharacter = true) {
  const stage = CONFIG.stages[stageIdx];
  if (!stage) return;

  // Selecting a stage unlocks world view if still in intro
  if (stageIdx !== 0) {
    introCompleted = true;
  }

  activeStageIndex = stageIdx;
  activePlaceholderId = null;
  currentDialogues = [...stage.dialogues];
  currentSpeaker = stage.speaker;
  currentLineIndex = 0;

  if (moveCharacter) {
    entities.moveToTargetX(stage.targetX);
  }

  updateNavHighlight();
  renderDialogue();
}

function selectPlaceholder(placeholderId) {
  const slot = CONFIG.placeholders[placeholderId];
  if (!slot) return;

  introCompleted = true;
  activeStageIndex = 2; // Keep Mr. Cloud context active so placeholders stay visible
  activePlaceholderId = placeholderId;
  currentDialogues = [...slot.dialogues];
  currentSpeaker = slot.speaker;
  currentLineIndex = 0;

  entities.moveToTargetX(slot.targetX);
  updateNavHighlight();
  renderDialogue();
}

stagePills.forEach((btn) => {
  btn.addEventListener('click', () => {
    const idx = Number(btn.dataset.stage);
    selectStage(idx, true);
  });
});

placeholderPills.forEach((btn) => {
  btn.addEventListener('click', () => {
    const pid = Number(btn.dataset.placeholder);
    selectPlaceholder(pid);
  });
});

// =========================================================
// 4. QUESTION MARK ('?') CONTROLS MODAL
// =========================================================
function toggleControlsModal(forceState) {
  const isHidden = controlsModal.classList.contains('hidden');
  const shouldShow = typeof forceState === 'boolean' ? forceState : isHidden;

  controlsModal.classList.toggle('hidden', !shouldShow);
  helpBtn.setAttribute('aria-expanded', String(shouldShow));
}

helpBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleControlsModal();
});

closeControlsBtn.addEventListener('click', () => {
  toggleControlsModal(false);
});

window.addEventListener('click', (e) => {
  if (!controlsModal.classList.contains('hidden') && !controlsModal.contains(e.target) && e.target !== helpBtn) {
    toggleControlsModal(false);
  }
});

// =========================================================
// 5. KEYBOARD CONTROLS (Locked Until Intro Finishes)
// =========================================================
window.addEventListener('keydown', (e) => {
  if (!introCompleted) return; // Block A, D, and Spacebar until after introduction

  const code = e.code;
  if (code === 'KeyA' || code === 'ArrowLeft') {
    keys.left = true;
  } else if (code === 'KeyD' || code === 'ArrowRight') {
    keys.right = true;
  } else if (code === 'Space') {
    e.preventDefault();
    entities.jump();
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyA' || code === 'ArrowLeft') {
    keys.left = false;
  } else if (code === 'KeyD' || code === 'ArrowRight') {
    keys.right = false;
  }
});

// =========================================================
// 6. ANCHOR SPEECH BUBBLE NEAR THE GIRL IN SCREEN SPACE
// =========================================================
const anchorWorldPos = new THREE.Vector3();

function updateSpeechBubblePosition() {
  entities.getSpeechWorldPosition(anchorWorldPos);
  anchorWorldPos.project(camera);

  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;

  let screenX = anchorWorldPos.x * halfW + halfW + 75;
  let screenY = -(anchorWorldPos.y * halfH) + halfH - 18;

  const padX = 190;
  const padTop = 105;
  const padBottom = 80;

  screenX = THREE.MathUtils.clamp(screenX, padX, window.innerWidth - padX);
  screenY = THREE.MathUtils.clamp(screenY, padTop, window.innerHeight - padBottom);

  speechBubble.style.left = `${screenX}px`;
  speechBubble.style.top = `${screenY}px`;
}

// Automatically sync active stage badge if user walks with A & D
function checkProximityStageSync() {
  if (!introCompleted || entities.targetX !== null || activePlaceholderId !== null) return;

  const girlX = entities.girlGroup.position.x;
  let closestIdx = activeStageIndex;
  let minDistance = Infinity;

  CONFIG.stages.forEach((st, idx) => {
    const dist = Math.abs(girlX - st.targetX);
    if (dist < minDistance) {
      minDistance = dist;
      closestIdx = idx;
    }
  });

  if (closestIdx !== activeStageIndex && minDistance < 4.5) {
    selectStage(closestIdx, false);
  }
}

// =========================================================
// 7. MAIN RENDER LOOP
// =========================================================
updateNavHighlight();
renderDialogue();

const clock = new THREE.Clock();
let prevTime = 0;
const currentLookAt = new THREE.Vector3(0, CONFIG.cameraViews.intro.lookAtY, 0);

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  const delta = Math.min(elapsedTime - prevTime, 0.1);
  prevTime = elapsedTime;

  entities.update(delta, elapsedTime, keys);
  world.update(elapsedTime);
  checkProximityStageSync();

  const girlX = entities.girlGroup.position.x;
  const view = introCompleted ? CONFIG.cameraViews.world : CONFIG.cameraViews.intro;

  // Smoothly interpolate camera position between horizon-line intro zoom and world view
  const desiredCamX = girlX + view.xOffset;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredCamX, 0.07);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, view.y, 0.07);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, view.z, 0.07);

  const targetLookX = girlX + view.lookAtXOffset;
  currentLookAt.x = THREE.MathUtils.lerp(currentLookAt.x, targetLookX, 0.08);
  currentLookAt.y = THREE.MathUtils.lerp(currentLookAt.y, view.lookAtY, 0.08);
  camera.lookAt(currentLookAt.x, currentLookAt.y, 0);

  renderer.render(scene, camera);

  // Keep speech bubble anchored right beside the girl
  updateSpeechBubblePosition();
}

animate();