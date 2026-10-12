import type { StatsSnapshot } from '../game/entities/Player';
import { getItem } from '../game/data/items';
import { getEnhance } from '../game/data/enhance';
import { formatPlaytime, getStats, totalKills } from '../game/data/stats';
import { getProf } from '../game/data/prof';

// Panel karakter: tampilkan primary (New World) + derived (WoW) + slot senjata.
export function initCharPanel() {
  const title = document.getElementById('char-title')!;
  const elWeapon = document.getElementById('char-weapon')!;
  const elPrimary = document.getElementById('char-primary')!;
  const elDerived = document.getElementById('char-derived')!;

  // delegasi klik tombol +1/-1/terapkan/batal/reset atribut (dirender ulang tiap stats-changed)
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
    const s = e.detail;
    title.textContent = `${s.jobId.toUpperCase()} Lv.${s.level} • EXP ${s.exp}/${s.expNext}`;

    const w = s.equippedWeaponId ? getItem(s.equippedWeaponId) : undefined;
    const a = s.equippedArmorId ? getItem(s.equippedArmorId) : undefined;
    const wLv = getEnhance('weapon');
    const aLv = getEnhance('armor');
    elWeapon.innerHTML =
      (w
        ? `<div class="stat"><span>🔫 ${w.name} +${wLv}</span><b>+${w.atk} ${w.weaponKind}</b></div>`
        : `<div class="stat"><span>🔫 Tangan kosong</span><b>-</b></div>`) +
      (a
        ? `<div class="stat"><span>🛡️ ${a.name} +${aLv}</span><b>+${a.def} Armor</b></div>`
        : `<div class="stat"><span>🛡️ Tanpa armor</span><b>-</b></div>`);

    const keys = ['str', 'dex', 'int', 'foc', 'con'] as const;
    const netPending = keys.reduce((a, k) => a + (s.pending[k] ?? 0), 0);
    const poolPreview = s.freePoints - netPending;
    const hasPending = keys.some((k) => (s.pending[k] ?? 0) !== 0);
    const totalSpent = keys.reduce((a, k) => a + (s.spent[k] ?? 0), 0);
    elPrimary.innerHTML =
      `<div class="stat"><span>🎯 Poin bebas</span><b>${poolPreview}</b></div>` +
      (
        [
          ['STR', 'str', s.primary.str, s.gearPrimary.str],
          ['DEX', 'dex', s.primary.dex, s.gearPrimary.dex],
          ['INT', 'int', s.primary.int, s.gearPrimary.int],
          ['FOC', 'foc', s.primary.foc, s.gearPrimary.foc],
          ['CON', 'con', s.primary.con, s.gearPrimary.con]
        ] as Array<[string, string, number, number]>
      )
        .map(([k, key, v, bonus]) => {
          const st = key as 'str' | 'dex' | 'int' | 'foc' | 'con';
          const preview = v + (s.pending[st] ?? 0);
          const canDec = (s.spent[st] ?? 0) + (s.pending[st] ?? 0) > 0 && poolPreview > 0;
          return (
            `<div class="stat attr-row"><span>${k}</span><span class="attr-group">` +
            (canDec
              ? `<button class="bag-btn attr-btn dec" data-attr="${key}" data-delta="-1">−1</button>`
              : `<span class="attr-spacer"></span>`) +
            `<b>${preview} <em class="bonus">(+${bonus})</em></b>` +
            (poolPreview > 0
              ? `<button class="bag-btn attr-btn" data-attr="${key}" data-delta="1">+1</button>`
              : `<span class="attr-spacer"></span>`) +
            `</span></div>`
          );
        })
        .join('') +
      (hasPending
        ? `<div class="attr-reset-row"><button class="bag-btn attr-apply-btn" data-act="apply-attr">✔ Terapkan</button><button class="bag-btn attr-reset-btn" data-act="cancel-attr">✕ Batal</button></div>`
        : totalSpent > 0
          ? `<div class="attr-reset-row"><button class="bag-btn attr-reset-btn" data-act="reset-attr">🔄 Reset (20G)</button></div>`
          : '');

    const d = s.derived;
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    elDerived.innerHTML = [
      ['P.Atk', `${d.pAtk}`],
      ['R.Atk', `${d.rAtk}`],
      ['M.Atk', `${d.mAtk}`],
      ['Heal', `${d.heal}`],
      ['Armor', `${d.armor}`],
      ['M.Res', `${d.magicRes}`],
      ['Crit', `${pct(d.critRate)} x${d.critDmg.toFixed(2)}`],
      ['Haste', pct(d.hastePct)],
      ['Dodge', pct(d.dodge)],
      ['Block', `${pct(d.blockChance)} -30%`],
      ['HPRegen', `${d.hpRegen.toFixed(1)}/5s`],
      ['MPRegen', `${d.mpRegen.toFixed(1)}/5s`],
      ['Move', `+${pct(d.moveSpeedBonus)}`],
      ['Lifesteal', pct(d.lifesteal)],
      ['Tenacity', pct(d.tenacity)]
    ]
      .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`)
      .join('');

    const gs = getStats();
    const mining = getProf('mining');
    const herb = getProf('herb');
    const topKills = Object.entries(gs.kills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' • ');
    const statsEl = document.getElementById('char-stats');
    if (statsEl) {
      statsEl.innerHTML =
        `<div class="stat"><span>Total Kill</span><b>${totalKills(gs)}</b></div>` +
        `<div class="stat"><span>Mati</span><b>${gs.deaths}</b></div>` +
        `<div class="stat"><span>Quest Klaim</span><b>${gs.claims}</b></div>` +
        `<div class="stat"><span>Max Lv</span><b>${gs.maxLevel}</b></div>` +
        `<div class="stat"><span>Main</span><b>${formatPlaytime(gs.playtimeSec)}</b></div>` +
        `<div class="stat"><span>⛏️ Mining</span><b>Lv.${mining.lvl} (${mining.xp}xp)</b></div>` +
        `<div class="stat"><span>🌿 Herbalism</span><b>Lv.${herb.lvl} (${herb.xp}xp)</b></div>` +
        (topKills ? `<div class="stat"><span>Top</span><b>${topKills}</b></div>` : '');
    }
  }) as EventListener);
}
