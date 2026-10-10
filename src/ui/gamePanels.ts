import { ITEMS, getItem } from '../game/data/items';
import { snapshotQuests } from '../game/data/questState';
import { BOUNTY_REWARD_EXP, BOUNTY_REWARD_GOLD, getBounty } from '../game/data/bounty';
import { snapshotAchievements } from '../game/data/achievements';
import { getCount, removeItem, snapshotInventory } from '../game/data/inventory';
import { getGold } from '../game/data/currency';
import {
  canEquip,
  equipItem,
  getEquippedArmorId,
  getEquippedWeaponId,
  unequipSlot
} from '../game/data/equipment';
import type { JobId } from '../game/data/jobs';

let currentJob: JobId = 'warrior';
let currentLevel = 1;

// Panel manager: hanya 1 panel terbuka (char/bag/quest).
export function initGamePanels() {
  const panels: Record<string, HTMLElement> = {
    char: document.getElementById('char-panel')!,
    bag: document.getElementById('bag-panel')!,
    quest: document.getElementById('quest-panel')!
  };

  window.addEventListener('stats-changed', ((e: CustomEvent<any>) => {
    const nj = e.detail.jobId as JobId;
    const nl = e.detail.level as number;
    // JANGAN render ulang tiap regen HP (event ini tiap 5s).
    // Hanya render ulang kalau job/level berubah, agar tap di HP tidak hilang.
    if (nj !== currentJob || nl !== currentLevel) {
      currentJob = nj;
      currentLevel = nl;
      if (!panels.bag.classList.contains('hidden')) renderBag();
    }
  }) as EventListener);

  // sinkron job walau Player belum ada (select-job datang dari main.ts)
  window.addEventListener('select-job', ((e: CustomEvent<JobId>) => {
    if (e.detail !== currentJob) {
      currentJob = e.detail;
      if (!panels.bag.classList.contains('hidden')) renderBag();
    }
  }) as EventListener);

  function toggle(name: keyof typeof panels) {
    const isHidden = panels[name].classList.contains('hidden');
    Object.values(panels).forEach((p) => p.classList.add('hidden'));
    if (isHidden) {
      panels[name].classList.remove('hidden');
      if (name === 'bag') renderBag();
      if (name === 'quest') renderQuest();
    }
  }

  document.getElementById('btn-char')?.addEventListener('click', () => toggle('char'));
  document.getElementById('btn-bag')?.addEventListener('click', () => toggle('bag'));
  document.getElementById('btn-quest')?.addEventListener('click', () => toggle('quest'));
  document.getElementById('char-close')?.addEventListener('click', () => panels.char.classList.add('hidden'));
  document.getElementById('bag-close')?.addEventListener('click', () => panels.bag.classList.add('hidden'));
  document.getElementById('quest-close')?.addEventListener('click', () => panels.quest.classList.add('hidden'));

  const potionBtn = document.getElementById('potion-btn') as HTMLButtonElement | null;
  potionBtn?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (getCount('potion-s') <= 0) return;
    if (potionBtn.disabled) return;
    // konsumsi terjadi di 'potion-consumed' hanya kalau Player berhasil heal (tidak penuh/cooldown/mati)
    window.dispatchEvent(new CustomEvent('use-potion'));
  });

  window.addEventListener('potion-consumed', () => {
    removeItem('potion-s', 1);
  });
  window.addEventListener('potion-used', ((e: CustomEvent<number>) => {
    const ms = e.detail ?? 5000;
    if (!potionBtn) return;
    potionBtn.disabled = true;
    potionBtn.classList.add('cooling');
    const countEl = document.getElementById('potion-count');
    const prevText = countEl?.textContent;
    let left = Math.ceil(ms / 1000);
    if (countEl) countEl.textContent = `${left}s`;
    const timer = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(timer);
        potionBtn.disabled = false;
        potionBtn.classList.remove('cooling');
        if (countEl) countEl.textContent = `x${getCount('potion-s')}`;
      } else if (countEl) {
        countEl.textContent = `${left}s`;
      }
    }, 1000);
    void prevText;
  }) as EventListener);

  function renderBag() {
    const grid = document.getElementById('bag-grid')!;
    const inv = snapshotInventory();
    const equippedW = getEquippedWeaponId();
    const equippedA = getEquippedArmorId();
    grid.innerHTML = ITEMS.map((it) => {
      const n = inv[it.id] ?? 0;
      if (n === 0) return '';
      const icon = it.type === 'consumable' ? '🧪' : it.type === 'weapon' ? '🗡️' : it.type === 'armor' ? '🛡️' : it.type === 'quest' ? '💎' : '📦';
      let action = '';
      if (it.type === 'weapon' || it.type === 'armor') {
        const equipped = it.slot === 'armor' ? equippedA : equippedW;
        if (equipped === it.id) {
          action = `<button class="bag-btn equipped" data-act="unequip" data-id="${it.id}" data-slot="${it.slot}">Terpasang ✓</button>`;
        } else {
          const check = canEquip(it.id, currentJob, currentLevel);
          action = check.ok
            ? `<button class="bag-btn" data-act="equip" data-id="${it.id}">Equip</button>`
            : `<button class="bag-btn locked" disabled>${check.reason}</button>`;
        }
      }
      const bonus =
        it.type === 'weapon'
          ? `<small>+${it.atk} ${it.weaponKind} ${it.primaryBonus ? JSON.stringify(it.primaryBonus) : ''}</small>`
          : it.type === 'armor'
            ? `<small>+${it.def} Armor ${it.primaryBonus ? JSON.stringify(it.primaryBonus) : ''}</small>`
            : `<small>${it.desc}</small>`;
      return `<div class="bag-slot">
        <div class="bag-icon">${icon}</div>
        <div class="bag-name">${it.name}</div>
        <div class="bag-count">x${n}</div>
        ${bonus}
        ${action}
      </div>`;
    }).join('');
    const potionCount = document.getElementById('potion-count');
    if (potionCount) potionCount.textContent = `x${getCount('potion-s')}`;
    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.textContent = `💰 ${getGold()}`;
  }

  gridClick();
  function gridClick() {
    const grid = document.getElementById('bag-grid')!;
    // pointerdown agar responsif di HP (click sering hilang kalau DOM ke-render ulang).
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      const id = btn.dataset.id!;
      if (btn.dataset.act === 'equip') {
        const res = equipItem(id, currentJob, currentLevel);
        if (!res.ok) showToast(res.reason ?? 'Gagal equip');
        else showToast('Terpasang ✓');
      } else {
        const slot = (btn.dataset.slot as 'weapon' | 'armor') ?? 'weapon';
        unequipSlot(slot);
        showToast('Dilepas');
      }
      renderBag();
    };
    grid.addEventListener('pointerdown', handler);
    // fallback desktop / aksesibilitas
    grid.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
      if (!btn || btn.disabled) return;
      // kalau sudah ditangani pointerdown, click kedua akan toggle balik;
      // cegah double dengan hanya jalan bila pointer bukan touch.
      if ((e as PointerEvent).pointerType === 'touch') return;
      (handler as EventListener)(e);
    });
  }

  function showToast(msg: string) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.getElementById('app')?.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    window.clearTimeout((toast as any)._t);
    (toast as any)._t = window.setTimeout(() => toast!.classList.remove('show'), 1200);
  }

  function renderQuest() {
    const list = document.getElementById('quest-list')!;
    const b = getBounty();
    const bountyHtml = `<div class="quest-item ${b.done ? 'done' : ''}">
          <b>🎯 Bounty Harian: Skeleton Elite</b>
          <p>Kalahkan 1 Skeleton Elite hari ini (reset harian).</p>
          <small>${b.done ? `✅ Selesai • +${BOUNTY_REWARD_GOLD}G +${BOUNTY_REWARD_EXP} EXP` : `⚔️ ${Math.min(b.progress, 1)}/1`}</small>
        </div>`;
    const achHtml = snapshotAchievements()
      .map(
        (a) => `<div class="quest-item ${a.unlocked ? 'done' : 'locked'}">
          <b>${a.unlocked ? '🏆' : '🔒'} ${a.name}</b>
          <p>${a.desc}</p>
          <small>${a.unlocked ? '✅ Selesai' : `+${a.gold}G`}</small>
        </div>`
      )
      .join('');
    list.innerHTML =
      bountyHtml +
      `<div class="char-section"><b>Pencapaian</b></div>${achHtml}` +
      `<div class="char-section"><b>Quest</b></div>` +
      snapshotQuests()
      .map((q) => {
        if (!q.unlocked) {
          return `<div class="quest-item locked">
          <b>🔒 ${q.title}</b>
          <p>${q.desc}</p>
          <small>Terkunci • selesaikan quest sebelumnya</small>
        </div>`;
        }
        const state = q.claimed ? '✅ Selesai (diklaim)' : q.done ? '🎁 Siap klaim di Tetua 🧙' : `⚔️ ${Math.min(q.progress, q.killCount)}/${q.killCount}`;
        return `<div class="quest-item ${q.done ? 'done' : ''}">
          <b>${q.claimed ? '✅' : q.done ? '🎁' : '📜'} ${q.title}</b>
          <p>${q.desc}</p>
          <small>${state} • +${q.rewardExp} EXP${q.rewardItemId ? ' + 🎁' : ''}</small>
        </div>`;
      })
      .join('');
  }

  window.addEventListener('inventory-changed', () => {
    if (!panels.bag.classList.contains('hidden')) renderBag();
    const potionCount = document.getElementById('potion-count');
    if (potionCount) potionCount.textContent = `x${getCount('potion-s')}`;
  });
  window.addEventListener('quest-changed', () => {
    if (!panels.quest.classList.contains('hidden')) renderQuest();
  });
  window.addEventListener('bounty-changed', () => {
    if (!panels.quest.classList.contains('hidden')) renderQuest();
  });
  window.addEventListener('game-stats-changed', () => {
    if (!panels.quest.classList.contains('hidden')) renderQuest();
  });
  window.addEventListener('equipment-changed', () => {
    if (!panels.bag.classList.contains('hidden')) renderBag();
  });
  window.addEventListener('gold-changed', ((e: CustomEvent<number>) => {
    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.textContent = `💰 ${e.detail}`;
  }) as EventListener);

  renderBag();
  const goldInit = document.getElementById('gold');
  if (goldInit) goldInit.textContent = `💰 ${getGold()}`;

  renderBag();
}

export function getBagContext() {
  return { job: currentJob, level: currentLevel };
}
void getItem;
