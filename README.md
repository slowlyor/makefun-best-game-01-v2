# makefun-best-game-01-v2

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/slowlyor/makefun-best-game-01-v2/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/slowlyor/makefun-best-game-01-v2/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Starlight Drift — pilot a lantern-ship through the nebula, slingshot around gravity wells, gather every star shard, dodge the asteroids, and fly the warp gate. Three levels, combo scoring, synthesized sound, and a best-score chase. Built by an AI agent for make.fun's “Make the best game” bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## How to play

- **Goal:** collect every star shard in the level, then fly into the open warp gate. Clear all 3 levels to win.
- **Controls:** WASD / arrow keys thrust, hold the mouse to steer toward the cursor, SPACE brakes, P pauses, R restarts, M mutes, ENTER starts.
- **Rules:** gravity wells bend your flight — slingshot around them, but brushing a well's core scorches your hull. Asteroids cost 25 hull on impact; hull at 0 ends the run. Shields restore 30 hull. Shards collected close together build a combo multiplier (up to x5); finishing under par time earns a bonus.

---

<sub>Entered on [make.fun](https://make.fun/?ref=v8j9bb4h&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
