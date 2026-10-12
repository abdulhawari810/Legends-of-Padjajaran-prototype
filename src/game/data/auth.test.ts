import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_BASES,
  changePassword,
  currentProfile,
  deleteProfile,
  findProfile,
  getProfileById,
  hasAnyProfile,
  hasLegacySave,
  listProfiles,
  login,
  logout,
  migrateLegacySave,
  register,
  restoreSession,
  setProfileJob,
  validatePassword,
  validateUsername,
  wipeEverything,
  __resetAuthCache
} from './auth';
import { keyForProfile, keysOfProfile, scopedKey, setActiveProfile, unscopeKey } from './persistence';

function reset() {
  localStorage.clear();
  setActiveProfile(null);
  __resetAuthCache();
}

describe('validasi', () => {
  it('username: panjang & karakter', () => {
    expect(validateUsername('ab')).toContain('Minimal');
    expect(validateUsername('a'.repeat(17))).toContain('Maksimal');
    expect(validateUsername('nama baik')).toContain('Hanya huruf');
    expect(validateUsername('pemain_1')).toBeNull();
    expect(validateUsername('ABC123')).toBeNull();
  });

  it('password: panjang minimum', () => {
    expect(validatePassword('abc')).toContain('Minimal');
    expect(validatePassword('a'.repeat(65))).toContain('Maksimal');
    expect(validatePassword('abcd')).toBeNull();
  });
});

describe('register', () => {
  beforeEach(reset);

  it('berhasil dan auto-login', () => {
    const r = register('ardi', 'rahasia');
    expect(r.ok).toBe(true);
    expect(currentProfile()?.username).toBe('ardi');
  });

  it('tolak nama duplikat (case-insensitive)', () => {
    register('Ardi', 'rahasia');
    expect(register('ardi', 'lain').ok).toBe(false);
    expect(register('ARDI', 'lain').ok).toBe(false);
  });

  it('tolak nama invalid tanpa membuat profil', () => {
    expect(register('a', 'rahasia').ok).toBe(false);
    expect(hasAnyProfile()).toBe(false);
  });

  it('trim spasi di username', () => {
    expect(register('  budi  ', 'rahasia').ok).toBe(true);
    expect(findProfile('budi')?.username).toBe('budi');
  });

  it('password TIDAK pernah disimpan sebagai teks polos', () => {
    register('candra', 'rahasia123');
    const raw = localStorage.getItem('mmorpg-auth-v1') ?? '';
    expect(raw).not.toContain('rahasia123');
    expect(raw).toContain('"hash"');
  });

  it('karakter baru punya job null (menunggu pilih class)', () => {
    const r = register('dina', 'rahasia');
    expect(r.profile?.job).toBeNull();
  });
});

describe('login', () => {
  beforeEach(reset);

  it('password benar -> masuk', () => {
    register('evo', 'rahasia');
    logout();
    expect(login('evo', 'rahasia').ok).toBe(true);
  });

  it('password salah -> ditolak dan sesi tetap kosong', () => {
    register('fajar', 'rahasia');
    logout();
    expect(login('fajar', 'salah').ok).toBe(false);
    expect(currentProfile()).toBe(null);
  });

  it('akun tidak ada -> ditolak', () => {
    expect(login('entah', 'rahasia').ok).toBe(false);
  });

  it('login mengaktifkan namespace profil', () => {
    const r = register('gita', 'rahasia');
    const id = r.profile!.id;
    expect(scopedKey('mmorpg-gold-v1')).toBe(`mmorpg:p:${id}:mmorpg-gold-v1`);
  });
});

describe('logout', () => {
  beforeEach(reset);

  it('melepas sesi tapi data tetap ada', () => {
    const r = register('hadi', 'rahasia');
    localStorage.setItem(scopedKey('mmorpg-gold-v1'), '999');
    logout();
    expect(currentProfile()).toBe(null);
    expect(localStorage.getItem(`mmorpg:p:${r.profile!.id}:mmorpg-gold-v1`)).toBe('999');
  });

  it('setActiveProfile jadi null setelah logout', () => {
    register('indah', 'rahasia');
    logout();
    expect(scopedKey('mmorpg-gold-v1')).toBe('mmorpg-gold-v1');
  });
});

describe('isolasi antar profil', () => {
  beforeEach(reset);

  it('gold tiap profil terpisah', () => {
    const a = register('sari', 'rahasia').profile!;
    localStorage.setItem(keyForProfile(a.id, 'mmorpg-gold-v1'), '111');
    logout();

    const b = register('tari', 'rahasia').profile!;
    expect(localStorage.getItem(keyForProfile(b.id, 'mmorpg-gold-v1'))).toBe(null);
    localStorage.setItem(keyForProfile(b.id, 'mmorpg-gold-v1'), '222');
    logout();

    login('sari', 'rahasia');
    expect(localStorage.getItem(scopedKey('mmorpg-gold-v1'))).toBe('111');
    logout();
    login('tari', 'rahasia');
    expect(localStorage.getItem(scopedKey('mmorpg-gold-v1'))).toBe('222');
  });

  it('keysOfProfile hanya milestone profil itu', () => {
    const a = register('umi', 'rahasia').profile!;
    logout();
    const b = register('vian', 'rahasia').profile!;
    localStorage.setItem(keyForProfile(a.id, 'mmorpg-gold-v1'), '1');
    localStorage.setItem(keyForProfile(a.id, 'mmorpg-inventory-v1'), '{}');
    localStorage.setItem(keyForProfile(b.id, 'mmorpg-gold-v1'), '2');

    expect(keysOfProfile(a.id).sort()).toEqual(
      [`mmorpg:p:${a.id}:mmorpg-gold-v1`, `mmorpg:p:${a.id}:mmorpg-inventory-v1`].sort()
    );
  });

  it('unscopeKey membalikkan key ter-namespace', () => {
    const p = register('wulan', 'rahasia').profile!;
    expect(unscopeKey(scopedKey('mmorpg-gold-v1'))).toBe('mmorpg-gold-v1');
    expect(unscopeKey(`mmorpg:p:${p.id}:mmorpg-gold-v1`)).toBe('mmorpg-gold-v1');
    expect(unscopeKey('mmorpg-gold-v1')).toBe(null);
  });
});

describe('job profil', () => {
  beforeEach(reset);

  it('setProfileJob tersimpan & persist', () => {
    const r = register('yuni', 'rahasia').profile!;
    expect(setProfileJob(r.id, 'mage')).toBe(true);
    expect(getProfileById(r.id)?.job).toBe('mage');
    expect(JSON.parse(localStorage.getItem('mmorpg-auth-v1')!).profiles[0].job).toBe('mage');
  });

  it('setProfileJob tolak id tak dikenal', () => {
    expect(setProfileJob('ngawur', 'warrior')).toBe(false);
  });
});

describe('hapus profil', () => {
  beforeEach(reset);

  it('hapus profil + semua key-nya', () => {
    const r = register('zaki', 'rahasia').profile!;
    localStorage.setItem(keyForProfile(r.id, 'mmorpg-gold-v1'), '500');
    logout();
    expect(deleteProfile(r.id).ok).toBe(true);
    expect(findProfile('zaki')).toBeUndefined();
    expect(localStorage.getItem(keyForProfile(r.id, 'mmorpg-gold-v1'))).toBe(null);
  });

  it('tolak hapus profil yang sedang login', () => {
    const r = register('rina', 'rahasia').profile!;
    expect(deleteProfile(r.id).ok).toBe(false);
    expect(findProfile('rina')).toBeDefined();
  });

  it('tolak id tak dikenal', () => {
    expect(deleteProfile('nope').ok).toBe(false);
  });
});

describe('ganti password', () => {
  beforeEach(reset);

  it('berhasil dengan password lama yang benar', () => {
    const r = register('sari', 'rahasia').profile!;
    expect(changePassword(r.id, 'rahasia', 'baru123').ok).toBe(true);
    logout();
    expect(login('sari', 'rahasia').ok).toBe(false);
    expect(login('sari', 'baru123').ok).toBe(true);
  });

  it('tolak password lama salah', () => {
    const r = register('tegar', 'rahasia').profile!;
    expect(changePassword(r.id, 'salah', 'baru123').ok).toBe(false);
  });

  it('password baru ikut divalidasi', () => {
    const r = register('uung', 'rahasia').profile!;
    expect(changePassword(r.id, 'rahasia', 'ab').ok).toBe(false);
  });
});

describe('sesi', () => {
  beforeEach(reset);

  it('restoreSession memulihkan profil tersimpan', () => {
    register('vina', 'rahasia');
    const id = currentProfile()!.id;
    // simulate page reload: sesi masih tersimpan tapi cache modul dibuang
    logout();
    const auth = JSON.parse(localStorage.getItem('mmorpg-auth-v1')!);
    auth.session = id;
    localStorage.setItem('mmorpg-auth-v1', JSON.stringify(auth));
    __resetAuthCache();
    setActiveProfile(null);

    const p = restoreSession();
    expect(p?.username).toBe('vina');
    expect(scopedKey('mmorpg-gold-v1')).toBe('mmorpg:p:' + id + ':mmorpg-gold-v1');
  });
});

describe('migrasi save lama', () => {
  beforeEach(reset);

  it('hasLegacySave false saat localStorage kosong', () => {
    expect(hasLegacySave()).toBe(false);
  });

  it('migrasi key lama ke profil baru + auto-login', () => {
    localStorage.setItem('mmorpg-gold-v1', '7777');
    localStorage.setItem('mmorpg-meta-v1', JSON.stringify({ currentJob: 'mage', killCount: 5 }));
    localStorage.setItem('mmorpg-inventory-v1', JSON.stringify({ 'potion-s': 9 }));

    expect(hasLegacySave()).toBe(true);
    const p = migrateLegacySave();
    expect(p).not.toBeNull();
    expect(p!.username).toBe('Pemain');
    expect(p!.job).toBe('mage');

    // key lama sudah pindah
    expect(localStorage.getItem('mmorpg-gold-v1')).toBe(null);
    expect(localStorage.getItem(`mmorpg:p:${p!.id}:mmorpg-gold-v1`)).toBe('7777');
    expect(localStorage.getItem(`mmorpg:p:${p!.id}:mmorpg-inventory-v1`)).toContain('potion-s');

    // auto-login
    expect(currentProfile()?.id).toBe(p!.id);
  });

  it('tidak migrasi dua kali', () => {
    localStorage.setItem('mmorpg-gold-v1', '1');
    migrateLegacySave();
    // flag set -> tidak ada lagi sisa key lama
    expect(hasLegacySave()).toBe(false);
    localStorage.setItem('mmorpg-gold-v1', '2');
    expect(hasLegacySave()).toBe(false);
  });

  it('progres lama tidak hilang: nilainya utuh', () => {
    const inv = { 'potion-s': 42, 'iron-ore': 13 };
    localStorage.setItem('mmorpg-inventory-v1', JSON.stringify(inv));
    localStorage.setItem('mmorpg-gold-v1', '31337');
    const p = migrateLegacySave()!;
    expect(JSON.parse(localStorage.getItem(`mmorpg:p:${p.id}:mmorpg-inventory-v1`)!)).toEqual(inv);
    expect(localStorage.getItem(`mmorpg:p:${p.id}:mmorpg-gold-v1`)).toBe('31337');
  });

  it('save meta rusak -> tetap jalan, fallback warrior', () => {
    localStorage.setItem('mmorpg-meta-v1', '{bukan json');
    localStorage.setItem('mmorpg-gold-v1', '5');
    const p = migrateLegacySave();
    expect(p).not.toBeNull();
    expect(p!.job).toBe('warrior');
  });

  it('LEGACY_BASES tidak bentrok dengan key scoped', () => {
    expect(LEGACY_BASES.every((k) => k.startsWith('mmorpg-') && !k.startsWith('mmorpg:p:'))).toBe(true);
  });
});

describe('wipeEverything', () => {
  beforeEach(reset);

  it('menghapus semua profil + key + auth', () => {
    const a = register('wan', 'rahasia').profile!;
    logout();
    register('yuni', 'rahasia');
    localStorage.setItem(keyForProfile(a.id, 'mmorpg-gold-v1'), '9');
    localStorage.setItem('mmorpg-gold-v1', 'legacy');

    wipeEverything();
    expect(localStorage.getItem('mmorpg-auth-v1')).toBe(null);
    expect(localStorage.getItem(keyForProfile(a.id, 'mmorpg-gold-v1'))).toBe(null);
    expect(localStorage.getItem('mmorpg-gold-v1')).toBe(null);
    expect(listProfiles()).toEqual([]);
    expect(currentProfile()).toBe(null);
  });

  it('TIDAK menghapus preferensi perangkat (volume/mute)', () => {
    register('x', 'rahasia');
    localStorage.setItem('mmorpg-vol-v1', '0.5');
    localStorage.setItem('mmorpg-muted-v1', '1');
    wipeEverything();
    // volume/mute = pengaturan perangkat, bukan progres -> harus tetap
    expect(localStorage.getItem('mmorpg-vol-v1')).toBe('0.5');
    expect(localStorage.getItem('mmorpg-muted-v1')).toBe('1');
  });

  it('menghapus key profil yatim (profil dihapus tapi data tertinggal)', () => {
    localStorage.setItem('mmorpg:p:ghost123:mmorpg-gold-v1', '5');
    register('y', 'rahasia');
    wipeEverything();
    expect(localStorage.getItem('mmorpg:p:ghost123:mmorpg-gold-v1')).toBe(null);
  });
});

describe('daftar profil', () => {
  beforeEach(reset);

  it('diurutkan dari yang terakhir dimainkan', () => {
    const a = register('satu', 'rahasia').profile!;
    logout();
    const b = register('dua', 'rahasia').profile!;
    expect(listProfiles()[0].id).toBe(b.id);
    expect(listProfiles()[1].id).toBe(a.id);
  });
});
