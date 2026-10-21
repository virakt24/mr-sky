// ============================================================================
// 1. YOUR CUSTOM 3D MODELS (.GLB)
// ============================================================================
export const CUSTOM_ASSETS = {
  girlModelUrl: './cutegirl.glb',
  girlScale: 1.0,
  girlOffsetY: 0.0,

  balloonModelUrl: './Baloon.glb',
  balloonScale: 1.0,
  balloonOffsetY: 0.0,

  environmentModelUrl: './env.glb',
  environmentScale: 1.0,
  environmentPosition: [0, 0, 0],

  combinedRocksModelUrl: './rocks.glb',
  combinedRocksScale: 1.0,
  combinedRocksPosition: [0, 0, 0],

  skyBgTextureUrl: ''
};

// Toggle landing pad outlines with 'C' key in-game
export const SHOW_LANDING_AREAS = false;

// ============================================================================
// 2. ROCK LANDING AREAS (AUTO-UPDATED WHEN rocks.glb LOADS)
// ============================================================================
export const STEPS = [
  { minX: -40.0, maxX: -3.2, topY: 0.0,  stepId: 0 },
  { minX: -3.2,  maxX: -1.4, topY: 0.72, stepId: 1 },
  { minX: -1.4,  maxX:  0.4, topY: 1.44, stepId: 2 },
  { minX:  0.4,  maxX:  2.2, topY: 2.16, stepId: 3 },
  { minX:  2.2,  maxX:  5.8, topY: 2.88, stepId: 4 },
  { minX:  5.8,  maxX: 40.0, topY: 0.0,  stepId: 0 }
];

// ============================================================================
// 3. WORLD COORDINATES & SHORT HUMANLIKE TEXT
// ============================================================================
export const BALLOON_X = 5.05;
export const BALLOON_BASE_Y = 2.88;
export const TARGET_SKY_ALTITUDE = 23.5;
export const MR_SKY_START_X = 9.2;
export const MR_SKY_END_X = 52.0;

export const STEP_THOUGHTS = {
  0: "hey... ever wonder why the sky is blue?",
  1: "let's climb up these stones.",
  2: "maybe the answer is up in the clouds.",
  3: "almost at the balloon...",
  4: "hop in!"
};

export const MR_SKY_LINES = [
  "hey there! hop onto my back and move right with D.",
  "watch how i change from gray to blue as we meet mama light's kids!"
];

export const SKY_STATIONS = [
  {
    x: 17.0,
    label: "Illustration 01",
    caption: "mama light holds all 7 rainbow kids together as white light."
  },
  {
    x: 28.0,
    label: "Illustration 02",
    caption: "the tall red kids take big steps right over the air pebbles."
  },
  {
    x: 39.0,
    label: "Illustration 03",
    caption: "little blue has tiny steps and bounces everywhere!"
  },
  {
    x: 50.0,
    label: "Illustration 04",
    caption: "all that bouncing blue light turns me bright blue!"
  }
];