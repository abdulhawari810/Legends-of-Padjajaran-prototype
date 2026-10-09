// Definisi 1 map awal: Greenfield 40x30 tile @32px = 1280x960 world.
export const MAP_DEF = {
  id: 'greenfield',
  name: 'Greenfield',
  widthTiles: 40,
  heightTiles: 30,
  tileSize: 32,
  get widthPx() {
    return this.widthTiles * this.tileSize;
  },
  get heightPx() {
    return this.heightTiles * this.tileSize;
  },
  playerSpawn: { x: 640, y: 480 },
  monsterSpawns: [
    { monsterId: 'slime', x: 320, y: 300, count: 4 },
    { monsterId: 'goblin', x: 900, y: 350, count: 3 },
    { monsterId: 'skeleton', x: 640, y: 760, count: 2 }
  ],
  // rintangan kotak sederhana (x,y,w,h dalam px)
  obstacles: [
    { x: 0, y: 0, w: 1280, h: 32 }, // top wall
    { x: 0, y: 928, w: 1280, h: 32 }, // bottom wall
    { x: 0, y: 0, w: 32, h: 960 }, // left
    { x: 1248, y: 0, w: 32, h: 960 }, // right
    { x: 440, y: 200, w: 120, h: 80 }, // rumah / batu
    { x: 760, y: 620, w: 140, h: 90 }
  ]
} as const;
