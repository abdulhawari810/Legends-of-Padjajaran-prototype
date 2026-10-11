import Phaser from 'phaser';

// Font teks biasa (bukan pixel/Courier) untuk semua teks dunia + HUD.
export const FONT = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

export function worldText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  // teks yang lahir ketutup HUD digeser ke tepi bawah HUD (tetap kelihatan)
  try {
    const cam = scene.cameras.main;
    const edgeWorldY = cam.worldView.y + hudOcclusionPx() / cam.zoom + 8;
    if (y < edgeWorldY) y = edgeWorldY;
  } catch {
    // abaikan
  }
  return scene.add.text(x, y, str, { fontFamily: FONT, ...style });
}

// Batas bawah HUD DOM (di-cache 500ms agar tidak layout-thrash).
// Label dunia yang tertutup HUD disembunyikan (tidak ngintip potong).
let cacheT = 0;
let hudBottom = 120;

export function hudOcclusionPx(): number {
  const now = performance.now();
  if (now - cacheT > 500) {
    cacheT = now;
    try {
      const els = ['#top-hud', '#target-frame']
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => {
          if (!el) return false;
          try {
            // offsetParent null untuk position:fixed di Chrome -> pakai rect
            return getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
          } catch {
            return false;
          }
        });
      if (els.length > 0) {
        hudBottom = els.reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
      }
    } catch {
      // abaikan
    }
  }
  return hudBottom;
}

export function isBehindHud(scene: Phaser.Scene, x: number, y: number, pad = 10): boolean {
  const cam = scene.cameras.main;
  const sy = (y - cam.worldView.y) * cam.zoom;
  return sy < hudOcclusionPx() + pad;
}
