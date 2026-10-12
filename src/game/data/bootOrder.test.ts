import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// =============================================================================
// Penjaga arsitektur boot (Batch AG).
//
// SELURUH modul data game me-cache state di level modul saat di-import, contoh:
//   let equippedWeaponId = loadJSON(KEY_W(), 'sword-wood');
//   const counts = new Map(Object.entries({...DEFAULTS, ...stored}));
//
// Kalau modul itu ikut ter-import SEBELUM `setActiveProfile()`, state yang
// ter-cache akan milik profil yang salah dan TIDAK PERNAH di-reload — akun
// pertama akan "menyerap" progres akun lain.
//
// Solusinya: `main.ts` hanya boleh meng-import modul bebas-cache (auth, UI
// auth), lalu seluruh game dimuat lewat dynamic `import('./app')`.
//
// Test ini gagal kalau ada yang menambah import modul data ke main.ts atau ke
// authScreen.ts — instead of debugging progres akun bercampur, gagal di sini.
// =============================================================================

/** Modul data yang me-cache state di level modul saat import. */
const DATA_MODULES = [
  'inventory',
  'currency',
  'equipment',
  'questState',
  'achievements',
  'bounty',
  'enhance',
  'bank',
  'prof',
  'quickslots',
  'settings',
  'skillLevel',
  'stats',
  'save'
];

/** Semua modul yang TIDAK boleh ter-import sebelum profil aktif. */
const STATEFUL_MODULES = [
  ...DATA_MODULES.map((m) => `data/${m}`),
  'game/Game',
  'game/audio'
];

/** File yang BOLEH di-import statis dari main.ts. */
const BOOTSTRAP_FILES = ['main.ts', 'ui/authScreen.ts'];

function readSource(rel: string): string {
  return readFileSync(join(process.cwd(), 'src', rel), 'utf8');
}

/** Ambil semua specifier yang di-import secara statis (bukan dynamic import). */
function staticImports(src: string): string[] {
  const out: string[] = [];
  // import ... from '...'
  const re1 = /^\s*import\s+(?!type\s)(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(src)) !== null) out.push(m[1]);
  // import '...' (side-effect only)
  const re2 = /^\s*import\s+['"]([^'"]+)['"]/gm;
  while ((m = re2.exec(src)) !== null) out.push(m[1]);
  return out;
}

describe('boot: urutan import (wajib)', () => {
  BOOTSTRAP_FILES.forEach((file) => {
    it(`${file} TIDAK boleh meng-import statis modul data berstate`, () => {
      const src = readSource(file);
      const specs = staticImports(src);
      const bad = specs.filter((s) =>
        STATEFUL_MODULES.some((mod) => s.includes(mod))
      );
      expect(
        bad,
        `${file} meng-import modul berstate secara statis: ${bad.join(', ')}. ` +
          `Modul ini meng-cache state saat import, jadi HARUS dimuat setelah ` +
          `setActiveProfile() lewat dynamic import('./app').`
      ).toEqual([]);
    });
  });

  it('main.ts memakai dynamic import untuk memuat game', () => {
    const src = readSource('main.ts');
    expect(src).toMatch(/await import\(['"]\.\/app['"]\)/);
  });

  it('main.ts memanggil setAuthReadyCallback / showAuthScreen sebelum app', () => {
    const src = readSource('main.ts');
    const iAuth = src.indexOf('showAuthScreen');
    const iApp = src.indexOf("import('./app')");
    expect(iAuth).toBeGreaterThan(-1);
    expect(iApp).toBeGreaterThan(-1);
    expect(iAuth).toBeLessThan(iApp);
  });
});

describe('boot: namespacing key', () => {
  it('modul data memakai scopedKey, bukan key datar', () => {
    const offenders: string[] = [];
    DATA_MODULES.forEach((mod) => {
      const src = readSource(`game/data/${mod}.ts`);
      const usesScope = /scopedKey\(/.test(src) || /KEY[A-Z_]*\(\)/.test(src);
      if (!usesScope) offenders.push(mod);
    });
    expect(offenders, `Modul tanpa scopedKey: ${offenders.join(', ')}`).toEqual([]);
  });

  it('tidak ada modul data yang masih membaca key datar langsung', () => {
    const offenders: string[] = [];
    DATA_MODULES.forEach((mod) => {
      const src = readSource(`game/data/${mod}.ts`);
      // loadJSON('mmorpg-...') langsung = lupa di-namespacing
      if (/loadJSON(<[^>]*>)?\(\s*'mmorpg-/.test(src)) offenders.push(mod);
    });
    expect(offenders, `Key datar di: ${offenders.join(', ')}`).toEqual([]);
  });
});