import { getItem } from '../game/data/items';
import type { StatsSnapshot } from '../game/entities/Player';

// Bar buff makanan tepat di bawah status bar player.
//
// Sumber kebenaran = StatsSnapshot.activeBuffs (dikirim tiap `stats-changed`).
// Event itu hanya datang tiap ~5 detik (regen), jadi durasi dihitung lokal
// dengan tick 250ms: chip menyimpan `endsAt` (timestamp saat buff habis).
// Setiap snapshot baru, `endsAt` di-reset ke nilai server -> tidak melenceng.
// Chip dihapus begitu left <= 0, jadi responsif dan tidak bergantung event.
export function initBuffBar() {
  const bar = document.getElementById('buff-bar');
  if (!bar) return;

  interface Chip {
    el: HTMLElement;
    fill: HTMLElement;
    time: HTMLElement;
    /** epoch ms saat buff habis */
    endsAt: number;
    /** durasi penuh (ms) untuk lebar bar */
    total: number;
  }
  const chips = new Map<string, Chip>();

  const clearAll = () => {
    chips.clear();
    bar.innerHTML = '';
    bar.classList.add('hidden');
  };

  const fmt = (ms: number) => {
    const secs = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const render = () => {
    const now = Date.now();
    let alive = 0;
    chips.forEach((chip, name) => {
      const left = chip.endsAt - now;
      if (left <= 0) {
        chip.el.remove();
        chips.delete(name);
        return;
      }
      alive++;
      chip.time.textContent = fmt(left);
      const pct = chip.total > 0 ? Math.max(0, Math.min(100, (left / chip.total) * 100)) : 0;
      chip.fill.style.width = `${pct}%`;
      // kedip saat < 5 detik tersisa
      chip.el.classList.toggle('near', left <= 5000);
    });
    if (alive === 0) clearAll();
  };

  const sync = (buffs: StatsSnapshot['activeBuffs'] | undefined) => {
    const list = buffs ?? [];
    if (list.length === 0) {
      // baru saja habis -> bersihkan (tunggu tick kalau masih ada sisa)
      let anyLeft = false;
      chips.forEach((c) => {
        if (c.endsAt - Date.now() > 0) anyLeft = true;
      });
      if (!anyLeft) clearAll();
      return;
    }

    chips.forEach((chip, key) => {
      if (!list.some((b) => b.name === key)) {
        chip.el.remove();
        chips.delete(key);
      }
    });

    list.forEach((b) => {
      const leftMs = Math.max(0, b.left * 1000);
      let chip = chips.get(b.name);
      if (!chip) {
        const el = document.createElement('div');
        el.className = `buff-chip${b.name === 'Herbal Tonic' ? ' def' : ''}`;
        el.innerHTML =
          `<span class="b-ico">${b.icon}</span>` +
          `<span class="b-name"></span>` +
          `<span class="b-val">+${b.value}</span>` +
          `<span class="b-time">0:00</span>` +
          `<span class="b-fill"></span>`;
        (el.querySelector('.b-name') as HTMLElement).textContent = b.name;
        bar.appendChild(el);
        // durasi penuh dari def item (lebih akurat daripada sisa pertama)
        const def = getItem(b.id);
        const total = def?.durMs ?? leftMs;
        chip = {
          el,
          fill: el.querySelector('.b-fill') as HTMLElement,
          time: el.querySelector('.b-time') as HTMLElement,
          endsAt: Date.now() + leftMs,
          total: Math.max(total, leftMs)
        };
        chips.set(b.name, chip);
      } else {
        chip.endsAt = Date.now() + leftMs;
      }
    });
    bar.classList.remove('hidden');
    render();
  };

  window.addEventListener(
    'stats-changed',
    ((e: CustomEvent<StatsSnapshot>) => sync(e.detail?.activeBuffs)) as EventListener
  );

  window.setInterval(render, 250);

  // chip dibuat tepat setelah pakai -> stats-changed menyusul, tapi tampilkan
  // segera agar tidak ada jeda 1 frame pada tombol.
  window.addEventListener(
    'buff-used',
    ((e: CustomEvent<string>) => {
      const def = getItem(e.detail);
      if (!def) return;
      const name = def.name;
      if (chips.has(name)) return;
      const el = document.createElement('div');
      el.className = `buff-chip${name === 'Herbal Tonic' ? ' def' : ''}`;
      const value = def.buffAtk ?? def.buffDef ?? 0;
      el.innerHTML =
        `<span class="b-ico">${def.icon ?? '🍖'}</span>` +
        `<span class="b-name"></span>` +
        `<span class="b-val">+${value}</span>` +
        `<span class="b-time">0:00</span>` +
        `<span class="b-fill"></span>`;
      (el.querySelector('.b-name') as HTMLElement).textContent = name;
      bar.appendChild(el);
      chips.set(name, {
        el,
        fill: el.querySelector('.b-fill') as HTMLElement,
        time: el.querySelector('.b-time') as HTMLElement,
        endsAt: Date.now() + (def.durMs ?? 30000),
        total: def.durMs ?? 30000
      });
      bar.classList.remove('hidden');
      render();
    }) as EventListener
  );
}