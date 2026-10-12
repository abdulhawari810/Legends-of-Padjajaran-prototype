import { ITEMS, getItem, type ItemDef } from '../game/data/items';
import { achievementHtml, bindQuestList, bountyHtml, bountyResetMs, questListHtml } from './questList';
import { getCount, removeItem, snapshotInventory } from '../game/data/inventory';
import { getGold } from '../game/data/currency';
import {
  canEquip,
  equipItem,
  getEquippedArmorId,
  getEquippedWeaponId,
  unequipSlot
} from '../game/data/equipment';
import { getEnhance } from '../game/data/enhance';
import { loadMeta } from '../game/data/save';
import { fitsQuickSlot, type QuickKind } from '../game/data/items';
import {
  QUICK_KINDS,
  getQuickItem,
  labelOf,
  setQuickItem,
  type QuickSlotIndex
} from '../game/data/quickslots';
import type { JobId } from '../game/data/jobs';
import type { StatsSnapshot } from '../game/entities/Player';
import { refreshCharPanel } from './charPanel';

let currentJob: JobId = 'warrior';
let currentLevel = 1;

/** Snapshot stats terakhir (untuk render kolom kiri panel equipment).
    Event `stats-changed` datang tiap 5 detik (regen) -> jangan render ulang
    seluruh grid, cukup kolom kiri yang murah. */
let lastStats: StatsSnapshot | null = null;

/** buff makanan aktif (dipakai kolom kiri panel Equipment). */
let bagBuffRows: Array<{ icon: string; name: string; value: number; left: number }> = [];

// ===== Panel Equipment (gabungan karakter + tas) =====
const BAG_TABS = [
  { id: 'all', label: 'ALL', icon: '' },
  { id: 'consumable', label: '', icon: '🧪' },
  { id: 'weapon', label: '', icon: '🗡️' },
  { id: 'armor', label: '', icon: '🛡️' },
  { id: 'material', label: '', icon: '📦' },
  { id: 'quest', label: '', icon: '💎' }
] as const;

type BagFilter = (typeof BAG_TABS)[number]['id'];
let bagFilter: BagFilter = 'all';
let bagSelected: string | null = null;
/** Slot quick yang sedang jadi target pasang (klik slot -> pilih item -> pasang).
    null = tidak ada; -1 = mode lepas semua. */
let bagQuickTarget: QuickSlotIndex | null = null;

// nilai acuan bar vital (rasio ke nilai -> lebar bar)
const VITAL_REF = { hp: 500, atk: 120, def: 100, mag: 70, mpr: 70 };

function vitalPct(v: number, ref: number) {
  return Math.max(0, Math.min(100, (v / ref) * 100));
}

function pctText(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function gearIconOf(type: string) {
  return type === 'consumable' ? '🧪' : type === 'weapon' ? '🗡️' : type === 'armor' ? '🛡️' : type === 'quest' ? '💎' : '📦';
}

/** Alasan equipment tidak bisa dipakai job ini, atau null bila bisa.
    Dipakai untuk border merah + tooltip + toast saat Equip ditekan. */
function equipLockOf(it: ItemDef): string | null {
  if (it.type !== 'weapon' && it.type !== 'armor') return null;
  const check = canEquip(it.id, currentJob, currentLevel);
  return check.ok ? null : check.reason ?? 'Tidak bisa dipakai';
}

/** Indeks quick-slot untuk jenis item (hp/mp/food). */
function slotIndexOf(kind: QuickKind): QuickSlotIndex | null {
  const i = QUICK_KINDS.indexOf(kind);
  return i < 0 ? null : (i as QuickSlotIndex);
}

function bonusTextOf(it: NonNullable<ReturnType<typeof getItem>>): string {
  const pb = it.primaryBonus;
  const pbTxt = pb
    ? Object.entries(pb)
        .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
        .join(' ')
    : '';
  if (it.type === 'weapon') return `+${it.atk} ${it.weaponKind}${pbTxt ? ' • ' + pbTxt : ''}`;
  if (it.type === 'armor') return `+${it.def} Armor${pbTxt ? ' • ' + pbTxt : ''}`;
  return it.desc;
}

// Panel manager: hanya 1 panel terbuka (char/bag/quest).
export function initGamePanels() {
  const panels: Record<string, HTMLElement> = {
    char: document.getElementById('char-panel')!,
    bag: document.getElementById('bag-panel')!,
    quest: document.getElementById('quest-panel')!
  };

  window.addEventListener('stats-changed', ((e: CustomEvent<StatsSnapshot>) => {
    const s = e.detail;
    lastStats = s;
    const nj = s.jobId as JobId;
    const nl = s.level as number;
    // JANGAN render ulang grid tiap regen HP (event ini tiap 5s) -> kolom
    // kiri saja yang di-refresh (murah, tidak menyentuh grid).
    // Grid hanya di-render ulang kalau job/level berubah.
    if (!panels.bag.classList.contains('hidden')) renderBagLeft(s);
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

  // Job permanen: init dari save supaya border merah/equip check benar
  // SEBELUM stats-changed pertama tiba.
  try {
    const meta = loadMeta();
    if (meta.currentJob === 'warrior' || meta.currentJob === 'mage' || meta.currentJob === 'archer') {
      currentJob = meta.currentJob;
    }
  } catch {
    // abaikan save korup
  }

  function toggle(name: keyof typeof panels) {
    const isHidden = panels[name].classList.contains('hidden');
    Object.values(panels).forEach((p) => p.classList.add('hidden'));
    if (isHidden) {
      panels[name].classList.remove('hidden');
      if (name === 'bag') renderBag();
      if (name === 'quest') renderQuest();
    }
  }

  // Panel karakter -> buka Equipment dengan filter tertentu.
  window.addEventListener('open-bag-with-filter', ((e: CustomEvent<string>) => {
    const f = e.detail ?? 'all';
    if (f === 'all' || BAG_TABS.some((t) => t.id === f)) {
      bagFilter = f as BagFilter;
      bagQuickTarget = null;
      bagSelected = null;
    }
    toggle('bag');
  }) as EventListener);

  // Slot kosong di toolbar HUD diketuk -> buka panel Equipment, slot itu jadi
  // target pasang + langsung pindah ke tab consumable.
  window.addEventListener('open-bag-for-slot', ((e: CustomEvent<number>) => {
    bagQuickTarget = (e.detail ?? 0) as QuickSlotIndex;
    bagSelected = null;
    bagFilter = 'consumable';
    toggle('bag');
  }) as EventListener);

  window.addEventListener('quickslots-changed', () => {
    if (!panels.bag.classList.contains('hidden')) renderBagRight();
  });

  document.getElementById('btn-char')?.addEventListener('click', () => {
    toggle('char');
    // stats-changed datang tiap 5 dtk -> render seketika biar panel tidak basi
    if (!panels.char.classList.contains('hidden')) refreshCharPanel();
  });
  document.getElementById('btn-bag')?.addEventListener('click', () => toggle('bag'));
  document.getElementById('btn-quest')?.addEventListener('click', () => toggle('quest'));
  document.getElementById('char-close')?.addEventListener('click', () => panels.char.classList.add('hidden'));
  document.getElementById('bag-close')?.addEventListener('click', () => panels.bag.classList.add('hidden'));
  document.getElementById('quest-close')?.addEventListener('click', () => panels.quest.classList.add('hidden'));

  // Konsumsi quick-slot: Player hanya dispatch 'quick-item-used' kalau efeknya
  // benar-benar jalan (HP/MP belum penuh, cooldown habis, buff belum aktif,
  // tidak mati). Detail membawa id item yang benar-benar terpakai.
  window.addEventListener('quick-item-used', ((e: CustomEvent<{ id: string; kind: string }>) => {
    removeItem(e.detail.id, 1);
  }) as EventListener);

  function renderBag() {
    renderBagLeft();
    renderBagRight();
    const goldEl = document.getElementById('gold');
    if (goldEl) goldEl.textContent = `${getGold()}`;
  }

  // ===== kolom kiri: avatar + nama + level/XP + gear slot + vital =====

  function renderBagLeft(snap?: StatsSnapshot) {
    const s = snap ?? lastStats;
    const nameEl = document.getElementById('bag-char-name');
    const lvEl = document.getElementById('bag-lv');
    const fillEl = document.getElementById('bag-lv-fill');
    const pctEl = document.getElementById('bag-lv-pct');
    const doll = document.getElementById('bag-doll-img') as HTMLImageElement | null;

    if (!s) return;
    if (nameEl) nameEl.textContent = s.jobId.toUpperCase();
    if (lvEl) lvEl.textContent = `${s.level}`;
    const expPct = Math.max(0, Math.min(1, s.exp / s.expNext));
    if (fillEl) fillEl.style.width = `${expPct * 100}%`;
    if (pctEl) pctEl.textContent = pctText(expPct);
    // avatar: sheet player yang sama dengan sprite in-game
    if (doll && doll.dataset.job !== s.jobId) {
      doll.dataset.job = s.jobId;
      doll.src = 'sprites/player/player_idle-front-01.png';
    }

    // --- gear slots ---
    const w = getEquippedWeaponId() ? getItem(getEquippedWeaponId()!) : undefined;
    const a = getEquippedArmorId() ? getItem(getEquippedArmorId()!) : undefined;
    const wLv = getEnhance('weapon');
    const aLv = getEnhance('armor');
    const gLeft = document.getElementById('bag-gear-left');
    const gRight = document.getElementById('bag-gear-right');
    if (gLeft) {
      gLeft.innerHTML = w
        ? `<button class="bag-gear-slot filled" data-gslot="weapon" title="Lepas ${w.name}">
             ${gearIconOf(w.type)}<span class="gear-plus">+${wLv}</span>
             <span class="gear-hint">${w.name} +${wLv}</span>
           </button>`
        : `<div class="bag-gear-slot empty" title="Slot senjata kosong">⚔️<span class="gear-hint">Slot senjata kosong</span></div>`;
    }
    if (gRight) {
      gRight.innerHTML = a
        ? `<button class="bag-gear-slot filled" data-gslot="armor" title="Lepas ${a.name}">
             ${gearIconOf(a.type)}<span class="gear-plus">+${aLv}</span>
             <span class="gear-hint">${a.name} +${aLv}</span>
           </button>`
        : `<div class="bag-gear-slot empty" title="Slot armor kosong">🛡️<span class="gear-hint">Slot armor kosong</span></div>`;
    }

    // buff makanan yang sedang aktif — kolom kiri (dari StatsSnapshot)
    const d = s.derived;
    bagBuffRows = s.activeBuffs ?? [];
    const barsEl = document.getElementById('bag-vital-bars');
    if (barsEl) {
      const rows: Array<[string, string, string, number, number]> = [
        ['hp', '❤️', 'HP', d.maxHp, VITAL_REF.hp],
        ['atk', '⚔️', 'Attack', d.pAtk + d.rAtk + d.mAtk, VITAL_REF.atk],
        ['def', '🛡️', 'Defense', d.armor, VITAL_REF.def],
        ['mag', '🔮', 'Magic', d.magicRes, VITAL_REF.mag],
        ['mpr', '💧', 'MP', d.maxMp, VITAL_REF.mpr]
      ];
      barsEl.innerHTML = rows
        .map(
          ([cls, ico, label, val, ref]) =>
            `<div class="vital-row ${cls}">
               <span class="v-ico">${ico}</span>
               <span class="v-label">${label}</span>
               <span class="v-num">${val}</span>
               <span class="vital-bar"><i style="width:${vitalPct(val, ref)}%"></i></span>
             </div>`
        )
        .join('');
    }
    const listEl = document.getElementById('bag-vital-list');
    if (listEl) {
      const rows: Array<[string, string]> = [
        ['🎯 P.Atk', `${d.pAtk}`],
        ['🏹 R.Atk', `${d.rAtk}`],
        ['✨ Heal', `${d.heal}`],
        ['Critical', `${pctText(d.critRate)} x${d.critDmg.toFixed(2)}`],
        ['Dodge', pctText(d.dodge)],
        ['Block', `${pctText(d.blockChance)}`],
        ['Haste', pctText(d.hastePct)],
        ['Lifesteal', pctText(d.lifesteal)],
        ['Tenacity', pctText(d.tenacity)],
        ['HPRegen', `${d.hpRegen.toFixed(1)}/5s`],
        ['MPRegen', `${d.mpRegen.toFixed(1)}/5s`],
        ['Move', `+${pctText(d.moveSpeedBonus)}`]
      ];
      // buff makanan aktif ditampilkan di paling atas
      const buffHtml = bagBuffRows
        .map(
          (b) =>
            `<div class="stat buff-row"><span>${b.icon} ${b.name}</span><b class="bonus">+${b.value} • ${b.left}s</b></div>`
        )
        .join('');
      listEl.innerHTML = buffHtml + rows.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    }
  }

  // ===== toolbar quick-slot di panel Equipment (pasang / lepas) =====

  function renderBagQuickbar() {
    const bar = document.getElementById('bag-quickbar');
    if (!bar) return;
    bar.innerHTML = QUICK_KINDS.map((kind, i) => {
      const idx = i as 0 | 1 | 2;
      const id = getQuickItem(idx);
      const def = id ? getItem(id) : undefined;
      const n = id ? getCount(id) : 0;
      const cls = `bag-qslot kind-${kind}${def ? ' filled' : ''}${bagQuickTarget === idx ? ' target' : ''}`;
      return `<button class="${cls}" data-qslot="${i}" title="${
        def ? `${def.name} — ketuk untuk lepas` : `Slot ${i + 1} (${labelOf(kind)}) kosong`
      }">
          <span class="bq-key">${i + 1}</span>
          <span class="bq-icon">${def?.icon ?? (kind === 'hp' ? '🧪' : kind === 'mp' ? '🔮' : '🍖')}</span>
          <span class="bq-label">${labelOf(kind)}</span>
          ${def ? `<span class="bq-count">x${n}</span>` : '<span class="bq-empty">—</span>'}
        </button>`;
    }).join('');
  }

  // ===== kolom kanan: filter tabs + grid =====

  function renderBagRight() {
    renderBagQuickbar();
    const tabsEl = document.getElementById('bag-tabs');
    if (tabsEl) {
      tabsEl.innerHTML = BAG_TABS.map(
        (t) =>
          `<button class="bag-tab ${t.id === bagFilter ? 'active' : ''}" data-tab="${t.id}">${
            t.icon ? t.icon : t.label
          }</button>`
      ).join('');
    }

    const grid = document.getElementById('bag-grid');
    if (!grid) return;
    const inv = snapshotInventory();
    const equippedW = getEquippedWeaponId();
    const equippedA = getEquippedArmorId();

    const cells: string[] = [];
    ITEMS.forEach((it) => {
      const n = inv[it.id] ?? 0;
      if (n === 0) return;
      if (bagFilter !== 'all' && it.type !== bagFilter) return;
      const equipped = it.type === 'weapon' ? equippedW === it.id : it.type === 'armor' ? equippedA === it.id : false;
      const lock = equipLockOf(it);
      cells.push(
        `<div class="bag-slot${equipped ? ' equipped' : ''}${bagSelected === it.id ? ' selected' : ''}${
          lock ? ' job-locked' : ''
        }" data-id="${it.id}" data-rarity="${it.type}"${lock ? ' data-locked="1" title="' + lock + '"' : ''}>
           <span class="bag-icon">${gearIconOf(it.type)}</span>
           ${n > 1 ? `<span class="bag-n">${n}</span>` : ''}
           ${lock ? '<span class="bag-lock">🔒</span>' : ''}
         </div>`
      );
    });
    // cell kosong agar grid tetap persegi di panel lebar
    if (cells.length === 0) {
      cells.push('<div class="bag-slot empty"><span class="bag-icon">📭</span></div>');
    }
    grid.innerHTML = cells.join('');

    renderBagDetail();
  }

  function renderBagDetail() {
    const nameEl = document.getElementById('bag-detail-name');
    const descEl = document.getElementById('bag-detail-desc');
    const useBtn = document.getElementById('bag-use-btn') as HTMLButtonElement | null;
    const unBtn = document.getElementById('bag-unequip-btn') as HTMLButtonElement | null;
    const it = bagSelected ? getItem(bagSelected) : undefined;
    if (!it) {
      if (nameEl) nameEl.textContent = '—';
      if (descEl) {
        descEl.textContent = bagQuickTarget !== null
          ? `Pilih item ${labelOf(QUICK_KINDS[bagQuickTarget])} untuk dipasang ke Slot ${bagQuickTarget + 1}.`
          : 'Pilih item untuk melihat detail.';
      }
      if (useBtn) {
        useBtn.textContent = 'Pakai';
        useBtn.disabled = true;
        useBtn.dataset.act = 'use';
        useBtn.classList.remove('locked');
        delete useBtn.dataset.lock;
      }
      if (unBtn) unBtn.disabled = true;
      return;
    }
    const equipped = it.type === 'weapon' ? getEquippedWeaponId() === it.id : it.type === 'armor' ? getEquippedArmorId() === it.id : false;
    const lock = equipLockOf(it);
    const inSlot = it.quick ? getQuickItem(it.quick === 'hp' ? 0 : it.quick === 'mp' ? 1 : 2) === it.id : false;
    if (nameEl) nameEl.textContent = `${gearIconOf(it.type)} ${it.name} ×${getCount(it.id)}`;
    if (descEl) {
      const bonus = it.type === 'weapon' || it.type === 'armor' ? ' — ' + bonusTextOf(it) : '';
      if (bagQuickTarget !== null) {
        const fits = it.quick ? fitsQuickSlot(it.id, QUICK_KINDS[bagQuickTarget]) : false;
        descEl.textContent = fits
          ? `Ketuk "Pasang" untuk masukkan ke Slot ${bagQuickTarget + 1} (${labelOf(QUICK_KINDS[bagQuickTarget])}).`
          : `⛔ Bukan item slot ${labelOf(QUICK_KINDS[bagQuickTarget])} — ${it.desc}${bonus}`;
      } else {
        descEl.textContent = lock ? `⛔ ${lock} — ${it.desc}${bonus}` : `${it.desc}${bonus}`;
      }
    }

    if (useBtn) {
      if (it.type === 'weapon' || it.type === 'armor') {
        useBtn.dataset.act = 'equip';
        // Item terkunci tetap bisa diklik -> muncul toast alasannya (lebih informatif
        // daripada tombol mati). Hanya "sudah terpasang" yang benar-benar nonaktif.
        useBtn.textContent = equipped ? 'Terpasang' : 'Equip';
        useBtn.disabled = equipped;
        useBtn.classList.toggle('locked', !!lock && !equipped);
        useBtn.title = lock ?? '';
        if (lock) useBtn.dataset.lock = lock;
        else delete useBtn.dataset.lock;
      } else if (it.type === 'consumable' && it.quick) {
        // mode pasang: item terpilih + slot jadi target
        useBtn.dataset.act = 'mount';
        if (bagQuickTarget !== null) {
          const fits = fitsQuickSlot(it.id, QUICK_KINDS[bagQuickTarget]);
          useBtn.textContent = `Slot ${bagQuickTarget + 1}`;
          useBtn.disabled = !fits || inSlot;
          useBtn.classList.toggle('locked', !fits);
        } else {
          useBtn.textContent = inSlot ? 'Terpasang' : 'Pasang';
          useBtn.disabled = inSlot;
          useBtn.classList.remove('locked');
        }
        useBtn.title = '';
        delete useBtn.dataset.lock;
      } else {
        useBtn.dataset.act = 'use';
        useBtn.textContent = 'Buang 1';
        useBtn.disabled = getCount(it.id) <= 0;
        useBtn.classList.remove('locked');
        delete useBtn.dataset.lock;
      }
    }
    if (unBtn) {
      if (it.type === 'consumable' && inSlot) {
        unBtn.disabled = false;
      } else {
        unBtn.disabled = !equipped;
      }
    }
  }

  // ===== klik: gear slot (lepas), filter tab, sel slot, aksi =====
  bindBagPanel();

  function bindBagPanel() {
    const panel = document.getElementById('bag-panel');
    if (!panel) return;

    // pointerdown = responsif di HP; click = fallback untuk keyboard/assistive tech.
    // CATATAN: preventDefault() pada pointerdown TIDAK membatalkan event click,
    // jadi tanpa guard di bawah tiap tap mouse jalankan handler DUA KALI -> slot
    // langsung toggle balik (terpilih lalu batal) dan terasa tidak berfungsi.
    let lastFire = 0;
    const act = (fn: (e: Event) => void) => {
      const once = (e: Event) => {
        const now = e.timeStamp || performance.now();
        // abaikan click pasangan dari pointerdown (cegah dobel). Pakai flag+time,
        // bukan timer murni, supaya dua tap sah beruntun tetap diproses.
        if (e.type === 'click' && lastFire !== 0 && now - lastFire <= 500) return;
        lastFire = e.type === 'click' ? 0 : now;
        (fn as EventListener)(e);
      };
      panel.addEventListener('pointerdown', once as EventListener);
      panel.addEventListener('click', (e) => {
        // touch sudah ditangani pointerdown
        if ((e as PointerEvent).pointerType === 'touch') return;
        once(e);
      });
    };

    act((e) => {
      const target = e.target as HTMLElement;

      // 1. gear slot -> lepas
      const gslot = target.closest<HTMLButtonElement>('button[data-gslot]');
      if (gslot && !gslot.disabled) {
        e.preventDefault();
        const slot = gslot.dataset.gslot as 'weapon' | 'armor';
        unequipSlot(slot);
        showToast('Dilepas');
        renderBag();
        return;
      }

      // 2. filter tab
      const tab = target.closest<HTMLButtonElement>('.bag-tab');
      if (tab) {
        e.preventDefault();
        bagFilter = tab.dataset.tab as BagFilter;
        bagSelected = null;
        renderBagRight();
        return;
      }

      // 3. quick-slot di toolbar panel: klik -> jadi target pasang / lepas
      const qslot = target.closest<HTMLButtonElement>('.bag-qslot');
      if (qslot) {
        e.preventDefault();
        const idx = Number(qslot.dataset.qslot) as QuickSlotIndex;
        const mounted = getQuickItem(idx);
        if (mounted) {
          // sudah berisi -> lepas
          setQuickItem(idx, null);
          showToast(`Slot ${idx + 1} dikosongkan`);
          if (bagQuickTarget === idx) bagQuickTarget = null;
          bagSelected = null;
          renderBagRight();
        } else {
          // kosong -> jadi target, main tab ke consumable supaya item kelihatan
          bagQuickTarget = bagQuickTarget === idx ? null : idx;
          bagSelected = null;
          if (bagQuickTarget !== null && bagFilter !== 'all' && bagFilter !== 'consumable') {
            bagFilter = 'consumable';
          }
          renderBagRight();
        }
        return;
      }

      // 4. pilih slot grid (ketuk lagi -> batal pilih)
      const slot = target.closest<HTMLElement>('.bag-slot[data-id]');
      if (slot) {
        e.preventDefault();
        const id = slot.dataset.id!;
        bagSelected = bagSelected === id ? null : id;
        renderBagRight();
        return;
      }

      // 5. tombol aksi Equip / Lepas / Pasang / Buang
      const btn = target.closest<HTMLButtonElement>('button[data-act]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      const kind = btn.dataset.act;
      if (kind === 'equip' && bagSelected) {
        const def = getItem(bagSelected);
        // cek dulu supaya toast menyebut alasannya dengan jelas (Equip tidak
        // dikunci disabled supaya pemain tetap bisa tanya "kenapa tidak bisa?").
        const lock = def ? equipLockOf(def) : null;
        if (lock) {
          showToast(`⛔ ${lock}`, true);
          return;
        }
        const res = equipItem(bagSelected, currentJob, currentLevel);
        if (!res.ok) showToast(`⛔ ${res.reason ?? 'Gagal equip'}`, true);
        else showToast('Terpasang ✓');
        renderBag();
      } else if (kind === 'mount' && bagSelected) {
        // pasang ke quick-slot (mode target) atau ke slot default item
        const def = getItem(bagSelected);
        const target = bagQuickTarget ?? (def?.quick ? slotIndexOf(def.quick) : null);
        if (!def?.quick || target === null) {
          showToast('⛔ Item ini tidak bisa dipasang ke slot', true);
          return;
        }
        const res = setQuickItem(target, bagSelected);
        if (!res.ok) {
          showToast(`⛔ ${res.reason ?? 'Gagal pasang'}`, true);
          return;
        }
        showToast(`Masuk Slot ${target + 1} ✓`);
        bagQuickTarget = null;
        bagSelected = null;
        renderBagRight();
      } else if (kind === 'unequip') {
        const id = bagSelected;
        const def = id ? getItem(id) : undefined;
        // consumable -> lepas dari quick-slot; equipment -> lepas slot gear
        if (def?.quick) {
          const idx = slotIndexOf(def.quick);
          if (idx !== null) setQuickItem(idx, null);
          showToast('Dilepas dari slot');
          renderBagRight();
        } else {
          const slotName = def?.slot;
          if (slotName) unequipSlot(slotName);
          showToast('Dilepas');
          renderBag();
        }
      } else if (kind === 'use' && bagSelected) {
        if (removeItem(bagSelected, 1)) {
          showToast('Dibuang 1');
          if (getCount(bagSelected) <= 0) bagSelected = null;
          renderBag();
        }
      }
    });
  }

  function showToast(msg: string, bad = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.getElementById('app')?.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.toggle('bad', bad);
    toast.classList.add('show');
    window.clearTimeout((toast as any)._t);
    // pesan error dibaca lebih lama
    (toast as any)._t = window.setTimeout(() => toast!.classList.remove('show'), bad ? 2200 : 1200);
  }

  function renderQuest() {
    const list = document.getElementById('quest-list')!;
    // scroll harus dijaga: quest-changed bisa datang beberapa kali beruntun
    // (kill -> progress -> selesai); tanpa ini posisi baca user meloncat ke atas.
    const top = list.scrollTop;
    list.innerHTML = bountyHtml() + questListHtml() + achievementHtml();
    if (top > 0) list.scrollTop = top;
    bindQuestList(list);
  }

  // Countdown reset bounty di header list quest.
  window.setInterval(() => {
    const el = document.getElementById('ql-countdown');
    if (!el) return;
    const t = Math.floor(bountyResetMs() / 1000);
    el.textContent =
      `${String(Math.floor(t / 3600)).padStart(2, '0')}:` +
      `${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:` +
      `${String(t % 60).padStart(2, '0')}`;
  }, 1000);
window.addEventListener('inventory-changed', () => {
    if (!panels.bag.classList.contains('hidden')) renderBagRight();
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
    if (goldEl) goldEl.textContent = `${e.detail}`;
  }) as EventListener);

  const goldInit = document.getElementById('gold');
  if (goldInit) goldInit.textContent = `${getGold()}`;
}

export function getBagContext() {
  return { job: currentJob, level: currentLevel };
}
void getItem;
