export const CONFIG = {
  models: {
    girl: './cutegirl.glb',
    balloon: './Baloon.glb',
    env: './env.glb',
    rocks: './rocks.glb'
  },

  // Horizon-line zoomed-in intro camera vs. unlocked world camera
  cameraViews: {
    intro: {
      xOffset: 0,
      y: 1.45,
      z: 4.2,
      lookAtXOffset: 0,
      lookAtY: 1.4
    },
    world: {
      xOffset: 1.2,
      y: 2.3,
      z: 9.2,
      lookAtXOffset: 0.7,
      lookAtY: 1.4
    }
  },

  movement: {
    walkSpeed: 7.5,
    jumpForce: 8.5,
    gravity: 22.0,
    minX: -6,
    maxX: 48
  },

  // 3 Main Stages + 4 Placeholders along the X-axis
  stages: [
    {
      id: 0,
      name: 'Starting Stage',
      targetX: 0,
      speaker: 'Mia',
      dialogues: [
        'Hello everyone! Welcome to our paper sky world! 👋',
        'Use A and D on your keyboard to walk around, or press Spacebar to hop!',
        'Click Next to finish the intro and start exploring the world!'
      ]
    },
    {
      id: 1,
      name: 'Balloon Stage',
      targetX: 14,
      speaker: 'Mia',
      dialogues: [
        'Look! Here is the Balloon Stage floating gently in the breeze.',
        'It carries letters and sketches all the way up to the high clouds.',
        'Ready to visit Mr. Cloud next? Walk right with D or click Mr. Cloud Stage above!'
      ]
    },
    {
      id: 2,
      name: 'Mr. Cloud Stage',
      targetX: 28,
      speaker: 'Mia & Mr. Cloud',
      dialogues: [
        'Say hi to Mr. Cloud! He is the fluffiest daydreamer in the sky.',
        'Every cloud here feels like soft stationery paper folded by hand.',
        'Now you can also click on Placeholders 1, 2, 3, and 4 in the top right bar!'
      ]
    }
  ],

  placeholders: {
    1: {
      name: 'Placeholder 1',
      targetX: 34,
      speaker: 'Mia',
      dialogues: [
        'This is Placeholder 1! You can add a custom mini-game or project showcase here.',
        'Use the Prev and Next buttons to flip through notes for this spot.'
      ]
    },
    2: {
      name: 'Placeholder 2',
      targetX: 38,
      speaker: 'Mia',
      dialogues: [
        'Welcome to Placeholder 2! Another creative corner ready for your story.',
        'Everything stays anchored right beside me as we explore!'
      ]
    },
    3: {
      name: 'Placeholder 3',
      targetX: 42,
      speaker: 'Mia',
      dialogues: [
        'Here is Placeholder 3! Imagine floating paper origami or sketchbook pages here.',
        'Click Prev to re-read or Next to continue.'
      ]
    },
    4: {
      name: 'Placeholder 4',
      targetX: 46,
      speaker: 'Mia',
      dialogues: [
        'You reached Placeholder 4 at the edge of the sky path!',
        'Click Starting Stage in the top bar anytime to head back to the beginning.'
      ]
    }
  }
};