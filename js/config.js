// js/config.js

export const STATES = {
  STAGE_1_INTRO: 'STAGE_1_INTRO',
  STAGE_2_WALK_AND_STONES: 'STAGE_2_WALK_AND_STONES',
  STAGE_3_BALLOON_BOARDING: 'STAGE_3_BALLOON_BOARDING',
  STAGE_3_BALLOON_ASCENT: 'STAGE_3_BALLOON_ASCENT',
  STAGE_4_WAIT_CLOUD_HOP: 'STAGE_4_WAIT_CLOUD_HOP',
  STAGE_4_HOPPING_TO_CLOUD: 'STAGE_4_HOPPING_TO_CLOUD',
  STAGE_4_CLOUD_GREETING: 'STAGE_4_CLOUD_GREETING',
  STAGE_5_SKY_EXPLORATION: 'STAGE_5_SKY_EXPLORATION'
};

export const CONFIG = {
  assets: {
    girl: './cutegirl.glb',
    balloon: './Baloon.glb',
    env: './env.glb',
    rocks: './rocks.glb'
  },

  // Stage 1: Girl positioned slightly ahead on the path in env.glb
  intro: {
    initialPosition: { x: -6.2, y: 0.34, z: 0.0 },
    initialRotationY: 0, // Facing the camera / horizon
    dialogue: [
      {
        speaker: 'Mia',
        text: "Hi there! I'm Mia! Welcome to our little paper sky world."
      },
      {
        speaker: 'Mia',
        text: 'Every sunny day I look up at the horizon and wonder... Why is the sky blue instead of clear or rainbow-colored?'
      },
      {
        speaker: 'Mia',
        text: "Let's walk down the path, hop across the 4 stepping stones to the Hot Air Balloon, and ask Mr. Cloud high up in the sky!"
      }
    ]
  },

  player: {
    moveSpeed: 5.2,
    cloudMoveSpeed: 5.5,
    jumpForce: 10.2,
    gravity: -22.0,
    radius: 0.42,
    height: 1.6,
    groundY: 0.34,
    minWalkX: -13.5,
    pathEndX: -2.5,
    fallResetY: -4.0
  },

  // Stage 2: Exactly 4 ascending stepping stone blocks aligned with rocks.glb
  steppingStones: [
    {
      id: 1,
      position: { x: -2.1, y: 0.55, z: 0.0 },
      size: { x: 1.75, y: 0.4, z: 2.0 },
      color: '#e5ddd0'
    },
    {
      id: 2,
      position: { x: -0.1, y: 1.25, z: 0.0 },
      size: { x: 1.75, y: 0.4, z: 2.0 },
      color: '#dcd3c4'
    },
    {
      id: 3,
      position: { x: 1.85, y: 1.95, z: -0.05 },
      size: { x: 1.75, y: 0.4, z: 2.0 },
      color: '#d4cab8'
    },
    {
      id: 4,
      position: { x: 3.85, y: 2.68, z: -0.15 },
      size: { x: 2.0, y: 0.4, z: 2.2 },
      color: '#cbc0ad'
    }
  ],

  // Stage 3: Hot Air Balloon positioned right after the 4th stone block
  balloon: {
    initialPosition: { x: 6.5, y: 2.85, z: -0.2 },
    basketOffset: { x: 0.0, y: 0.25, z: 0.0 },
    entryTriggerRadius: 1.65,
    hopDuration: 0.65,
    hopArcHeight: 1.8,
    ascentSpeed: 6.5,
    ascentDamping: 5.0,
    targetSkyY: 24.0
  },

  // Stage 4 & 5: Mr. Cloud & 4 Interactive Sky Educational Images
  cloud: {
    initialPosition: { x: 10.2, y: 24.0, z: -0.2 },
    riderOffset: { x: 0.0, y: 0.62, z: 0.15 },
    hopDuration: 0.8,
    hopArcHeight: 2.4,
    minX: 9.8,
    maxX: 27.5,
    triggerRadius: 1.45,

    greetingDialogue: [
      {
        speaker: 'Mr. Cloud',
        text: 'Hello Mia! Welcome up to the troposphere! Hop on and make yourself comfy!'
      },
      {
        speaker: 'Mr. Cloud',
        text: "You wanted to know why the sky is blue, right? I've set up 4 illustrated sky stations ahead of us!"
      },
      {
        speaker: 'Mr. Cloud',
        text: 'Use ← A and D → to glide with me across the sky—or click any of the 4 sky boards to inspect the science!'
      }
    ],

    completionDialogue: [
      {
        speaker: 'Mr. Cloud',
        text: 'Hooray! We explored all 4 sky stations together! Now you know how Rayleigh scattering of short blue wavelengths paints our sky blue!'
      },
      {
        speaker: 'Mia',
        text: 'Thank you, Mr. Cloud! We can keep gliding around the sky with ← A and D → or click any of the 4 stations above to review!'
      }
    ],

    // Stage 5: 4 Educational Sky Image Stations
    stations: [
      {
        id: 1,
        x: 13.0,
        y: 26.2,
        z: -1.8,
        shortLabel: '1. Sunlight Colors',
        title: '1. Sunlight Contains All Colors',
        accent: '#ffd84d',
        diagramType: 'rainbow',
        pages: [
          {
            speaker: 'Mr. Cloud · Station 1',
            text: 'Even though sunlight looks white or warm yellow to our eyes, it is actually made of ALL the colors of the rainbow combined!'
          },
          {
            speaker: 'Mr. Cloud · Station 1',
            text: 'Light travels in waves. Red and orange light have long, lazy wavelengths, while blue and violet light have short, choppy wavelengths.'
          }
        ]
      },
      {
        id: 2,
        x: 17.5,
        y: 26.2,
        z: -1.8,
        shortLabel: '2. Atmosphere',
        title: "2. Earth's Blanket of Gases",
        accent: '#a8e6cf',
        diagramType: 'atmosphere',
        pages: [
          {
            speaker: 'Mr. Cloud · Station 2',
            text: 'When sunlight reaches Earth, it enters our atmosphere—a protective blanket filled with tiny gas molecules (mostly nitrogen and oxygen).'
          },
          {
            speaker: 'Mr. Cloud · Station 2',
            text: 'These gas molecules are thousands of times smaller than a grain of sand—much smaller than the wavelengths of visible light!'
          }
        ]
      },
      {
        id: 3,
        x: 22.0,
        y: 26.2,
        z: -1.8,
        shortLabel: '3. Blue Scattering',
        title: '3. Rayleigh Scattering',
        accent: '#7fd1f7',
        diagramType: 'scattering',
        pages: [
          {
            speaker: 'Mr. Cloud · Station 3',
            text: 'Long red and yellow waves pass right past the tiny air molecules almost undisturbed. But short, energetic blue waves collide with the molecules!'
          },
          {
            speaker: 'Mr. Cloud · Station 3',
            text: 'This process is called Rayleigh Scattering: tiny gas molecules scatter short-wavelength blue light in every direction across the sky!'
          }
        ]
      },
      {
        id: 4,
        x: 26.5,
        y: 26.2,
        z: -1.8,
        shortLabel: '4. Blue Sky View',
        title: '4. Why We See a Blue Sky',
        accent: '#ff7a59',
        diagramType: 'eyes',
        pages: [
          {
            speaker: 'Mr. Cloud · Station 4',
            text: 'Because blue light is scattered all over the atmosphere, wherever you look up during the day, that scattered blue light reaches your eyes!'
          },
          {
            speaker: 'Mr. Cloud · Station 4',
            text: 'Violet light scatters even more, but the sun emits much more blue light and human eyes are far more sensitive to blue—giving us our bright blue sky!'
          }
        ]
      }
    ]
  },

  camera: {
    // Stage 1: Zoomed-in close-up camera aligned horizontally with the horizon line
    introOffset: { x: 0.0, y: 1.18, z: 3.4 },
    introLookOffset: { x: 0.0, y: 1.12, z: 0.0 },

    // Stage 2: Zoomed-out side-scrolling gameplay camera
    groundOffset: { x: 1.2, y: 2.6, z: 8.8 },
    groundLookOffset: { x: 1.0, y: 1.35, z: 0.0 },

    // Stage 3: Balloon camera
    balloonOffset: { x: 1.4, y: 2.6, z: 10.2 },
    balloonLookOffset: { x: 1.2, y: 1.8, z: 0.0 },

    // Stage 4 & 5: Mr. Cloud sky exploration camera
    cloudOffset: { x: 0.8, y: 2.3, z: 9.6 },
    cloudLookOffset: { x: 0.6, y: 1.5, z: -0.5 },

    lerpSpeed: 4.2
  },

  dom: {
    helpBtn: '#help-btn',
    controlsModal: '#controls-modal',
    closeControlsBtn: '#close-controls-btn',
    homeBrandBtn: '#home-brand-btn',
    promptHint: '#prompt-hint',
    stagePills: '.stage-pill',
    navDivider: '#nav-divider',
    placeholderGroup: '#placeholder-group',
    placeholderPills: '.placeholder-pill',
    dialogueBox: '#girl-dialogue',
    dialogueSpeaker: '#dialogue-speaker',
    dialogueText: '#dialogue-text',
    dialogueStep: '#dialogue-step-indicator',
    dialoguePrevBtn: '#dialogue-prev-btn',
    dialogueNextBtn: '#dialogue-next-btn',
    dialogueTail: '#dialogue-tail',
    introControls: '#intro-controls',
    replayBtn: '#replay-btn',
    skipBtn: '#skip-btn',
    bottomKeyControls: '#bottom-key-controls',
    btnMoveLeft: '#btn-move-left',
    btnJumpHop: '#btn-jump-hop',
    btnMoveRight: '#btn-move-right'
  }
};