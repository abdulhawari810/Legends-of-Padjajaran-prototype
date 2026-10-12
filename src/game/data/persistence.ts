// Helper persist localStorage (nanti ganti Capacitor Preferences / Tauri store).
//
// SINCE Batch AG: seluruh key progres di-namespacing per profil akun supaya
// beberapa akun bisa hidup berdampingan di satu perangkat tanpa saling timpa.
//
//   key lama : mmorpg-gold-v1              (semua pemain berbagi)
//   key baru : mmorpg:p:<profileId>:gold-v1  (pisah per profil)
//
// PENTING: modul data me-cache state saat di-import
// (`let equipped = loadJSON(...)`, `const counts = new Map(...)`).
// Jadi `setActiveProfile()` WAJIB dipanggil SEBELUM modul data mana pun di-import
// — itulah kenapa `main.ts` melakukan boot async dengan dynamic `import()`.

/** Id profil yang sedang aktif. null = belum login. */
let activeProfileId: string | null = null;

export function setActiveProfile(id: string | null): void {
  activeProfileId = id && id.length > 0 ? id : null;
}

export function getActiveProfileId(): string | null {
  return activeProfileId;
}

/** Prefix namespace aktif, mis. `mmorpg:p:abc123:` */
export function scopePrefix(): string {
  return activeProfileId ? `mmorpg:p:${activeProfileId}:` : '';
}

/**
 * Terjemahkan key dasar jadi key milik profil aktif.
 * Kalau belum ada profil aktif, key dikembalikan apa adanya (mode legacy /
 * dipakai oleh modul auth yang memang global).
 */
export function scopedKey(base: string): string {
  return activeProfileId ? `${scopePrefix()}${base}` : base;
}

/** Balikkan key ter-namespace ke bentuk dasarnya. */
export function unscopeKey(full: string): string | null {
  const m = /^mmorpg:p:([^:]+):(.+)$/.exec(full);
  return m ? m[2] : null;
}

/** Key milik profil tertentu (dipakai saat menghapus profil). */
export function keyForProfile(profileId: string, base: string): string {
  return `mmorpg:p:${profileId}:${base}`;
}

/** Semua key localStorage milik satu profil. */
export function keysOfProfile(profileId: string): string[] {
  const prefix = `mmorpg:p:${profileId}:`;
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) out.push(k);
  }
  return out;
}

/** Semua key milik profil aktif. */
export function keysOfActiveProfile(): string[] {
  if (!activeProfileId) return [];
  return keysOfProfile(activeProfileId);
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // abaikan quota error di webview lama
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // abaikan
  }
}