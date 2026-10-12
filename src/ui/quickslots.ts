import { getItem } from '../game/data/items';
import { getQuickItem, pruneEmptySlots, QUICK_KINDS, labelOf, type QuickSlotIndex } from '../game/data/quickslots';
import { getCount } from '../game/data/inventory';

// 3 tombol quick-slot di toolbar: 1=HP, 2=MP, 3=food buff.
// Item dipasang lewat panel Equipment, dipakai dari tombol ini.
export function initQuickSlots() {
  const btns: HTMLButtonElement[] = [0, 1, 2].map(
    (i) => document.getElementById(`quick-btn-${i}`) as HTMLButtonElement
  );

  // sisa cooldown potion global (ms), dihitung lokal dari event `potion-used`.
  // Deviasi hanya kalau tab di-throttle browser — cukup untuk angka detik.
  let cdLeft = 0;
  let cdTimer = 0;

  btns.forEach((btn, i) => {
    if (!btn) return;
    const idx = i as QuickSlotIndex;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      const id = getQuickItem(idx);
      // slot kosong -> arahkan pemain ke panel Equipment
      if (!id) window.dispatchEvent(new CustomEvent('open-bag-for-slot', { detail: idx }));
      else window.dispatchEvent(new CustomEvent('use-quick', { detail: idx }));
    });
    btn.addEventListener('pointerup', () => btn.classList.remove('pressed'));
    btn.addEventListener('pointercancel', () => btn.classList.remove('pressed'));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  const paint = () => {
    // slot yang itemnya habis / tidak cocok jenis -> kosongkan otomatis,
    // supaya pemain tidak terkunci ke item yang sudah tidak ada.
    pruneEmptySlots();
    btns.forEach((btn, i) => {
      if (!btn) return;
      const idx = i as QuickSlotIndex;
      const kind = QUICK_KINDS[idx];
      const id = getQuickItem(idx);
      const def = id ? getItem(id) : undefined;
      const n = id ? getCount(id) : 0;
      const iconEl = btn.querySelector('.q-icon');
      const countEl = btn.querySelector('.q-count');
      const keyEl = btn.querySelector('.q-key');
      btn.dataset.kind = kind;
      btn.dataset.empty = def ? '0' : '1';
      btn.dataset.running = def && (def.buffAtk || def.buffDef) ? '1' : '0';
      if (keyEl) keyEl.textContent = `${i + 1}`;
      if (iconEl) iconEl.textContent = def?.icon ?? (kind === 'hp' ? '🧪' : kind === 'mp' ? '🔮' : '🍖');
      if (countEl) countEl.textContent = def ? `x${n}` : '';
      btn.setAttribute(
        'aria-label',
        def ? `${def.name} x${n}` : `Slot ${i + 1} ${labelOf(kind)} kosong`
      );
      btn.title = def
        ? `${def.name} ×${n}\n${def.desc}\nKetuk untuk pakai`
        : `Slot ${i + 1} (${labelOf(kind)}) kosong — buka Equipment untuk memasang`;
      paintCd(btn, cdLeft, def?.quick === 'hp' || def?.quick === 'mp');
    });
  };

  const paintCd = (btn: HTMLButtonElement, left: number, isPotion: boolean) => {
    const cdEl = btn.querySelector('.q-cd');
    if (!cdEl) return;
    const on = isPotion && left > 0;
    cdEl.textContent = on ? `${Math.ceil(left / 1000)}s` : '';
    cdEl.classList.toggle('show', on);
    btn.classList.toggle('cooling', on);
  };

  const startCd = (ms: number) => {
    cdLeft = ms;
    window.clearTimeout(cdTimer);
    const tick = () => {
      cdLeft -= 250;
      if (cdLeft > 0) {
        btns.forEach((btn, i) => {
          if (!btn) return;
          const id = getQuickItem(i as QuickSlotIndex);
          const def = id ? getItem(id) : undefined;
          paintCd(btn, cdLeft, def?.quick === 'hp' || def?.quick === 'mp');
        });
        cdTimer = window.setTimeout(tick, 250);
      } else {
        cdLeft = 0;
        paint();
      }
    };
    cdTimer = window.setTimeout(tick, 250);
  };

  window.addEventListener('inventory-changed', paint);
  window.addEventListener('quickslots-changed', paint);
  window.addEventListener('player-respawned', paint);
  window.addEventListener('potion-used', ((e: CustomEvent<number>) => startCd(e.detail ?? 5000)) as EventListener);

  paint();
}