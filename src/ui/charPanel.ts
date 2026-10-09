import type { StatsSnapshot } from '../game/entities/Player';
import { getItem } from '../game/data/items';

// Panel karakter: tampilkan primary (New World) + derived (WoW) + slot senjata.
export function initCharPanel() {
  const title = document.getElementById('char-title')!;
  const elWeapon = document.getElementById('char-weapon')!;
  const elPrimary = document.getElementById('char-primary')!;
  const elDerived = document.getElementById('char-derived')!;

  window.addEventListener('stats-changed', ((e: CustomEvent<StatsSnapshot>) => {
    const s = e.detail;
    title.textContent = `${s.jobId.toUpperCase()} Lv.${s.level} • EXP ${s.exp}/${s.expNext}`;

    const w = s.equippedWeaponId ? getItem(s.equippedWeaponId) : undefined;
    const a = s.equippedArmorId ? getItem(s.equippedArmorId) : undefined;
    elWeapon.innerHTML =
      (w
        ? `<div class="stat"><span>🔫 ${w.name}</span><b>+${w.atk} ${w.weaponKind}</b></div>`
        : `<div class="stat"><span>🔫 Tangan kosong</span><b>-</b></div>`) +
      (a
        ? `<div class="stat"><span>🛡️ ${a.name}</span><b>+${a.def} Armor</b></div>`
        : `<div class="stat"><span>🛡️ Tanpa armor</span><b>-</b></div>`);

    elPrimary.innerHTML = (
      [
        ['STR', s.primary.str, s.gearPrimary.str],
        ['DEX', s.primary.dex, s.gearPrimary.dex],
        ['INT', s.primary.int, s.gearPrimary.int],
        ['FOC', s.primary.foc, s.gearPrimary.foc],
        ['CON', s.primary.con, s.gearPrimary.con]
      ] as Array<[string, number, number]>
    )
      .map(([k, v, bonus]) =>
        bonus > 0
          ? `<div class="stat"><span>${k}</span><b>${v} <em class="bonus">(+${bonus})</em></b></div>`
          : `<div class="stat"><span>${k}</span><b>${v}</b></div>`
      )
      .join('');

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
  }) as EventListener);
}
