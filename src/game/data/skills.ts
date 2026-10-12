import type { JobId } from './jobs';

// Batch N: 3 skill aktif per job. Slot 0 = skill lama, slot 1-2 = baru.
// Tombol: Q/1, 2, 3. MP + cooldown per skill.
export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  mpCost: number;
  cooldownMs: number;
  /** Waktu cast ms (0 = instan). Berkurang 0.5 dtk/Lv, min 1.5 dtk. */
  castMs?: number;
}

export const SKILLS: Record<JobId, SkillDef[]> = {
  warrior: [
    {
      id: 'whirlwind',
      name: 'Whirlwind',
      icon: '🌪️',
      desc: 'AoE 360° radius 115, 150% dmg.',
      mpCost: 15,
      cooldownMs: 8000
    },
    {
      id: 'bulwark',
      name: 'Bulwark',
      icon: '🛡️',
      desc: 'Perisai 6 dtk: damage -40%, block+.',
      mpCost: 10,
      cooldownMs: 14000
    },
    {
      id: 'leap-slam',
      name: 'Leap Slam',
      icon: '💥',
      desc: 'Lompat 130px + AoE 100 (130%).',
      mpCost: 12,
      cooldownMs: 10000
    }
  ],
  mage: [
    {
      id: 'fireball',
      name: 'Fireball',
      icon: '🔥',
      desc: 'Auto-target homing 200% dmg + ledakan 65px (50%). Cast 3.5 dtk (berkurang per level).',
      mpCost: 12,
      cooldownMs: 5000,
      castMs: 3500
    },
    {
      id: 'frost-nova',
      name: 'Frost Nova',
      icon: '❄️',
      desc: 'AoE 130 di sekitar (100%) + slow 4 dtk.',
      mpCost: 14,
      cooldownMs: 12000
    },
    {
      id: 'blink',
      name: 'Blink',
      icon: '✨',
      desc: 'Teleport 170px ke arah hadap.',
      mpCost: 8,
      cooldownMs: 8000
    }
  ],
  archer: [
    {
      id: 'double-shot',
      name: 'Double Shot',
      icon: '🎯',
      desc: '2 panah homing ke 2 target terdekat di depan.',
      mpCost: 10,
      cooldownMs: 6000
    },
    {
      id: 'arrow-rain',
      name: 'Arrow Rain',
      icon: '🌧️',
      desc: 'Hujan panah di target (160%, r85, jeda 0.7 dtk).',
      mpCost: 14,
      cooldownMs: 12000
    },
    {
      id: 'swift',
      name: 'Swift',
      icon: '💨',
      desc: '6 dtk: serang +30% cepat, gerak +15%.',
      mpCost: 8,
      cooldownMs: 16000
    }
  ]
};

export function getSkill(job: JobId, slot: number): SkillDef | undefined {
  return SKILLS[job]?.[slot];
}
