import { beforeEach, describe, expect, it } from 'vitest';
import {
  NEVER_USED,
  nowMs,
  pruneExpiredState,
  resetPersistentState,
  state
} from './persistentTimers';

// =============================================================================
// Regresi: cooldown skill & buff harus BERTAHAN saat ganti map.
//
// Bug asli: `lastSkillAt` (dan buff) adalah field instance Player, sedangkan
// ganti map memanggil `scene.restart()` -> `create()` -> `new Player()`.
// Field baru kembali ke sentinel -99999, dan `scene.time.now` reset ke 0.
// Akibatnya pemain bisa pakai skill tanpa cooldown cukup dengan keluar-masuk map.
//
// Perbaikan: timer pindah ke store module-level + jam global `nowMs()`.
// Test ini menyimulasikan siklus "restart scene" dengan membuat state baru
// beberapa kali, tanpa perlu Phaser.
// =============================================================================

describe('persistentTimers: cooldown bertahan lintas ganti map', () => {
  beforeEach(() => {
    resetPersistentState();
  });

  it('nowMs() monoton naik dan tidak pernah reset', () => {
    const a = nowMs();
    const b = nowMs();
    expect(b).toBeGreaterThanOrEqual(a);
    expect(nowMs()).toBeGreaterThanOrEqual(b);
  });

  it('state baru mulai dari sentinel (semua skill ready)', () => {
    const s = state();
    expect(s.lastSkillAt.mage[0]).toBe(NEVER_USED);
    expect(s.lastSkillAt.warrior[0]).toBe(NEVER_USED);
    expect(s.lastSkillAt.archer[0]).toBe(NEVER_USED);
  });

  it('BUG: cooldown hilang setelah "restart scene" (state di-set ulang)', () => {
    // Simulasi: pakai skill, lalu scene restart -> Player baru -> state fresh
    const now = nowMs();
    state().lastSkillAt.mage[0] = now; // markSkilled

    // Player BARU akan membaca dari store yang SAMA, bukan field baru:
    const baru = state(); // accessor menunjuk store yang sama
    expect(baru.lastSkillAt.mage[0]).toBe(now);

    // cooldown 8 detik -> masih dalam 8 detik harus TERKUNCI
    const cd = 8000;
    const elapsed = nowMs() - baru.lastSkillAt.mage[0];
    expect(elapsed).toBeLessThan(cd); // belum cukup waktu
    expect(elapsed >= cd).toBe(false); // canSkill = false (belum ready)
  });

  it('buff (shield/swift/buff makanan) juga bertahan lintas "restart"', () => {
    const now = nowMs();
    state().shieldUntil = now + 6000;
    state().swiftUntil = now + 6000;
    state().buffAtk = 5;
    state().buffAtkUntil = now + 30000;
    state().buffDef = 3;
    state().buffDefUntil = now + 30000;

    // "restart": akses lagi lewat store
    const s = state();
    const t = nowMs();
    expect(t < s.shieldUntil).toBe(true); // shield masih aktif
    expect(t < s.swiftUntil).toBe(true); // swift masih aktif
    expect(s.buffAtk).toBe(5);
    expect(s.buffAtkUntil > t).toBe(true);
    expect(s.buffDef).toBe(3);
    expect(s.buffDefUntil > t).toBe(true);
  });

  it('per-job terpisah: pakai skill mage tidak mengunci warrior', () => {
    const now = nowMs();
    state().lastSkillAt.mage[0] = now;
    expect(state().lastSkillAt.warrior[0]).toBe(NEVER_USED);
    expect(state().lastSkillAt.archer[0]).toBe(NEVER_USED);
  });

  it('per-slot terpisah: pakai slot 0 tidak mengunci slot 1', () => {
    const now = nowMs();
    state().lastSkillAt.warrior[0] = now;
    expect(state().lastSkillAt.warrior[1]).toBe(NEVER_USED);
    expect(state().lastSkillAt.warrior[2]).toBe(NEVER_USED);
  });

  it('pruneExpiredState() TIDAK menghapus timer yang masih aktif', () => {
    const now = nowMs();
    state().lastSkillAt.mage[0] = now; // baru saja dipakai -> harus selamat prune
    pruneExpiredState();
    expect(state().lastSkillAt.mage[0]).toBe(now);
  });

  it('pruneExpiredState() membersihkan timer yang sudah lama (>2 menit)', () => {
    // Simulasi timer kuno: jauh di masa lalu
    state().lastSkillAt.mage[0] = nowMs() - 200_000;
    pruneExpiredState();
    expect(state().lastSkillAt.mage[0]).toBe(NEVER_USED);
  });

  it('resetPersistentState() menghapus semua timer (karakter baru/profil baru)', () => {
    const now = nowMs();
    state().lastSkillAt.mage[0] = now;
    state().shieldUntil = now + 6000;
    state().buffAtk = 9;
    resetPersistentState();
    expect(state().lastSkillAt.mage[0]).toBe(NEVER_USED);
    expect(state().shieldUntil).toBe(0);
    expect(state().buffAtk).toBe(0);
  });
});