// Starlight Drift — render: everything drawn on the canvas, from the
// nebula backdrop to the HUD and the title / end screens. No DOM UI except
// the canvas itself; text is drawn so screenshots capture the whole game.

import { CANVAS, GAME_NAME, GAME_TAGLINE, LEVELS, PALETTE } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world, now) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  grad.addColorStop(0, PALETTE.space);
  grad.addColorStop(1, PALETTE.spaceDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // Soft nebula blobs, drifting almost imperceptibly.
  const blobs = [
    { x: 300 + Math.sin(now * 0.02) * 12, y: 220, r: 300, c: PALETTE.nebulaA },
    { x: 980, y: 560 + Math.cos(now * 0.015) * 10, r: 340, c: PALETTE.nebulaB },
    { x: 700, y: 120, r: 240, c: PALETTE.nebulaC },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c + '55');
    g.addColorStop(1, b.c + '00');
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }

  // Twinkling stars in three depth layers.
  for (const s of world.stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(now * (0.6 + s.layer * 0.4) + s.twinkle);
    ctx.globalAlpha = twinkle * (0.45 + s.layer * 0.18);
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A soft vignette so the playfield edges fall away from the action.
  const vig = ctx.createRadialGradient(
    CANVAS.width / 2, CANVAS.height / 2, CANVAS.height * 0.45,
    CANVAS.width / 2, CANVAS.height / 2, CANVAS.width * 0.72,
  );
  vig.addColorStop(0, 'rgba(4, 6, 15, 0)');
  vig.addColorStop(1, 'rgba(4, 6, 15, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
}

function drawWell(ctx, well, now) {
  const pulse = 1 + 0.06 * Math.sin(now * 1.4 + well.pulse);
  const outer = well.radius * 2.6 * pulse;
  const g = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, outer);
  g.addColorStop(0, 'rgba(124, 140, 255, 0.55)');
  g.addColorStop(0.35, 'rgba(88, 110, 255, 0.22)');
  g.addColorStop(1, 'rgba(88, 110, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(well.x, well.y, outer, 0, Math.PI * 2);
  ctx.fill();

  // Accretion ring, slowly rotating.
  ctx.save();
  ctx.translate(well.x, well.y);
  ctx.rotate(now * 0.25 + well.pulse);
  ctx.strokeStyle = 'rgba(160, 175, 255, 0.65)';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 14]);
  ctx.beginPath();
  ctx.arc(0, 0, well.radius * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // The hot core itself.
  const core = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.radius * 0.55);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.5, '#aab6ff');
  core.addColorStop(1, 'rgba(90, 110, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(well.x, well.y, well.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawGate(ctx, gate, now) {
  if (!gate.open) {
    // A dormant gate: a dim ring and a lock hint.
    ctx.strokeStyle = 'rgba(89, 242, 200, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, gate.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(143, 163, 200, 0.9)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARP GATE — LOCKED', gate.x, gate.y + gate.radius + 22);
    return;
  }
  const breathe = 1 + 0.08 * Math.sin(now * 3);
  const g = ctx.createRadialGradient(gate.x, gate.y, 0, gate.x, gate.y, gate.radius * 2.1);
  g.addColorStop(0, 'rgba(89, 242, 200, 0.75)');
  g.addColorStop(0.5, 'rgba(29, 233, 182, 0.25)');
  g.addColorStop(1, 'rgba(29, 233, 182, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, gate.radius * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gate;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, gate.radius * breathe, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#eafff6';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  // Label below the ring: the gate sits near the top, under the HUD bar.
  ctx.fillText('WARP GATE OPEN', gate.x, gate.y + gate.radius + 24);
}

function drawShard(ctx, shard, now) {
  if (shard.taken) return;
  const bobY = Math.sin(shard.bob) * 4;
  const twinkle = 0.75 + 0.25 * Math.sin(now * 4 + shard.spin);
  ctx.save();
  ctx.translate(shard.x, shard.y + bobY);
  ctx.rotate(Math.sin(now * 1.6 + shard.spin) * 0.35);
  ctx.globalAlpha = twinkle;
  ctx.shadowColor = PALETTE.shard;
  ctx.shadowBlur = 16;
  ctx.fillStyle = PALETTE.shard;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 15);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.shardCore;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 7);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawShieldPickup(ctx, shield) {
  if (shield.taken) return;
  const bobY = Math.sin(shield.bob) * 4;
  ctx.save();
  ctx.translate(shield.x, shield.y + bobY);
  ctx.shadowColor = PALETTE.shield;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = PALETTE.shield;
  ctx.fillStyle = 'rgba(124, 252, 154, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(12, -6);
  ctx.lineTo(10, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-10, 8);
  ctx.lineTo(-12, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#eafff0';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+', shield.x, shield.y + bobY + 5);
}

function drawAsteroid(ctx, asteroid) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);
  ctx.fillStyle = PALETTE.asteroid;
  ctx.strokeStyle = PALETTE.asteroidDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = asteroid.bumps.length;
  for (let i = 0; i <= n; i += 1) {
    const angle = (i / n) * Math.PI * 2;
    const r = asteroid.radius * asteroid.bumps[i % n];
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Craters for texture.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.arc(-asteroid.radius * 0.3, asteroid.radius * 0.2, asteroid.radius * 0.22, 0, Math.PI * 2);
  ctx.arc(asteroid.radius * 0.35, -asteroid.radius * 0.25, asteroid.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ctx, ship, now) {
  // Trail ribbon.
  if (ship.trail.length > 1) {
    for (let i = 1; i < ship.trail.length; i += 1) {
      const t = i / ship.trail.length;
      ctx.globalAlpha = t * 0.5;
      ctx.strokeStyle = '#7cf7ff';
      ctx.lineWidth = 1 + t * 3;
      ctx.beginPath();
      ctx.moveTo(ship.trail[i - 1].x, ship.trail[i - 1].y);
      ctx.lineTo(ship.trail[i].x, ship.trail[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Blink while invulnerable after a hit.
  if (now < ship.invulnerableUntil && Math.floor(now * 12) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI / 2);

  // Engine flame while thrusting.
  if (ship.thrusting) {
    const flicker = 14 + Math.random() * 10;
    const flame = ctx.createLinearGradient(0, 12, 0, 12 + flicker + 14);
    flame.addColorStop(0, PALETTE.flameHot);
    flame.addColorStop(1, 'rgba(255, 157, 69, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(0, 12 + flicker + 12);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();
  }

  // Lantern-ship: a pointed hull with a glowing core.
  ctx.shadowColor = PALETTE.hull;
  ctx.shadowBlur = 16;
  ctx.fillStyle = PALETTE.ship;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(12, 12);
  ctx.lineTo(5, 8);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.shard;
  ctx.beginPath();
  ctx.arc(0, 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world, totalScore, now) {
  const ship = world.ship;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top bar: level, score, shards, hull.
  ctx.fillStyle = 'rgba(4, 6, 15, 0.55)';
  ctx.fillRect(0, 0, CANVAS.width, 54);

  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${world.index + 1} — ${world.def.name.toUpperCase()}`, 20, 34);

  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(`SCORE ${totalScore.toLocaleString('en-US')}`, 420, 34);

  ctx.fillStyle = PALETTE.shard;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(`◆ ${world.shardsCollected}/${world.def.shards}`, 640, 34);

  // Hull bar.
  const barX = 820;
  const barW = 200;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRect(ctx, barX, 18, barW, 18, 9);
  ctx.fill();
  const hullFrac = ship.hull / 100;
  ctx.fillStyle = hullFrac > 0.5 ? PALETTE.shield : hullFrac > 0.25 ? PALETTE.shard : PALETTE.danger;
  if (hullFrac > 0) {
    roundRect(ctx, barX, 18, Math.max(18, barW * hullFrac), 18, 9);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`HULL ${Math.ceil(ship.hull)}`, barX + barW + 12, 33);

  // Combo badge.
  if (world.combo > 1) {
    ctx.fillStyle = PALETTE.shard;
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${world.combo}  ${world.comboTimer.toFixed(1)}s`, CANVAS.width - 20, 34);
    ctx.textAlign = 'left';
  }

  // Timer + level intro line under the bar.
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`TIME ${Math.floor(world.levelTime)}s  ·  PAR ${world.def.parSeconds}s`, 20, 78);

  // Recent event feed, bottom-left.
  ctx.font = '600 16px system-ui, sans-serif';
  world.events.forEach((event, i) => {
    const age = world.levelTime - event.at;
    if (age > 5) return;
    ctx.globalAlpha = Math.max(0, 1 - age / 5);
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(event.text, 20, CANVAS.height - 24 - (world.events.length - 1 - i) * 22);
  });
  ctx.globalAlpha = 1;

  // Controls reminder, bottom-right.
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD / arrows thrust · mouse: steer · SPACE brake · P pause · R restart · M mute', CANVAS.width - 20, CANVAS.height - 16);
  ctx.textAlign = 'left';
}

function drawPanel(ctx, title, lines, accent) {
  const w = 640;
  const h = 120 + lines.length * 34;
  const x = (CANVAS.width - w) / 2;
  const y = (CANVAS.height - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || PALETTE.hudText;
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.fillText(title, CANVAS.width / 2, y + 62);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 19px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS.width / 2, y + 108 + i * 34);
  });
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, now) {
  // Animated backdrop behind the title: slow drifting shards and stars.
  const fake = { stars: [] };
  for (let i = 0; i < 140; i += 1) {
    const seed = i * 137.5;
    fake.stars.push({
      x: (seed * 7.3) % CANVAS.width,
      y: (seed * 3.1) % CANVAS.height,
      size: 0.6 + (i % 3) * 0.7,
      layer: 1 + (i % 3),
      twinkle: seed,
    });
  }
  drawBackground(ctx, fake, now);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.shard;
  ctx.font = '800 84px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(255, 215, 106, 0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText(GAME_NAME, CANVAS.width / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(GAME_TAGLINE, CANVAS.width / 2, 348);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Pilot your lantern-ship through the nebula. Gravity wells bend your flight —', CANVAS.width / 2, 420);
  ctx.fillText('slingshot around them, gather every star shard, dodge the rocks, and fly the warp gate.', CANVAS.width / 2, 448);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 22px system-ui, sans-serif';
  const blink = 0.6 + 0.4 * Math.sin(now * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('Press ENTER or click to launch  ·  3 levels  ·  best score wins', CANVAS.width / 2, 530);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText('WASD / arrows thrust   ·   hold mouse to steer   ·   SPACE brake   ·   P pause   ·   M mute', CANVAS.width / 2, 590);
  ctx.textAlign = 'left';
}

export function drawWorld(ctx, world, totalScore, now) {
  drawBackground(ctx, world, now);
  for (const well of world.wells) drawWell(ctx, well, now);
  drawGate(ctx, world.gate, now);
  for (const shield of world.shields) drawShieldPickup(ctx, shield);
  for (const shard of world.shards) drawShard(ctx, shard, now);
  for (const asteroid of world.asteroids) drawAsteroid(ctx, asteroid);
  drawParticles(ctx, world.particles);
  drawShip(ctx, world.ship, now);
  drawHud(ctx, world, totalScore, now);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(4, 6, 15, 0.55)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  drawPanel(ctx, 'PAUSED', ['Press P to keep flying, or R to restart the level.'], PALETTE.hudText);
}

export function drawLevelClear(ctx, levelName, bonus, totalScore) {
  drawPanel(
    ctx,
    'LEVEL CLEAR',
    [`${levelName} complete!`, `Time bonus +${bonus.toLocaleString('en-US')}`, `Score ${totalScore.toLocaleString('en-US')}`, 'Press ENTER for the next level'],
    PALETTE.gate,
  );
}

export function drawVictory(ctx, totalScore, bestScore, timeSeconds) {
  drawPanel(
    ctx,
    'YOU LIT THE SKY',
    [
      'All three levels cleared — every shard gathered.',
      `Final score ${totalScore.toLocaleString('en-US')}   ·   Best ${bestScore.toLocaleString('en-US')}`,
      `Total time ${Math.floor(timeSeconds / 60)}:${String(Math.floor(timeSeconds % 60)).padStart(2, '0')}`,
      'Press ENTER or R to play again',
    ],
    PALETTE.shard,
  );
}

export function drawGameOver(ctx, world, totalScore) {
  drawPanel(
    ctx,
    'SHIP LOST',
    [
      `The nebula keeps its shards this time — level ${world.index + 1}, ${world.shardsCollected}/${world.def.shards} shards.`,
      `Score ${totalScore.toLocaleString('en-US')}`,
      'Press ENTER or R to try again',
    ],
    PALETTE.danger,
  );
}
