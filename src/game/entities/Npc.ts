import Phaser from 'phaser';

export class Npc extends Phaser.Physics.Arcade.Sprite {
  bubble: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'npc-elder');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(5);
    this.setImmovable(true);

    this.bubble = scene.add
      .text(x, y - 52, '!', {
        fontSize: '18px',
        color: '#fbbf24',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 6, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(7);
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
