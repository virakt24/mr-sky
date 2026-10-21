// ============================================================================
// 1. CUSTOM 3D MODELS (.GLB) & 2D TEXTURES (.PNG/.JPG)
// ============================================================================
export const CUSTOM_ASSETS = {
  girlModelUrl: './Girl_rig.glb',   // Path to your custom girl .glb
  girlScale: 1.0,
  girlOffsetY: 0.0,

  balloonModelUrl: './Baloon.glb',              // e.g. './assets/models/balloon.glb'
  mrSkyModelUrl: '',                // e.g. './assets/models/mr-sky.glb'
  environmentModelUrl: './env.glb',          // e.g. './assets/models/environment.glb'

  // OPTION A FOR ROCKS: One combined .glb containing all 4 rocks:
  combinedRocksModelUrl: './rocks.glb',        // e.g. './assets/models/all_rocks.glb'
  combinedRocksPosition: [0, 0, 0],
  combinedRocksScale: 1.0,

  // 2D Textures
  skyBgTextureUrl: '',              // e.g. './assets/textures/sky-bg.png'
  cloud2DTextureUrl: '',            // e.g. './assets/textures/cloud-2d.png'
  illustrationUrls: ['', '', '', '']
};

// Keep true to see the exact landing plateau of each stone (Press 'C' in-game to toggle)
export const SHOW_LANDING_AREAS = true;

// ============================================================================
// 2. ROCK LANDING AREAS & INDIVIDUAL STONE MODELS
// ============================================================================
// OPTION B FOR ROCKS: Set `rockModelUrl` on each step below.
// Note: Step 4's maxX now extends to 5.8 (underneath the balloon basket) so
// walking slowly without jumping never drops the character into a gap!
export const STEPS = [
  { minX: -40.0, maxX: -3.2, topY: 0.0,  stepId: 0 },
  {
    minX: -3.2, maxX: -1.4, topY: 0.72, stepId: 1,
    rockModelUrl: '',       // e.g. './assets/models/rock1.glb'
    autoFitToStep: true,
    scale: 1.0, offsetX: 0, offsetY: 0, rotationY: 0
  },
  {
    minX: -1.4, maxX:  0.4, topY: 1.44, stepId: 2,
    rockModelUrl: '',       // e.g. './assets/models/rock2.glb'
    autoFitToStep: true,
    scale: 1.0, offsetX: 0, offsetY: 0, rotationY: 0
  },
  {
    minX:  0.4, maxX:  2.2, topY: 2.16, stepId: 3,
    rockModelUrl: '',       // e.g. './assets/models/rock3.glb'
    autoFitToStep: true,
    scale: 1.0, offsetX: 0, offsetY: 0, rotationY: 0
  },
  {
    minX:  2.2, maxX:  5.8, topY: 2.88, stepId: 4,
    rockModelUrl: '',       // e.g. './assets/models/rock4.glb'
    autoFitToStep: true,
    scale: 1.0, offsetX: 0, offsetY: 0, rotationY: 0
  },
  { minX:  5.8, maxX: 40.0, topY: 0.0,  stepId: 0 }
];

// ============================================================================
// 3. WORLD COORDINATES & STORY TEXT
// ============================================================================
export const BALLOON_X = 5.05; // Snug against Rock 4 so there is zero gap
export const BALLOON_BASE_Y = 2.88;
export const TARGET_SKY_ALTITUDE = 23.5;
export const MR_SKY_START_X = 9.2;

export const STEP_THOUGHTS = {
  0: "“hi there... have you ever wondered why the sky is so blue?”",
  1: "“is someone up there painting the clouds with a giant brush?”",
  2: "“or does the warm sunlight hide a secret inside its beams?”",
  3: "“almost at the basket... let’s float up and ask mr. sky!”",
  4: "“step right into the wicker basket!”"
};

export const MR_SKY_LINES = [
  "Welcome up to the quiet clouds, little traveler! I heard you wondering down on the sand why my sky glows so blue.",
  "It’s all because of Mama Light and her seven rainbow kids! Hop out of your basket onto my cloud, and we’ll glide through the sky together to see how they play."
];

export const SKY_STATIONS = [
  {
    x: 16.5,
    caption: "“High in the Sun, Mama Light holds all seven rainbow kids in one big warm hug—making sunlight look pure white.”"
  },
  {
    x: 27.5,
    caption: "“Tall Brother Red and Sister Orange have long legs. They take giant strides right over the tiny air pebbles without scattering!”"
  },
  {
    x: 38.5,
    caption: "“Little Blue is tiny with short, bouncy steps—bonk! boing!—bumping into every air pebble and scattering all across the sky!”"
  },
  {
    x: 49.5,
    caption: "“All those bouncing Little Blue waves fill Mr. Sky with his cozy blue glow! (And at sunset, tall Red paints his cheeks coral.)”"
  }
];