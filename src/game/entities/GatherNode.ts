import Phaser from 'phaser';

export type NodeKind = 'ore' | 'herb';

// Batch Y: node gather ( mining / herbalism ). Non-combat, dipanen via channel.
export class GatherNode extends Phaser.Physics.Arcade.Sprite {
  kind: NodeKind;
  alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: NodeKind) {
    super(scene, x, y, kind === 'ore' ? 'node-ore' : 'node-herb');
    this.kind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(10 + (y * 0.01));
  }
}
