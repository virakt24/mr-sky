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

// Set to true (or press 'C' key in-game) to see your manual stone landing boxes!
export const SHOW_LANDING_AREAS = true;
export const ROCK_MAPPING_DEPTH = 0.9;

// ============================================================================
// 2. 100% MANUAL STONE LANDING BOXES
// ============================================================================
// Edit minX (left edge), maxX (right edge), and topY (top surface height) for
// each of your 4 stones below. Nothing will overwrite these numbers!
export const STEPS = [
  { minX: -40.0, maxX: -2.5, topY: 0.0,  stepId: 0 }, // Ground before stones
  { minX: -2.85,  maxX: -1.52, topY: 0.70, stepId: 1 }, // Stone 1 manual box
  { minX: -1.52,  maxX: 0.8, topY: 1.4, stepId: 2 }, // Stone 2 manual box
  { minX: 0.8,  maxX:  2.5, topY: 2.2, stepId: 3 }, // Stone 3 manual box
  { minX:  2.5,  maxX:  5, topY: 2.6, stepId: 4 }, // Stone 4 manual box
  { minX:  3.7,  maxX: 40.0, topY: 0.0,  stepId: 0 }  // d Ground after stones
];

// ============================================================================
// 3. WORLD COORDINATES & SHORT HUMANLIKE TEXT
// ============================================================================
export const BALLOON_X = 5.4;
export const BALLOON_BASE_Y = 2.20;
export const TARGET_SKY_ALTITUDE = 23.5;
export const MR_SKY_START_X = 8.8;
export const MR_SKY_END_X = 50.0;

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
    x: 15.0,
    label: "Illustration 01",
    caption: "mama light holds all 7 rainbow kids together as white light."
  },
  {
    x: 26.0,
    label: "Illustration 02",
    caption: "the tall red kids take big steps right over the air pebbles."
  },
  {
    x: 37.0,
    label: "Illustration 03",
    caption: "little blue has tiny steps and bounces everywhere!"
  },
  {
    x: 46.5,
    label: "Illustration 04",
    caption: "all that bouncing blue light turns me bright blue! keep going right →"
  }
];