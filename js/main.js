// js/main.js

import * as THREE from 'three';
import { CONFIG, STATES } from './config.js';
import { World } from './world.js';
import { Entities } from './entities.js';
import { createScene } from './scene.js';

class GameFlowController {
  constructor() {
    const { scene, camera, renderer } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.world = new World(this.scene);
    this.entities = new Entities(this.scene);

    this.clock = new THREE.Clock();
    this.state = STATES.STAGE_1_INTRO;

    // Paginated dialogue state
    this.dialoguePages = [];
    this.dialogueIndex = 0;
    this.isDialogueOpen = false;
    this.dialoguePlacement = 'character'; // 'character' (Stage 1 Mia) or 'top' (Mr. Cloud & Sky Stations)
    this.onDialogueFinish = null;

    // Stage 5 sky exploration tracking
    this.activeStationId = null;
    this.lastTriggeredStationId = null;
    this.targetCloudAutoX = null;
    this.exploredStationIds = new Set();
    this.completionShown = false;

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      arrowUp: false,
      arrowDown: false,
      arrowLeft: false,
      arrowRight: false
    };

    this.cameraLookTarget = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.cacheDOMElements();
    this.styleBottomKeyBar();
    this.bindUIEvents();
    this.bindInputEvents();
    this.exposeGlobalHandlers();
  }

  cacheDOMElements() {
    const d = CONFIG.dom;
    this.helpBtn = document.querySelector(d.helpBtn);
    this.controlsModal = document.querySelector(d.controlsModal);
    this.closeControlsBtn = document.querySelector(d.closeControlsBtn);
    this.homeBrandBtn = document.querySelector(d.homeBrandBtn);
    this.promptHint = document.querySelector(d.promptHint);
    this.stagePills = document.querySelectorAll(d.stagePills);
    this.navDivider = document.querySelector(d.navDivider);
    this.placeholderGroup = document.querySelector(d.placeholderGroup);
    this.placeholderPills = document.querySelectorAll(d.placeholderPills);

    this.dialogueBox = document.querySelector(d.dialogueBox);
    this.dialogueSpeaker = document.querySelector(d.dialogueSpeaker);
    this.dialogueText = document.querySelector(d.dialogueText);
    this.dialogueStep = document.querySelector(d.dialogueStep);
    this.dialoguePrevBtn = document.querySelector(d.dialoguePrevBtn);
    this.dialogueNextBtn = document.querySelector(d.dialogueNextBtn);
    this.dialogueTail = document.querySelector(d.dialogueTail);

    this.introControls = document.querySelector(d.introControls);
    this.replayBtn = document.querySelector(d.replayBtn);
    this.skipBtn = document.querySelector(d.skipBtn);

    this.bottomKeyControls = document.querySelector(d.bottomKeyControls);
    this.btnMoveLeft = document.querySelector(d.btnMoveLeft);
    this.btnJumpHop = document.querySelector(d.btnJumpHop);
    this.btnMoveRight = document.querySelector(d.btnMoveRight);
  }

  // Center the bottom mapped controls bar horizontally via JS without touching css/style.css
  styleBottomKeyBar() {
    if (!this.bottomKeyControls) return;
    this.bottomKeyControls.style.left = '50%';
    this.bottomKeyControls.style.right = 'auto';
    this.bottomKeyControls.style.transform = 'translateX(-50%)';
  }

  bindUIEvents() {
    // 1. Question Mark (?) Controls Modal Toggle & Close
    if (this.helpBtn) {
      this.helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        this.toggleControlsModal();
      });
    }

    if (this.closeControlsBtn) {
      this.closeControlsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        this.toggleControlsModal(false);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.controlsModal &&
        !this.controlsModal.classList.contains('hidden')
      ) {
        this.toggleControlsModal(false);
      }
    });

    // 2. Global Navigation Header Buttons (Home, 3 Stages, 4 Sky Stations)
    if (this.homeBrandBtn) {
      this.homeBrandBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.replayExperience();
      });
    }

    this.stagePills.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const stageIdx = Number(btn.dataset.stage);
        this.jumpToNavStage(stageIdx);
      });
    });

    this.placeholderPills.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const stationId = Number(btn.dataset.placeholder);
        this.selectSkyStation(stationId);
      });
    });

    // 3. Intro-Only Replay & Skip Buttons
    if (this.replayBtn) {
      this.replayBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.replayExperience();
      });
    }

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.handleSkip();
      });
    }

    // 4. Bottom Mapped Controls ([← A] [Spacebar · Jump / Hop] [D →])
    this.bindHoldableControlButton(this.btnMoveLeft, 'a');
    this.bindHoldableControlButton(this.btnMoveRight, 'd');
    this.bindHoldableControlButton(this.btnJumpHop, 'space', () => {
      // If the player is on Stone 4 or waiting in the balloon at Mr. Cloud's height,
      // pressing the middle Jump/Hop button also supplies forward 'd' so single-click Hop works smoothly
      if (
        (this.state === STATES.STAGE_2_WALK_AND_STONES &&
          this.entities.currentStoneId > 0) ||
        this.state === STATES.STAGE_4_WAIT_CLOUD_HOP
      ) {
        this.keys.d = true;
      }
    });

    // 5. Dialogue Pagination Buttons (Previous & Next -> Finish)
    if (this.dialoguePrevBtn) {
      this.dialoguePrevBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.prevDialoguePage();
      });
    }

    if (this.dialogueNextBtn) {
      this.dialogueNextBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.nextDialoguePage();
      });
    }

    // 6. Clicking 3D Sky Educational Boards directly on canvas
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.addEventListener('pointerdown', (e) =>
        this.onCanvasPointerDown(e)
      );
    }
  }

  bindHoldableControlButton(buttonEl, keyName, onPressExtra = null) {
    if (!buttonEl) return;

    const press = (e) => {
      e.preventDefault();
      buttonEl.blur();
      this.keys[keyName] = true;
      if (keyName === 'a' || keyName === 'd') {
        this.targetCloudAutoX = null;
      }
      if (typeof onPressExtra === 'function') {
        onPressExtra();
      }
      this.syncBottomControlVisuals();
    };

    const release = (e) => {
      e.preventDefault();
      this.keys[keyName] = false;
      if (keyName === 'space' && onPressExtra) {
        this.keys.d = false;
      }
      this.syncBottomControlVisuals();
    };

    buttonEl.addEventListener('pointerdown', press);
    buttonEl.addEventListener('pointerup', release);
    buttonEl.addEventListener('pointerleave', release);
    buttonEl.addEventListener('pointercancel', release);
  }

  syncBottomControlVisuals() {
    const leftActive = this.keys.a || this.keys.arrowLeft;
    const rightActive = this.keys.d || this.keys.arrowRight;
    const spaceActive = this.keys.space;

    if (this.btnMoveLeft) {
      this.btnMoveLeft.style.backgroundColor = leftActive ? '#ffd84d' : '';
      this.btnMoveLeft.style.transform = leftActive ? 'translateY(1.5px)' : '';
    }
    if (this.btnMoveRight) {
      this.btnMoveRight.style.backgroundColor = rightActive ? '#ffd84d' : '';
      this.btnMoveRight.style.transform = rightActive ? 'translateY(1.5px)' : '';
    }
    if (this.btnJumpHop) {
      this.btnJumpHop.style.backgroundColor = spaceActive ? '#ff7a59' : '';
      this.btnJumpHop.style.color = spaceActive ? '#ffffff' : '';
      this.btnJumpHop.style.transform = spaceActive ? 'translateY(1.5px)' : '';
    }
  }

  updateBottomControlVisibilityAndLabels() {
    const isIntro = this.state === STATES.STAGE_1_INTRO;

    // Replay & Skip are ONLY shown during the introduction stage
    if (this.introControls) {
      this.introControls.classList.toggle('hidden-nav', !isIntro);
    }

    // Mapped movement controls ([← A] [Spacebar] [D →]) are shown in all stages after Intro
    if (this.bottomKeyControls) {
      this.bottomKeyControls.classList.toggle('hidden-nav', isIntro);
    }

    if (!this.btnJumpHop) return;

    if (this.state === STATES.STAGE_3_BALLOON_ASCENT) {
      this.btnJumpHop.textContent = 'Hold Spacebar · Ascend ↑';
    } else if (this.state === STATES.STAGE_4_WAIT_CLOUD_HOP) {
      this.btnJumpHop.textContent = 'Spacebar + D → · Hop to Mr. Cloud';
    } else if (
      this.state === STATES.STAGE_2_WALK_AND_STONES &&
      this.entities.currentStoneId === 4
    ) {
      this.btnJumpHop.textContent = 'Spacebar + D → · Hop to Balloon';
    } else {
      this.btnJumpHop.textContent = 'Spacebar · Jump / Hop';
    }
  }

  exposeGlobalHandlers() {
    window.toggleControlsModal = (force) => this.toggleControlsModal(force);
    window.closeControlsModal = () => this.toggleControlsModal(false);
    window.goToStage = (stageIdx) => this.jumpToNavStage(stageIdx);
    window.goToPlaceholder = (id) => this.selectSkyStation(id);
    window.prevDialogue = () => this.prevDialoguePage();
    window.nextDialogue = () => this.nextDialoguePage();
    window.replayExperience = () => this.replayExperience();
    window.skipIntro = () => this.handleSkip();
  }

  bindInputEvents() {
    window.addEventListener('keydown', (e) => this.onKeyChange(e, true));
    window.addEventListener('keyup', (e) => this.onKeyChange(e, false));
  }

  onKeyChange(event, isPressed) {
    const code = event.code;
    const key = event.key.toLowerCase();

    // Prevent Spacebar from re-triggering any focused UI button
    if (code === 'Space' || key === ' ') {
      if (
        document.activeElement &&
        document.activeElement.tagName === 'BUTTON'
      ) {
        document.activeElement.blur();
      }
      event.preventDefault();
      this.keys.space = isPressed;
    }

    if (code === 'KeyW' || key === 'w') this.keys.w = isPressed;
    if (code === 'KeyA' || key === 'a') {
      this.keys.a = isPressed;
      if (isPressed) this.targetCloudAutoX = null;
    }
    if (code === 'KeyS' || key === 's') this.keys.s = isPressed;
    if (code === 'KeyD' || key === 'd') {
      this.keys.d = isPressed;
      if (isPressed) this.targetCloudAutoX = null;
    }
    if (code === 'ArrowUp') this.keys.arrowUp = isPressed;
    if (code === 'ArrowDown') this.keys.arrowDown = isPressed;
    if (code === 'ArrowLeft') {
      this.keys.arrowLeft = isPressed;
      if (isPressed) this.targetCloudAutoX = null;
    }
    if (code === 'ArrowRight') {
      this.keys.arrowRight = isPressed;
      if (isPressed) this.targetCloudAutoX = null;
    }

    this.syncBottomControlVisuals();
  }

  resetKeys() {
    Object.keys(this.keys).forEach((k) => {
      this.keys[k] = false;
    });
    this.syncBottomControlVisuals();
  }

  toggleControlsModal(forceState) {
    if (!this.controlsModal || !this.helpBtn) return;
    const isCurrentlyHidden = this.controlsModal.classList.contains('hidden');
    const shouldOpen =
      typeof forceState === 'boolean' ? forceState : isCurrentlyHidden;

    this.controlsModal.classList.toggle('hidden', !shouldOpen);
    this.helpBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  // =========================================================
  // DIALOGUE PAGINATION SYSTEM (Previous / Next -> Finish)
  // =========================================================
  openDialogue(pages, onFinishCallback = null, placement = 'character') {
    if (!pages || pages.length === 0) return;
    this.dialoguePages = pages;
    this.dialogueIndex = 0;
    this.onDialogueFinish = onFinishCallback;
    this.dialoguePlacement = placement;
    this.isDialogueOpen = true;

    if (this.dialogueBox) {
      this.dialogueBox.classList.remove('hidden');
    }
    this.renderDialoguePage();
    this.updateSpeechBubblePosition();
  }

  renderDialoguePage() {
    if (!this.isDialogueOpen || this.dialoguePages.length === 0) return;

    const current = this.dialoguePages[this.dialogueIndex];
    const total = this.dialoguePages.length;
    const isFirst = this.dialogueIndex === 0;
    const isLast = this.dialogueIndex === total - 1;

    if (this.dialogueSpeaker) {
      this.dialogueSpeaker.textContent = current.speaker || 'Mia';
    }
    if (this.dialogueText) {
      this.dialogueText.textContent = current.text;
    }
    if (this.dialogueStep) {
      this.dialogueStep.textContent = `${this.dialogueIndex + 1} / ${total}`;
    }

    // Hide/disable Previous button on first page (index === 0)
    if (this.dialoguePrevBtn) {
      this.dialoguePrevBtn.disabled = isFirst;
      this.dialoguePrevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
    }

    // Change Next button text to "Finish" on final page
    if (this.dialogueNextBtn) {
      this.dialogueNextBtn.textContent = isLast ? 'Finish' : 'Next →';
      this.dialogueNextBtn.dataset.state = isLast ? 'finish' : 'next';
    }
  }

  prevDialoguePage() {
    if (!this.isDialogueOpen) return;
    if (this.dialogueIndex > 0) {
      this.dialogueIndex -= 1;
      this.renderDialoguePage();
    }
  }

  nextDialoguePage() {
    if (!this.isDialogueOpen) return;
    if (this.dialogueIndex < this.dialoguePages.length - 1) {
      this.dialogueIndex += 1;
      this.renderDialoguePage();
    } else {
      // Final page ("Finish") clicked -> close dialogue & trigger next stage
      this.closeDialogue(true);
    }
  }

  closeDialogue(runCallback = false) {
    this.isDialogueOpen = false;
    if (this.dialogueBox) {
      this.dialogueBox.classList.add('hidden');
    }
    const cb = this.onDialogueFinish;
    this.onDialogueFinish = null;
    if (runCallback && typeof cb === 'function') {
      cb();
    }
  }

  // =========================================================
  // GLOBAL NAVIGATION, REPLAY & SKIP
  // =========================================================
  updateNavbarUI(activeStageIndex, showCloudPlaceholders = false) {
    this.stagePills.forEach((pill) => {
      const idx = Number(pill.dataset.stage);
      pill.classList.toggle('active', idx === activeStageIndex);
    });

    if (this.navDivider) {
      this.navDivider.classList.toggle('hidden-nav', !showCloudPlaceholders);
    }
    if (this.placeholderGroup) {
      this.placeholderGroup.classList.toggle(
        'hidden-nav',
        !showCloudPlaceholders
      );
    }
  }

  updatePlaceholderPillsUI(activeId) {
    this.placeholderPills.forEach((pill) => {
      const id = Number(pill.dataset.placeholder);
      pill.classList.toggle('active', id === activeId);
    });
  }

  replayExperience() {
    this.resetKeys();
    this.closeDialogue(false);
    this.activeStationId = null;
    this.lastTriggeredStationId = null;
    this.targetCloudAutoX = null;

    if (this.world.mrCloud) {
      const { initialPosition } = CONFIG.cloud;
      this.world.mrCloud.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z
      );
    }

    this.entities.resetToIntro();
    this.enterState(STATES.STAGE_1_INTRO);
  }

  handleSkip() {
    this.resetKeys();
    if (this.state === STATES.STAGE_1_INTRO) {
      // Immediately end intro dialogue, hide Replay/Skip, show bottom mapped controls, and enter Stage 2
      this.closeDialogue(false);
      this.enterState(STATES.STAGE_2_WALK_AND_STONES);
    }
  }

  jumpToNavStage(stageIdx) {
    this.resetKeys();
    this.closeDialogue(false);
    this.targetCloudAutoX = null;

    if (stageIdx === 0) {
      this.replayExperience();
    } else if (stageIdx === 1) {
      if (this.entities.balloon) {
        const { initialPosition } = CONFIG.balloon;
        this.entities.balloon.position.set(
          initialPosition.x,
          initialPosition.y,
          initialPosition.z
        );
      }
      this.entities.enterBalloonBasket();
      this.enterState(STATES.STAGE_3_BALLOON_ASCENT);
    } else if (stageIdx === 2) {
      if (this.entities.balloon) {
        this.entities.balloon.position.y = CONFIG.balloon.targetSkyY;
      }
      if (this.world.mrCloud) {
        const { initialPosition } = CONFIG.cloud;
        this.world.mrCloud.position.set(
          initialPosition.x,
          initialPosition.y,
          initialPosition.z
        );
      }
      this.entities.syncGirlOnMrCloud(this.world);
      this.enterState(STATES.STAGE_4_CLOUD_GREETING);
    }
  }

  selectSkyStation(stationId) {
    const station = this.world.stationBoards.find((s) => s.id === stationId);
    if (!station) return;

    if (this.state !== STATES.STAGE_5_SKY_EXPLORATION) {
      if (this.entities.balloon) {
        this.entities.balloon.position.y = CONFIG.balloon.targetSkyY;
      }
      this.entities.syncGirlOnMrCloud(this.world);
      this.enterState(STATES.STAGE_5_SKY_EXPLORATION);
    }

    this.targetCloudAutoX = station.x;
    this.openSkyStationDialogue(station);
  }

  onCanvasPointerDown(event) {
    if (
      this.state !== STATES.STAGE_5_SKY_EXPLORATION &&
      this.state !== STATES.STAGE_4_CLOUD_GREETING
    ) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.world.stationBoards.map((s) => s.group);
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData?.stationId) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.stationId) {
        this.selectSkyStation(obj.userData.stationId);
      }
    }
  }

  // =========================================================
  // 5-STAGE STATE MACHINE
  // =========================================================
  async start() {
    await this.world.init();
    await this.entities.init();

    if (this.entities.girl) {
      const p = this.entities.girl.position;
      this.cameraLookTarget.set(
        p.x + CONFIG.camera.introLookOffset.x,
        p.y + CONFIG.camera.introLookOffset.y,
        p.z + CONFIG.camera.introLookOffset.z
      );
    }

    this.enterState(STATES.STAGE_1_INTRO);
    this.animate();
  }

  enterState(newState) {
    this.state = newState;
    this.resetKeys();
    this.updateBottomControlVisibilityAndLabels();

    switch (newState) {
      case STATES.STAGE_1_INTRO: {
        this.updateNavbarUI(0, false);
        this.updatePlaceholderPillsUI(null);
        this.setPromptText('');
        if (this.entities.girl) {
          this.entities.girl.rotation.set(0, CONFIG.intro.initialRotationY, 0);
        }
        // Stage 1: Dialogue anchored next to Mia
        this.openDialogue(
          CONFIG.intro.dialogue,
          () => {
            this.enterState(STATES.STAGE_2_WALK_AND_STONES);
          },
          'character'
        );
        break;
      }

      case STATES.STAGE_2_WALK_AND_STONES: {
        this.updateNavbarUI(0, false);
        this.closeDialogue(false);
        this.setPromptText(
          'Walk with [← A] & [D →] · Jump stones with [Spacebar] + [D →]'
        );
        break;
      }

      case STATES.STAGE_3_BALLOON_BOARDING: {
        this.updateNavbarUI(1, false);
        this.setPromptText('Hopping into the Hot Air Balloon...');
        this.entities.startBalloonHop();
        break;
      }

      case STATES.STAGE_3_BALLOON_ASCENT: {
        this.updateNavbarUI(1, false);
        this.closeDialogue(false);
        this.setPromptText(
          'Hold [Spacebar] to rise in the Hot Air Balloon up to Mr. Cloud!'
        );
        break;
      }

      case STATES.STAGE_4_WAIT_CLOUD_HOP: {
        this.updateNavbarUI(1, false);
        this.setPromptText(
          'Mr. Cloud is here! Press [D →] + [Spacebar] to hop onto Mr. Cloud!'
        );
        break;
      }

      case STATES.STAGE_4_HOPPING_TO_CLOUD: {
        this.updateNavbarUI(2, true);
        this.setPromptText('Hopping onto Mr. Cloud...');
        this.entities.startCloudHop(this.world);
        break;
      }

      case STATES.STAGE_4_CLOUD_GREETING: {
        this.updateNavbarUI(2, true);
        this.entities.syncGirlOnMrCloud(this.world);
        this.setPromptText('Mr. Cloud Greeting (Click Next → Finish)');
        // Stage 4: Mr. Cloud dialogue displayed at the TOP of the screen
        this.openDialogue(
          CONFIG.cloud.greetingDialogue,
          () => {
            this.enterState(STATES.STAGE_5_SKY_EXPLORATION);
          },
          'top'
        );
        break;
      }

      case STATES.STAGE_5_SKY_EXPLORATION: {
        this.updateNavbarUI(2, true);
        this.entities.syncGirlOnMrCloud(this.world);
        this.updateExplorationPrompt();
        break;
      }
    }
  }

  openSkyStationDialogue(station) {
    this.activeStationId = station.id;
    this.lastTriggeredStationId = station.id;
    this.updatePlaceholderPillsUI(station.id);

    this.world.markStationVisited(station.id);
    this.exploredStationIds.add(station.id);
    this.updateExplorationPrompt();

    // Stage 5: Sky Station & Mr. Cloud explanations displayed at the TOP of the screen
    this.openDialogue(
      station.pages,
      () => {
        this.activeStationId = null;
        this.updatePlaceholderPillsUI(null);

        if (this.exploredStationIds.size === 4 && !this.completionShown) {
          this.completionShown = true;
          this.openDialogue(CONFIG.cloud.completionDialogue, null, 'top');
        }
      },
      'top'
    );
  }

  updateExplorationPrompt() {
    const count = this.exploredStationIds.size;
    this.setPromptText(
      `Glide with [← A] & [D →] or click the 4 Sky Images (${count}/4 Explored)`
    );
  }

  update(dt, elapsedTime) {
    this.entities.updateMixer(dt);
    this.world.update(elapsedTime);

    switch (this.state) {
      case STATES.STAGE_1_INTRO: {
        break;
      }

      case STATES.STAGE_2_WALK_AND_STONES: {
        const result = this.entities.updateStage2Movement(
          dt,
          this.keys,
          this.world
        );

        this.updateBottomControlVisibilityAndLabels();

        if (result.triggerBalloonHop) {
          this.enterState(STATES.STAGE_3_BALLOON_BOARDING);
        } else if (result.boardedBalloon) {
          this.enterState(STATES.STAGE_3_BALLOON_ASCENT);
        } else if (result.landedStoneId === 4) {
          this.setPromptText(
            'Stone 4 reached! Press [D →] + [Spacebar] to hop into the Hot Air Balloon!'
          );
        } else if (result.landedStoneId > 0) {
          this.setPromptText(
            `Stone ${result.landedStoneId}/4 · Press [D →] + [Spacebar] to jump to Stone ${result.landedStoneId + 1}!`
          );
        }
        break;
      }

      case STATES.STAGE_3_BALLOON_BOARDING: {
        const done = this.entities.updateParabolicHop(dt);
        if (done) {
          this.entities.enterBalloonBasket();
          this.enterState(STATES.STAGE_3_BALLOON_ASCENT);
        }
        break;
      }

      case STATES.STAGE_3_BALLOON_ASCENT: {
        const reachedTop = this.entities.updateBalloonAscent(dt, this.keys);
        if (reachedTop) {
          this.enterState(STATES.STAGE_4_WAIT_CLOUD_HOP);
        }
        break;
      }

      case STATES.STAGE_4_WAIT_CLOUD_HOP: {
        this.entities.syncGirlWithBasket();
        if ((this.keys.d || this.keys.arrowRight) && this.keys.space) {
          this.enterState(STATES.STAGE_4_HOPPING_TO_CLOUD);
        }
        break;
      }

      case STATES.STAGE_4_HOPPING_TO_CLOUD: {
        const hopDone = this.entities.updateParabolicHop(dt);
        if (hopDone) {
          this.enterState(STATES.STAGE_4_CLOUD_GREETING);
        }
        break;
      }

      case STATES.STAGE_4_CLOUD_GREETING: {
        this.entities.syncGirlOnMrCloud(this.world);
        break;
      }

      case STATES.STAGE_5_SKY_EXPLORATION: {
        this.entities.updateCloudNavigation(
          dt,
          this.keys,
          this.world,
          this.targetCloudAutoX
        );

        if (
          this.targetCloudAutoX !== null &&
          Math.abs(this.world.mrCloud.position.x - this.targetCloudAutoX) < 0.1
        ) {
          this.targetCloudAutoX = null;
        }

        const nearStation = this.world.getActiveStation(
          this.world.mrCloud.position
        );

        if (nearStation) {
          if (this.lastTriggeredStationId !== nearStation.id) {
            this.openSkyStationDialogue(nearStation);
          }
        } else {
          this.lastTriggeredStationId = null;
        }
        break;
      }
    }

    this.updateCamera(dt);
    this.updateSpeechBubblePosition();
  }

  updateCamera(dt) {
    if (!this.camera || !this.entities.girl) return;

    let camOffset = CONFIG.camera.groundOffset;
    let lookOffset = CONFIG.camera.groundLookOffset;

    if (this.state === STATES.STAGE_1_INTRO) {
      camOffset = CONFIG.camera.introOffset;
      lookOffset = CONFIG.camera.introLookOffset;
    } else if (
      this.state === STATES.STAGE_3_BALLOON_BOARDING ||
      this.state === STATES.STAGE_3_BALLOON_ASCENT ||
      this.state === STATES.STAGE_4_WAIT_CLOUD_HOP
    ) {
      camOffset = CONFIG.camera.balloonOffset;
      lookOffset = CONFIG.camera.balloonLookOffset;
    } else if (
      this.state === STATES.STAGE_4_HOPPING_TO_CLOUD ||
      this.state === STATES.STAGE_4_CLOUD_GREETING ||
      this.state === STATES.STAGE_5_SKY_EXPLORATION
    ) {
      camOffset = CONFIG.camera.cloudOffset;
      lookOffset = CONFIG.camera.cloudLookOffset;
    }

    const targetPos = this.entities.girl.position;
    const desiredCamPos = new THREE.Vector3(
      targetPos.x + camOffset.x,
      targetPos.y + camOffset.y,
      targetPos.z + camOffset.z
    );

    const alpha = Math.min(CONFIG.camera.lerpSpeed * dt, 1.0);
    this.camera.position.lerp(desiredCamPos, alpha);

    const desiredLookAt = new THREE.Vector3(
      targetPos.x + lookOffset.x,
      targetPos.y + lookOffset.y,
      targetPos.z + lookOffset.z
    );
    this.cameraLookTarget.lerp(desiredLookAt, alpha);
    this.camera.lookAt(this.cameraLookTarget);
  }

  updateSpeechBubblePosition() {
    if (!this.dialogueBox || !this.isDialogueOpen) return;

    // Mr. Cloud & Sky Exploration dialogues stay pinned at the TOP of the screen
    if (this.dialoguePlacement === 'top') {
      this.dialogueBox.style.left = '50%';
      this.dialogueBox.style.top = '96px';
      this.dialogueBox.style.width = 'min(480px, 88vw)';
      this.dialogueBox.style.transform = 'translate(-50%, 0)';
      if (this.dialogueTail) {
        this.dialogueTail.style.display = 'none';
      }
      return;
    }

    // Stage 1 Intro: Anchor speech bubble next to Mia
    if (!this.entities.girl || !this.camera) return;

    this.dialogueBox.style.width = '';
    this.dialogueBox.style.transform = 'translate(-50%, -100%)';
    if (this.dialogueTail) {
      this.dialogueTail.style.display = 'block';
    }

    const anchorWorld = this.entities.girl.position.clone();
    anchorWorld.y += 1.75;
    anchorWorld.project(this.camera);

    const halfW = window.innerWidth * 0.5;
    const halfH = window.innerHeight * 0.5;

    let screenX = anchorWorld.x * halfW + halfW;
    let screenY = -(anchorWorld.y * halfH) + halfH;

    screenX = THREE.MathUtils.clamp(
      screenX,
      200,
      Math.max(200, window.innerWidth - 200)
    );
    screenY = THREE.MathUtils.clamp(
      screenY,
      245,
      Math.max(245, window.innerHeight - 95)
    );

    this.dialogueBox.style.left = `${screenX}px`;
    this.dialogueBox.style.top = `${screenY}px`;
  }

  setPromptText(message) {
    if (!this.promptHint) return;
    this.promptHint.textContent = message;
    this.promptHint.classList.toggle('hidden-nav', !message);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();
    this.update(dt, elapsedTime);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameFlowController();
  app.start();
});