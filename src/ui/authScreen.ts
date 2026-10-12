import {
  currentProfile,
  findProfile,
  hasLegacySave,
  listProfiles,
  login,
  logout,
  register,
  restoreSession,
  setProfileJob,
  type Profile
} from '../game/data/auth';
import { JOBS, type JobId } from '../game/data/jobs';

// ============================================================================
// Layar 1: Masuk / Daftar  +  Daftar profil tersimpan
// Layar 2: Pemilihan class (hanya untuk karakter baru)
// Boot flow di main.ts: restoreSession -> migrateLegacy -> authScreen
// -> (job belum dipilih?) jobScreen -> baru import modul game.
// ============================================================================

let onReady: (() => void) | null = null;

export function setAuthReadyCallback(fn: () => void) {
  onReady = fn;
}

/** Kembalikan true kalau boot boleh lanjut ke game. */
export async function showAuthScreen(): Promise<boolean> {
  // migrasi save lama -> profil "Pemain", langsung login
  if (hasLegacySave()) {
    const migrated = await migrateAndShow();
    if (migrated) return true;
  }

  // sesi tersimpan?
  const restored = restoreSession();
  if (restored) {
    hideAll();
    if (restored.job) return true;
    return showJobScreen(restored);
  }

  const screen = document.getElementById('auth-screen');
  if (!screen) return true; // DOM tidak ada (mis. diuji) -> lanjut saja
  screen.classList.remove('hidden');
  paint();
  return false;
}

async function migrateAndShow(): Promise<boolean> {
  const { migrateLegacySave } = await import('../game/data/auth');
  const note = document.getElementById('auth-legacy-note');
  if (note) note.classList.remove('hidden');
  // beri jeda supaya user sempat membaca banner migrasi
  await sleep(700);
  const profile = migrateLegacySave();
  if (!profile) {
    if (note) note.classList.add('hidden');
    return false;
  }
  hideAll();
  return true;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hideAll() {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('job-create-screen')?.classList.add('hidden');
}

// ============================================================================
// Layar auth
// ============================================================================

type Mode = 'login' | 'register';
let mode: Mode = 'login';

function paint() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.auth-tab');
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.authTab === mode));

  const submit = document.getElementById('auth-submit');
  if (submit) submit.textContent = mode === 'login' ? 'Masuk' : 'Buat Akun';

  const pw = document.getElementById('auth-password') as HTMLInputElement | null;
  if (pw) pw.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');

  const note = document.getElementById('auth-legacy-note');
  if (note && !hasLegacySave()) note.classList.add('hidden');

  paintProfiles();
  err('');
}

function paintProfiles() {
  const box = document.getElementById('auth-profiles');
  if (!box) return;
  const list = listProfiles();
  if (list.length === 0) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML =
    `<div class="auth-profiles-title">Profil tersimpan di perangkat ini</div>` +
    list
      .map((p) => {
        const job = JOBS.find((j) => j.id === p.job);
        return `<div class="profile-row" data-profile="${p.id}">
            <span class="p-name">${escapeHtml(p.username)}</span>
            <span class="p-meta">${job ? `${job.name}` : 'belum pilih class'}</span>
          </div>`;
      })
      .join('');
}

function err(msg: string) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  );
}

/** Pasang listener layar auth (dipanggil sekali saat boot). */
export function bindAuthScreen() {
  document.querySelectorAll<HTMLButtonElement>('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.authTab === 'register' ? 'register' : 'login';
      paint();
    });
  });

  const form = document.getElementById('auth-form') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitAuth();
  });

  document.getElementById('auth-profiles')?.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.profile-row[data-profile]');
    if (!row) return;
    const p = listProfiles().find((x) => x.id === row.dataset.profile);
    if (!p) return;
    const nameEl = document.getElementById('auth-username') as HTMLInputElement | null;
    if (nameEl) nameEl.value = p.username;
    err('Isi password lalu tekan Masuk.');
    const pw = document.getElementById('auth-password') as HTMLInputElement | null;
    pw?.focus();
  });

  // enter di field = submit
  document.querySelectorAll<HTMLInputElement>('.auth-input').forEach((inp) => {
    inp.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault();
        submitAuth();
      }
    });
  });
}

async function submitAuth() {
  const nameEl = document.getElementById('auth-username') as HTMLInputElement | null;
  const pwEl = document.getElementById('auth-password') as HTMLInputElement | null;
  const submit = document.getElementById('auth-submit') as HTMLButtonElement | null;
  const username = nameEl?.value ?? '';
  const password = pwEl?.value ?? '';

  if (submit) submit.disabled = true;
  err('');

  // beri napas supaya UI sempat repaint (hash 1000 putaran pure-JS)
  await sleep(16);

  const res = mode === 'login' ? login(username, password) : register(username, password);

  if (submit) submit.disabled = false;

  if (!res.ok) {
    err(res.reason ?? 'Gagal');
    return;
  }
  if (pwEl) pwEl.value = '';

  const profile = res.profile as Profile;
  hideAll();
  if (profile.job) {
    onReady?.();
    return;
  }
  await showJobScreen(profile);
}

// ============================================================================
// Layar pilih class
// ============================================================================

let pendingProfile: Profile | null = null;
let pickedJob: JobId | null = null;

export async function showJobScreen(profile: Profile): Promise<boolean> {
  const screen = document.getElementById('job-create-screen');
  if (!screen) return true;
  pendingProfile = profile;
  pickedJob = null;

  const icon = document.getElementById('jobc-icon');
  if (icon) icon.textContent = '🎲';
  const sub = document.getElementById('jobc-sub');
  if (sub) sub.textContent = `Halo ${profile.username} — pilih class karaktermu.`;

  const list = document.getElementById('jobc-list');
  if (list) {
    list.innerHTML = JOBS.map(
      (j) => `<div class="jobc-card ${j.id}" data-job="${j.id}">
        <div class="jobc-ico">${j.id === 'warrior' ? '⚔️' : j.id === 'mage' ? '🔮' : '🏹'}</div>
        <div class="jobc-name">${j.name}</div>
        <div class="jobc-desc">${j.desc}</div>
        <div class="jobc-stats">
          Kecepatan <b>${j.moveSpeed}</b><br />
          STR <b>${j.basePrimary.str}</b> · DEX <b>${j.basePrimary.dex}</b><br />
          INT <b>${j.basePrimary.int}</b> · FOC <b>${j.basePrimary.foc}</b><br />
          CON <b>${j.basePrimary.con}</b>
        </div>
        <button class="jobc-pick" data-pick="${j.id}">Pilih</button>
      </div>`
    ).join('');
  }

  const go = document.createElement('button');
  go.className = 'jobc-go';
  go.id = 'jobc-go';
  go.textContent = 'Masuk Game';
  go.addEventListener('click', () => confirmJob());

  const foot = screen.querySelector('.auth-foot');
  if (foot) foot.parentElement?.insertBefore(go, foot);

  screen.classList.remove('hidden');

  list?.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pick]');
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-job]');
    const id = (btn?.dataset.pick ?? card?.dataset.job) as JobId | undefined;
    if (!id) return;
    e.preventDefault();
    pickedJob = id;
    list.querySelectorAll<HTMLElement>('.jobc-card').forEach((c) =>
      c.classList.toggle('sel', c.dataset.job === id)
    );
    go.classList.add('ready');
  });

  return false;
}

function confirmJob() {
  if (!pendingProfile || !pickedJob) return;
  setProfileJob(pendingProfile.id, pickedJob);
  hideAll();
  onReady?.();
}

/** Logout dari panel pengaturan. */
export function doLogout() {
  logout();
  window.location.reload();
}

/** Helper untuk panel settings: profil yang sedang login. */
export function activeProfileName(): string {
  return currentProfile()?.username ?? '—';
}

export function profileHasProfile(username: string): boolean {
  return !!findProfile(username);
}