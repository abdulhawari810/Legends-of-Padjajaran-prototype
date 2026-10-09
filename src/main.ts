import './style.css';
import { createGame } from './game/Game';
import { initJoystick } from './ui/joystick';
import { initAttackButton } from './ui/attack';
import { initCharPanel } from './ui/charPanel';
import { initHud } from './ui/hud';
import { initGamePanels } from './ui/gamePanels';
import { initLandscape } from './ui/orientation';

const container = document.getElementById('game-container')!;
createGame(container);
initJoystick();
initAttackButton();
initCharPanel();
initHud();
initGamePanels();
initLandscape();

// Pilih job (3 class). Default warrior.
import { JOBS } from './game/data/jobs';

const buttons = document.querySelectorAll<HTMLButtonElement>('#job-select button');

function setActive(jobId: string) {
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.job === jobId));
  window.dispatchEvent(new CustomEvent('select-job', { detail: jobId }));
  const icons: Record<string, string> = { warrior: '⚔️', mage: '🔮', archer: '🏹' };
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon && icons[jobId]) avatarIcon.textContent = icons[jobId];
}

buttons.forEach((b) => {
  b.addEventListener('click', () => setActive(b.dataset.job!));
});

setActive('warrior');
