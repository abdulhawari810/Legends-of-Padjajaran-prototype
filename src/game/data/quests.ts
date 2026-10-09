export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  killTarget: string; // monster id
  killCount: number;
  rewardExp: number;
  rewardItemId?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q-slime-01',
    title: 'Pembersihan Slime',
    desc: 'Kalahkan 3 Slime di Greenfield.',
    killTarget: 'slime',
    killCount: 3,
    rewardExp: 30,
    rewardItemId: 'potion-s'
  },
  {
    id: 'q-goblin-01',
    title: 'Ancaman Goblin',
    desc: 'Kalahkan 3 Goblin.',
    killTarget: 'goblin',
    killCount: 3,
    rewardExp: 60
  }
];
