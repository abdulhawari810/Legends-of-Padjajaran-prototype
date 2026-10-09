import { VirtualInput } from '../game/input/VirtualInput';

// Tombol serang kanan bawah: pointerdown -> queue 1 serangan.
// Cooldown tetap diatur di Player/MapScene agar tidak spam.
export function initAttackButton() {
  const btn = document.getElementById('attack-btn');
  if (!btn) return;

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    VirtualInput.requestAttack();
    btn.classList.add('pressed');
  });
  window.addEventListener('pointerup', () => btn.classList.remove('pressed'));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
