// Batch BA-1: pipeline sprite eksternal untuk player.
// Cara pakai:
//   1. Copy file frame ke public/sprites/player/ (jangan serve dari free_assets).
//   2. Isi PLAYER_FRAMES: key tekstur -> path file (format persis seperti di bawah).
//   3. BootScene preload otomatis; key yang berhasil load TIDAK digambar prosedural.
//   4. File hilang/rusak = fallback prosedural (game tetap jalan).
// Key anim Player.ts tidak berubah: player-{down,up,left,right}-{0..3} + walk-{dir}.

// null = 100% prosedural (default aman).
export type FrameMap = Record<string, string>;

// ---- Batch BA-2: spritesheet monster (strip horizontal, square frame).
// Key konvensi: sheet `monster-{id}-sheet`, statis `monster-{id}` (frame 0),
// anim `monster-{id}-idle`. BootScene preload + potong otomatis;
// gagal load = fallback prosedural. Contoh terisi:
// export const MONSTER_SHEETS: Record<string, MonsterSheet> = {
//   slime: { file: 'sprites/monsters/slime-idle.png', fw: 156, fh: 156, start: 0, end: 13, rate: 8 },
// };
export interface MonsterSheet {
  file: string;
  fw: number;
  fh: number;
  start: number;
  end: number;
  rate: number;
}

export const MONSTER_SHEETS: Record<string, MonsterSheet> = {
  // BA-2 terpasang (strip horizontal, frame persegi):
  slime: { file: 'sprites/monsters/slime-idle.png', fw: 156, fh: 156, start: 0, end: 13, rate: 8 },
  bat: { file: 'sprites/monsters/bat-fly.png', fw: 87, fh: 87, start: 0, end: 10, rate: 10 },
  skeleton: { file: 'sprites/monsters/skeleton-idle.png', fw: 128, fh: 128, start: 0, end: 6, rate: 6 },
};

// BA-1 terpasang: chibi warrior 64x64 (down = idle+walk asli,
// up/left/right = idle-cycle per arah karena walk-nya tidak ada).
export const PLAYER_FRAMES: FrameMap = {
  'player-down-0': 'sprites/player/player_idle-front-01.png',
  'player-down-1': 'sprites/player/player_walk-front-01.png',
  'player-down-2': 'sprites/player/player_walk-front-02.png',
  'player-down-3': 'sprites/player/player_walk-front-03.png',
  'player-up-0': 'sprites/player/player_idle-back-01.png',
  'player-up-1': 'sprites/player/player_idle-back-02.png',
  'player-up-2': 'sprites/player/player_idle-back-03.png',
  'player-up-3': 'sprites/player/player_idle-back-04.png',
  'player-left-0': 'sprites/player/player_idle-leftt-01.png',
  'player-left-1': 'sprites/player/player_idle-leftt-02.png',
  'player-left-2': 'sprites/player/player_idle-leftt-03.png',
  'player-left-3': 'sprites/player/player_idle-leftt-04.png',
  'player-right-0': 'sprites/player/player_idle-right-01.png',
  'player-right-1': 'sprites/player/player_idle-right-02.png',
  'player-right-2': 'sprites/player/player_idle-right-03.png',
  'player-right-3': 'sprites/player/player_idle-right-04.png'
};

// Cara ganti set lain: timpa mapping di atas (key tetap), atau set null
// untuk kembali 100% prosedural.
