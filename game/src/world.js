// Starlight Drift — world: level construction, entities, particles and the
// score/combo bookkeeping. Holds no rendering and no input; the loop drives
// it one fixed step at a time.

import { ASTEROID, CANVAS, COMBO, LEVELS, PARTICLES, PHYSICS, SHIP } from './config.js';
import { makeAsteroid, makeShip, stepAsteroid, stepShip } from './physics.js';

// A tiny deterministic RNG (mulberry32) so a level and its screenshots are
// reproducible from a seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLevel(levelIndex, seed) {
  const def = LEVELS[levelIndex];
  const rng = mulberry32(seed);
  const wells = def.wells.map((w) => ({
    x: w.x * CANVAS.width,
    y: w.y * CANVAS.height,
    mass: w.mass,
    radius: w.radius,
    pulse: rng() * Math.PI * 2,
  }));

  // Shards are placed away from wells and edges, with a minimum gap apart.
  const shards = [];
  let guard = 0;
  while (shards.length < def.shards && guard < 400) {
    guard += 1;
    const x = 90 + rng() * (CANVAS.width - 180);
    const y = 90 + rng() * (CANVAS.height - 180);
    const nearWell = wells.some((w) => Math.hypot(x - w.x, y - w.y) < w.radius + 110);
    const nearShard = shards.some((s) => Math.hypot(x - s.x, y - s.y) < 110);
    if (nearWell || nearShard) continue;
    shards.push({
      x,
      y,
      radius: 13,
      taken: false,
      bob: rng() * Math.PI * 2,
      spin: rng() * Math.PI * 2,
    });
  }

  const asteroids = [];
  for (let i = 0; i < def.asteroids; i += 1) {
    asteroids.push(makeAsteroid(rng, CANVAS.width, CANVAS.height));
  }

  const shields = [];
  for (let i = 0; i < def.shields; i += 1) {
    shields.push({
      x: 120 + rng() * (CANVAS.width - 240),
      y: 120 + rng() * (CANVAS.height - 240),
      radius: 16,
      taken: false,
      bob: rng() * Math.PI * 2,
    });
  }

  // Starfield: three depth layers of static stars for the backdrop.
  const stars = [];
  for (let i = 0; i < 190; i += 1) {
    stars.push({
      x: rng() * CANVAS.width,
      y: rng() * CANVAS.height,
      size: 0.6 + rng() * 1.9,
      layer: 1 + Math.floor(rng() * 3),
      twinkle: rng() * Math.PI * 2,
    });
  }

  return {
    def,
    index: levelIndex,
    ship: makeShip(CANVAS.width * 0.5, CANVAS.height * 0.82),
    wells,
    shards,
    asteroids,
    shields,
    stars,
    gate: { x: CANVAS.width * 0.5, y: 96, radius: PHYSICS.gateOpenRadius, open: false },
    gateChimed: false, // the gate-open chime plays once, the frame it opens
    particles: [],
    shardsCollected: 0,
    levelTime: 0,
    combo: 0,
    comboUntil: 0,
    comboTimer: 0,
    score: 0,
    events: [], // human-readable feed lines for the HUD ("Shard +300 x3")
  };
}

export function addParticles(world, x, y, count, color, speed, life) {
  for (let i = 0; i < count; i += 1) {
    if (world.particles.length >= PARTICLES.maxCount) return;
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.5 + Math.random() * 0.5),
      maxLife: life,
      size: 1.5 + Math.random() * 2.5,
      color,
    });
  }
}

function stepParticles(world, dt) {
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-1.6 * dt);
    p.vy *= Math.exp(-1.6 * dt);
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

function pushEvent(world, text) {
  world.events.push({ text, at: world.levelTime });
  if (world.events.length > 4) world.events.shift();
}

export function collectShard(world, shard, now) {
  shard.taken = true;
  world.shardsCollected += 1;
  // Combo: shards inside the window raise the multiplier for the next one.
  if (now <= world.comboUntil) {
    world.combo = Math.min(world.combo + 1, COMBO.maxMultiplier);
  } else {
    world.combo = 1;
  }
  world.comboUntil = now + COMBO.windowSeconds;
  world.comboTimer = COMBO.windowSeconds;
  const gained = COMBO.shardBaseScore * world.combo;
  world.score += gained;
  addParticles(world, shard.x, shard.y, PARTICLES.burstOnCollect, '#ffd76a', 180, 0.6);
  pushEvent(world, `Shard +${gained}${world.combo > 1 ? `  x${world.combo} combo` : ''}`);
  if (world.shardsCollected >= world.def.shards) {
    world.gate.open = true;
    pushEvent(world, 'Warp gate open — fly into it!');
  }
  return gained;
}

export function damageShip(world, amount, now) {
  world.ship.hull = Math.max(0, world.ship.hull - amount);
  world.ship.invulnerableUntil = now + 1.2;
  world.combo = 0;
  addParticles(world, world.ship.x, world.ship.y, PARTICLES.burstOnHit, '#ff5470', 260, 0.7);
  pushEvent(world, `Hull -${amount}`);
}

export function healShip(world, amount) {
  world.ship.hull = Math.min(SHIP.hullMax, world.ship.hull + amount);
  addParticles(world, world.ship.x, world.ship.y, 18, '#7CFC9A', 150, 0.6);
  pushEvent(world, `Shield +${amount} hull`);
}

// One fixed simulation step. Returns a small report of what happened so the
// loop can play the matching sounds and change screens.
export function stepWorld(world, input, dt, now) {
  const report = { collected: 0, hit: false, healed: false, gateEntered: false, wellScrape: false };
  world.levelTime += dt;
  if (now > world.comboUntil) world.combo = 0;
  world.comboTimer = Math.max(0, world.comboUntil - now);

  stepShip(world.ship, input, world.wells, dt, now);
  for (const a of world.asteroids) stepAsteroid(a, dt, CANVAS.width, CANVAS.height);

  // Thrust exhaust particles, emitted from the ship's tail.
  if (world.ship.thrusting) {
    const back = world.ship.angle + Math.PI;
    addParticles(
      world,
      world.ship.x + Math.cos(back) * 16,
      world.ship.y + Math.sin(back) * 16,
      2,
      '#ff9d45',
      60,
      0.35,
    );
  }

  // Shards drift toward the ship when close, then collect on touch.
  for (const shard of world.shards) {
    if (shard.taken) continue;
    shard.bob += dt * 2;
    const dx = world.ship.x - shard.x;
    const dy = world.ship.y - shard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < PHYSICS.shardMagnetRadius && dist > 1) {
      const pull = 260 * (1 - dist / PHYSICS.shardMagnetRadius);
      shard.x += (dx / dist) * pull * dt;
      shard.y += (dy / dist) * pull * dt;
    }
    if (dist < PHYSICS.shardCollectRadius + shard.radius * 0.4) {
      report.collected += collectShard(world, shard, now);
    }
  }

  // Shields restore hull on touch.
  for (const shield of world.shields) {
    if (shield.taken) continue;
    shield.bob += dt * 2;
    const dist = Math.hypot(world.ship.x - shield.x, world.ship.y - shield.y);
    if (dist < PHYSICS.shardCollectRadius + shield.radius * 0.5) {
      shield.taken = true;
      report.healed = true;
      healShip(world, 30);
    }
  }

  // Asteroid impacts cost hull and grant brief invulnerability.
  for (const asteroid of world.asteroids) {
    const dx = world.ship.x - asteroid.x;
    const dy = world.ship.y - asteroid.y;
    const r = 14 + asteroid.radius * 0.82;
    if (now >= world.ship.invulnerableUntil && dx * dx + dy * dy < r * r) {
      damageShip(world, ASTEROID.hitDamage, now);
      report.hit = true;
      // Shove the ship away from the rock so hits do not chain instantly.
      const d = Math.max(1, Math.hypot(dx, dy));
      world.ship.vx += (dx / d) * 260;
      world.ship.vy += (dy / d) * 260;
    }
  }

  // Brushing a well's core scorches the hull — the wells are dangerous too.
  for (const well of world.wells) {
    const dx = world.ship.x - well.x;
    const dy = world.ship.y - well.y;
    const r = 14 + well.radius * 0.45;
    if (now >= world.ship.invulnerableUntil && dx * dx + dy * dy < r * r) {
      damageShip(world, 15, now);
      report.wellScrape = true;
      const d = Math.max(1, Math.hypot(dx, dy));
      world.ship.vx += (dx / d) * 320;
      world.ship.vy += (dy / d) * 320;
    }
  }

  // Flying into an open gate ends the level.
  if (world.gate.open) {
    const dist = Math.hypot(world.ship.x - world.gate.x, world.ship.y - world.gate.y);
    if (dist < world.gate.radius) {
      report.gateEntered = true;
      addParticles(world, world.gate.x, world.gate.y, PARTICLES.burstOnGate, '#59f2c8', 300, 0.9);
    }
  }

  stepParticles(world, dt);
  return report;
}

export function levelClearBonus(world) {
  const timeLeft = Math.max(0, world.def.parSeconds - world.levelTime);
  const bonus = COMBO.levelClearBonus + Math.round(timeLeft) * COMBO.timeBonusPerSecond;
  world.score += bonus;
  return bonus;
}

export function shardsRemaining(world) {
  return world.def.shards - world.shardsCollected;
}
