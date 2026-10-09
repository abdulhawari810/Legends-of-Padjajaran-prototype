// Paksa lanskap untuk web mobile:
// 1. Coba Screen Orientation API lock('landscape') saat gesture pertama.
// 2. Tampilkan overlay #rotate-hint via CSS saat portrait (tanpa JS tiap frame).
// 3. Resize Phaser otomatis via Scale.FIT (sudah di Game.ts).
export function initLandscape() {
  const tryLock = async () => {
    try {
      // @ts-ignore - beberapa browser tidak punya type ini
      const orient = screen.orientation as any;
      if (orient && typeof orient.lock === 'function') {
        // butuh fullscreen di sebagian browser Android agar lock berhasil
        await orient.lock('landscape');
      }
    } catch {
      // abaikan: fallback-nya overlay CSS "putar HP"
    }
  };

  // lock hanya boleh dipanggil dari user gesture
  const onFirstGesture = () => {
    void tryLock();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('touchend', onFirstGesture);
  };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchend', onFirstGesture, { once: true });

  // saat kembali dari portrait ke landscape, paksa resize Phaser
  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  });
}
