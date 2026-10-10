import { getVolume, isMuted, setMuted, setVolume, sfxClick } from '../game/audio';
import { getQuality, setQuality, type Quality } from '../game/data/settings';
import { exportSave, importSave } from '../game/data/save';

// Panel pengaturan: volume, mute, kualitas partikel.
export function initSettings() {
  const btn = document.getElementById('btn-settings');
  const panel = document.getElementById('settings-panel');
  const vol = document.getElementById('vol-slider') as HTMLInputElement | null;
  const muteBtn = document.getElementById('btn-mute-2');
  const qBtn = document.getElementById('btn-quality');
  if (!btn || !panel) return;

  const paintMute = () => {
    if (muteBtn) muteBtn.textContent = isMuted() ? '🔇 Mute: ON' : '🔊 Mute: OFF';
    const top = document.getElementById('btn-mute');
    if (top) top.textContent = isMuted() ? '🔇' : '🔊';
  };
  const paintQuality = (q: Quality) => {
    if (qBtn) qBtn.textContent = q === 'low' ? '✨ Kualitas: Rendah' : '✨ Kualitas: Tinggi';
  };

  btn.addEventListener('click', () => {
    sfxClick();
    const hidden = panel.classList.contains('hidden');
    ['char-panel', 'bag-panel', 'quest-panel', 'npc-panel'].forEach((id) =>
      document.getElementById(id)?.classList.add('hidden')
    );
    panel.classList.toggle('hidden', !hidden);
    if (vol) vol.value = `${Math.round(getVolume() * 100)}`;
    paintMute();
    paintQuality(getQuality());
  });
  document.getElementById('settings-close')?.addEventListener('click', () => panel.classList.add('hidden'));

  vol?.addEventListener('input', () => {
    setVolume(Number(vol.value) / 100);
    if (Number(vol.value) > 0 && isMuted()) {
      setMuted(false);
      paintMute();
    }
  });
  muteBtn?.addEventListener('click', () => {
    setMuted(!isMuted());
    paintMute();
    if (!isMuted()) sfxClick();
  });
  qBtn?.addEventListener('click', () => {
    const next: Quality = getQuality() === 'low' ? 'high' : 'low';
    setQuality(next);
    paintQuality(next);
    sfxClick();
  });

  const backupText = document.getElementById('backup-text') as HTMLTextAreaElement | null;
  const backupMsg = document.getElementById('backup-msg');
  const sayBackup = (msg: string, ok: boolean) => {
    if (backupMsg) {
      backupMsg.textContent = msg;
      backupMsg.style.color = ok ? '#4ade80' : '#ef4444';
    }
  };
  document.getElementById('btn-export')?.addEventListener('click', () => {
    try {
      if (backupText) {
        backupText.value = JSON.stringify(exportSave());
        backupText.select();
      }
      sayBackup('Disalin ke kolom, simpan baik-baik ✓', true);
      sfxClick();
    } catch {
      sayBackup('Gagal export', false);
    }
  });
  document.getElementById('btn-import')?.addEventListener('click', () => {
    try {
      const res = importSave(JSON.parse(backupText?.value ?? ''));
      if (!res.ok) {
        sayBackup(res.reason ?? 'Gagal import', false);
        return;
      }
      sayBackup('Berhasil, restart... ✓', true);
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      sayBackup('Kode tidak valid', false);
    }
  });

  paintMute();
  paintQuality(getQuality());
}
