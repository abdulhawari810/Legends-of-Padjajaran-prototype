import { beforeEach, describe, expect, it } from 'vitest';
import { loadMeta, saveMeta } from './save';
import { setActiveProfile } from './persistence';
import { register, setProfileJob, __resetAuthCache, currentProfile } from './auth';

// =============================================================================
// Regression: job yang dipilih di layar auth harus benar-benar dipakai game.
//
// Bug asli (Batch AG): `setProfileJob()` menulis ke `mmorpg-auth-v1`, tapi
// game membaca job dari save game (`mmorpg-meta-v1`). Untuk karakter baru
// save game masih kosong -> `loadMeta()` fallback 'warrior' -> pemain memilih
// Mage tapi masuk game sebagai Warrior, lalu `jobLocked` mengunci salah.
//
// Yang diuji di sini adalah sisi "save game" yang jadi sumber kebenaran Player.
// Sisi UI-nya ada di `ui/authScreen.test.ts`.
// =============================================================================

describe('job dari auth -> save game', () => {
  beforeEach(() => {
    localStorage.clear();
    setActiveProfile(null);
    __resetAuthCache();
  });

  it('karakter baru: save game kosong -> loadMeta fallback warrior', () => {
    const p = register('ardi', 'rahasia').profile!;
    setActiveProfile(p.id);
    // belum ada key meta sama sekali
    expect(loadMeta().currentJob).toBe('warrior');
  });

  it('setProfileJob tidak menulis ke save game (harus ditulis terpisah)', () => {
    // Mendaftarkan behavior ini penting: kalau suatu saat setProfileJob
    // ikut menulis ke save game, test ini gagal dan memberi tahu kita
    // bahwa sekarang ada dua sumber kebenaran.
    const p = register('budi', 'rahasia').profile!;
    setActiveProfile(p.id);
    setProfileJob(p.id, 'mage');

    // profil auth punya job
    expect(currentProfile()?.job).toBe('mage');
    // save game MASIH kosong -> inilah bug yang pernah ada
    expect(loadMeta().currentJob).toBe('warrior');
    expect(localStorage.getItem(`mmorpg:p:${p.id}:mmorpg-meta-v1`)).toBe(null);
  });

  it('FIX: tulis job dari auth ke save game sebelum main', () => {
    // langkah 1: pemain pilih "mage" di layar auth
    const p = register('citra', 'rahasia').profile!;
    setActiveProfile(p.id);
    setProfileJob(p.id, 'mage');
    const chosen = currentProfile()!.job!;
    expect(chosen).toBe('mage');

    // langkah 2: startGame() menulis job ke save game (app.ts)
    const meta = loadMeta();
    if (meta.currentJob !== chosen) saveMeta({ ...meta, currentJob: chosen });

    // sekarang Player akan baca 'mage'
    expect(loadMeta().currentJob).toBe('mage');
    expect(JSON.parse(localStorage.getItem(`mmorpg:p:${p.id}:mmorpg-meta-v1`)!).currentJob).toBe('mage');
  });

  it('FIX: tidak menimpa job lama kalau karakter sudah punya progres', () => {
    const p = register('dana', 'rahasia').profile!;
    setActiveProfile(p.id);

    // karakter sudah main sebagai archer
    saveMeta({ currentJob: 'archer', killCount: 40 });
    setProfileJob(p.id, 'archer');

    // startGame() dipanggil lagi (mis. refresh halaman)
    const chosen = p.job ?? 'warrior';
    const meta = loadMeta();
    if (meta.currentJob !== chosen) saveMeta({ ...meta, currentJob: chosen });

    const after = loadMeta();
    expect(after.currentJob).toBe('archer');
    // killCount harus tetap (tidak ditimpa dengan 0)
    expect(after.killCount).toBe(40);
  });

  it('FIX: profil tanpa job -> fallback warrior dan konsisten', () => {
    const p = register('eka', 'rahasia').profile!;
    setActiveProfile(p.id);
    const chosen = p.job ?? 'warrior'; // p.job === null
    expect(chosen).toBe('warrior');

    const meta = loadMeta();
    if (meta.currentJob !== chosen) saveMeta({ ...meta, currentJob: chosen });
    expect(loadMeta().currentJob).toBe('warrior');
  });

  it('FIX: tiap profil punya meta sendiri', () => {
    const a = register('fajar', 'rahasia').profile!;
    setActiveProfile(a.id);
    saveMeta({ currentJob: 'mage', killCount: 5 });

    const b = register('gea', 'rahasia').profile!;
    setActiveProfile(b.id);
    // profil baru belum punya meta
    expect(loadMeta().currentJob).toBe('warrior');
    saveMeta({ currentJob: 'archer', killCount: 0 });

    setActiveProfile(a.id);
    expect(loadMeta().currentJob).toBe('mage');
    expect(loadMeta().killCount).toBe(5);
    expect(b.id).not.toBe(a.id);
  });
});
