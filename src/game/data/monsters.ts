// Batch A FINAL tuning (TTK target Lv1 + starter weapon):
//  Warrior P43 / Mage M51 / Archer R44 (dengan senjata).
//  Slime 70HP  -> 2 hit semua job (43*2, 51+ variance, 44*2). Tutorial aman.
//  Goblin 110HP -> 3 hit (43*3=129, 51*3, 44*3). TTK 1.2-1.8s.
//  Skeleton 160HP -> 4 hit. TTK 1.5-2.4s.
//  Elite 320HP -> ~6-7 hit basic / 3-4 hit + skill. Endgame 1 map.
// Damage ke player (mitigasi armor 21/8/13):
//  Slime 5   -> W4 / M5 / A4 per 1.6s  (DPS ~3). 1 slime 60-80s untuk bunuh player.
//  Goblin 9  -> W7 / M8 / A8 per 1.3s  (DPS ~6). 2 goblin ~12 DPS -> mage 14s, warrior 20s.
//  Skeleton 13 -> W11 / M12 / A11 per 1.1s (DPS ~10). 2 skeleton fokus -> mage ~8s. Potion 50 = 28% HP mage.
// Aggro tiered agar tidak keroyok sekaligus: slime 120 pasif, goblin 160, skeleton 190.
// Speed semua < player (160-190) agar mage/archer bisa kite.
export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  exp: number;
  texture: string;
  aggroRange: number;
  attackRange: number;
  moveSpeed: number;
  attackCooldownMs: number;
  /** skala visual (boss 1.5). Default 1. */
  scale?: number;
  /** jeda respawn ms. Default 4000. */
  respawnMs?: number;
  boss?: boolean;
  /** id monster yang di-summon boss. Default 'skeleton'. */
  summonId?: string;
  /** damage mentah AoE boss. Default 25. */
  aoeDmg?: number;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'slime',
    name: 'Slime',
    hp: 70,
    atk: 5,
    exp: 12,
    texture: 'monster-slime',
    aggroRange: 120,
    attackRange: 46,
    moveSpeed: 40,
    attackCooldownMs: 1600
  },
  {
    id: 'goblin',
    name: 'Goblin',
    hp: 110,
    atk: 9,
    exp: 22,
    texture: 'monster-goblin',
    aggroRange: 160,
    attackRange: 46,
    moveSpeed: 70,
    attackCooldownMs: 1300
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    hp: 160,
    atk: 13,
    exp: 38,
    texture: 'monster-skeleton',
    aggroRange: 190,
    attackRange: 48,
    moveSpeed: 60,
    attackCooldownMs: 1100
  },
  {
    id: 'skeleton-elite',
    name: 'Skeleton Elite',
    hp: 320,
    atk: 18,
    exp: 85,
    texture: 'monster-skeleton-elite',
    aggroRange: 220,
    attackRange: 60,
    moveSpeed: 58,
    attackCooldownMs: 1500,
    scale: 1.5,
    respawnMs: 25000,
    boss: true
  },
  // --- Dark Forest (Batch I) ---
  {
    id: 'wolf',
    name: 'Dire Wolf',
    hp: 140,
    atk: 11,
    exp: 30,
    texture: 'monster-wolf',
    aggroRange: 200,
    attackRange: 46,
    moveSpeed: 85,
    attackCooldownMs: 1200
  },
  {
    id: 'orc',
    name: 'Orc',
    hp: 220,
    atk: 15,
    exp: 55,
    texture: 'monster-orc',
    aggroRange: 170,
    attackRange: 48,
    moveSpeed: 55,
    attackCooldownMs: 1400
  },
  {
    id: 'golem',
    name: 'Stone Golem',
    hp: 300,
    atk: 17,
    exp: 75,
    texture: 'monster-golem',
    aggroRange: 160,
    attackRange: 50,
    moveSpeed: 45,
    attackCooldownMs: 1600
  },
  // --- Crystal Cave (Batch O) ---
  {
    id: 'bat',
    name: 'Cave Bat',
    hp: 90,
    atk: 9,
    exp: 25,
    texture: 'monster-bat',
    aggroRange: 220,
    attackRange: 44,
    moveSpeed: 95,
    attackCooldownMs: 1000
  },
  {
    id: 'cultist',
    name: 'Cultist',
    hp: 180,
    atk: 16,
    exp: 65,
    texture: 'monster-cultist',
    aggroRange: 180,
    attackRange: 46,
    moveSpeed: 60,
    attackCooldownMs: 1400
  },
  {
    id: 'cave-troll',
    name: 'Cave Troll',
    hp: 450,
    atk: 22,
    exp: 140,
    texture: 'monster-troll',
    aggroRange: 230,
    attackRange: 62,
    moveSpeed: 52,
    attackCooldownMs: 1600,
    scale: 1.6,
    respawnMs: 30000,
    boss: true,
    summonId: 'bat',
    aoeDmg: 34
  }
];
