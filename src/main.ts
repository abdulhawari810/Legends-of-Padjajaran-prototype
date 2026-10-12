import './style.css';
import { currentProfile, setProfileJob } from './game/data/auth';
import { bindAuthScreen, setAuthReadyCallback, showAuthScreen } from './ui/authScreen';

// =============================================================================
// Bootstrap (Batch AG).
//
// URUTAN PENTING — jangan diacak:
//
//   1. Tentukan profil aktif  -> setActiveProfile(id) di persistence
//   2. import('./app')         -> modul data baru me-load dengan key profil
//
// Semua modul data me-cache state di level modul saat di-import
// (`let equipped = loadJSON(...)`). Kalau langkah 2 terjadi sebelum langkah 1,
// state yang ter-cache milik profil yang salah DAN tidak akan pernah di-reload.
// Karena itu main.ts SENGAJA hanya meng-import modul auth + UI auth (yang bebas
// circular), lalu memakai dynamic import() untuk seluruh game.
// =============================================================================

async function boot() {
  bindAuthScreen();

  // Tampilkan layar auth kalau belum ada sesi. Fungsi ini
  // mengembalikan true kalau boot boleh lanjut.
  const ready = await showAuthScreen();
  if (!ready) {
    setAuthReadyCallback(() => void launch());
    return;
  }
  await launch();
}

async function launch() {
  const profile = currentProfile();
  if (!profile) {
    // sesi hilang (mis. profil dihapus dari tab lain) -> kembali ke layar auth
    await showAuthScreen();
    return;
  }
  // Profil tanpa job (mis. screen pilih job gagal render) -> default warrior.
  if (!profile.job) setProfileJob(profile.id, 'warrior');

  const app = await import('./app');
  app.startGame(app.resolveJob());
}

void boot();