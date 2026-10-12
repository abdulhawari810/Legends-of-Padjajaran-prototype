import { createGame } from './game/Game';
import { initBuffBar } from './ui/buffBar';
import { initJoystick } from './ui/joystick';
import { initAttackButton } from './ui/attack';
import { initSkillButton } from './ui/skill';
import { initQuickSlots } from './ui/quickslots';
import { initCharPanel } from './ui/charPanel';
import { initHud } from './ui/hud';
import { initGamePanels } from './ui/gamePanels';
import { initSettings } from './ui/settings';
import { initMinimap } from './ui/minimap';
import { initChat } from './ui/chat';
import { initTargetPanel } from './ui/targetPanel';
import { initQuickMenu } from './ui/quickmenu';
import { initLandscape } from './ui/orientation';
import { loadMeta, saveMeta } from './game/data/save';
import type { JobId } from './game/data/jobs';
import { initAudio, isMuted, setMuted, sfxClick } from './game/audio';

// =============================================================================
// Isi game. Modul ini WAJIB di-import SETELAH `setActiveProfile()` supaya
// semua modul data meng-cache key milik profil yang benar.
// Dipanggil dari main.ts lewat dynamic `import('./app')`.
// =============================================================================

export function startGame(jobId: JobId) {
  // Tulis job ke SAVE GAME dulu, sebelum Player dibuat.
  //
  // Player membaca `loadMeta().currentJob` di konstruktor lalu langsung
  // mengunci diri (`jobLocked = true`). Job dari layar auth tersimpan di
  // `mmorpg-auth-v1`, BUKAN di save game — jadi kalau tidak ditulis ke sini,
  // karakter baru selalu fallback ke 'warrior' apa pun yang dipilih pemain,
  // lalu terkunci permanen.
  try {
    const meta = loadMeta();
    if (meta.currentJob !== jobId) saveMeta({ ...meta, currentJob: jobId });
  } catch {
    // save korup -> biarkan default
  }

  const container = document.getElementById('game-container');
  if (container) createGame(container);

  initJoystick();
  initAttackButton();
  initSkillButton();
  initQuickSlots();
  initBuffBar();
  initCharPanel();
  initHud();
  initGamePanels();
  initSettings();
  initMinimap();
  initChat();
  initTargetPanel();
  initQuickMenu();
  initLandscape();

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

  paintJob(jobId);
}

// ===== Label job permanen =====
// Strip #job-select diganti jadi label read-only. Job tidak bisa diganti lagi.
const jobSelect = document.getElementById('job-select');
const JOB_ICONS: Record<string, string> = { warrior: '⚔️', mage: '🔮', archer: '🏹' };
const JOB_LABEL: Record<string, string> = { warrior: 'Warrior', mage: 'Mage', archer: 'Archer' };

export function paintJob(jobId: string) {
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon && JOB_ICONS[jobId]) avatarIcon.textContent = JOB_ICONS[jobId];
  if (jobSelect) {
    jobSelect.classList.add('locked');
    jobSelect.innerHTML = `<span class="job-fixed">${JOB_ICONS[jobId] ?? ''} ${JOB_LABEL[jobId] ?? jobId}</span>`;
  }
}

/**
 * Job efektif dari SAVE GAME. Hanya dipakai sebagai diagnosis/debug —
 * untuk boot, `startGame()` menerima job dari profil auth lalu MENULISNYA
 * ke save game lebih dulu.
 */
export function resolveJob(): string {
  try {
    const meta = loadMeta();
    if (meta.currentJob === 'warrior' || meta.currentJob === 'mage' || meta.currentJob === 'archer') {
      return meta.currentJob;
    }
  } catch {
    // abaikan save korup
  }
  return 'warrior';
}