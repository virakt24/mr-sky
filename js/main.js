// js/main.js

import * as THREE from 'three';
import { CONFIG, STATES } from './config.js';
import { World } from './world.js';
import { Entities } from './entities.js';
import * as SceneModule from './scene.js';

class GameFlowController {
  constructor() {
    // Support whichever export pattern js/scene.js uses without modifying it
    const sceneContext =
      typeof SceneModule.initScene === 'function'
        ? SceneModule.initScene()
        : typeof SceneModule.createScene === 'function'
        ? SceneModule.createScene()
        : SceneModule;

    this.scene = sceneContext.scene;
    this.camera = sceneContext.camera;
    this.renderer = sceneContext.renderer;
    this.customRender = sceneContext.render || null;

    this.world = new World(this.scene);
    this.entities = new Entities(this.scene);

    this.clock = new THREE.Clock();
    this.state = STATES.INTRO;
    this.introTimer = 0;
    this.activePlaceholderId = null;

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

    this.cacheDOMElements();
    this.bindInputEvents();
  }

  cacheDOMElements() {
    this.dialogueContainer = document.querySelector(
      CONFIG.dom.dialogueContainer
    );
    this.dialogueTitle = document.querySelector(CONFIG.dom.dialogueTitle);
    this.dialogueText = document.querySelector(CONFIG.dom.dialogueText);
    this.promptHint = document.querySelector(CONFIG.dom.promptHint);
    this.placeholderCards = document.querySelectorAll(
      CONFIG.dom.placeholderCards
    );
  }

  bindInputEvents() {
    window.addEventListener('keydown', (e) => this.onKeyChange(e, true));
    window.addEventListener('keyup', (e) => this.onKeyChange(e, false));
  }

  onKeyChange(event, isPressed) {
    const code = event.code;
    const key = event.key.toLowerCase();

    if (code === 'KeyW' || key === 'w') this.keys.w = isPressed;
    if (code === 'KeyA' || key === 'a') this.keys.a = isPressed;
    if (code === 'KeyS' || key === 's') this.keys.s = isPressed;
    if (code === 'KeyD' || key === 'd') this.keys.d = isPressed;
    if (code === 'Space' || key === ' ') this.keys.space = isPressed;
    if (code === 'ArrowUp') this.keys.arrowUp = isPressed;
    if (code === 'ArrowDown') this.keys.arrowDown = isPressed;
    if (code === 'ArrowLeft') this.keys.arrowLeft = isPressed;
    if (code === 'ArrowRight') this.keys.arrowRight = isPressed;
  }

  async start() {
    await this.world.init();
    await this.entities.init();

    if (this.entities.girl) {
      this.cameraLookTarget.copy(this.entities.girl.position);
    }

    this.enterState(STATES.INTRO);
    this.animate();
  }

  enterState(newState) {
    this.state = newState;

    switch (newState) {
      case STATES.INTRO:
        this.introTimer = 0;
        this.setPromptText('');
        break;

      case STATES.JUMP_PATH:
        this.hideExplanations();
        this.setPromptText(
          'Jump across the invisible path to reach the balloon basket (WASD + Space)'
        );
        break;

      case STATES.BALLOON_ASCENT:
        this.setPromptText('Hold [SPACE] to ascend into the blue sky');
        break;

      case STATES.WAIT_CLOUD_HOP:
        this.setPromptText(
          'Press [D] + [SPACE] simultaneously to hop onto the cloud'
        );
        break;

      case STATES.HOPPING_TO_CLOUD:
        this.setPromptText('');
        this.entities.startCloudHop(this.world);
        break;

      case STATES.CLOUD_NAVIGATION:
        this.setPromptText('Use [A] and [D] to explore the cloud stops');
        break;
    }
  }

  update(dt) {
    this.entities.updateMixer(dt);

    switch (this.state) {
      // 1. INTRO SEQUENCE
      case STATES.INTRO: {
        this.introTimer += dt;
        if (this.introTimer >= CONFIG.intro.duration || this.keys.space) {
          this.keys.space = false;
          this.enterState(STATES.JUMP_PATH);
        }
        break;
      }

      // 1. INVISIBLE BLOCKS JUMP TO BALLOON BASKET
      case STATES.JUMP_PATH: {
        const enteredBasket = this.entities.updateJumpPathMovement(
          dt,
          this.keys,
          this.world
        );
        if (enteredBasket) {
          this.enterState(STATES.BALLOON_ASCENT);
        }
        break;
      }

      // 2. BALLOON ASCENT WHILE HOLDING SPACE
      case STATES.BALLOON_ASCENT: {
        const reachedSky = this.entities.updateBalloonAscent(dt, this.keys);
        if (reachedSky) {
          this.enterState(STATES.WAIT_CLOUD_HOP);
        }
        break;
      }

      // 3. WAIT FOR SIMULTANEOUS 'D' + 'SPACE' TO HOP TO CLOUD
      case STATES.WAIT_CLOUD_HOP: {
        this.entities.syncGirlWithBasket();
        if (this.keys.d && this.keys.space) {
          this.enterState(STATES.HOPPING_TO_CLOUD);
        }
        break;
      }

      // 3. PARABOLIC HOP TRANSITION ONTO CLOUD PLATFORM
      case STATES.HOPPING_TO_CLOUD: {
        const hopFinished = this.entities.updateCloudHop(dt);
        if (hopFinished) {
          this.enterState(STATES.CLOUD_NAVIGATION);
        }
        break;
      }

      // 4. CLOUD HORIZONTAL NAVIGATION ('A' & 'D') & 4 EXPLANATION PLACEHOLDERS
      case STATES.CLOUD_NAVIGATION: {
        this.entities.updateCloudNavigation(dt, this.keys, this.world);
        const activePlaceholder = this.world.getActivePlaceholder(
          this.entities.girl.position
        );

        if (activePlaceholder) {
          if (this.activePlaceholderId !== activePlaceholder.id) {
            this.activePlaceholderId = activePlaceholder.id;
            this.showPlaceholderExplanation(activePlaceholder);
          }
        } else if (this.activePlaceholderId !== null) {
          this.activePlaceholderId = null;
          this.hideExplanations();
        }
        break;
      }
    }

    this.updateCamera(dt);
  }

  updateCamera(dt) {
    if (!this.camera || !this.entities.girl) return;

    let offset = CONFIG.camera.groundOffset;
    if (
      this.state === STATES.BALLOON_ASCENT ||
      this.state === STATES.WAIT_CLOUD_HOP
    ) {
      offset = CONFIG.camera.balloonOffset;
    } else if (
      this.state === STATES.HOPPING_TO_CLOUD ||
      this.state === STATES.CLOUD_NAVIGATION
    ) {
      offset = CONFIG.camera.cloudOffset;
    }

    const targetPos = this.entities.girl.position;
    const desiredCamPos = new THREE.Vector3(
      targetPos.x + offset.x,
      targetPos.y + offset.y,
      targetPos.z + offset.z
    );

    this.camera.position.lerp(
      desiredCamPos,
      Math.min(CONFIG.camera.lerpSpeed * dt, 1.0)
    );

    const desiredLookAt = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 1.0,
      targetPos.z
    );
    this.cameraLookTarget.lerp(
      desiredLookAt,
      Math.min(CONFIG.camera.lerpSpeed * dt, 1.0)
    );
    this.camera.lookAt(this.cameraLookTarget);
  }

  // Triggers existing HTML structure / CSS classes without modifying styles
  showPlaceholderExplanation(placeholder) {
    if (this.placeholderCards && this.placeholderCards.length > 0) {
      this.placeholderCards.forEach((card, index) => {
        const matchIndex =
          card.dataset.placeholder !== undefined
            ? Number(card.dataset.placeholder) === placeholder.id
            : index === placeholder.id;
        card.classList.toggle('active', matchIndex);
        card.classList.toggle('visible', matchIndex);
        card.classList.toggle('hidden', !matchIndex);
      });
    }

    if (this.dialogueContainer) {
      this.dialogueContainer.classList.remove('hidden');
      this.dialogueContainer.classList.add('active', 'visible');
    }
    if (this.dialogueTitle) {
      this.dialogueTitle.textContent = placeholder.title;
    }
    if (this.dialogueText) {
      this.dialogueText.textContent = placeholder.text;
    }
  }

  hideExplanations() {
    if (this.placeholderCards && this.placeholderCards.length > 0) {
      this.placeholderCards.forEach((card) => {
        card.classList.remove('active', 'visible');
        card.classList.add('hidden');
      });
    }

    if (this.dialogueContainer) {
      this.dialogueContainer.classList.remove('active', 'visible');
      this.dialogueContainer.classList.add('hidden');
    }
  }

  setPromptText(message) {
    if (!this.promptHint) return;
    this.promptHint.textContent = message;
    this.promptHint.classList.toggle('active', Boolean(message));
    this.promptHint.classList.toggle('visible', Boolean(message));
    this.promptHint.classList.toggle('hidden', !message);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.update(dt);

    if (this.customRender) {
      this.customRender();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameFlowController();
  app.start();
});