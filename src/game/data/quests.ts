export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  killTarget: string; // monster id
  killCount: number;
  rewardExp: number;
  rewardItemId?: string;
  /** quest prasyarat (harus done dulu agar terbuka) */
  requires?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q-start-01',
    title: 'Slime Pertama',
    desc: 'Tutorial: kalahkan 1 Slime di Greenfield.',
    killTarget: 'slime',
    killCount: 1,
    rewardExp: 10
  },
  {
    id: 'q-slime-01',
    title: 'Pembersihan Slime',
    desc: 'Kalahkan 3 Slime di Greenfield.',
    killTarget: 'slime',
    killCount: 3,
    rewardExp: 30,
    rewardItemId: 'potion-s',
    requires: 'q-start-01'
  },
  {
    id: 'q-goblin-01',
    title: 'Ancaman Goblin',
    desc: 'Kalahkan 3 Goblin.',
    killTarget: 'goblin',
    killCount: 3,
    rewardExp: 60,
    requires: 'q-slime-01'
  },
  {
    id: 'q-skeleton-01',
    title: 'Tulang Berserakan',
    desc: 'Kalahkan 2 Skeleton di selatan Greenfield.',
    killTarget: 'skeleton',
    killCount: 2,
    rewardExp: 100,
    rewardItemId: 'potion-s',
    requires: 'q-goblin-01'
  },
  {
    id: 'q-elite-01',
    title: 'Elite Selatan',
    desc: 'Kalahkan 1 Skeleton Elite (tengkorak besar bermahkota).',
    killTarget: 'skeleton-elite',
    killCount: 1,
    rewardExp: 150,
    rewardItemId: 'potion-s',
    requires: 'q-skeleton-01'
  },
  {
    id: 'q-wolf-01',
    title: 'Lolongan Kegelapan',
    desc: 'Kalahkan 3 Dire Wolf di Dark Forest (lewat portal utara).',
    killTarget: 'wolf',
    killCount: 3,
    rewardExp: 90,
    rewardItemId: 'potion-s',
    requires: 'q-elite-01'
  },
  {
    id: 'q-orc-01',
    title: 'Gempuran Orc',
    desc: 'Kalahkan 3 Orc di Dark Forest.',
    killTarget: 'orc',
    killCount: 3,
    rewardExp: 130,
    rewardItemId: 'potion-s',
    requires: 'q-wolf-01'
  },
  {
    id: 'q-golem-01',
    title: 'Hati Batu',
    desc: 'Kalahkan 2 Stone Golem di Dark Forest.',
    killTarget: 'golem',
    killCount: 2,
    rewardExp: 180,
    rewardItemId: 'potion-s',
    requires: 'q-orc-01'
  },
  {
    id: 'q-bat-01',
    title: 'Gaduh Gua',
    desc: 'Kalahkan 4 Cave Bat di Crystal Cave (portal utara Dark Forest).',
    killTarget: 'bat',
    killCount: 4,
    rewardExp: 120,
    rewardItemId: 'potion-s',
    requires: 'q-golem-01'
  },
  {
    id: 'q-cultist-01',
    title: 'Sesat Kultus',
    desc: 'Kalahkan 3 Cultist di Crystal Cave.',
    killTarget: 'cultist',
    killCount: 3,
    rewardExp: 160,
    rewardItemId: 'potion-s',
    requires: 'q-bat-01'
  },
  {
    id: 'q-troll-01',
    title: 'Raja Gua',
    desc: 'Kalahkan 1 Cave Troll di jantung gua.',
    killTarget: 'cave-troll',
    killCount: 1,
    rewardExp: 250,
    rewardItemId: 'potion-s',
    requires: 'q-cultist-01'
  }
];
