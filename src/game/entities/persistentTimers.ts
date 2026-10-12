import type { JobId } from '../data/jobs';

/**
 * Opsi C — jam global + store timer yang bertahan saat ganti map.
 *
 * MASALAH YANG DISELESAIKAN
 * ------------------------
 * Cooldown skill/buff sebelumnya memakai `scene.time.now` (jam scene Phaser)
 * yang RESET KE 0 setiap `scene.restart()`. Ganti map -> `scene.restart()` ->
 * `create()` -> `new Player()`, sehingga:
 *
 *   - `lastSkillAt` kembali ke sentinel -99999 (semua skill instantly ready)
 *   - `shieldUntil` / `swiftUntil` / `buffAtkUntil` / `buffDefUntil` kembali 0
 *
 * Artinya pemain bisa spam skill tanpa cooldown hanya dengan keluar-masuk map.
 *
 * SOLUSI
 * ------
 * 1. Semua timer memakai `nowMs()` (monotonic global, TIDAK pernah reset).
 * 2. State timer disimpan di store module-level. Store ini hidup selama game
 *    berjalan di satu halaman, jadi TIDAK ikut hilang saat scene di-restart.
 * 3. `restoreFromStore()` dipanggil di konstruktor Player: state dari map
 *    sebelumnya dipak ulang, jadi cooldown & buff tetap berjalan.
 *
 * CATATAN PENTING
 * ---------------
 * `nowMs()` memakai `performance.now()` yang monotonic DAN tidak terpengaruh
 * perubahan jam sistem. Dipakai, bukan `Date.now()`, supaya tidak bisa
 * dirusak oleh gambar jam atau perpindahan zona waktu.
 *
 * State ini TIDAK disimpan ke localStorage — sengaja. Cooldown/buff adalah
 * state runtime (sama seperti HP/MP yang juga reset), dan bertahan setelah
 * reload akan membingungkan: skill bisa saja terkunci setelah reload game.
 */

let originMs: number | null = null;

/**
 * Jam monotonic global dalam milidetik.
 * Nol saat pertama kali dipanggil, lalu naik terus.
 */
export function nowMs(): number {
  if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
    // Fallback untuk lingkungan tanpa performance API (test lama).
    if (originMs === null) originMs = 0;
    return Date.now() - originMs;
  }
  if (originMs === null) originMs = performance.now();
  return performance.now() - originMs;
}

/** Sentinel: "belum pernah dipakai" — cukup jauh untuk selalu lolos cooldown. */
export const NEVER_USED = -99999;

/** Bentuk store: apa pun yang perlu bertahan saat ganti map. */
export interface PersistentState {
  /** per job, per slot: kapan skill terakhir dipakai. */
  lastSkillAt: Record<JobId, [number, number, number]>;
  lastAttackAt: number;
  lastPotionAt: number;
  shieldUntil: number;
  swiftUntil: number;
  buffAtk: number;
  buffAtkUntil: number;
  buffDef: number;
  buffDefUntil: number;
}

function freshState(): PersistentState {
  return {
    lastSkillAt: {
      warrior: [NEVER_USED, NEVER_USED, NEVER_USED],
      mage: [NEVER_USED, NEVER_USED, NEVER_USED],
      archer: [NEVER_USED, NEVER_USED, NEVER_USED]
    },
    lastAttackAt: NEVER_USED,
    lastPotionAt: NEVER_USED,
    shieldUntil: 0,
    swiftUntil: 0,
    buffAtk: 0,
    buffAtkUntil: 0,
    buffDef: 0,
    buffDefUntil: 0
  };
}

/** Store module-level: bertahan selama halaman hidup, TIDAK ikut restart scene. */
let store: PersistentState = freshState();

/** Ambil object state langsung supaya bisa dimutasi in-place. */
export function state(): PersistentState {
  return store;
}

/** Buang semua timer (mis. karakter baru / setelah mati / ganti profil). */
export function resetPersistentState(): void {
  store = freshState();
}

/**
 * Buang timer yang sudah kedaluwarsa supaya tidak menumpuk di memori saat
 * pemain sering ganti map. Dipanggil tiap kali scene baru dibuat.
 */
export function pruneExpiredState(): void {
  const now = nowMs();
  for (const job of ['warrior', 'mage', 'archer'] as JobId[]) {
    const arr = store.lastSkillAt[job];
    if (!Array.isArray(arr)) continue;
    // Skill cooldown terpanjang di game ini di bawah 60 detik; angka ini
    // hanya perlu cukup besar untuk tidak salah-buang state yang masih hidup.
    if (now - arr[0] > 120_000) arr[0] = NEVER_USED;
    if (now - arr[1] > 120_000) arr[1] = NEVER_USED;
    if (now - arr[2] > 120_000) arr[2] = NEVER_USED;
  }
  if (now - store.lastPotionAt > 120_000) store.lastPotionAt = NEVER_USED;
}