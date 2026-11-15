// Starlight Drift — physics: the ship, gravity wells, and every collision.
// Pure step functions over plain state objects, so the loop stays thin and
// the screenshot harness can fast-forward the world deterministically.

import { ASTEROID, CANVAS, PHYSICS, SHIP } from './config.js';

export function makeShip(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // nose points up at spawn
    hull: SHIP.hullMax,
    invulnerableUntil: 0,
    thrusting: false,
    trail: [], // recent positions, drawn as a fading ribbon
  };
}

// Gravity from one well, with a soft core so the pull stays finite.
export function wellAcceleration(ship, well) {
  const dx = well.x - ship.x;
  const dy = well.y - ship.y;
  const distSq = dx * dx + dy * dy + PHYSICS.wellFalloff * PHYSICS.wellFalloff;
  const dist = Math.sqrt(distSq);
  const strength = (PHYSICS.gravityScale * well.mass) / distSq;
  return { ax: (dx / dist) * strength, ay: (dy / dist) * strength };
}

export function stepShip(ship, input, wells, dt, now) {
  // Keyboard thrust is a direction; mouse thrust pulls toward the cursor.
  const keys = input.thrustVector();
  let ax = 0;
  let ay = 0;
  let thrusting = false;
  if (keys.x !== 0 || keys.y !== 0) {
    ax += keys.x * SHIP.thrust;
    ay += keys.y * SHIP.thrust;
    thrusting = true;
  }
  const mouse = input.mouseThrust();
  if (mouse) {
    const dx = mouse.x - ship.x;
    const dy = mouse.y - ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      ax += (dx / dist) * SHIP.mouseThrust;
      ay += (dy / dist) * SHIP.mouseThrust;
      thrusting = true;
    }
  }

  // Gravity wells bend the flight path — the game's core mechanic.
  for (const well of wells) {
    const g = wellAcceleration(ship, well);
    ax += g.ax;
    ay += g.ay;
  }

  ship.vx += ax * dt;
  ship.vy += ay * dt;

  // Gentle drag plus a hard speed cap keep the ship controllable.
  const dragFactor = Math.exp(-SHIP.drag * dt);
  ship.vx *= dragFactor;
  ship.vy *= dragFactor;
  if (input.braking()) {
    // Brake keeps SHIP.brake of the speed per second: a hard, responsive
    // stop, so threading the wells feels fair instead of floaty.
    const brakeFactor = Math.pow(SHIP.brake, dt);
    ship.vx *= brakeFactor;
    ship.vy *= brakeFactor;
  }
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
    ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Steer the nose toward the velocity so the ship reads as flying.
  if (speed > 40) {
    const target = Math.atan2(ship.vy, ship.vx);
    let diff = target - ship.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = SHIP.turnRate * dt;
    ship.angle += Math.max(-step, Math.min(step, diff));
  }

  // The playfield wraps: flying off one edge returns on the other, so a
  // slingshot never ends the run by accident.
  if (ship.x < -SHIP.radius) ship.x += CANVAS.width + SHIP.radius * 2;
  if (ship.x > CANVAS.width + SHIP.radius) ship.x -= CANVAS.width + SHIP.radius * 2;
  if (ship.y < -SHIP.radius) ship.y += CANVAS.height + SHIP.radius * 2;
  if (ship.y > CANVAS.height + SHIP.radius) ship.y -= CANVAS.height + SHIP.radius * 2;

  ship.thrusting = thrusting;
  ship.trail.push({ x: ship.x, y: ship.y });
  if (ship.trail.length > 26) ship.trail.shift();
  return ship;
}

export function makeAsteroid(rng, width, height) {
  // Spawn just outside a random edge, drifting across the playfield.
  const edge = Math.floor(rng() * 4);
  const radius = ASTEROID.minRadius + rng() * (ASTEROID.maxRadius - ASTEROID.minRadius);
  const speed = ASTEROID.minSpeed + rng() * (ASTEROID.maxSpeed - ASTEROID.minSpeed);
  const angle = rng() * Math.PI * 2;
  let x;
  let y;
  if (edge === 0) { x = -radius; y = rng() * height; }
  else if (edge === 1) { x = width + radius; y = rng() * height; }
  else if (edge === 2) { x = rng() * width; y = -radius; }
  else { x = rng() * width; y = height + radius; }
  // Aim roughly across the field so asteroids cross the player's path.
  const cx = width / 2 + (rng() - 0.5) * width * 0.6;
  const cy = height / 2 + (rng() - 0.5) * height * 0.6;
  const heading = Math.atan2(cy - y, cx - x);
  // Craggy outline: a fixed set of radial bumps per asteroid.
  const bumps = [];
  const bumpCount = 9;
  for (let i = 0; i < bumpCount; i += 1) {
    bumps.push(0.78 + rng() * 0.34);
  }
  return {
    x,
    y,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    radius,
    rotation: angle,
    spin: (rng() - 0.5) * 2 * ASTEROID.spinMax,
    bumps,
    hitCooldownUntil: 0,
  };
}

export function stepAsteroid(asteroid, dt, width, height) {
  asteroid.x += asteroid.vx * dt;
  asteroid.y += asteroid.vy * dt;
  asteroid.rotation += asteroid.spin * dt;
  // Wrap with a margin so big rocks do not pop in mid-screen.
  const m = asteroid.radius + 4;
  if (asteroid.x < -m) asteroid.x += width + m * 2;
  if (asteroid.x > width + m) asteroid.x -= width + m * 2;
  if (asteroid.y < -m) asteroid.y += height + m * 2;
  if (asteroid.y > height + m) asteroid.y -= height + m * 2;
  return asteroid;
}

// Circle-vs-circle test shared by shards, shields, gates and asteroids.
export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

export function shipHitsAsteroid(ship, asteroid, now) {
  if (now < ship.invulnerableUntil) return false;
  if (now < asteroid.hitCooldownUntil) return false;
  const dx = ship.x - asteroid.x;
  const dy = ship.y - asteroid.y;
  const r = SHIP.radius + asteroid.radius * 0.82;
  return dx * dx + dy * dy < r * r;
}

// A glancing bounce off a well's glowing core: costly, but not a hull hit.
export function shipHitsWellCore(ship, well, now) {
  if (now < ship.invulnerableUntil) return false;
  const dx = ship.x - well.x;
  const dy = ship.y - well.y;
  const r = SHIP.radius + well.radius * 0.45;
  return dx * dx + dy * dy < r * r;
}
