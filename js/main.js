import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createScene } from './scene.js';
import { World } from './world.js';
import { Entities } from './entities.js';

const { scene, camera, renderer } = createScene();
const world = new World(scene);
const entities = new Entities(scene);

// Keyboard state (A, D, Spacebar)
const keys = {
  left: false,
  right: false
};

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

const speechBubble = document.getElementById('girl-dialogue');
const speakerEl = document.getElementById('dialogue-speaker');
const dialogueTextEl = document.getElementById('dialogue-text');
const stepIndicatorEl = document.getElementById('dialogue-step-indicator');
const prevBtn = document.getElementById('dialogue-prev-btn');
const nextBtn = document.getElementById('dialogue-next-btn');

// =========================================================
// 1. DIALOGUE BOX LOGIC (Controlled by Mouse Prev / Next)
// =========================================================
function renderDialogue() {
  speakerEl.textContent = currentSpeaker;
  dialogueTextEl.textContent = currentDialogues[currentLineIndex];
  stepIndicatorEl.textContent = `${currentLineIndex + 1} / ${currentDialogues.length}`;

  prevBtn.disabled = currentLineIndex === 0;

  if (currentLineIndex === currentDialogues.length - 1) {
    nextBtn.textContent = activeStageIndex < CONFIG.stages.length - 1 && !activePlaceholderId
      ? 'Next Stage →'
      : 'Replay ↻';
  } else {
    nextBtn.textContent = 'Next →';
  }
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
  } else {
    // If on the final line of a main stage, smoothly advance to the next stage
    if (!activePlaceholderId && activeStageIndex < CONFIG.stages.length - 1) {
      selectStage(activeStageIndex + 1);
    } else {
      currentLineIndex = 0;
      renderDialogue();
    }
  }
});

// =========================================================
// 2. GLOBAL NAVBAR: STAGES & 4 PLACEHOLDERS
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
}

function selectStage(stageIdx, moveCharacter = true) {
  const stage = CONFIG.stages[stageIdx];
  if (!stage) return;

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
// 3. QUESTION MARK ('?') CONTROLS MODAL
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
// 4. KEYBOARD CONTROLS (A, D, SPACEBAR)
// =========================================================
window.addEventListener('keydown', (e) => {
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
// 5. ANCHOR SPEECH BUBBLE NEAR THE GIRL IN SCREEN SPACE
// =========================================================
const anchorWorldPos = new THREE.Vector3();

function updateSpeechBubblePosition() {
  entities.getSpeechWorldPosition(anchorWorldPos);
  anchorWorldPos.project(camera);

  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;

  // Convert normalized device coordinates (-1 to 1) to screen pixels
  let screenX = anchorWorldPos.x * halfW + halfW + 75;
  let screenY = -(anchorWorldPos.y * halfH) + halfH - 18;

  // Keep the bubble safely inside the inner-curved white border
  const padX = 190;
  const padTop = 105;
  const padBottom = 60;

  screenX = THREE.MathUtils.clamp(screenX, padX, window.innerWidth - padX);
  screenY = THREE.MathUtils.clamp(screenY, padTop, window.innerHeight - padBottom);

  speechBubble.style.left = `${screenX}px`;
  speechBubble.style.top = `${screenY}px`;
}

// Automatically sync active stage badge if user walks with A & D
function checkProximityStageSync() {
  if (entities.targetX !== null || activePlaceholderId !== null) return;

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
// 6. MAIN RENDER LOOP
// =========================================================
renderDialogue();
const clock = new THREE.Clock();
let prevTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();
  const delta = Math.min(elapsedTime - prevTime, 0.1);
  prevTime = elapsedTime;

  entities.update(delta, elapsedTime, keys);
  world.update(elapsedTime);
  checkProximityStageSync();

  // Smooth camera tracking along the girl's X position
  const desiredCamX = entities.girlGroup.position.x + 1.2;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredCamX, 0.08);
  camera.lookAt(camera.position.x - 0.5, 1.4, 0);

  renderer.render(scene, camera);

  // Project girl's 3D position to keep her speech bubble right next to her
  updateSpeechBubblePosition();
}

animate();