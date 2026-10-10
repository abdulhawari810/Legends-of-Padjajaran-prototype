// Batch L: minimap DOM 150x112. MapScene kirim 'minimap-update' tiap 400ms.
export interface MinimapData {
  w: number;
  h: number;
  player: { x: number; y: number };
  monsters: Array<{ x: number; y: number; boss: boolean }>;
  npc: { x: number; y: number } | null;
  portals: Array<{ x: number; y: number }>;
  view: { x: number; y: number; w: number; h: number };
}

export function initMinimap() {
  const cv = document.getElementById('minimap') as HTMLCanvasElement | null;
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  window.addEventListener('minimap-update', ((e: CustomEvent<MinimapData>) => {
    const d = e.detail;
    if (!d || d.w <= 0) return;
    const W = cv.width;
    const H = cv.height;
    const s = Math.min(W / d.w, H / d.h);
    const ox = (W - d.w * s) / 2;
    const oy = (H - d.h * s) / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    const dot = (x: number, y: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ox + x * s, oy + y * s, r, 0, Math.PI * 2);
      ctx.fill();
    };
    d.portals.forEach((p) => dot(p.x, p.y, 3, '#22d3ee'));
    if (d.npc) dot(d.npc.x, d.npc.y, 3, '#fbbf24');
    d.monsters.forEach((m) => dot(m.x, m.y, m.boss ? 3 : 2, m.boss ? '#c084fc' : '#ef4444'));
    dot(d.player.x, d.player.y, 3, '#ffffff');
    // bingkai kamera
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + d.view.x * s, oy + d.view.y * s, d.view.w * s, d.view.h * s);
  }) as EventListener);
}
