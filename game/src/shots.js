// Starlight Drift — shots: deterministic staged states for screenshots.
// ?shot=start shows the title, ?shot=play a mid-game moment with the HUD,
// ?shot=win the victory screen, ?shot=over the game-over screen. Each one is
// the real game, built from the same level builder and renderer the player
// sees — only the inputs are scripted, so the capture is reproducible.

import { SCREENS } from './config.js';
import { addParticles, buildLevel, collectShard, stepWorld } from './world.js';

// A fixed input script: thrust directions per simulated second, so the
// staged "play" shot always shows the ship mid-flight, not parked at spawn.
function scriptedInput() {
  let t = 0;
  return {
    state: { pressed: new Set(), pointerDown: false },
    thrustVector() {
      // A gentle arc: up-right first, then left, like a slingshot pass.
      if (t < 1.2) return { x: 0.7, y: -0.7 };
      if (t < 2.4) return { x: -0.4, y: -0.6 };
      return { x: 0.2, y: 0.3 };
    },
    mouseThrust() {
      return null;
    },
    braking() {
      return false;
    },
    wasPressed() {
      return false;
    },
    endFrame() {},
    setTime(seconds) {
      t = seconds;
    },
  };
}

function stagePlayShot(game) {
  const world = buildLevel(0, 1000);
  const input = scriptedInput();
  const dt = 1 / 60;
  let now = 0;
  // Fast-forward ~4 s of real physics so the ship is flying, the trail is
  // drawn, and a couple of shards are already in the score.
  for (let i = 0; i < 240; i += 1) {
    now += dt;
    input.setTime(now);
    stepWorld(world, input, dt, now);
    // Nudge the ship toward the nearest shard so the staged shot shows
    // collecting in progress rather than a random drift.
    if (i === 70 || i === 150) {
      const shard = world.shards.find((s) => !s.taken);
      if (shard) {
        world.ship.x = shard.x - 60;
        world.ship.y = shard.y + 40;
        world.ship.vx = 120;
        world.ship.vy = -60;
      }
    }
  }
  // Guarantee a lively HUD: at least two shards collected, a combo running.
  if (world.shardsCollected < 2) {
    const remaining = world.shards.filter((s) => !s.taken).slice(0, 2 - world.shardsCollected);
    for (const shard of remaining) collectShard(world, shard, now);
  }
  addParticles(world, world.ship.x, world.ship.y, 10, '#7cf7ff', 120, 0.5);
  game.world = world;
  game.totalScore = world.score;
  game.totalTime = world.levelTime;
  game.screen = SCREENS.playing;
}

function stageVictoryShot(game, startRun) {
  startRun();
  // Play level 1 to completion in script, then jump to the victory screen
  // with a believable final score and time.
  const world = game.world;
  for (const shard of world.shards) {
    if (!shard.taken) collectShard(world, shard, world.levelTime + 1);
  }
  world.gate.open = true;
  world.ship.x = world.gate.x;
  world.ship.y = world.gate.y + 30;
  world.levelTime = 68; // HUD time for the final level, matching the 3:34 run
  game.totalScore = world.score + 1250;
  game.totalTime = 214;
  game.screen = SCREENS.victory;
}

function stageGameOverShot(game) {
  const world = buildLevel(1, 1077);
  // Stage the wreck: hull at zero, a few shards already banked, rocks near.
  world.ship.hull = 0;
  world.ship.x = 640;
  world.ship.y = 430;
  world.ship.vx = -40;
  world.ship.vy = 20;
  world.ship.invulnerableUntil = 0;
  world.levelTime = 47; // HUD time: the run lasted into level 2
  const first = world.shards[0];
  if (first) collectShard(world, first, 1);
  const second = world.shards[1];
  if (second) collectShard(world, second, 2);
  addParticles(world, world.ship.x, world.ship.y, 26, '#ff5470', 260, 0.7);
  game.world = world;
  game.totalScore = world.score;
  game.totalTime = world.levelTime;
  game.screen = SCREENS.gameOver;
}

export function applyShot(game, shot, controls) {
  if (shot === 'start') {
    game.screen = SCREENS.title;
    return;
  }
  if (shot === 'play') {
    stagePlayShot(game);
    return;
  }
  if (shot === 'win') {
    stageVictoryShot(game, controls.startRun);
    return;
  }
  if (shot === 'over') {
    stageGameOverShot(game);
    return;
  }
  // Unknown value: fall back to the title so the capture still shows the game.
  game.screen = SCREENS.title;
}
