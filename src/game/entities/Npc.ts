import Phaser from 'phaser';
import { worldText } from '../text';
import type { NpcDef } from '../data/map';

const TINT: Record<string, number | null> = {
  elder: null,
  vendor: 0xfcd34d,
  bank: 0xe7e5e4,
  'trainer-warrior': 0xfca5a5,
  'trainer-mage': 0x93c5fd,
  'trainer-archer': 0x86efac
};

export class Npc extends Phaser.Physics.Arcade.Sprite {
  def: NpcDef;
  bubble: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    super(scene, def.x, def.y, 'npc-elder');
    this.def = def;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(10 + ((def.y + 24) * 0.01));
    this.setImmovable(true);
    const tint = TINT[def.kind === 'trainer' ? `trainer-${def.job}` : def.kind];
    if (tint) this.setTint(tint);

    this.bubble = worldText(scene, def.x, def.y - 52, '!', {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 2 }
    })
      .setOrigin(0.5)
      .setDepth(30);
  }

  setClaimable(claimable: boolean, hasProgress: boolean) {
    this.bubble.setText(claimable ? '!' : hasProgress ? '?' : '...');
    this.bubble.setColor(claimable ? '#4ade80' : '#fbbf24');
  }

  destroyAll() {
    this.bubble.destroy();
    this.destroy();
  }
}
