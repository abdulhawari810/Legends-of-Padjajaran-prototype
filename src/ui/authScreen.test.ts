import { beforeEach, describe, expect, it, vi } from 'vitest';

// Reproduksi alur "daftar -> pilih class" di jsdom supaya bug-nya ketahuan
// tanpa harus buka browser.
describe('authScreen: alur pilih class', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="auth-screen" class="auth-screen hidden">
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab active" data-auth-tab="login">Masuk</button>
            <button class="auth-tab" data-auth-tab="register">Daftar</button>
          </div>
          <div id="auth-legacy-note" class="auth-note hidden"></div>
          <form id="auth-form">
            <input id="auth-username" class="auth-input" />
            <input id="auth-password" class="auth-input" />
          </form>
          <div id="auth-error"></div>
          <button id="auth-submit">Masuk</button>
          <div id="auth-profiles"></div>
        </div>
      </div>
      <div id="job-create-screen" class="auth-screen hidden">
        <div class="auth-card wide">
          <span id="jobc-icon"></span>
          <div id="jobc-sub"></div>
          <div id="jobc-list" class="jobc-list"></div>
          <div class="auth-foot">foot</div>
        </div>
      </div>`;
  });

  it('layar pilih class menampilkan 3 kartu', async () => {
    const { showAuthScreen, bindAuthScreen, setAuthReadyCallback } = await import('./authScreen');
    const { __resetAuthCache } = await import('../game/data/auth');
    __resetAuthCache();
    bindAuthScreen();

    const ready = vi.fn();
    setAuthReadyCallback(ready);

    expect(await showAuthScreen()).toBe(false);

    // isi form daftar
    // pindah ke tab Daftar dulu (default-nya Masuk)
    document.querySelector<HTMLElement>('[data-auth-tab="register"]')!.click();
    (document.getElementById('auth-username') as HTMLInputElement).value = 'ardi';
    (document.getElementById('auth-password') as HTMLInputElement).value = 'rahasia';
    document.getElementById('auth-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 60));

    const list = document.getElementById('jobc-list')!;
    expect(list.querySelectorAll('.jobc-card').length).toBe(3);
    expect(document.getElementById('job-create-screen')!.classList.contains('hidden')).toBe(false);
    expect(ready).not.toHaveBeenCalled();
  });

  it('klik kartu -> tombol Masuk Game aktif -> klik -> lanjut ke game', async () => {
    const { showAuthScreen, bindAuthScreen, setAuthReadyCallback } = await import('./authScreen');
    const { __resetAuthCache, currentProfile } = await import('../game/data/auth');
    __resetAuthCache();
    bindAuthScreen();

    const ready = vi.fn();
    setAuthReadyCallback(ready);

    await showAuthScreen();
    document.querySelector<HTMLElement>('[data-auth-tab="register"]')!.click();
    (document.getElementById('auth-username') as HTMLInputElement).value = 'budi';
    (document.getElementById('auth-password') as HTMLInputElement).value = 'rahasia';
    document.getElementById('auth-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 60));

    const go = document.getElementById('jobc-go');
    expect(go, 'tombol "Masuk Game" tidak dibuat').not.toBeNull();
    expect(go!.classList.contains('ready'), 'tombol belum aktif sebelum pilih').toBe(false);

    // klik kartu mage
    const mageCard = document.querySelector<HTMLElement>('.jobc-card.mage')!;
    mageCard.querySelector<HTMLElement>('[data-pick]')!.click();

    expect(mageCard.classList.contains('sel'), 'kartu tidak ditandai terpilih').toBe(true);
    expect(go!.classList.contains('ready'), 'tombol tidak aktif setelah pilih').toBe(true);

    // klik tombol
    go!.click();

    expect(ready, 'callback boot tidak terpanggil').toHaveBeenCalledTimes(1);
    expect(currentProfile()?.job).toBe('mage');
    expect(document.getElementById('job-create-screen')!.classList.contains('hidden')).toBe(true);
  });

  it('klik kartu langsung (tanpa tombol Pilih) juga berfungsi', async () => {
    const { showAuthScreen, bindAuthScreen, setAuthReadyCallback } = await import('./authScreen');
    const { __resetAuthCache, currentProfile } = await import('../game/data/auth');
    __resetAuthCache();
    bindAuthScreen();
    const ready = vi.fn();
    setAuthReadyCallback(ready);

    await showAuthScreen();
    document.querySelector<HTMLElement>('[data-auth-tab="register"]')!.click();
    (document.getElementById('auth-username') as HTMLInputElement).value = 'citra';
    (document.getElementById('auth-password') as HTMLInputElement).value = 'rahasia';
    document.getElementById('auth-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((r) => setTimeout(r, 60));

    const archer = document.querySelector<HTMLElement>('.jobc-card.archer')!;
    archer.click(); // klik kartu, bukan tombolnya
    expect(archer.classList.contains('sel')).toBe(true);

    document.getElementById('jobc-go')!.click();
    expect(currentProfile()?.job).toBe('archer');
    expect(ready).toHaveBeenCalledTimes(1);
  });
});