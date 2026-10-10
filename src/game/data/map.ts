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
  pond?: { x: number; y: number; rx: number; ry: number };
  trees: Array<{ x: number; y: number }>;
  houses: Array<{ x: number; y: number; w: number; h: number }>;
  monsterSpawns: Array<{ monsterId: string; x: number; y: number; count: number }>;
  obstacles: Array<{ x: number; y: number; w: number; h: number }>;
  portals: PortalDef[];
  npc?: { x: number; y: number };
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
  widthTiles: 52,
  heightTiles: 38,
  tileSize: 32,
  playerSpawn: { x: 640, y: 480 },
  healZone: { x: 640, y: 480, r: 70 },
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
    { x: 500, y: 1100 }
  ],
  houses: [
    { x: 440, y: 200, w: 120, h: 80 },
    { x: 760, y: 620, w: 140, h: 90 }
  ],
  monsterSpawns: [
    { monsterId: 'slime', x: 320, y: 300, count: 4 },
    { monsterId: 'goblin', x: 900, y: 350, count: 3 },
    { monsterId: 'skeleton', x: 640, y: 760, count: 2 },
    { monsterId: 'skeleton-elite', x: 860, y: 810, count: 1 },
    { monsterId: 'slime', x: 1300, y: 500, count: 3 }
  ],
  obstacles: [
    { x: 0, y: 0, w: 1664, h: 32 }, // top wall
    { x: 0, y: 1184, w: 1664, h: 32 }, // bottom wall
    { x: 0, y: 0, w: 32, h: 1216 }, // left
    { x: 1632, y: 0, w: 32, h: 1216 }, // right
    { x: 440, y: 200, w: 120, h: 80 }, // rumah
    { x: 760, y: 620, w: 140, h: 90 }, // rumah
    { x: 110, y: 725, w: 180, h: 110 } // kolam (approx pond)
  ],
  portals: [{ x: 640, y: 70, r: 50, to: 'dark', spawn: { x: 640, y: 890 } }],
  npc: { x: 640, y: 400 }
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
    { monsterId: 'wolf', x: 400, y: 400, count: 4 },
    { monsterId: 'orc', x: 1000, y: 450, count: 3 },
    { monsterId: 'golem', x: 700, y: 250, count: 2 },
    { monsterId: 'orc', x: 1250, y: 950, count: 2 }
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
  ]
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
    { monsterId: 'bat', x: 400, y: 400, count: 4 },
    { monsterId: 'cultist', x: 1000, y: 550, count: 3 },
    { monsterId: 'cave-troll', x: 704, y: 250, count: 1 }
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
  portals: [{ x: 704, y: 1000, r: 50, to: 'dark', spawn: { x: 640, y: 150 } }]
});

export const MAPS: Record<MapId, MapDefShape> = {
  greenfield: MAP_DEF,
  dark: MAP_DARK,
  cave: MAP_CAVE
};

export function getMapDef(id: string): MapDefShape {
  return (MAPS as Record<string, MapDefShape>)[id] ?? MAP_DEF;
}
