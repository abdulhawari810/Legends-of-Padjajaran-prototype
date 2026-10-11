import { sfxClick } from '../game/audio';

// Batch UI desktop: menu cepat kanan = memencet tombol top-menu yang sama.
export function initQuickMenu() {
  document.querySelectorAll<HTMLButtonElement>('#quick-menu button[data-go]').forEach((b) => {
    b.addEventListener('click', () => {
      sfxClick();
      document.getElementById(b.dataset.go!)?.click();
    });
  });
}
