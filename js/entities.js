// js/entities.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class Entities {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // Girl state
    this.girl = null;
    this.mixer = null;
    this.actions = {};
    this.activeActionName = null;
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    this.currentStoneId = 0;
    this.walkCycleTime = 0;
    this.isSittingOnCloud = false;

    // Balloon state
    this.balloon = null;
    this.balloonAscentVelocity = 0;

    // Parabolic hop interpolation (for boarding balloon or hopping onto Mr. Cloud)
    this.hopData = {
      elapsed: 0,
      duration: 0.75,
      arcHeight: 2.0,
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
          this.girl.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const { initialPosition, initialRotationY } = CONFIG.intro;
          this.girl.position.set(
            initialPosition.x,
            initialPosition.y,
            initialPosition.z
          );
          this.girl.rotation.set(0, initialRotationY, 0);
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
          this.balloon.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

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

    const matchKey = keys.find((k) => k.includes(keyword)) || keys[0];
    if (this.activeActionName === matchKey) return;

    const nextAction = this.actions[matchKey];
    const prevAction = this.actions[this.activeActionName];

    if (prevAction) prevAction.fadeOut(0.2);

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

  setSittingPose(isSitting) {
    if (!this.girl) return;
    this.isSittingOnCloud = isSitting;
    if (isSitting) {
      // Cozy sitting/riding posture on top of Mr. Cloud
      this.girl.scale.set(1.0, 0.86, 1.05);
      this.girl.rotation.z = 0;
      this.playAnimation('sit');
    } else {
      this.girl.scale.set(1.0, 1.0, 1.0);
      this.girl.rotation.z = 0;
    }
  }

  resetToIntro() {
    if (this.girl) {
      const { initialPosition, initialRotationY } = CONFIG.intro;
      this.girl.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z
      );
      this.girl.rotation.set(0, initialRotationY, 0);
      this.setSittingPose(false);
    }
    if (this.balloon) {
      const { initialPosition } = CONFIG.balloon;
      this.balloon.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z
      );
    }
    this.velocity.set(0, 0, 0);
    this.balloonAscentVelocity = 0;
    this.isGrounded = true;
    this.currentStoneId = 0;
  }

  // Stage 2 & 3: Walking with A & D, Jumping across the 4 Stone Blocks, and Hopping onto Balloon
  updateStage2Movement(dt, keys, world) {
    if (!this.girl) return { boardedBalloon: false, landedStoneId: 0 };

    this.setSittingPose(false);

    let moveX = 0;
    if (keys.d || keys.arrowRight) moveX += 1;
    if (keys.a || keys.arrowLeft) moveX -= 1;

    // From the 4th stone block (or close to it), pressing D + Spacebar hops directly onto the Hot Air Balloon
    if (
      this.isGrounded &&
      this.currentStoneId === 4 &&
      (keys.d || keys.arrowRight) &&
      keys.space
    ) {
      return { triggerBalloonHop: true, landedStoneId: 4 };
    }

    if (moveX !== 0) {
      this.girl.position.x += moveX * CONFIG.player.moveSpeed * dt;
      this.girl.position.x = Math.max(
        CONFIG.player.minWalkX,
        this.girl.position.x
      );
      this.girl.rotation.y = moveX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;

      // Keep Z aligned with the path / stepping stones
      const targetZ = this.girl.position.x > 1.0 ? -0.15 : 0.0;
      this.girl.position.z = THREE.MathUtils.lerp(
        this.girl.position.z,
        targetZ,
        6.0 * dt
      );

      if (this.isGrounded) {
        this.walkCycleTime += dt * 12;
        this.girl.rotation.z = Math.sin(this.walkCycleTime) * 0.05;
        this.playAnimation('walk');
      }
    } else if (this.isGrounded) {
      this.girl.rotation.z = THREE.MathUtils.lerp(
        this.girl.rotation.z,
        0,
        10 * dt
      );
      this.playAnimation('idle');
    }

    // Jump trigger
    if (keys.space && this.isGrounded) {
      this.velocity.y = CONFIG.player.jumpForce;
      this.isGrounded = false;
      this.currentStoneId = 0;
      this.girl.rotation.z = 0;
      this.playAnimation('jump');
    }

    // Apply gravity
    const prevY = this.girl.position.y;
    this.velocity.y += CONFIG.player.gravity * dt;
    this.girl.position.y += this.velocity.y * dt;

    let landedOnStone = false;

    // Top-surface collision with the 4 stepping stone blocks
    if (this.velocity.y <= 0) {
      for (const stone of world.stoneColliders) {
        const { min, max } = stone.box;
        const withinX =
          this.girl.position.x + CONFIG.player.radius >= min.x &&
          this.girl.position.x - CONFIG.player.radius <= max.x;

        if (
          withinX &&
          prevY >= stone.topY - 0.35 &&
          this.girl.position.y <= stone.topY + 0.08
        ) {
          this.girl.position.y = stone.topY;
          this.velocity.y = 0;
          this.isGrounded = true;
          this.currentStoneId = stone.id;
          landedOnStone = true;
          break;
        }
      }
    }

    // Ground path collision or respawn if fallen
    if (!landedOnStone) {
      if (
        this.girl.position.x <= CONFIG.player.pathEndX + 0.45 &&
        this.girl.position.y <= CONFIG.player.groundY
      ) {
        this.girl.position.y = CONFIG.player.groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
        this.currentStoneId = 0;
      } else if (this.girl.position.y < CONFIG.player.fallResetY) {
        // Respawn safely right before Stone 1 so the player doesn't lose progress
        this.girl.position.set(-3.2, CONFIG.player.groundY, 0.0);
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.currentStoneId = 0;
      }
    }

    // Proximity landing in the Hot Air Balloon basket
    if (this.balloon) {
      const basketWorldPos = this.getBasketWorldPosition();
      const distToBasket = this.girl.position.distanceTo(basketWorldPos);
      if (distToBasket <= CONFIG.balloon.entryTriggerRadius) {
        this.enterBalloonBasket();
        return { boardedBalloon: true, landedStoneId: this.currentStoneId };
      }
    }

    return {
      boardedBalloon: false,
      triggerBalloonHop: false,
      landedStoneId: this.currentStoneId
    };
  }

  getBasketWorldPosition() {
    const { basketOffset } = CONFIG.balloon;
    return new THREE.Vector3(
      this.balloon.position.x + basketOffset.x,
      this.balloon.position.y + basketOffset.y,
      this.balloon.position.z + basketOffset.z
    );
  }

  startBalloonHop() {
    this.hopData.elapsed = 0;
    this.hopData.duration = CONFIG.balloon.hopDuration;
    this.hopData.arcHeight = CONFIG.balloon.hopArcHeight;
    this.hopData.startPos.copy(this.girl.position);
    this.hopData.endPos.copy(this.getBasketWorldPosition());
    this.girl.rotation.set(0, Math.PI * 0.5, 0);
    this.playAnimation('jump', true);
  }

  updateParabolicHop(dt) {
    this.hopData.elapsed += dt;
    const t = Math.min(this.hopData.elapsed / this.hopData.duration, 1.0);

    this.girl.position.lerpVectors(
      this.hopData.startPos,
      this.hopData.endPos,
      t
    );
    const arc = Math.sin(t * Math.PI) * this.hopData.arcHeight;
    this.girl.position.y += arc;

    if (t >= 1.0) {
      this.girl.position.copy(this.hopData.endPos);
      this.velocity.set(0, 0, 0);
      this.isGrounded = true;
      this.playAnimation('idle');
      return true;
    }
    return false;
  }

  enterBalloonBasket() {
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.setSittingPose(false);
    const basketPos = this.getBasketWorldPosition();
    this.girl.position.copy(basketPos);
    this.girl.rotation.set(0, 0, 0);
    this.playAnimation('idle');
  }

  // Stage 3: Smoothly ascend while Spacebar is held
  updateBalloonAscent(dt, keys) {
    if (!this.balloon || !this.girl) return false;

    const targetVel = keys.space ? CONFIG.balloon.ascentSpeed : 0;
    this.balloonAscentVelocity = THREE.MathUtils.lerp(
      this.balloonAscentVelocity,
      targetVel,
      CONFIG.balloon.ascentDamping * dt
    );

    this.balloon.position.y += this.balloonAscentVelocity * dt;

    if (this.balloon.position.y >= CONFIG.balloon.targetSkyY) {
      this.balloon.position.y = CONFIG.balloon.targetSkyY;
      this.balloonAscentVelocity = 0;
      this.syncGirlWithBasket();
      return true;
    }

    this.syncGirlWithBasket();
    return false;
  }

  syncGirlWithBasket() {
    const basketPos = this.getBasketWorldPosition();
    this.girl.position.copy(basketPos);
  }

  // Stage 4: Hop from the Hot Air Balloon onto Mr. Cloud
  startCloudHop(world) {
    this.hopData.elapsed = 0;
    this.hopData.duration = CONFIG.cloud.hopDuration;
    this.hopData.arcHeight = CONFIG.cloud.hopArcHeight;
    this.hopData.startPos.copy(this.girl.position);

    const cloudPos = world.mrCloud
      ? world.mrCloud.position
      : CONFIG.cloud.initialPosition;
    const { riderOffset } = CONFIG.cloud;

    this.hopData.endPos.set(
      cloudPos.x + riderOffset.x,
      cloudPos.y + riderOffset.y,
      cloudPos.z + riderOffset.z
    );

    this.girl.rotation.set(0, Math.PI * 0.5, 0);
    this.playAnimation('jump', true);
  }

  syncGirlOnMrCloud(world) {
    if (!this.girl || !world.mrCloud) return;
    const { riderOffset } = CONFIG.cloud;
    this.girl.position.set(
      world.mrCloud.position.x + riderOffset.x,
      world.mrCloud.position.y + riderOffset.y,
      world.mrCloud.position.z + riderOffset.z
    );
    this.setSittingPose(true);
  }

  // Stage 5: Ride Mr. Cloud horizontally across the sky to explore the 4 stations
  updateCloudNavigation(dt, keys, world, targetAutoX = null) {
    if (!this.girl || !world.mrCloud) return;

    let moveX = 0;
    if (keys.d || keys.arrowRight) moveX += 1;
    if (keys.a || keys.arrowLeft) moveX -= 1;

    if (moveX !== 0) {
      world.mrCloud.position.x += moveX * CONFIG.player.cloudMoveSpeed * dt;
      world.mrCloud.position.x = THREE.MathUtils.clamp(
        world.mrCloud.position.x,
        CONFIG.cloud.minX,
        CONFIG.cloud.maxX
      );
      this.girl.rotation.y = moveX > 0 ? Math.PI * 0.25 : -Math.PI * 0.25;
    } else if (targetAutoX !== null) {
      world.mrCloud.position.x = THREE.MathUtils.lerp(
        world.mrCloud.position.x,
        targetAutoX,
        5.0 * dt
      );
      this.girl.rotation.y = 0;
    } else {
      this.girl.rotation.y = THREE.MathUtils.lerp(
        this.girl.rotation.y,
        0,
        5.0 * dt
      );
    }

    this.syncGirlOnMrCloud(world);
  }

  updateMixer(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }
}