import { loadJSON, saveJSON, keysOfProfile, removeKey, setActiveProfile } from './persistence';
import { hashPassword, makeSalt, safeEqual } from './sha256';
import type { JobId } from './jobs';

// =============================================================================
// Sistem akun LOKAL (tidak ada server).
//
// Yang Dicegat:  hash SHA-256 pure-JS, bukan `crypto.subtle` (butuh secure
//                context; Capacitor/file:// bisa tidak punya).
// Yang TIDAK Dicegat:Ini bukan autentikasi sungguhan. Tidak ada server, jadi
//                siapa pun yang pegang perangkat bisa baca localStorage. Fungsinya
//                hanya memisahkan progres antar orang di satu perangkat.
//
// Modul ini SENGAJA tidak meng-import modul data game (inventory, gold, ...)
// supaya bebas circular. Data profil memakai localStorage mentah lewat
// persistence; penamespacingan key game ditangani `setActiveProfile`.
// =============================================================================

const AUTH_KEY = 'mmorpg-auth-v1';
const MIGRATED_KEY = 'mmorpg-legacy-migrated-v1';

export interface Profile {
  id: string;
  username: string;
  /** sha256 iteratif dari salt+password */
  hash: string;
  salt: string;
  /** null = karakter baru, belum pilih job */
  job: JobId | null;
  createdAt: number;
  lastPlayed: number;
}

interface AuthData {
  v: 1;
  profiles: Profile[];
  /** id profil yang sedang login */
  session: string | null;
}

const EMPTY: AuthData = { v: 1, profiles: [], session: null };

let data: AuthData = normalize(loadJSON<AuthData>(AUTH_KEY, EMPTY));

/**
 * Reset state in-memory modul ke localStorage.
 *
 * Hanya untuk unit test: `data` di-cache di level modul, jadi
 * `localStorage.clear()` saja tidak mengosongkan cache itu.
 */
export function __resetAuthCache(): void {
  data = normalize(loadJSON<AuthData>(AUTH_KEY, EMPTY));
}

function normalize(raw: AuthData): AuthData {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.profiles)) return { ...EMPTY };
  return {
    v: 1,
    profiles: raw.profiles.filter(
      (p): p is Profile =>
        !!p && typeof p.id === 'string' && typeof p.username === 'string' && typeof p.hash === 'string'
    ),
    session: typeof raw.session === 'string' ? raw.session : null
  };
}

function persist() {
  saveJSON(AUTH_KEY, data);
}

function emit() {
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

// ===== validasi =====

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

export function validateUsername(name: string): string | null {
  if (name.length < 3) return 'Minimal 3 karakter';
  if (name.length > 16) return 'Maksimal 16 karakter';
  if (!USERNAME_RE.test(name)) return 'Hanya huruf, angka, dan underscore';
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 4) return 'Minimal 4 karakter';
  if (pw.length > 64) return 'Maksimal 64 karakter';
  return null;
}

// ===== id =====

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ===== query =====

export function listProfiles(): Profile[] {
  return data.profiles.slice().sort((a, b) => b.lastPlayed - a.lastPlayed);
}

export function findProfile(username: string): Profile | undefined {
  const key = username.trim().toLowerCase();
  return data.profiles.find((p) => p.username.toLowerCase() === key);
}

export function getProfileById(id: string): Profile | undefined {
  return data.profiles.find((p) => p.id === id);
}

export function hasAnyProfile(): boolean {
  return data.profiles.length > 0;
}

/** Profil yang sedang login, atau null. */
export function currentProfile(): Profile | null {
  if (!data.session) return null;
  return getProfileById(data.session) ?? null;
}

// ===== aksi =====

/**
 * Buat akun baru lalu LANGSUNG login.
 * Penting: sesi harus aktif di sini, karena setelah daftar pemain diarahkan ke
 * layar pilih class yang memanggil `currentProfile()`.
 */
export function register(username: string, password: string): { ok: boolean; reason?: string; profile?: Profile } {
  const name = username.trim();
  const uErr = validateUsername(name);
  if (uErr) return { ok: false, reason: uErr };
  const pErr = validatePassword(password);
  if (pErr) return { ok: false, reason: pErr };
  if (findProfile(name)) return { ok: false, reason: 'Nama sudah dipakai' };

  const salt = makeSalt();
  const profile: Profile = {
    id: makeId(),
    username: name,
    salt,
    hash: hashPassword(password, salt),
    job: null,
    createdAt: Date.now(),
    lastPlayed: Date.now()
  };
  data.profiles.push(profile);
  data.session = profile.id;
  persist();
  setActiveProfile(profile.id);
  emit();
  return { ok: true, profile };
}

export function login(username: string, password: string): { ok: boolean; reason?: string; profile?: Profile } {
  const name = username.trim();
  const uErr = validateUsername(name);
  if (uErr) return { ok: false, reason: uErr };

  const profile = findProfile(name);
  if (!profile) return { ok: false, reason: 'Akun tidak ditemukan' };

  const attempt = hashPassword(password, profile.salt);
  if (!safeEqual(attempt, profile.hash)) return { ok: false, reason: 'Password salah' };

  data.session = profile.id;
  profile.lastPlayed = Date.now();
  persist();
  setActiveProfile(profile.id);
  emit();
  return { ok: true, profile };
}

/** Logout hanya melepas sesi; data progres tetap tersimpan. */
export function logout() {
  data.session = null;
  persist();
  setActiveProfile(null);
  emit();
}

/** Set job karakter (dipanggil setelah layar pemilihan job). */
export function setProfileJob(profileId: string, job: JobId): boolean {
  const p = getProfileById(profileId);
  if (!p) return false;
  p.job = job;
  p.lastPlayed = Date.now();
  persist();
  emit();
  return true;
}

/** Hapus profil + seluruh key progresnya. Tidak boleh profil yang sedang login. */
export function deleteProfile(profileId: string): { ok: boolean; reason?: string } {
  const idx = data.profiles.findIndex((p) => p.id === profileId);
  if (idx < 0) return { ok: false, reason: 'Profil tidak ditemukan' };
  if (data.session === profileId) return { ok: false, reason: 'Keluar dulu sebelum menghapus' };

  keysOfProfile(profileId).forEach((k) => removeKey(k));
  data.profiles.splice(idx, 1);
  persist();
  emit();
  return { ok: true };
}

/** Ganti password (butuh password lama). */
export function changePassword(
  profileId: string,
  oldPw: string,
  newPw: string
): { ok: boolean; reason?: string } {
  const p = getProfileById(profileId);
  if (!p) return { ok: false, reason: 'Profil tidak ditemukan' };
  if (!safeEqual(hashPassword(oldPw, p.salt), p.hash)) return { ok: false, reason: 'Password lama salah' };
  const err = validatePassword(newPw);
  if (err) return { ok: false, reason: err };
  const salt = makeSalt();
  p.salt = salt;
  p.hash = hashPassword(newPw, salt);
  persist();
  emit();
  return { ok: true };
}

// ===== migrasi save lama (pre-auth) =====

/** Key lama (flat, tanpa namespace) milik progres pemain lama. */
export const LEGACY_BASES = [
  'mmorpg-player-jobs-v1',
  'mmorpg-player-pos-v1',
  'mmorpg-meta-v1',
  'mmorpg-inventory-v1',
  'mmorpg-gold-v1',
  'mmorpg-quests-v1',
  'mmorpg-equip-weapon-v1',
  'mmorpg-equip-armor-v1',
  'mmorpg-bounty-v1',
  'mmorpg-enhance-v1',
  'mmorpg-stats-v1',
  'mmorpg-ach-v1',
  'mmorpg-quickslots-v1',
  'mmorpg-prof-v1',
  'mmorpg-skills-v1',
  'mmorpg-bank-v1',
  'mmorpg-slot-1-v1',
  'mmorpg-slot-2-v1',
  'mmorpg-slot-3-v1'
];

/** true bila masih ada save lama yang belum dimigrasi. */
export function hasLegacySave(): boolean {
  if (loadJSON<boolean>(MIGRATED_KEY, false)) return false;
  return LEGACY_BASES.some((k) => localStorage.getItem(k) !== null);
}

/**
 * Buat profil pertama dari save lama yang ada.
 * Key lama disalin (lalu dihapus) ke namespace profil baru supaya progres
 * pemain tidak hilang. Job diambil dari `mmorpg-meta-v1`.
 * Dipanggil SATU kali sebelum layar login tampil.
 */
export function migrateLegacySave(): Profile | null {
  if (!hasLegacySave()) return null;

  // baca job lama SEBELUM key dihapus
  let job: JobId | null = null;
  try {
    const meta = JSON.parse(localStorage.getItem('mmorpg-meta-v1') ?? 'null') as { currentJob?: string } | null;
    if (meta?.currentJob === 'warrior' || meta?.currentJob === 'mage' || meta?.currentJob === 'archer') {
      job = meta.currentJob;
    }
  } catch {
    // save rusak -> karakter baru mulai Lv1
  }

  const profile: Profile = {
    id: makeId(),
    username: 'Pemain',
    salt: makeSalt(),
    hash: '',
    job: job ?? 'warrior',
    createdAt: Date.now(),
    lastPlayed: Date.now()
  };
  profile.hash = hashPassword('lama', profile.salt);
  data.profiles.push(profile);
  persist();

  // pindahkan key lama ke namespace profil baru
  const prefix = `mmorpg:p:${profile.id}:`;
  let moved = 0;
  LEGACY_BASES.forEach((base) => {
    const raw = localStorage.getItem(base);
    if (raw === null) return;
    try {
      localStorage.setItem(prefix + base, raw);
      localStorage.removeItem(base);
      moved++;
    } catch {
      // quota error -> biarkan key lama apa adanya
    }
  });
  saveJSON(MIGRATED_KEY, true);

  // power legacy ini minimal; langsung login supaya pemain lanjut main
  data.session = profile.id;
  persist();
  setActiveProfile(profile.id);
  emit();
  void moved;
  return profile;
}

/** Dipakai saat boot: pulihkan profil sesi yang tersimpan. */
export function restoreSession(): Profile | null {
  if (!data.session) return null;
  const p = getProfileById(data.session);
  if (!p) {
    data.session = null;
    persist();
    return null;
  }
  setActiveProfile(p.id);
  return p;
}

/** Reset total (untuk "hapus semua data" di pengaturan). */
export function wipeEverything() {
  const seen = new Set<string>();
  // semua profil
  data.profiles.forEach((p) => keysOfProfile(p.id).forEach((k) => seen.add(k)));
  LEGACY_BASES.forEach((k) => seen.add(k));
  // key profil yatim (profil sudah dihapus tapi datanya masih ada)
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mmorpg:p:')) seen.add(k);
    }
  } catch {
    // abaikan
  }
  seen.add(AUTH_KEY);
  seen.add(MIGRATED_KEY);
  seen.forEach((k) => removeKey(k));
  data = { ...EMPTY };
  setActiveProfile(null);
  // SENGAJA tidak persist(): key auth harus benar-benar hilang supaya wipe
  // total, bukan sekadar ditulis ulang dengan state kosong.
  emit();
}