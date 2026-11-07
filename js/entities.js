// js/entities.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class Entities {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // Girl character state
    this.girl = null;
    this.mixer = null;
    this.actions = {};
    this.activeActionName = null;
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;

    // Balloon state
    this.balloon = null;
    this.balloonAscentVelocity = 0;

    // Cloud hop interpolation state
    this.hopData = {
      elapsed: 0,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3()
    };
  }

  async init() {
    await Promise.all([this.loadGirl(), this.loadBalloon()]);
  }

  loadGirl() {
    return new Promise((resolve, reject) => {
      this.loader.load(
        CONFIG.assets.girl,
        (gltf) => {
          this.girl = gltf.scene;
          const { initialPosition, initialRotationY } = CONFIG.intro;
          this.girl.position.set(
            initialPosition.x,
            initialPosition.y,
            initialPosition.z
          );
          this.girl.rotation.y = initialRotationY;
          this.scene.add(this.girl);

          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.girl);
            gltf.animations.forEach((clip) => {
              const name = clip.name.toLowerCase();
              this.actions[name] = this.mixer.clipAction(clip);
            });
            this.playAnimation('idle');
          }
          resolve(this.girl);
        },
        undefined,
        reject
      );
    });
  }

  loadBalloon() {
    return new Promise((resolve, reject) => {
      this.loader.load(
        CONFIG.assets.balloon,
        (gltf) => {
          this.balloon = gltf.scene;
          const { initialPosition } = CONFIG.balloon;
          this.balloon.position.set(
            initialPosition.x,
            initialPosition.y,
            initialPosition.z
          );
          this.scene.add(this.balloon);
          resolve(this.balloon);
        },
        undefined,
        reject
      );
    });
  }

  playAnimation(keyword, loopOnce = false) {
    if (!this.mixer) return;
    const keys = Object.keys(this.actions);
    if (keys.length === 0) return;

    const matchKey =
      keys.find((k) => k.includes(keyword)) || keys[0];

    if (this.activeActionName === matchKey) return;

    const nextAction = this.actions[matchKey];
    const prevAction = this.actions[this.activeActionName];

    if (prevAction) {
      prevAction.fadeOut(0.2);
    }

    nextAction.reset();
    if (loopOnce) {
      nextAction.setLoop(THREE.LoopOnce, 1);
      nextAction.clampWhenFinished = true;
    } else {
      nextAction.setLoop(THREE.LoopRepeat);
    }
    nextAction.fadeIn(0.2).play();
    this.activeActionName = matchKey;
  }

  // Step 1: Update movement & jumping across invisible blocks
  updateJumpPathMovement(dt, keys, world) {
    if (!this.girl) return false;

    const moveDir = new THREE.Vector3();
    if (keys.d || keys.arrowRight) moveDir.x += 1;
    if (keys.a || keys.arrowLeft) moveDir.x -= 1;
    if (keys.w || keys.arrowUp) moveDir.z -= 1;
    if (keys.s || keys.arrowDown) moveDir.z += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.girl.position.x += moveDir.x * CONFIG.player.moveSpeed * dt;
      this.girl.position.z += moveDir.z * CONFIG.player.moveSpeed * dt;
      this.girl.rotation.y = Math.atan2(moveDir.x, moveDir.z);

      if (this.isGrounded) {
        this.playAnimation('walk');
      }
    } else if (this.isGrounded) {
      this.playAnimation('idle');
    }

    // Jump trigger
    if (keys.space && this.isGrounded) {
      this.velocity.y = CONFIG.player.jumpForce;
      this.isGrounded = false;
      this.playAnimation('jump');
    }

    // Apply gravity
    const prevY = this.girl.position.y;
    this.velocity.y += CONFIG.player.gravity * dt;
    this.girl.position.y += this.velocity.y * dt;

    let landed = false;

    // Collide with invisible blocks on downward motion
    if (this.velocity.y <= 0) {
      for (const collider of world.invisibleColliders) {
        const { min, max } = collider.box;
        const withinXZ =
          this.girl.position.x + CONFIG.player.radius >= min.x &&
          this.girl.position.x - CONFIG.player.radius <= max.x &&
          this.girl.position.z + CONFIG.player.radius >= min.z &&
          this.girl.position.z - CONFIG.player.radius <= max.z;

        if (
          withinXZ &&
          prevY >= collider.topY - 0.15 &&
          this.girl.position.y <= collider.topY
        ) {
          this.girl.position.y = collider.topY;
          this.velocity.y = 0;
          this.isGrounded = true;
          landed = true;
          break;
        }
      }
    }

    // Base ground collision & fall reset
    if (!landed) {
      if (
        this.girl.position.x < 1.2 &&
        this.girl.position.y <= CONFIG.player.groundY
      ) {
        this.girl.position.y = CONFIG.player.groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else if (this.girl.position.y < CONFIG.player.fallResetY) {
        // Respawn at start if the player misses an invisible block
        const { initialPosition } = CONFIG.intro;
        this.girl.position.set(
          initialPosition.x,
          initialPosition.y,
          initialPosition.z
        );
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
      }
    }

    // Check if player reached the balloon basket
    if (this.balloon) {
      const basketWorldPos = this.getBasketWorldPosition();
      const distToBasket = this.girl.position.distanceTo(basketWorldPos);
      if (distToBasket <= CONFIG.balloon.entryTriggerRadius) {
        this.enterBalloonBasket();
        return true; // Reached basket
      }
    }

    return false;
  }

  getBasketWorldPosition() {
    const { basketOffset } = CONFIG.balloon;
    return new THREE.Vector3(
      this.balloon.position.x + basketOffset.x,
      this.balloon.position.y + basketOffset.y,
      this.balloon.position.z + basketOffset.z
    );
  }

  enterBalloonBasket() {
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    const basketPos = this.getBasketWorldPosition();
    this.girl.position.copy(basketPos);
    this.girl.rotation.y = Math.PI * 0.5;
    this.playAnimation('idle');
  }

  // Step 2: Smoothly ascend while Space is held
  updateBalloonAscent(dt, keys) {
    if (!this.balloon || !this.girl) return false;

    const targetVel = keys.space ? CONFIG.balloon.ascentSpeed : 0;
    this.balloonAscentVelocity = THREE.MathUtils.lerp(
      this.balloonAscentVelocity,
      targetVel,
      CONFIG.balloon.ascentDamping * dt
    );

    this.balloon.position.y += this.balloonAscentVelocity * dt;

    // Clamp at target sky altitude
    if (this.balloon.position.y >= CONFIG.balloon.targetSkyY) {
      this.balloon.position.y = CONFIG.balloon.targetSkyY;
      this.balloonAscentVelocity = 0;
      this.syncGirlWithBasket();
      return true; // Reached target sky height
    }

    this.syncGirlWithBasket();
    return false;
  }

  syncGirlWithBasket() {
    const basketPos = this.getBasketWorldPosition();
    this.girl.position.copy(basketPos);
  }

  // Step 3: Start and update the hop out of the basket onto the cloud platform
  startCloudHop(world) {
    this.hopData.elapsed = 0;
    this.hopData.startPos.copy(this.girl.position);

    const firstPlaceholder = CONFIG.cloud.placeholders[0];
    const cloudTopY = world.cloudCollider.topY;

    this.hopData.endPos.set(
      firstPlaceholder.x,
      cloudTopY,
      CONFIG.cloud.platformCenter.z
    );

    this.girl.rotation.y = Math.PI * 0.5;
    this.playAnimation('jump', true);
  }

  updateCloudHop(dt) {
    this.hopData.elapsed += dt;
    const t = Math.min(this.hopData.elapsed / CONFIG.cloud.hopDuration, 1.0);

    // Smooth horizontal and base vertical interpolation
    this.girl.position.lerpVectors(
      this.hopData.startPos,
      this.hopData.endPos,
      t
    );

    // Parabolic arc over the basket rim onto the cloud
    const arc = Math.sin(t * Math.PI) * CONFIG.cloud.hopArcHeight;
    this.girl.position.y += arc;

    if (t >= 1.0) {
      this.girl.position.copy(this.hopData.endPos);
      this.isGrounded = true;
      this.playAnimation('idle');
      return true; // Completed hop onto cloud
    }

    return false;
  }

  // Step 4: Horizontal-only movement ('a' and 'd') across the cloud platform
  updateCloudNavigation(dt, keys, world) {
    if (!this.girl) return;

    let moveX = 0;
    if (keys.d) moveX += 1;
    if (keys.a) moveX -= 1;

    if (moveX !== 0) {
      this.girl.position.x += moveX * CONFIG.player.cloudMoveSpeed * dt;
      this.girl.position.x = THREE.MathUtils.clamp(
        this.girl.position.x,
        CONFIG.cloud.minX,
        CONFIG.cloud.maxX
      );
      this.girl.rotation.y = moveX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      this.playAnimation('walk');
    } else {
      this.playAnimation('idle');
    }

    // Lock Y and Z strictly to the cloud platform surface
    this.girl.position.y = world.cloudCollider.topY;
    this.girl.position.z = CONFIG.cloud.platformCenter.z;
  }

  updateMixer(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }
}