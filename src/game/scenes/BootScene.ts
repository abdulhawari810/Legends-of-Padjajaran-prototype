import Phaser from 'phaser';

// BootScene: generate texture prosedural agar scaffolding jalan
// tanpa asset eksternal. Nanti ganti dengan sprite sheet asli.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.createPlayerTextures();
    this.createMonsterTextures();
    this.createProjectileTextures();
    this.createParticleTextures();
    this.createNpcTexture();
    this.scene.start('Map');
  }

  private createPlayerTextures() {
    // 32x48 karakter top-down sederhana, beda arah = beda aksen.
    // 4 frame jalan per arah dibuat via tint/offset kaki.
    const directions = ['down', 'up', 'left', 'right'] as const;
    const baseColors: Record<string, number> = {
      down: 0x3b82f6,
      up: 0x22c55e,
      left: 0xf59e0b,
      right: 0xef4444
    };

    directions.forEach((dir) => {
      for (let frame = 0; frame < 4; frame++) {
        const key = `player-${dir}-${frame}`;
        if (this.textures.exists(key)) continue;
        const g = this.add.graphics();
        // badan
        g.fillStyle(0x1f2937, 1);
        g.fillRect(4, 0, 24, 48);
        // baju sesuai arah
        g.fillStyle(baseColors[dir], 1);
        g.fillRect(6, 10, 20, 22);
        // kepala
        g.fillStyle(0xfcd7a8, 1);
        g.fillRect(9, 2, 14, 12);
        // mata arah
        g.fillStyle(0x111827, 1);
        if (dir === 'down') {
          g.fillRect(11, 8, 3, 3);
          g.fillRect(18, 8, 3, 3);
        } else if (dir === 'up') {
          // belakang kepala, tanpa mata
        } else if (dir === 'left') {
          g.fillRect(9, 8, 3, 3);
        } else {
          g.fillRect(20, 8, 3, 3);
        }
        // kaki animasi jalan (2 frame gerak)
        const legOffset = frame % 2 === 0 ? 0 : 2;
        g.fillStyle(0x0f172a, 1);
        g.fillRect(7, 34 + legOffset, 7, 12 - legOffset);
        g.fillRect(18, 34 - legOffset, 7, 12 + legOffset);
        g.generateTexture(key, 32, 48);
        g.destroy();
      }
    });

    // idle = frame 0 tiap arah
    (['down', 'up', 'left', 'right'] as const).forEach((dir) => {
      if (!this.textures.exists(`player-${dir}`)) {
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0);
        g.generateTexture(`player-${dir}-alias`, 1, 1);
        g.destroy();
      }
    });
  }

  private createMonsterTextures() {
    const defs: Array<[string, number]> = [
      ['slime', 0x22c55e],
      ['goblin', 0x84cc16],
      ['skeleton', 0xe5e7eb],
      ['wolf', 0x64748b],
      ['orc', 0x4d7c0f],
      ['golem', 0x78716c],
      ['bat', 0x8b5cf6],
      ['cultist', 0x991b1b]
    ];
    defs.forEach(([name, color]) => {
      if (this.textures.exists(`monster-${name}`)) return;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 8, 32, 24, 8);
      g.fillStyle(0x111827, 1);
      g.fillRect(8, 16, 5, 5);
      g.fillRect(19, 16, 5, 5);
      g.generateTexture(`monster-${name}`, 32, 32);
      g.destroy();
    });
    // Elite: skeleton besar bermahkota + mata merah
    if (!this.textures.exists('monster-skeleton-elite')) {
      const g = this.add.graphics();
      g.fillStyle(0xe5e7eb, 1);
      g.fillRoundedRect(2, 12, 40, 30, 10);
      g.fillStyle(0xef4444, 1);
      g.fillRect(11, 22, 7, 7);
      g.fillRect(26, 22, 7, 7);
      // mahkota emas
      g.fillStyle(0xfbbf24, 1);
      g.fillTriangle(6, 12, 12, 0, 18, 12);
      g.fillTriangle(18, 12, 24, 0, 30, 12);
      g.fillTriangle(30, 12, 36, 0, 38, 12);
      g.fillRect(6, 10, 32, 4);
      g.generateTexture('monster-skeleton-elite', 44, 44);
      g.destroy();
    }
    // Troll: raksasa batu kehijauan + mata kuning
    if (!this.textures.exists('monster-troll')) {
      const g = this.add.graphics();
      g.fillStyle(0x4d7c0f, 1);
      g.fillRoundedRect(2, 10, 44, 34, 10);
      g.fillStyle(0x365314, 1);
      g.fillRect(2, 34, 12, 14);
      g.fillRect(34, 34, 12, 14);
      g.fillStyle(0xfbbf24, 1);
      g.fillRect(13, 20, 8, 8);
      g.fillRect(27, 20, 8, 8);
      g.generateTexture('monster-troll', 48, 48);
      g.destroy();
    }
  }

  private createProjectileTextures() {
    if (!this.textures.exists('proj-arrow')) {
      const g = this.add.graphics();
      g.fillStyle(0xfbbf24, 1);
      g.fillRect(0, 6, 20, 4);
      g.fillTriangle(20, 2, 20, 14, 28, 8);
      g.generateTexture('proj-arrow', 28, 16);
      g.destroy();
    }
    if (!this.textures.exists('proj-fire')) {
      const g = this.add.graphics();
      g.fillStyle(0xef4444, 1);
      g.fillCircle(8, 8, 8);
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(8, 8, 4);
      g.generateTexture('proj-fire', 16, 16);
      g.destroy();
    }
    if (!this.textures.exists('slash')) {
      const g = this.add.graphics();
      g.lineStyle(5, 0xffffff, 1);
      g.strokeCircle(32, 32, 24);
      g.generateTexture('slash', 64, 64);
      g.destroy();
    }
  }

  private createParticleTextures() {
    if (this.textures.exists('part-dot')) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('part-dot', 8, 8);
    g.destroy();
  }

  private createNpcTexture() {
    if (this.textures.exists('npc-elder')) return;
    const g = this.add.graphics();
    // jubah ungu tetua
    g.fillStyle(0x6d28d9, 1);
    g.fillRoundedRect(2, 14, 28, 32, 6);
    // kepala + jenggot putih
    g.fillStyle(0xfcd7a8, 1);
    g.fillCircle(16, 12, 9);
    g.fillStyle(0xe5e7eb, 1);
    g.fillRect(9, 14, 14, 8);
    // tongkat
    g.fillStyle(0x92400e, 1);
    g.fillRect(26, 4, 3, 40);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(27, 4, 4);
    g.generateTexture('npc-elder', 32, 48);
    g.destroy();
  }
}
