import { getVolume, isMuted, setMuted, setVolume, sfxClick } from '../game/audio';
import { getQuality, setQuality, type Quality } from '../game/data/settings';
import {
  MAX_SLOTS,
  deleteSlot,
  exportSave,
  importSave,
  loadSlot,
  saveSlot,
  slotInfo
} from '../game/data/save';

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

  // ===== Batch D: slot save (2x klik = konfirmasi) =====
  const slotList = document.getElementById('slot-list');
  let armedKey: string | null = null;
  let armedTimer = 0;
  const arm = (key: string, btn: HTMLButtonElement, label: string): boolean => {
    if (armedKey !== key) {
      armedKey = key;
      btn.textContent = label;
      window.clearTimeout(armedTimer);
      armedTimer = window.setTimeout(() => {
        armedKey = null;
        renderSlots();
      }, 3000);
      return false;
    }
    window.clearTimeout(armedTimer);
    armedKey = null;
    return true;
  };

  function renderSlots() {
    if (!slotList) return;
    slotList.innerHTML = '';
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const info = slotInfo(i);
      const row = document.createElement('div');
      row.className = 'slot-row';
      const label = info.empty
        ? `Slot ${i} — kosong`
        : `Slot ${i} — ${info.job.toUpperCase()} Lv.${info.level} • 💰${info.gold} • ⚔️${info.kill} • ${new Date(info.savedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
      const name = document.createElement('div');
      name.className = 'slot-name';
      name.textContent = label;
      row.appendChild(name);
      const btns = document.createElement('div');
      btns.className = 'slot-btns';
      const bSave = document.createElement('button');
      bSave.className = 'bag-btn';
      bSave.textContent = '💾 Simpan';
      bSave.addEventListener('click', () => {
        if (!info.empty && !arm(`save${i}`, bSave, 'Timpa? Klik lagi!')) return;
        const res = saveSlot(i);
        sayBackup(res.ok ? `Slot ${i} tersimpan ✓` : (res.reason ?? 'Gagal simpan'), res.ok);
        sfxClick();
        renderSlots();
      });
      const bLoad = document.createElement('button');
      bLoad.className = 'bag-btn';
      bLoad.textContent = '📥 Muat';
      bLoad.disabled = info.empty;
      bLoad.addEventListener('click', () => {
        if (!arm(`load${i}`, bLoad, 'Timpa progres? Klik lagi!')) return;
        const res = loadSlot(i);
        if (!res.ok) {
          sayBackup(res.reason ?? 'Gagal muat', false);
          renderSlots();
          return;
        }
        sayBackup(`Slot ${i} dimuat, restart... ✓`, true);
        window.setTimeout(() => window.location.reload(), 800);
      });
      const bDel = document.createElement('button');
      bDel.className = 'bag-btn';
      bDel.textContent = '🗑️';
      bDel.disabled = info.empty;
      bDel.title = 'Hapus slot';
      bDel.addEventListener('click', () => {
        if (!arm(`del${i}`, bDel, 'Hapus? Klik lagi!')) return;
        deleteSlot(i);
        sayBackup(`Slot ${i} dihapus`, true);
        sfxClick();
        renderSlots();
      });
      btns.append(bSave, bLoad, bDel);
      row.appendChild(btns);
      slotList.appendChild(row);
    }
  }

  document.getElementById('btn-reset-map')?.addEventListener('click', () => {
    sfxClick();
    document.getElementById('settings-panel')?.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('reset-map'));
  });

  // segarkan daftar tiap panel dibuka (tombol ⚙️ di bawah juga render ulang)
  const settingsBtn = document.getElementById('btn-settings');
  const renderOnOpen = () => renderSlots();
  settingsBtn?.addEventListener('click', renderOnOpen);
  renderSlots();

  paintMute();
  paintQuality(getQuality());
}
