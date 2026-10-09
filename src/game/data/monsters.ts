// Batch A FINAL tuning (TTK target Lv1 + starter weapon):
//  Warrior P43 / Mage M51 / Archer R44 (dengan senjata).
//  Slime 70HP  -> 2 hit semua job (43*2, 51+ variance, 44*2). Tutorial aman.
//  Goblin 110HP -> 3 hit (43*3=129, 51*3, 44*3). TTK 1.2-1.8s.
//  Skeleton 160HP -> 4 hit. TTK 1.5-2.4s. Mini-boss 1 map.
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
    attackRange: 30,
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
    attackRange: 30,
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
    attackRange: 32,
    moveSpeed: 60,
    attackCooldownMs: 1100
  }
];
