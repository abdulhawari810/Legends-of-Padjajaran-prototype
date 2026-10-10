import './style.css';
import { createGame } from './game/Game';
import { initJoystick } from './ui/joystick';
import { initAttackButton } from './ui/attack';
import { initSkillButton } from './ui/skill';
import { initCharPanel } from './ui/charPanel';
import { initHud } from './ui/hud';
import { initGamePanels } from './ui/gamePanels';
import { initSettings } from './ui/settings';
import { initMinimap } from './ui/minimap';
import { initLandscape } from './ui/orientation';

const container = document.getElementById('game-container')!;
createGame(container);
initJoystick();
initAttackButton();
initSkillButton();
initCharPanel();
initHud();
initGamePanels();
initSettings();
initMinimap();
initLandscape();

// Pilih job (3 class). Default dari save terakhir, fallback warrior.
import { JOBS } from './game/data/jobs';
import { loadMeta } from './game/data/save';
import { clearAllSave } from './game/data/save';
import { initAudio, isMuted, setMuted, sfxClick } from './game/audio';

initAudio();

const muteBtn = document.getElementById('btn-mute');
const paintMute = () => {
  if (muteBtn) muteBtn.textContent = isMuted() ? '🔇' : '🔊';
};
muteBtn?.addEventListener('click', () => {
  setMuted(!isMuted());
  paintMute();
  if (!isMuted()) sfxClick();
});
paintMute();

const buttons = document.querySelectorAll<HTMLButtonElement>('#job-select button');

function setActive(jobId: string) {
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.job === jobId));
  window.dispatchEvent(new CustomEvent('select-job', { detail: jobId }));
  const icons: Record<string, string> = { warrior: '⚔️', mage: '🔮', archer: '🏹' };
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon && icons[jobId]) avatarIcon.textContent = icons[jobId];
}

buttons.forEach((b) => {
  b.addEventListener('click', () => {
    sfxClick();
    setActive(b.dataset.job!);
  });
});

// sinkron tombol saat MapScene restore job dari save (tanpa dispatch ulang)
window.addEventListener('select-job-sync', ((e: CustomEvent<string>) => {
  const jobId = e.detail;
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.job === jobId));
  const icons: Record<string, string> = { warrior: '⚔️', mage: '🔮', archer: '🏹' };
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon && icons[jobId]) avatarIcon.textContent = icons[jobId];
}) as EventListener);

let initialJob = 'warrior';
try {
  const meta = loadMeta();
  if (meta.currentJob === 'warrior' || meta.currentJob === 'mage' || meta.currentJob === 'archer') {
    initialJob = meta.currentJob;
  }
} catch {
  // abaikan save korup
}
void JOBS;

setActive(initialJob);

// Reset save dengan konfirmasi 2x klik
const resetBtn = document.getElementById('btn-reset-save');
let resetArmed = false;
let resetTimer = 0;
resetBtn?.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    if (resetBtn) resetBtn.textContent = 'Klik lagi untuk hapus!';
    resetTimer = window.setTimeout(() => {
      resetArmed = false;
      if (resetBtn) resetBtn.textContent = 'Reset Save';
    }, 3000);
    return;
  }
  window.clearTimeout(resetTimer);
  clearAllSave();
  window.location.reload();
});
