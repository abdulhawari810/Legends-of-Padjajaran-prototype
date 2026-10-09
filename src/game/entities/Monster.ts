import Phaser from 'phaser';
import type { MonsterDef } from '../data/monsters';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: MonsterDef;
  maxHp: number;
  hp: number;
  alive = true;
  spawnX: number;
  spawnY: number;
  lastAttackAt = 0;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef) {
    super(scene, x, y, def.texture);
    this.def = def;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.spawnX = x;
    this.spawnY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.setDepth(5);

    this.hpBar = scene.add.graphics().setDepth(6);
    this.drawHpBar();

    // pulse idle via scale agar tidak tarung dengan velocity kejar
    scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.08 },
      duration: 900 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout'
    });
  }

  private drawHpBar() {
    this.hpBar.clear();
    if (!this.alive) return;
    const w = 32;
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(this.x - w / 2, this.y - 26, w, 5);
    this.hpBar.fillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444, 1);
    this.hpBar.fillRect(this.x - w / 2, this.y - 26, w * pct, 5);
  }

  updateBar() {
    this.drawHpBar();
  }

  /** return true jika mati */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && this.clearTint());
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.setVelocity(0, 0);
      this.drawHpBar();
      return true;
    }
    this.drawHpBar();
    return false;
  }

  canAttackMonster(now: number): boolean {
    return now - this.lastAttackAt >= this.def.attackCooldownMs;
  }

  markAttacked(now: number) {
    this.lastAttackAt = now;
  }

  rollMonsterDamage(): number {
    return Math.max(1, this.def.atk + Phaser.Math.Between(-1, 2));
  }

  /** AI kejar: return true jika dalam jarak serang */
  chaseOrHold(px: number, py: number): boolean {
    if (!this.alive) {
      this.setVelocity(0, 0);
      return false;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    // leash: kalau terlalu jauh dari spawn (>400), balik
    const distSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (distSpawn > 400) {
      this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.def.moveSpeed);
      return false;
    }
    if (dist <= this.def.attackRange) {
      this.setVelocity(0, 0);
      return true;
    }
    if (dist <= this.def.aggroRange) {
      this.scene.physics.moveTo(this, px, py, this.def.moveSpeed);
      return false;
    }
    this.setVelocity(0, 0);
    return false;
  }

  dieWithEffect(onDone: () => void) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.4,
      duration: 250,
      onComplete: () => {
        this.hpBar.destroy();
        this.destroy();
        onDone();
      }
    });
  }
}
