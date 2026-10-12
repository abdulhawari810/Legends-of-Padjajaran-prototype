import { VirtualInput } from '../game/input/VirtualInput';
import { SKILLS } from '../game/data/skills';
import { getSkillLevel } from '../game/data/skillLevel';
import type { JobId } from '../game/data/jobs';
import { loadMeta } from '../game/data/save';

// Batch N: 3 tombol skill (slot 0/1/2). Icon + cooldown per job per slot.
const SLOTS = [0, 1, 2] as const;
const BTN_IDS = ['skill-btn', 'skill-btn-2', 'skill-btn-3'] as const;

export function initSkillButton() {
  const btns = BTN_IDS.map((id) => document.getElementById(id) as HTMLButtonElement | null);
  const timers: number[] = [0, 0, 0];

  let lastJob: JobId | null = null;
  const setIcons = (jobId: JobId) => {
    if (jobId === lastJob) return;
    lastJob = jobId;
    const defs = SKILLS[jobId] ?? [];
    btns.forEach((btn, i) => {
      if (!btn) return;
      const def = defs[i];
      if (!def) return;
      btn.title = `${def.name} Lv.${getSkillLevel(jobId, i)} (${def.mpCost} MP, ${i + 1}) — ${def.desc}`;
      btn.innerHTML = `${def.icon}<span class="skill-cd"></span><span class="key">${i + 1}</span>`;
    });
  };

  const clearCooldown = (i: number) => {
    const btn = btns[i];
    window.clearInterval(timers[i]);
    timers[i] = 0;
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('cooling');
    btn.querySelector('.skill-cd')!.textContent = '';
  };

  const startCooldown = (i: number, ms: number) => {
    const btn = btns[i];
    window.clearInterval(timers[i]);
    timers[i] = 0;
    if (!btn) return;
    if (ms <= 0) {
      clearCooldown(i);
      return;
    }
    btn.disabled = true;
    btn.classList.add('cooling');
    let left = Math.ceil(ms / 1000);
    const paint = () => {
      const el = btn.querySelector('.skill-cd');
      if (el) el.textContent = left > 0 ? `${left}s` : '';
    };
    paint();
    timers[i] = window.setInterval(() => {
      left -= 1;
      if (left <= 0) clearCooldown(i);
      else paint();
    }, 1000);
  };

  btns.forEach((btn, i) => {
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      VirtualInput.requestSkill(i);
      btn.classList.add('pressed');
    });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  window.addEventListener('pointerup', () => btns.forEach((b) => b?.classList.remove('pressed')));

  window.addEventListener('select-job', ((e: CustomEvent<JobId>) => setIcons(e.detail)) as EventListener);
  window.addEventListener('select-job-sync', ((e: CustomEvent<JobId>) => setIcons(e.detail)) as EventListener);
  // Job permanen: pastikan ikon sinkron begitu Player benar-benar ada
  // (stats-changed pasti terkirim setelah Player constructed).
  window.addEventListener('stats-changed', ((e: CustomEvent<{ jobId: JobId }>) => {
    setIcons(e.detail.jobId);
  }) as EventListener);

  // dipakai habis skill
  window.addEventListener('skill-used', ((e: CustomEvent<{ slot: number; ms: number }>) => {
    startCooldown(e.detail.slot ?? 0, e.detail.ms ?? 5000);
  }) as EventListener);

  // ganti job: tampilkan sisa cooldown tiap slot job baru
  window.addEventListener('skill-cooldown-sync', ((e: CustomEvent<number[]>) => {
    const left = e.detail ?? [0, 0, 0];
    SLOTS.forEach((i) => startCooldown(i, left[i] ?? 0));
  }) as EventListener);

  setIcons('warrior');
  paintJobIfReady();
  function paintJobIfReady() {
    const meta = loadMeta();
    if (meta.currentJob) setIcons(meta.currentJob);
  }
}
