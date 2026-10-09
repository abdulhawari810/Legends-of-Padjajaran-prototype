import { VirtualInput } from '../game/input/VirtualInput';

// Joystick DOM: pointer events agar jalan di touch + mouse.
// Elemen yang diharapkan di index.html: #joystick-base > #joystick-knob
export function initJoystick() {
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  const RADIUS = 48; // px gerak maksimal knob
  let activePointer: number | null = null;
  let centerX = 0;
  let centerY = 0;

  function setKnob(dx: number, dy: number) {
    knob!.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function handleMove(clientX: number, clientY: number) {
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    setKnob(dx, dy);
    VirtualInput.set(dx / RADIUS, dy / RADIUS);
  }

  function reset() {
    activePointer = null;
    setKnob(0, 0);
    VirtualInput.clear();
    base!.classList.remove('active');
  }

  base.addEventListener('pointerdown', (e) => {
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    const r = base.getBoundingClientRect();
    centerX = r.left + r.width / 2;
    centerY = r.top + r.height / 2;
    base.classList.add('active');
    base.setPointerCapture(e.pointerId);
    handleMove(e.clientX, e.clientY);
  });

  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    handleMove(e.clientX, e.clientY);
  });

  base.addEventListener('pointerup', (e) => {
    if (e.pointerId !== activePointer) return;
    reset();
  });
  base.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== activePointer) return;
    reset();
  });

  // cegah context menu / scroll saat drag di mobile
  base.addEventListener('contextmenu', (e) => e.preventDefault());
}
