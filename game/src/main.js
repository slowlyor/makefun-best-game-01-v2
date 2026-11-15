// Starlight Drift — main: the game loop and screen state machine.
// Wires input, world, physics, audio and render together. Screens: title,
// playing, paused, levelClear, victory, gameOver. The ?shot= query param
// (shots.js) renders a deterministic state for screenshots.

import {
  playClick,
  playGameOver,
  playGateOpen,
  playHit,
  playLevelClear,
  playLevelStart,
  playPickup,
  playShield,
  playVictory,
  setMuted,
  startThrustHum,
  stopThrustHum,
  unlockAudio,
} from './audio.js';
import { CANVAS, LEVELS, SCREENS } from './config.js';
import { createInput } from './input.js';
import {
  drawGameOver,
  drawLevelClear,
  drawPaused,
  drawTitle,
  drawVictory,
  drawWorld,
} from './render.js';
import { applyShot } from './shots.js';
import { buildLevel, levelClearBonus, stepWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;

const input = createInput(canvas);

const BEST_KEY = 'starlight-drift-best-score';
let bestScore = 0;
try {
  bestScore = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  bestScore = 0;
}

const game = {
  screen: SCREENS.title,
  world: null,
  totalScore: 0,
  runScore: 0, // points banked from levels already cleared
  totalTime: 0,
  levelBonus: 0,
  now: 0, // seconds since the page loaded, drives all animation
  lastFrame: 0,
  shotMode: false,
  muted: false,
};

function saveBest() {
  if (game.totalScore <= bestScore) return;
  bestScore = game.totalScore;
  try {
    window.localStorage.setItem(BEST_KEY, String(bestScore));
  } catch {
    // Private mode or no storage: the best score just lives for the session.
  }
}

function startLevel(levelIndex, seed) {
  game.world = buildLevel(levelIndex, seed ?? 1000 + levelIndex * 77);
  game.screen = SCREENS.playing;
  game.levelBonus = 0;
  // No audio in screenshot mode: there is no user gesture to unlock it with.
  if (!game.shotMode) playLevelStart();
}

function startRun() {
  game.totalScore = 0;
  game.runScore = 0;
  game.totalTime = 0;
  startLevel(0);
}

function nextLevel() {
  const next = game.world.index + 1;
  if (next >= LEVELS.length) {
    game.screen = SCREENS.victory;
    saveBest();
    playVictory();
    return;
  }
  startLevel(next);
}

function handleLevelClear() {
  game.levelBonus = levelClearBonus(game.world);
  // Bank this level's points into the run total; the next level starts at 0.
  game.runScore += game.world.score + game.levelBonus;
  game.totalScore = game.runScore;
  game.screen = SCREENS.levelClear;
  playLevelClear();
}

function handleGameOver() {
  game.screen = SCREENS.gameOver;
  saveBest();
  playGameOver();
  stopThrustHum();
}

function handleKeys() {
  const pressed = input.state.pressed;
  const any = (codes) => codes.some((c) => pressed.has(c));

  if (any(['KeyM'])) {
    game.muted = !game.muted;
    setMuted(game.muted);
    document.body.dataset.muted = String(game.muted);
  }

  switch (game.screen) {
    case SCREENS.title:
      if (any(['Enter', 'NumpadEnter', 'Space']) || input.state.pointerDown) {
        unlockAudio();
        playClick();
        startRun();
      }
      break;
    case SCREENS.playing:
      if (any(['KeyP', 'Escape'])) {
        game.screen = SCREENS.paused;
        stopThrustHum();
        playClick();
      } else if (any(['KeyR'])) {
        startLevel(game.world.index);
        playClick();
      }
      break;
    case SCREENS.paused:
      if (any(['KeyP', 'Escape', 'Enter'])) {
        game.screen = SCREENS.playing;
        playClick();
      } else if (any(['KeyR'])) {
        startLevel(game.world.index);
        playClick();
      }
      break;
    case SCREENS.levelClear:
      if (any(['Enter', 'NumpadEnter', 'Space'])) {
        playClick();
        nextLevel();
      }
      break;
    case SCREENS.victory:
    case SCREENS.gameOver:
      if (any(['Enter', 'NumpadEnter', 'Space', 'KeyR'])) {
        playClick();
        startRun();
      }
      break;
    default:
      break;
  }
}

function frame(timestamp) {
  const now = timestamp / 1000;
  const dt = Math.min(0.05, game.lastFrame === 0 ? 0.016 : now - game.lastFrame);
  game.lastFrame = now;
  game.now = now;

  handleKeys();

  if (game.screen === SCREENS.playing && game.world) {
    const report = stepWorld(game.world, input, dt, now);
    game.totalTime += dt;
    // Live total: banked points plus whatever this level has earned so far.
    game.totalScore = game.runScore + game.world.score;
    if (report.collected > 0) playPickup(game.world.combo);
    if (report.hit) playHit();
    if (report.healed) playShield();
    if (report.wellScrape) playHit();
    if (game.world.gate.open && game.world.shardsCollected >= game.world.def.shards) {
      // Play the gate-open chime once, the frame the gate opens.
      if (!game.world.gateChimed) {
        game.world.gateChimed = true;
        playGateOpen();
      }
    }
    if (game.world.ship.thrusting) startThrustHum();
    else stopThrustHum();
    if (report.gateEntered) {
      stopThrustHum();
      handleLevelClear();
    } else if (game.world.ship.hull <= 0) {
      handleGameOver();
    }
  } else {
    stopThrustHum();
  }

  // Draw the current screen.
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  switch (game.screen) {
    case SCREENS.title:
      drawTitle(ctx, now);
      break;
    case SCREENS.playing:
    case SCREENS.paused:
      drawWorld(ctx, game.world, game.totalScore, now);
      if (game.screen === SCREENS.paused) drawPaused(ctx);
      break;
    case SCREENS.levelClear:
      drawWorld(ctx, game.world, game.totalScore, now);
      drawLevelClear(ctx, game.world.def.name, game.levelBonus, game.totalScore);
      break;
    case SCREENS.victory:
      drawWorld(ctx, game.world, game.totalScore, now);
      drawVictory(ctx, game.totalScore, bestScore, game.totalTime);
      break;
    case SCREENS.gameOver:
      drawWorld(ctx, game.world, game.totalScore, now);
      drawGameOver(ctx, game.world, game.totalScore);
      break;
    default:
      drawTitle(ctx, now);
      break;
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

// Screenshot mode: ?shot=start|play|win|over renders one frozen, fully
// deterministic state of the real game instead of starting the loop's input.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  game.shotMode = true;
  applyShot(game, shot, { startLevel, startRun });
  // One still frame is enough; keep animating the backdrop lightly so the
  // capture shows the living game, without advancing gameplay.
  requestAnimationFrame(function stillFrame(timestamp) {
    game.now = timestamp / 1000;
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
    if (game.screen === SCREENS.title) {
      drawTitle(ctx, game.now);
    } else {
      drawWorld(ctx, game.world, game.totalScore, game.now);
      if (game.screen === SCREENS.victory) {
        // In a staged screenshot the best score was never saved; show the
        // run's own score as the best so the panel reads consistently.
        drawVictory(ctx, game.totalScore, Math.max(bestScore, game.totalScore), game.totalTime);
      } else if (game.screen === SCREENS.gameOver) {
        drawGameOver(ctx, game.world, game.totalScore);
      } else if (game.screen === SCREENS.levelClear) {
        drawLevelClear(ctx, game.world.def.name, game.levelBonus, game.totalScore);
      }
    }
    requestAnimationFrame(stillFrame);
  });
} else {
  requestAnimationFrame(frame);
}
