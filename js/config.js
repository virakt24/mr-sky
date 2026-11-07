// js/config.js

export const STATES = {
  INTRO: 'INTRO',
  JUMP_PATH: 'JUMP_PATH',
  BALLOON_ASCENT: 'BALLOON_ASCENT',
  WAIT_CLOUD_HOP: 'WAIT_CLOUD_HOP',
  HOPPING_TO_CLOUD: 'HOPPING_TO_CLOUD',
  CLOUD_NAVIGATION: 'CLOUD_NAVIGATION'
};

export const CONFIG = {
  assets: {
    girl: './cutegirl.glb',
    balloon: './Baloon.glb',
    env: './env.glb',
    rocks: './rocks.glb'
  },

  intro: {
    duration: 3.5, // Seconds before enabling movement (or press Space to advance)
    initialPosition: { x: 0, y: 0, z: 0 },
    initialRotationY: 0
  },

  player: {
    moveSpeed: 5.0,
    cloudMoveSpeed: 4.5,
    jumpForce: 9.5,
    gravity: -22.0,
    radius: 0.4,
    height: 1.6,
    groundY: 0.0,
    fallResetY: -5.0
  },

  // Step 1: Path of invisible box colliders leading into the balloon basket
  invisibleBlocks: [
    { position: { x: 2.0, y: 0.6, z: 0.0 }, size: { x: 1.6, y: 0.4, z: 1.6 } },
    { position: { x: 4.2, y: 1.3, z: -0.5 }, size: { x: 1.6, y: 0.4, z: 1.6 } },
    { position: { x: 6.4, y: 2.0, z: -1.0 }, size: { x: 1.6, y: 0.4, z: 1.6 } },
    { position: { x: 8.6, y: 2.7, z: -1.2 }, size: { x: 1.6, y: 0.4, z: 1.6 } },
    { position: { x: 10.8, y: 3.4, z: -1.2 }, size: { x: 1.8, y: 0.4, z: 1.8 } }
  ],

  // Step 2: Balloon basket entry and vertical sky ascent
  balloon: {
    initialPosition: { x: 13.0, y: 3.6, z: -1.2 },
    basketOffset: { x: 0.0, y: 0.25, z: 0.0 }, // Girl's local offset inside basket
    entryTriggerRadius: 1.35,
    ascentSpeed: 6.0,
    ascentDamping: 5.0,
    targetSkyY: 28.0
  },

  // Step 3 & 4: Cloud platform & 4 evenly spaced explanation placeholders
  cloud: {
    platformCenter: { x: 22.0, y: 28.0, z: -1.2 },
    platformSize: { x: 16.0, y: 0.8, z: 3.0 },
    hopDuration: 0.85,
    hopArcHeight: 2.6,
    minX: 16.0,
    maxX: 28.0,
    triggerRadius: 1.1,
    // 4 evenly spaced X positions (16.5, 19.5, 22.5, 25.5 -> spacing = 3.0 units)
    placeholders: [
      {
        id: 0,
        x: 16.5,
        title: 'Placeholder 1',
        text: 'Welcome to the sky! Here is the first stage of our cloud journey.'
      },
      {
        id: 1,
        x: 19.5,
        title: 'Placeholder 2',
        text: 'Second stop: Exploring how atmospheric currents shape the clouds above.'
      },
      {
        id: 2,
        x: 22.5,
        title: 'Placeholder 3',
        text: 'Third stop: High-altitude light scattering gives Mr. Sky its vibrant hue.'
      },
      {
        id: 3,
        x: 25.5,
        title: 'Placeholder 4',
        text: 'Final stop: You have reached the summit of the cloud platform!'
      }
    ]
  },

  camera: {
    groundOffset: { x: 0, y: 3.5, z: 8.5 },
    balloonOffset: { x: 0, y: 2.8, z: 10.0 },
    cloudOffset: { x: 0, y: 3.0, z: 9.0 },
    lerpSpeed: 4.5
  },

  // Existing HTML selectors (preserves existing DOM and CSS classes)
  dom: {
    dialogueContainer: '#dialogue-box, .dialogue-box, .explanation-container, #explanation',
    dialogueTitle: '#dialogue-title, .dialogue-title, .explanation-title',
    dialogueText: '#dialogue-text, .dialogue-text, .explanation-text',
    promptHint: '#prompt-hint, .prompt-hint, .interaction-prompt',
    placeholderCards: '.placeholder-item, .explanation-card, [data-placeholder]'
  }
};