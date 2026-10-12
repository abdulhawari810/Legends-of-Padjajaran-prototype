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
    // static body: node tidak akan terdorong oleh player (aman dari masalah
    // saling-dorong yang sama seperti player<->monster).
    scene.physics.add.existing(this, true);
    // body 26x26 di kaki sprite (seperti pohon blocking) supaya player tertahan
    // oleh "batu/herbanya", bukan oleh kotak kosong di atas sprite.
    this.setSize(26, 26);
    this.setOffset(3, 6);
    this.setDepth(10 + (y * 0.01));
  }
}
