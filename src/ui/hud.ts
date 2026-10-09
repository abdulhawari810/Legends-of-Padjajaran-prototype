import type { StatsSnapshot } from '../game/entities/Player';

// Top HUD ala MMORPG: avatar + HP/MP/EXP bar.
export function initHud() {
  window.addEventListener('stats-changed', ((e: CustomEvent<StatsSnapshot>) => {
    const s = e.detail;
    const hpPct = Math.max(0, (s.hp / s.derived.maxHp) * 100);
    const mpPct = Math.max(0, (s.mp / s.derived.maxMp) * 100);
    const expPct = Math.max(0, Math.min(100, (s.exp / s.expNext) * 100));

    const hpFill = document.getElementById('hp-fill');
    const mpFill = document.getElementById('mp-fill');
    const expFill = document.getElementById('exp-fill');
    const hpText = document.getElementById('hp-text');
    const mpText = document.getElementById('mp-text');
    const lvBadge = document.getElementById('lv-badge');
    const avatar = document.getElementById('avatar');
    const jobName = document.getElementById('job-name');

    if (hpFill) hpFill.style.width = `${hpPct}%`;
    if (mpFill) mpFill.style.width = `${mpPct}%`;
    if (expFill) expFill.style.width = `${expPct}%`;
    if (hpText) hpText.textContent = `${s.hp}/${s.derived.maxHp}`;
    if (mpText) mpText.textContent = `${s.mp}/${s.derived.maxMp}`;
    if (lvBadge) lvBadge.textContent = `${s.level}`;
    if (jobName) jobName.textContent = s.jobId.toUpperCase();
    if (avatar) avatar.dataset.job = s.jobId;
  }) as EventListener);
}
