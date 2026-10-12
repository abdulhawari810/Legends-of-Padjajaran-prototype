import type { StatsSnapshot } from '../game/entities/Player';
import { getItem } from '../game/data/items';
import { getEnhance } from '../game/data/enhance';
import { formatPlaytime, getStats, totalKills } from '../game/data/stats';
import { getProf } from '../game/data/prof';
import { JOBS, type JobId } from '../game/data/jobs';
import { SKILLS } from '../game/data/skills';
import { getSkillLevel } from '../game/data/skillLevel';
import type { AttrKey } from '../game/data/attrRules';
import { currentProfile, wipeEverything } from '../game/data/auth';
import { doLogout } from './authScreen';
import {
  canDecrement,
  canIncrement,
  decrementHint,
  hasStagedChange,
  poolAfterStaging,
  totalSpent
} from '../game/data/attrRules';
import { achievementHtml, bindQuestList, questListHtml } from './questList';

type CharView = 'status' | 'ability' | 'quest' | 'skill';

const MAX_LEVEL = 20;

/** Tema visual per job: warna aksen + ikon. */
const JOB_THEME: Record<string, { icon: string; label: string; avatar: string }> = {
  warrior: { icon: '⚔️', label: 'Warrior', avatar: 'sprites/player/player_idle-front-01.png' },
  mage: { icon: '🔮', label: 'Mage', avatar: 'sprites/player/player_idle-front-01.png' },
  archer: { icon: '🏹', label: 'Archer', avatar: 'sprites/player/player_idle-front-01.png' }
};

/** Hook: taruh PNG custom di public/sprites/avatar/<job>.png untuk mengganti
    sprite bawaan. Kalau file tidak ada, gambar tidak berubah (fallback aman). */
const AVATAR_OVERRIDE: Record<string, string> = {};

let view: CharView = 'status';

// Panel karakter: artwork + tab Status / Ability / Quest / Skill.
export function initCharPanel() {
  const panel = document.getElementById('char-panel')!;
  const elPrimary = document.getElementById('char-primary')!;

  // --- tab vertikal ---
  document.querySelectorAll<HTMLButtonElement>('.cp-tab').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.view as CharView));
  });

  const setView = (v: CharView) => {
    view = v;
    document.querySelectorAll<HTMLButtonElement>('.cp-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.view === v);
    });
    document.querySelectorAll<HTMLElement>('.cp-view').forEach((s) => {
      s.classList.toggle('active', s.dataset.view === v);
    });
    // render tab yang baru dibuka (t sebelumnya tidak di-render tiap tick)
    renderActiveView();
  };

  // --- tombol bawah ---
  document.getElementById('cp-btn-ability')?.addEventListener('click', () => setView('ability'));
  document.getElementById('cp-btn-weapon')?.addEventListener('click', () => openBag('weapon'));
  document.getElementById('cp-btn-equip')?.addEventListener('click', () => openBag('all'));
  document.getElementById('cp-btn-skill')?.addEventListener('click', () => setView('skill'));
  document.getElementById('char-back')?.addEventListener('click', () => panel.classList.add('hidden'));
  document.getElementById('cp-plus')?.addEventListener('click', () => setView('ability'));

  function openBag(filter: string) {
    panel.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('open-bag-with-filter', { detail: filter }));
  }

  // --- alokasi atribut (delegasi, aman walau tab tidak aktif) ---
  elPrimary.addEventListener('click', ((e: Event) => {
    const act = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
    if (act && !act.disabled) {
      window.dispatchEvent(new CustomEvent(act.dataset.act!));
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-attr]');
    if (!btn || btn.disabled) return;
    window.dispatchEvent(
      new CustomEvent('allocate-attr', { detail: { stat: btn.dataset.attr, delta: Number(btn.dataset.delta ?? 1) } })
    );
  }) as EventListener);

  window.addEventListener('stats-changed', ((e: CustomEvent<StatsSnapshot>) => {
    render(e.detail);
  }) as EventListener);

  // --- profil: tampilkan nama + tombol logout / hapus progres ---
  const profileEl = document.getElementById('cp-profile-name');
  if (profileEl) {
    const p = currentProfile();
    profileEl.textContent = p ? `${p.username} · ${p.job ?? '—'}` : '—';
  }

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Keluar dari profil ini? Progres tetap tersimpan.')) doLogout();
  });

  const wipeBtn = document.getElementById('btn-wipe-save');
  if (wipeBtn) {
    let armed = false;
    let timer = 0;
    wipeBtn.addEventListener('click', () => {
      const p = currentProfile();
      if (!p) return;
      if (!armed) {
        armed = true;
        wipeBtn.textContent = 'Yakin hapus?';
        timer = window.setTimeout(() => {
          armed = false;
          wipeBtn.textContent = 'Hapus Progres';
        }, 3000);
        return;
      }
      window.clearTimeout(timer);
      // hapus SELURUH data (semua profil + auth), bukan cuma progres aktif
      if (confirm(`Hapus SEMUA data game di perangkat ini (termasuk semua profil)?`)) {
        wipeEverything();
        window.location.reload();
      }
    });
  }

  // Data quest/skill berubah -> render ulang tab terkait (bukan tiap regen).
  const refresh = () => {
    if (!panel.classList.contains('hidden')) renderActiveView();
  };
  window.addEventListener('quest-changed', refresh);
  window.addEventListener('bounty-changed', refresh);
  window.addEventListener('game-stats-changed', refresh);
  window.addEventListener('equipment-changed', refresh);
  window.addEventListener('inventory-changed', refresh);
}

// ===== render =====

/** Snapshot terakhir supaya panel bisa di-render ulang saat dibuka tanpa
    menunggu event `stats-changed` berikutnya (yang datang tiap 5 detik). */
let lastSnapshot: StatsSnapshot | null = null;

/** Dipanggil gamePanels saat panel karakter dibuka. */
export function refreshCharPanel() {
  if (lastSnapshot) render(lastSnapshot);
}

/**
 * Render HANYA tab yang sedang terlihat.
 *
 * `stats-changed` datang tiap ~5 detik (regen HP). Kalau semua tab di-render
 * tiap event, penggantian innerHTML menyebabkan:
 *  - scroll posisi user meloncat ke atas tiap 5 detik
 *  - tombol alokasi atribut +/- ikut hilang di tengah tap (HP)
 * Jadi tab non-aktif dilewati; tab aktif di-render dengan scroll di-preserve.
 */
function renderActiveView() {
  if (!lastSnapshot) return;
  keepScroll(() => {
    switch (view) {
      case 'status':
        renderStatus(lastSnapshot!);
        break;
      case 'ability':
        renderAbility(lastSnapshot!);
        break;
      case 'quest':
        renderQuest();
        break;
      case 'skill':
        renderSkill(lastSnapshot!.jobId);
        break;
    }
  });
}

/**
 * Ganti isi tab sambil menjaga posisi scroll.
 *
 * YANG di-scroll adalah `.cp-view` (overflow-y:auto), bukan div di dalamnya.
 * Tanpa ini, tiap `stats-changed` (5 detik) menimpa innerHTML sehingga scroll
 * user meloncat ke atas dan tombol +/- ikut hilang di tengah tap.
 */
function keepScroll(fn: () => void) {
  const el = document.querySelector<HTMLElement>(".cp-view.active");
  const top = el?.scrollTop ?? 0;
  fn();
  if (el && top > 0) el.scrollTop = top;
}


function render(s: StatsSnapshot) {
  lastSnapshot = s;
  const panel = document.getElementById('char-panel');
  const theme = JOB_THEME[s.jobId] ?? JOB_THEME.warrior;

  // tema panel per job
  panel?.classList.remove('job-warrior', 'job-mage', 'job-archer');
  panel?.classList.add(`job-${s.jobId}`);

  // artwork + nama
  const artImg = document.getElementById('cp-art-img') as HTMLImageElement | null;
  if (artImg) {
    const want = AVATAR_OVERRIDE[s.jobId] ?? theme.avatar;
    if (artImg.dataset.job !== s.jobId || artImg.getAttribute('src') !== want) {
      artImg.dataset.job = s.jobId;
      artImg.src = want;
    }
  }
  const artIcon = document.getElementById('cp-art-icon');
  if (artIcon) artIcon.textContent = theme.icon;
  const artClass = document.getElementById('cp-art-class');
  if (artClass) artClass.textContent = theme.label;

  const title = document.getElementById('char-title');
  if (title) title.textContent = s.jobId.toUpperCase();

  const className = document.getElementById('cp-class-name');
  if (className) className.textContent = theme.label;

  renderHeader(s);
  renderActiveView();
}

// --- header: bintang rarity + level + exp ---
function renderHeader(s: StatsSnapshot) {
  // rarity naik tiap 4 level (1..5 bintang)
  const stars = Math.max(1, Math.min(5, Math.ceil(s.level / (MAX_LEVEL / 5))));
  const starsEl = document.getElementById('cp-stars');
  if (starsEl) starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  const lvEl = document.getElementById('cp-lv');
  if (lvEl) lvEl.textContent = `${s.level}`;

  const fillEl = document.getElementById('cp-exp-fill');
  if (fillEl) fillEl.style.width = `${Math.max(0, Math.min(100, (s.exp / s.expNext) * 100))}%`;

  const nextEl = document.getElementById('cp-exp-next');
  if (nextEl) nextEl.textContent = `${s.expNext}`;

  const hpEl = document.getElementById('cp-hp');
  const hpMaxEl = document.getElementById('cp-hp-max');
  if (hpEl) hpEl.textContent = `${s.hp}`;
  if (hpMaxEl) hpMaxEl.textContent = `${s.derived.maxHp}`;
  const mpEl = document.getElementById('cp-mp');
  const mpMaxEl = document.getElementById('cp-mp-max');
  if (mpEl) mpEl.textContent = `${s.mp}`;
  if (mpMaxEl) mpMaxEl.textContent = `${s.derived.maxMp}`;
}

// --- tab Status: stat grid + equipment + buff ---
function renderStatus(s: StatsSnapshot) {
  const d = s.derived;
  const job = JOBS.find((j) => j.id === s.jobId);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const speed = Math.round((job?.moveSpeed ?? 170) * (1 + d.moveSpeedBonus));

  const rows: Array<[string, string]> = [
    ['Serangan', `${d.pAtk}`],
    ['Pertahanan', `${d.armor}`],
    ['Sihir', `${d.mAtk}`],
    ['Res. Sihir', `${d.magicRes}`],
    ['Kekuatan', `${s.primary.str}`],
    ['Vitalitas', `${s.primary.con}`],
    ['Intelijen', `${s.primary.int}`],
    ['Kecepatan', `${speed}`],
    ['Kritis', pct(d.critRate)],
    ['Fokus', `${s.primary.foc}`],
    ['Kelincahan', `${s.primary.dex}`],
    ['Hindari', pct(d.dodge)]
  ];
  const grid = document.getElementById('char-derived');
  if (grid) {
    grid.innerHTML = rows
      .map(([label, val]) => `<div class="cp-stat"><span>${label}</span><b>${val}</b></div>`)
      .join('');
  }

  // equipment ringkas
  const w = s.equippedWeaponId ? getItem(s.equippedWeaponId) : undefined;
  const a = s.equippedArmorId ? getItem(s.equippedArmorId) : undefined;
  const wLv = getEnhance('weapon');
  const aLv = getEnhance('armor');
  const el = document.getElementById('char-weapon');
  if (el) {
    el.innerHTML =
      (w
        ? `<div class="cp-gear-row"><span class="g-ico">🗡️</span><span class="g-name">${w.name}${wLv > 0 ? ` +${wLv}` : ''}</span><span class="g-bonus">+${w.atk} ${w.weaponKind}</span></div>`
        : `<div class="cp-gear-row empty"><span class="g-ico">🗡️</span><span class="g-name">Belum ada senjata</span></div>`) +
      (a
        ? `<div class="cp-gear-row"><span class="g-ico">🛡️</span><span class="g-name">${a.name}${aLv > 0 ? ` +${aLv}` : ''}</span><span class="g-bonus">+${a.def} Armor</span></div>`
        : `<div class="cp-gear-row empty"><span class="g-ico">🛡️</span><span class="g-name">Belum ada armor</span></div>`);
  }

  // buff aktif
  const buffs = s.activeBuffs ?? [];
  const buffEl = document.getElementById('cp-buffs');
  if (buffEl) {
    buffEl.innerHTML =
      buffs.length === 0
        ? 'Tidak ada buff.'
        : buffs
            .map(
              (b) =>
                `<div class="cp-buff"><span>${b.icon}</span><span>${b.name}</span><b style="margin-left:auto">+${b.value}</b><span>${b.left}s</span></div>`
            )
            .join('');
  }
}

// --- tab Ability: alokasi atribut ---
function renderAbility(s: StatsSnapshot) {
  const el = document.getElementById('char-primary');
  if (!el) return;
  const keys: Array<[string, AttrKey]> = [
    ['STR', 'str'],
    ['DEX', 'dex'],
    ['INT', 'int'],
    ['FOC', 'foc'],
    ['CON', 'con']
  ];
  const poolPreview = poolAfterStaging(s.freePoints, s.pending);
  const hasPending = hasStagedChange(s.pending);
  const spentTotal = totalSpent(s.spent);

  el.innerHTML =
    `<div class="stat"><span>🎯 Poin bebas</span><b>${poolPreview}</b></div>` +
    keys
      .map(([label, key]) => {
        const preview = s.primary[key] + (s.pending[key] ?? 0);
        const gear = s.gearPrimary[key];
        // aturan -1: hanya staging sesi ini. Sudah "Terapkan" = permanen.
        const canDec = canDecrement(s.pending, key);
        return (
          `<div class="stat attr-row" title="${decrementHint(s.pending, key)}"><span>${label}</span><span class="attr-group">` +
          (canDec
            ? `<button class="bag-btn attr-btn dec" data-attr="${key}" data-delta="-1">−1</button>`
            : `<span class="attr-spacer"></span>`) +
          `<b>${preview} <em class="bonus">(+${gear})</em></b>` +
          (canIncrement(s.freePoints, s.pending)
            ? `<button class="bag-btn attr-btn" data-attr="${key}" data-delta="1">+1</button>`
            : `<span class="attr-spacer"></span>`) +
          `</span></div>`
        );
      })
      .join('') +
    (hasPending
      ? `<div class="attr-reset-row"><button class="bag-btn attr-apply-btn" data-act="apply-attr">✔ Terapkan</button><button class="bag-btn attr-reset-btn" data-act="cancel-attr">✕ Batal</button></div>`
        : spentTotal > 0
        ? `<div class="attr-reset-row"><button class="bag-btn attr-reset-btn" data-act="reset-attr">🔄 Reset (20G)</button></div>`
        : '');

  // penjelasan aturan -1 (biar pemain tidak bingung kenapa tombolnya hilang)
  const hint = document.getElementById('cp-ability-hint');
  if (hint) {
    hint.textContent = hasPending
      ? 'Poin yang belum "Terapkan" masih bisa dibatalkan dengan −1.'
        : spentTotal > 0
        ? 'Poin sudah permanen. Untuk mengubahnya: tambah dulu dengan +1 lalu tekan −1, atau Reset (20G) untuk mengembalikan semua poin.'
        : 'Tiap level memberi 5 poin bebas. Tekan +1 untuk menambah; tekan −1 untuk membatalkan sebelum "Terapkan".';
  }
}

// --- tab Quest: statistik + quest + pencapaian ---
function renderQuest() {
  const el = document.getElementById('cp-quest-list');
  if (!el) return;
  const gs = getStats();
  const mining = getProf('mining');
  const herb = getProf('herb');

  const statsHtml =
    `<div class="q-row"><span>⚔️ Total Kill</span><b>${totalKills(gs)}</b></div>` +
    `<div class="q-row"><span>💀 Mati</span><b>${gs.deaths}</b></div>` +
    `<div class="q-row"><span>🎁 Quest diklaim</span><b>${gs.claims}</b></div>` +
    `<div class="q-row"><span>⭐ Max Lv</span><b>${gs.maxLevel}</b></div>` +
    `<div class="q-row"><span>⏱ Main</span><b>${formatPlaytime(gs.playtimeSec)}</b></div>` +
    `<div class="q-row"><span>⛏️ Mining</span><b>Lv.${mining.lvl}</b></div>` +
    `<div class="q-row"><span>🌿 Herbalism</span><b>Lv.${herb.lvl}</b></div>`;

  el.innerHTML = statsHtml + questListHtml() + achievementHtml();
  bindQuestList(el);
}

// --- tab Skill ---
function renderSkill(jobId: JobId) {
  const el = document.getElementById('cp-skill-list');
  if (!el) return;
  const defs = SKILLS[jobId] ?? [];
  el.innerHTML =
    defs
      .map((d, i) => {
        const lv = getSkillLevel(jobId, i);
        return `<div class="cp-skill">
          <span class="s-ico">${d.icon}</span>
          <div class="s-body">
            <div class="s-name">${d.name} <em>Lv.${lv}</em> <small style="opacity:.6">[${i + 1}]</small></div>
            <div class="s-desc">${d.desc}</div>
            <div class="s-meta">${d.mpCost} MP • CD ${(d.cooldownMs / 1000).toFixed(1)}s${
              d.castMs ? ` • Cast ${(d.castMs / 1000).toFixed(1)}s` : ''
            } • Requires Lv.${1 + (lv - 1) * 3}</div>
          </div>
        </div>`;
      })
      .join('') || '<div class="cp-hint">Tidak ada skill untuk job ini.</div>';
}
