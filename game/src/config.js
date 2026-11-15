// Starlight Drift — configuration: tuning, palette and level definitions.
// One file, one job: every number that shapes how the game feels lives here.

export const GAME_NAME = 'Starlight Drift';
export const GAME_TAGLINE = 'Ride the gravity wells. Gather the light.';

export const CANVAS = {
  // Logical playfield; the canvas scales to the window while keeping this
  // aspect so screenshots and play look identical everywhere.
  width: 1280,
  height: 800,
};

export const PALETTE = {
  space: '#070b1d',
  spaceDeep: '#04060f',
  nebulaA: '#1b2a6b',
  nebulaB: '#5b2a86',
  nebulaC: '#0e4a5e',
  star: '#e8f1ff',
  shard: '#ffd76a',
  shardCore: '#fff3c4',
  gate: '#59f2c8',
  gateGlow: '#1de9b6',
  hull: '#7cf7ff',
  ship: '#f4f7ff',
  flame: '#ff9d45',
  flameHot: '#ffe066',
  asteroid: '#8d7d8a',
  asteroidDark: '#5d5258',
  danger: '#ff5470',
  shield: '#7CFC9A',
  hudText: '#dfe9ff',
  hudDim: '#8fa3c8',
  panel: 'rgba(8, 14, 34, 0.82)',
  panelEdge: 'rgba(124, 247, 255, 0.35)',
};

export const SHIP = {
  radius: 14,
  thrust: 620, // px/s^2 of acceleration while a thrust key is held
  mouseThrust: 540,
  brake: 0.35, // fraction of speed kept per second while braking (Space)
  drag: 0.12, // gentle exponential damping so the ship never flies forever
  maxSpeed: 520,
  turnRate: 5.2, // radians per second of nose steering
  hullMax: 100,
  invulnerableSeconds: 1.2, // grace after taking a hit
};

export const PHYSICS = {
  gravityScale: 90000, // pull strength of a gravity well, tuned per well mass
  wellFalloff: 220, // softening distance so the pull never explodes at centre
  shardMagnetRadius: 130, // shards drift toward the ship inside this range
  shardCollectRadius: 26,
  gateOpenRadius: 46,
  asteroidBounce: 0.55,
};

// Combo: shards collected within this window of each other raise the multiplier.
export const COMBO = {
  windowSeconds: 4,
  maxMultiplier: 5,
  shardBaseScore: 100,
  levelClearBonus: 500,
  timeBonusPerSecond: 25, // bonus for finishing a level under par time
};

export const LEVELS = [
  {
    name: 'First Light',
    parSeconds: 75,
    shards: 6,
    wells: [{ x: 0.62, y: 0.42, mass: 1.0, radius: 52 }],
    asteroids: 5,
    shields: 1,
    intro: 'Collect 6 star shards, then fly into the warp gate.',
  },
  {
    name: 'Twin Pull',
    parSeconds: 90,
    shards: 8,
    wells: [
      { x: 0.30, y: 0.30, mass: 0.9, radius: 46 },
      { x: 0.72, y: 0.66, mass: 1.15, radius: 56 },
    ],
    asteroids: 8,
    shields: 1,
    intro: 'Two wells now. Slingshot between them — do not fall in.',
  },
  {
    name: 'The Maelstrom',
    parSeconds: 110,
    shards: 10,
    wells: [
      { x: 0.24, y: 0.62, mass: 1.0, radius: 48 },
      { x: 0.52, y: 0.28, mass: 1.2, radius: 54 },
      { x: 0.80, y: 0.60, mass: 0.9, radius: 46 },
    ],
    asteroids: 12,
    shields: 2,
    intro: 'Three wells, a crowded sky. Clear every shard to win.',
  },
];

export const ASTEROID = {
  minRadius: 16,
  maxRadius: 34,
  minSpeed: 24,
  maxSpeed: 68,
  hitDamage: 25,
  spinMax: 1.4,
};

export const PARTICLES = {
  thrustPerSecond: 90,
  burstOnCollect: 14,
  burstOnHit: 26,
  burstOnGate: 60,
  maxCount: 420,
};

export const SCREENS = {
  title: 'title',
  playing: 'playing',
  paused: 'paused',
  levelClear: 'levelClear',
  victory: 'victory',
  gameOver: 'gameOver',
};
