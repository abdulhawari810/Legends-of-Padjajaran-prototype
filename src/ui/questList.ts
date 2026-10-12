import { snapshotQuests, questNeed } from '../game/data/questState';
import { snapshotAchievements } from '../game/data/achievements';
import { getBounties } from '../game/data/bounty';
import { getItem } from '../game/data/items';
import { MONSTERS } from '../game/data/monsters';

// Daftar quest bergaya kartu: badge reward di kiri, judul + progress bar di
// tengah, tombol aksi di kanan. Dipakai oleh panel Quest (/btn-quest) dan tab
// Quest di panel Karakter.
//
// Responsif: 1 kolom di HP, 2 kolom di >= 720px (desktop).

/** Sisa waktu menuju reset bounty harian (ms). */
export function bountyResetMs(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function fmtCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function monsterName(id: string): string {
  return MONSTERS.find((m) => m.id === id)?.name ?? id;
}

/** Baris bounty harian (bagian atas, seperti milestone di referensi). */
export function bountyHtml(): string {
  const ms = bountyResetMs();
  const list = getBounties();
  return (
    `<div class="ql-head">
       <div class="ql-head-title">📜 Quest</div>
       <div class="ql-refresh">Reset bounty <b id="ql-countdown">${fmtCountdown(ms)}</b></div>
     </div>
     <div class="ql-bounty-row">
       <div class="ql-bounty-ms">
         <div class="ql-bounty-ms-num">${list.filter((b) => b.done).length}</div>
         <div class="ql-bounty-ms-label">Bounty</div>
       </div>
       ${list
         .map(
           (b) => `
         <div class="ql-bounty ${b.done ? 'done' : ''}">
           <div class="ql-bounty-name">${monsterName(b.target)}</div>
           <div class="ql-bounty-bar"><i style="width:${Math.min(100, (b.progress / Math.max(1, b.need)) * 100)}%"></i></div>
           <div class="ql-bounty-need">${Math.min(b.progress, b.need)}/${b.need}</div>
           <div class="ql-bounty-reward">${b.gold}G • ${b.exp} XP</div>
         </div>`
         )
         .join('')}
     </div>`
  );
}

/** Daftar quest utama. */
export function questListHtml(): string {
  const quests = snapshotQuests();
  if (quests.length === 0) return `<div class="ql-empty">Belum ada quest.</div>`;

  return `<div class="ql-list">${quests.map(questRow).join('')}</div>`;
}

function questRow(q: ReturnType<typeof snapshotQuests>[number]): string {
  const need = Math.max(1, questNeed(q.id));
  const prog = Math.min(q.progress, need);
  const pct = Math.min(100, (prog / need) * 100);

  // state menentukan warna + tombol aksi
  let state: string;
  let act: string;
  if (!q.unlocked) {
    state = 'locked';
    act = `<span class="ql-act locked" title="Terkunci">🔒</span>`;
  } else if (q.claimed) {
    state = 'claimed';
    act = `<span class="ql-act done" title="Sudah diklaim">✅</span>`;
  } else if (q.claimable) {
    state = 'ready';
    act = `<button class="ql-act ready" data-claim="${q.id}" title="Klaim di Tetua 🧙">✓</button>`;
  } else {
    state = 'active';
    act = `<span class="ql-act go" title="Lanjutkan quest">▶</span>`;
  }

  // badge kiri = EXP (angka besar) + reward tambahan kecil
  const extra: string[] = [];
  if (q.rewardGold) extra.push(`${q.rewardGold}G`);
  const extraItem = q.rewardItemId ? getItem(q.rewardItemId) : undefined;
  if (extraItem) extra.push(extraItem.icon ?? extraItem.name);

  const objective = !q.unlocked
    ? 'Terkunci — selesaikan quest sebelumnya'
    : q.claimed
      ? 'Selesai &amp; diklaim'
      : q.claimable
        ? 'Siap diklaim di Tetua 🧙'
        : q.desc;

  return `<div class="ql-item ${state}">
    <div class="ql-reward">
      <div class="ql-reward-num">${q.rewardExp}</div>
      <div class="ql-reward-tag">EXP</div>
    </div>
    <div class="ql-body">
      <div class="ql-title">${q.title}</div>
      <div class="ql-desc">${objective}</div>
      <div class="ql-bar"><i style="width:${pct}%"></i></div>
      <div class="ql-prog">
        <span>${q.unlocked ? `${prog}/${need}` : '—'}</span>
        ${extra.length ? `<span class="ql-extra">🎁 ${extra.join(' ')}</span>` : ''}
      </div>
    </div>
    ${act}
  </div>`;
}

/** Daftar pencapaian (achievement) — ringkas, di bawah quest. */
export function achievementHtml(): string {
  const list = snapshotAchievements();
  const done = list.filter((a) => a.unlocked).length;
  return `<div class="ql-ach-head">
      <span>🏆 Pencapaian</span>
      <span class="ql-ach-count">${done}/${list.length}</span>
    </div>
    <div class="ql-ach-list">
      ${list
        .map(
          (a) => `<div class="ql-ach ${a.unlocked ? 'on' : ''}">
            <span class="a-ico">${a.unlocked ? '🏆' : '🔒'}</span>
            <span class="a-name">${a.name}</span>
            <span class="a-val">${a.unlocked ? '✅' : `+${a.gold}G`}</span>
          </div>`
        )
        .join('')}
    </div>`;
}

/**
 * Pasang delegasi klik untuk tombol klaim pada daftar quest.
 * Aman dipanggil ulang karena elemen di-re-render tiap perubahan.
 */
export function bindQuestList(container: HTMLElement | null) {
  if (!container || container.dataset.bound === '1') return;
  container.dataset.bound = '1';
  const handler = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-claim]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('claim-quest', { detail: btn.dataset.claim }));
  };
  container.addEventListener('pointerdown', handler);
  container.addEventListener('click', (e) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    (handler as EventListener)(e);
  });
}