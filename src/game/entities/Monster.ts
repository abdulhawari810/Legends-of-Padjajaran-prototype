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
  private provokedUntil = 0;
  evading = false;
  /** Batch N: slow habis waktu (frost nova). */
  slowUntil = 0;
  /** Batch K: jadwal pola boss (ms scene.time). */
  nextAoEAt = 0;
  nextSummonAt = 0;
  private baseScale = 1;
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

    this.baseScale = def.scale ?? 1;
    this.setScale(this.baseScale);
    this.setDepth(10 + ((y + 16 * this.baseScale) * 0.01));

    this.hpBar = scene.add.graphics().setDepth(6);
    this.drawHpBar();

    // pulse idle via scale agar tidak tarung dengan velocity kejar
    scene.tweens.add({
      targets: this,
      scale: { from: this.baseScale, to: this.baseScale * 1.08 },
      duration: 900 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout'
    });
  }

  private drawHpBar() {
    this.hpBar.clear();
    if (!this.alive) return;
    this.hpBar.setDepth(this.depth + 0.05);
    const w = this.def.boss ? 48 : 32;
    const h = this.def.boss ? 6 : 5;
    const yOff = this.def.boss ? -36 : -26;
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(this.x - w / 2, this.y + yOff, w, h);
    this.hpBar.fillStyle(
      this.def.boss ? 0xa855f7 : pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444,
      1
    );
    this.hpBar.fillRect(this.x - w / 2, this.y + yOff, w * pct, h);
  }

  updateBar() {
    this.setDepth(10 + ((this.y + this.displayHeight / 2) * 0.01));
    this.drawHpBar();
  }

  /** return true jika mati */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    if (this.evading) return false; // immune saat evade
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && !this.evading && this.clearTint());
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

  /** Dipanggil saat kena damage agar langsung mengejar player walau di luar aggro. */
  provoke(now: number, durationMs = 5000) {
    if (!this.alive || this.evading) return;
    this.provokedUntil = Math.max(this.provokedUntil, now + durationMs);
  }

  /** Jalan kembali ke titik spawn. Return true jika sudah sampai. */
  returnHome(): boolean {
    if (!this.alive) return true;
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    if (d <= 12) {
      this.setVelocity(0, 0);
      return true;
    }
    this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.def.moveSpeed);
    return false;
  }

  /** AI kejar: return true jika dalam jarak serang */
  chaseOrHold(px: number, py: number, now = 0): boolean {
    if (!this.alive) {
      this.setVelocity(0, 0);
      return false;
    }
    const distSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    // sedang evade: abaikan player, lari pulang sampai sampai + full heal
    if (this.evading) {
      if (distSpawn <= 12) {
        this.evading = false;
        this.hp = this.maxHp;
        this.provokedUntil = 0;
        this.setVelocity(0, 0);
        this.clearTint();
        this.setAlpha(1);
        this.drawHpBar();
        return false;
      }
      this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.def.moveSpeed * 1.8);
      return false;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    // leash: kalau terlalu jauh dari spawn (>400), masuk mode evade
    if (distSpawn > 400) {
      this.evading = true;
      this.provokedUntil = 0;
      this.setVelocity(0, 0);
      this.setTint(0x9ca3af);
      this.setAlpha(0.7);
      this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.def.moveSpeed * 1.8);
      return false;
    }
    if (dist <= this.def.attackRange) {
      this.setVelocity(0, 0);
      return true;
    }
    const provoked = now < this.provokedUntil;
    const slowed = now < this.slowUntil;
    const chaseSpeed = slowed ? this.def.moveSpeed * 0.5 : this.def.moveSpeed;
    if (dist <= this.def.aggroRange || (provoked && dist <= 600)) {
      this.scene.physics.moveTo(this, px, py, chaseSpeed);
      return false;
    }
    // idle: tidak diam di tengah jalan, masuk evade sampai sampai spawn.
    // Selama pulang: immune + abaikan player walau didekati/dipukul.
    if (distSpawn > 16) {
      this.evading = true;
      this.provokedUntil = 0;
      this.setTint(0x9ca3af);
      this.setAlpha(0.7);
      this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.def.moveSpeed * 1.8);
      return false;
    }
    this.returnHome();
    return false;
  }

  dieWithEffect(onDone: () => void) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.baseScale * 1.4,
      duration: 250,
      onComplete: () => {
        this.hpBar.destroy();
        this.destroy();
        onDone();
      }
    });
  }
}
