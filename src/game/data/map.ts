// Definisi map: Greenfield 52x38 + Dark Forest 52x40 + Gua 44x34 (@32px).
export type MapId = 'greenfield' | 'dark' | 'cave';
export type MapTheme = 'green' | 'dark' | 'cave';

export interface PortalDef {
  x: number;
  y: number;
  r: number;
  to: MapId;
  /** titik mendarat di map tujuan */
  spawn: { x: number; y: number };
}

export interface NpcDef {
  id: string;
  name: string;
  kind: 'elder' | 'vendor' | 'bank' | 'trainer';
  job?: 'warrior' | 'mage' | 'archer';
  x: number;
  y: number;
  greet: string;
}

export interface GatherDef {
  kind: 'ore' | 'herb';
  x: number;
  y: number;
}

export interface MapDefShape {
  id: MapId;
  name: string;
  theme: MapTheme;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  readonly widthPx: number;
  readonly heightPx: number;
  playerSpawn: { x: number; y: number };
  healZone: { x: number; y: number; r: number };
  /** Zona aman kota: monster tidak kejar/masuk (lepas aggro). Opsional. */
  town?: { x: number; y: number; r: number };
  pond?: { x: number; y: number; rx: number; ry: number };
  trees: Array<{ x: number; y: number }>;
  houses: Array<{ x: number; y: number; w: number; h: number }>;
  monsterSpawns: Array<{ monsterId: string; x: number; y: number; count: number; level: number }>;
  obstacles: Array<{ x: number; y: number; w: number; h: number }>;
  portals: PortalDef[];
  npcs: NpcDef[];
  gather: GatherDef[];
}

function makeDef(d: Omit<MapDefShape, 'widthPx' | 'heightPx'>): MapDefShape {
  return {
    ...d,
    get widthPx() {
      return this.widthTiles * this.tileSize;
    },
    get heightPx() {
      return this.heightTiles * this.tileSize;
    }
  };
}

export const MAP_DEF = makeDef({
  id: 'greenfield',
  name: 'Greenfield',
  theme: 'green',
  widthTiles: 58,
  heightTiles: 42,
  tileSize: 32,
  playerSpawn: { x: 640, y: 480 },
  healZone: { x: 640, y: 480, r: 70 },
  town: { x: 640, y: 480, r: 300 },
  pond: { x: 200, y: 780, rx: 90, ry: 55 },
  trees: [
    { x: 120, y: 120 },
    { x: 220, y: 640 },
    { x: 420, y: 620 },
    { x: 1050, y: 200 },
    { x: 1150, y: 550 },
    { x: 150, y: 480 },
    { x: 990, y: 870 },
    { x: 350, y: 860 },
    { x: 700, y: 140 },
    { x: 1120, y: 760 },
    { x: 1450, y: 300 },
    { x: 1520, y: 700 },
    { x: 1300, y: 1050 },
    { x: 500, y: 1100 },
    { x: 1600, y: 500 },
    { x: 1500, y: 1000 },
    { x: 700, y: 1250 }
  ],
  houses: [
    { x: 440, y: 200, w: 120, h: 80 },
    { x: 760, y: 620, w: 140, h: 90 }
  ],
  monsterSpawns: [
    { monsterId: 'slime', x: 250, y: 250, count: 4, level: 1 },
    { monsterId: 'goblin', x: 1000, y: 300, count: 3, level: 2 },
    { monsterId: 'skeleton', x: 640, y: 880, count: 2, level: 3 },
    { monsterId: 'skeleton-elite', x: 900, y: 830, count: 1, level: 5 },
    { monsterId: 'slime', x: 1300, y: 500, count: 3, level: 2 },
    { monsterId: 'goblin', x: 1450, y: 950, count: 2, level: 3 }
  ],
  obstacles: [
    { x: 0, y: 0, w: 1856, h: 32 }, // top wall
    { x: 0, y: 1312, w: 1856, h: 32 }, // bottom wall
    { x: 0, y: 0, w: 32, h: 1344 }, // left
    { x: 1824, y: 0, w: 32, h: 1344 }, // right
    { x: 440, y: 200, w: 120, h: 80 }, // rumah
    { x: 760, y: 620, w: 140, h: 90 }, // rumah
    { x: 110, y: 725, w: 180, h: 110 } // kolam (approx pond)
  ],
  portals: [{ x: 640, y: 70, r: 50, to: 'dark', spawn: { x: 640, y: 890 } }],
  gather: [
    { kind: 'ore', x: 300, y: 700 },
    { kind: 'ore', x: 950, y: 780 },
    { kind: 'herb', x: 500, y: 300 },
    { kind: 'herb', x: 900, y: 600 },
    { kind: 'herb', x: 1150, y: 400 }
  ],
  npcs: [
    { id: 'elder', name: '🧙 Tetua Greenfield', kind: 'elder', x: 640, y: 400, greet: 'Bantu kami bersihkan monster, hadiah menantimu.' },
    { id: 'vendor', name: '🛒 Pedagang Keliling', kind: 'vendor', x: 720, y: 470, greet: 'Beli potion, jual hasil buruanmu di sini!' },
    { id: 'bank', name: '🏦 Bankir', kind: 'bank', x: 560, y: 540, greet: 'Simpan gold & barangmu. Brankas aman dari penalti mati.' },
    { id: 'trainer-warrior', name: '⚔️ Pelatih Warrior', kind: 'trainer', job: 'warrior', x: 500, y: 400, greet: 'Otot dan keberanian! Tempa skill di sini.' },
    { id: 'trainer-mage', name: '🔮 Pelatih Mage', kind: 'trainer', job: 'mage', x: 780, y: 420, greet: 'Rasakan aliran mana! Tempa skill di sini.' },
    { id: 'trainer-archer', name: '🏹 Pelatih Archer', kind: 'trainer', job: 'archer', x: 640, y: 600, greet: 'Satu panah, satu nyawa. Tempa skill di sini.' }
  ]
});

export const MAP_DARK = makeDef({
  id: 'dark',
  name: 'Dark Forest',
  theme: 'dark',
  widthTiles: 52,
  heightTiles: 40,
  tileSize: 32,
  playerSpawn: { x: 640, y: 900 },
  healZone: { x: 640, y: 900, r: 70 },
  trees: [
    { x: 140, y: 140 },
    { x: 420, y: 700 },
    { x: 760, y: 300 },
    { x: 1150, y: 180 },
    { x: 1250, y: 600 },
    { x: 200, y: 880 },
    { x: 900, y: 950 },
    { x: 520, y: 180 },
    { x: 1300, y: 300 },
    { x: 1450, y: 800 },
    { x: 400, y: 1150 },
    { x: 800, y: 1150 }
  ],
  houses: [{ x: 600, y: 480, w: 120, h: 90 }],
  monsterSpawns: [
    { monsterId: 'wolf', x: 400, y: 400, count: 4, level: 4 },
    { monsterId: 'orc', x: 1000, y: 450, count: 3, level: 5 },
    { monsterId: 'golem', x: 700, y: 250, count: 2, level: 6 },
    { monsterId: 'orc', x: 1250, y: 950, count: 2, level: 6 }
  ],
  obstacles: [
    { x: 0, y: 0, w: 1664, h: 32 },
    { x: 0, y: 1248, w: 1664, h: 32 },
    { x: 0, y: 0, w: 32, h: 1280 },
    { x: 1632, y: 0, w: 32, h: 1280 },
    { x: 600, y: 480, w: 120, h: 90 }, // gubuk
    { x: 300, y: 200, w: 80, h: 60 }, // batu
    { x: 1050, y: 700, w: 90, h: 70 }, // batu
    { x: 1200, y: 300, w: 90, h: 70 } // batu
  ],
  portals: [
    { x: 640, y: 1010, r: 50, to: 'greenfield', spawn: { x: 640, y: 150 } },
    { x: 640, y: 70, r: 50, to: 'cave', spawn: { x: 704, y: 880 } }
  ],
  gather: [
    { kind: 'ore', x: 350, y: 600 },
    { kind: 'ore', x: 850, y: 800 },
    { kind: 'ore', x: 1200, y: 500 },
    { kind: 'herb', x: 500, y: 300 },
    { kind: 'herb', x: 1000, y: 850 }
  ],
  npcs: []
});

export const MAP_CAVE = makeDef({
  id: 'cave',
  name: 'Crystal Cave',
  theme: 'cave',
  widthTiles: 44,
  heightTiles: 34,
  tileSize: 32,
  playerSpawn: { x: 704, y: 940 },
  healZone: { x: 704, y: 940, r: 70 },
  trees: [
    { x: 150, y: 150 },
    { x: 1250, y: 160 },
    { x: 180, y: 850 },
    { x: 1230, y: 880 }
  ],
  houses: [],
  monsterSpawns: [
    { monsterId: 'bat', x: 400, y: 400, count: 4, level: 7 },
    { monsterId: 'cultist', x: 1000, y: 550, count: 3, level: 8 },
    { monsterId: 'cave-troll', x: 704, y: 250, count: 1, level: 10 }
  ],
  obstacles: [
    { x: 0, y: 0, w: 1408, h: 32 },
    { x: 0, y: 1056, w: 1408, h: 32 },
    { x: 0, y: 0, w: 32, h: 1088 },
    { x: 1376, y: 0, w: 32, h: 1088 },
    { x: 300, y: 300, w: 90, h: 90 }, // pilar
    { x: 1010, y: 300, w: 90, h: 90 }, // pilar
    { x: 300, y: 700, w: 90, h: 90 }, // pilar
    { x: 1010, y: 700, w: 90, h: 90 }, // pilar
    { x: 584, y: 520, w: 240, h: 150 } // lava tengah
  ],
  portals: [{ x: 704, y: 1000, r: 50, to: 'dark', spawn: { x: 640, y: 150 } }],
  gather: [
    { kind: 'ore', x: 400, y: 700 },
    { kind: 'ore', x: 1000, y: 700 },
    { kind: 'ore', x: 500, y: 250 },
    { kind: 'ore', x: 900, y: 250 },
    { kind: 'herb', x: 500, y: 850 },
    { kind: 'herb', x: 900, y: 850 }
  ],
  npcs: []
});

export const MAPS: Record<MapId, MapDefShape> = {
  greenfield: MAP_DEF,
  dark: MAP_DARK,
  cave: MAP_CAVE
};

export function getMapDef(id: string): MapDefShape {
  return (MAPS as Record<string, MapDefShape>)[id] ?? MAP_DEF;
}
