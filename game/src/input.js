// Starlight Drift — input: keyboard and mouse, unified into one small state
// object the game loop reads each frame. Also owns the pause / mute /
// restart keys and the canvas click-to-thrust steering.

export function createInput(canvas) {
  const state = {
    // Held keys, by their KeyboardEvent.code (KeyW, ArrowUp, Space, ...).
    keys: new Set(),
    // Pointer position in logical canvas coordinates (see toLogical).
    pointerX: 0,
    pointerY: 0,
    pointerDown: false,
    pointerInside: false,
    // Edge-triggered actions, consumed once by the loop each frame.
    pressed: new Set(),
  };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onKeyDown(event) {
    // Ignore repeats: a held key is one press, not a stream of them.
    if (event.repeat) return;
    state.keys.add(event.code);
    state.pressed.add(event.code);
    // Keep the page from scrolling on game keys.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    state.keys.delete(event.code);
  }

  function onPointerMove(event) {
    const p = toLogical(event.clientX, event.clientY);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.pointerInside = true;
  }

  function onPointerDown(event) {
    const p = toLogical(event.clientX, event.clientY);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.pointerDown = true;
    state.pointerInside = true;
  }

  function onPointerUp() {
    state.pointerDown = false;
  }

  function onBlur() {
    state.keys.clear();
    state.pointerDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', () => {
    state.pointerInside = false;
  });

  return {
    state,

    // Directional thrust: arrows or WASD. Returns a unit-ish vector.
    thrustVector() {
      let x = 0;
      let y = 0;
      const k = state.keys;
      if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
      if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
      if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
      if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },

    // Holding the mouse steers the ship toward the cursor.
    mouseThrust() {
      if (!state.pointerDown || !state.pointerInside) return null;
      return { x: state.pointerX, y: state.pointerY };
    },

    braking() {
      return state.keys.has('Space');
    },

    // True once for the frame the key went down; the loop clears it.
    wasPressed(code) {
      return state.pressed.has(code);
    },

    // True if any of the given codes went down this frame.
    anyPressed(codes) {
      return codes.some((code) => state.pressed.has(code));
    },

    endFrame() {
      state.pressed.clear();
    },

    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    },
  };
}
