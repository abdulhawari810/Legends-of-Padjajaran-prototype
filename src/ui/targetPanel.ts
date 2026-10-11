// Panel status target: muncul saat monster di-lock manual atau diserang.
// Scene kirim 'target-show' {id,name,level,hp,maxHp,locked} dan 'target-hide'.
// Tanpa lock, panel hilang 5 detik setelah hit terakhir.
const ICONS: Record<string, string> = {
  slime: '🟢',
  goblin: '👺',
  skeleton: '💀',
  wolf: '🐺',
  orc: '👹',
  golem: '🗿',
  bat: '🦇',
  cultist: '🧙',
  'skeleton-elite': '👑',
  'cave-troll': '🧌'
};

export function initTargetPanel() {
  const frame = document.getElementById('target-frame');
  const portrait = document.getElementById('target-portrait');
  const name = document.getElementById('target-name');
  const fill = document.getElementById('target-hp-fill');
  const text = document.getElementById('target-hp-text');
  if (!frame || !portrait || !name || !fill || !text) return;

  let lockedId: string | null = null;
  let timer = 0;

  const paint = (id: string, nm: string, level: number, hp: number, maxHp: number) => {
    frame.classList.remove('hidden');
    portrait.textContent = ICONS[id] ?? '❓';
    name.textContent = `${nm} Lv.${level}`;
    const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
    fill.style.width = `${pct}%`;
    text.textContent = `${Math.max(0, Math.round(hp))}/${maxHp}`;
  };

  const hide = () => {
    window.clearTimeout(timer);
    timer = 0;
    lockedId = null;
    frame.classList.add('hidden');
  };

  window.addEventListener(
    'target-show',
    ((e: CustomEvent<{ id: string; name: string; level: number; hp: number; maxHp: number; locked: boolean }>) => {
      const d = e.detail;
      if (!d) return;
      window.clearTimeout(timer);
      if (d.locked) lockedId = d.id;
      // hit ke monster lain tanpa lock: tampilkan bila tidak ada lock aktif
      if (!d.locked && lockedId && lockedId !== d.id) return;
      paint(d.id, d.name, d.level, d.hp, d.maxHp);
      if (!d.locked) {
        timer = window.setTimeout(() => {
          if (!lockedId) frame.classList.add('hidden');
        }, 5000);
      }
    }) as EventListener
  );

  window.addEventListener('target-hide', () => hide());
}
