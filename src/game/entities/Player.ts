import Phaser from 'phaser';
import { JOBS, type JobId } from '../data/jobs';
import { VirtualInput } from '../input/VirtualInput';
import {
  expForLevel,
  mitigatePhysical,
  rollCrit,
  type Derived,
  type Primary
} from '../data/attributes';
import {
  calcDerivedWithGear,
  equipItem,
  equipWeapon,
  gearBonusFor,
  getEquippedArmorId,
  getEquippedWeaponId,
  starterArmorFor,
  starterWeaponFor
} from '../data/equipment';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface StatsSnapshot {
  jobId: JobId;
  level: number;
  exp: number;
  expNext: number;
  primary: Primary; // efektif = base + gear
  basePrimary: Primary;
  gearPrimary: Primary;
  derived: Derived;
  hp: number;
  mp: number;
  equippedWeaponId: string | null;
  equippedArmorId: string | null;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  jobId: JobId = 'warrior';
  facing: Facing = 'down';
  speed = 170;

  level = 1;
  exp = 0;
  expNext = expForLevel(1);
  primary: Primary = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
  derived!: Derived;
  hp = 1;
  mp = 1;

  attackRange = 70;
  baseCooldownMs = 380;
  isRanged = false;
  projectileTexture = 'proj-arrow';
  dead = false;
  potionCooldownMs = 5000;
  private lastAttackAt = 0;
  private lastPotionAt = -9999;
  private regenAccum = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-down-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setOffset(6, 26);

    this.createAnims();
    this.setupInput();
    this.setJob('warrior');

    window.addEventListener('select-job', ((e: CustomEvent<JobId>) => {
      this.setJob(e.detail);
    }) as EventListener);

    window.addEventListener('use-potion', (() => {
      this.tryUsePotion();
    }) as EventListener);

    window.addEventListener('equipment-changed', (() => {
      this.recalc(false);
      this.emitStats();
    }) as EventListener);
  }

  tryUsePotion(): boolean {
    const now = this.scene.time.now;
    if (this.dead) return false;
    if (now - this.lastPotionAt < this.potionCooldownMs) return false;
    if (this.hp >= this.derived.maxHp) return false;
    this.lastPotionAt = now;
    this.hp = Math.min(this.derived.maxHp, this.hp + 50);
    this.emitStats();
    window.dispatchEvent(new CustomEvent('potion-consumed'));
    window.dispatchEvent(new CustomEvent('potion-used', { detail: this.potionCooldownMs }));
    return true;
  }

  potionCooldownLeft(now: number): number {
    return Math.max(0, this.potionCooldownMs - (now - this.lastPotionAt));
  }

  heal(amount: number) {
    if (this.dead) return;
    this.hp = Math.min(this.derived.maxHp, this.hp + amount);
    this.emitStats();
  }

  /** Damage monster fisik ke player dengan mitigasi WoW. */
  takeDamage(raw: number): { actual: number; dodged: boolean; blocked: boolean; died: boolean } {
    if (this.dead) return { actual: 0, dodged: false, blocked: false, died: true };
    if (Math.random() < this.derived.dodge) {
      return { actual: 0, dodged: true, blocked: false, died: false };
    }
    let blocked = false;
    if (this.derived.blockChance > 0 && Math.random() < this.derived.blockChance) {
      blocked = true;
      raw = Math.round(raw * (1 - this.derived.blockValue));
    }
    let actual = mitigatePhysical(raw, this.derived.armor);
    actual = Math.max(1, Math.round(actual * (1 - this.derived.tenacity * 0.3)));
    this.hp -= actual;
    // flash merah
    this.setTint(0xef4444);
    this.scene.time.delayedCall(100, () => !this.dead && this.clearTint());
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return { actual, dodged: false, blocked, died: true };
    }
    this.emitStats();
    return { actual, dodged: false, blocked, died: false };
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setAlpha(0.5);
    this.emitStats();
    window.dispatchEvent(new CustomEvent('player-died'));
  }

  respawn(x: number, y: number) {
    this.dead = false;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.clearTint();
    this.recalc(true);
    this.emitStats();
    window.dispatchEvent(new CustomEvent('player-respawned'));
  }

  setJob(jobId: JobId) {
    this.jobId = jobId;
    const job = JOBS.find((j) => j.id === jobId);
    if (!job) return;
    this.level = 1;
    this.exp = 0;
    this.expNext = expForLevel(1);
    this.primary = { ...job.basePrimary };
    // auto-pasang starter job agar core equip selalu valid
    equipWeapon(starterWeaponFor(jobId), jobId, 1);
    equipItem(starterArmorFor(jobId), jobId, 1);
    this.recalc(true);
    this.emitStats();

    if (jobId === 'warrior') {
      this.attackRange = 70;
      this.baseCooldownMs = 380;
      this.isRanged = false;
    } else if (jobId === 'mage') {
      this.attackRange = 240;
      this.baseCooldownMs = 600;
      this.isRanged = true;
      this.projectileTexture = 'proj-fire';
    } else {
      this.attackRange = 260;
      this.baseCooldownMs = 450;
      this.isRanged = true;
      this.projectileTexture = 'proj-arrow';
    }
  }

  private recalc(fullRestore = false) {
    const job = JOBS.find((j) => j.id === this.jobId)!;
    this.derived = calcDerivedWithGear(
      this.primary,
      gearBonusFor(getEquippedWeaponId(), getEquippedArmorId())
    );
    this.speed = Math.round(job.moveSpeed * (1 + this.derived.moveSpeedBonus));
    if (fullRestore) {
      this.hp = this.derived.maxHp;
      this.mp = this.derived.maxMp;
    } else {
      this.hp = Math.min(this.hp, this.derived.maxHp);
      this.mp = Math.min(this.mp, this.derived.maxMp);
    }
  }

  addExp(amount: number): boolean {
    this.exp += amount;
    let leveled = false;
    const job = JOBS.find((j) => j.id === this.jobId)!;
    while (this.exp >= this.expNext && this.level < 20) {
      this.exp -= this.expNext;
      this.level += 1;
      this.expNext = expForLevel(this.level);
      this.primary.str += job.growthPerLevel.str;
      this.primary.dex += job.growthPerLevel.dex;
      this.primary.int += job.growthPerLevel.int;
      this.primary.foc += job.growthPerLevel.foc;
      this.primary.con += job.growthPerLevel.con;
      this.recalc(true);
      leveled = true;
    }
    this.emitStats();
    return leveled;
  }

  snapshot(): StatsSnapshot {
    const gear = gearBonusFor(getEquippedWeaponId(), getEquippedArmorId());
    const effective: Primary = {
      str: this.primary.str + gear.primary.str,
      dex: this.primary.dex + gear.primary.dex,
      int: this.primary.int + gear.primary.int,
      foc: this.primary.foc + gear.primary.foc,
      con: this.primary.con + gear.primary.con
    };
    return {
      jobId: this.jobId,
      level: this.level,
      exp: this.exp,
      expNext: this.expNext,
      primary: effective,
      basePrimary: { ...this.primary },
      gearPrimary: { ...gear.primary },
      derived: { ...this.derived },
      hp: Math.round(this.hp),
      mp: Math.round(this.mp),
      equippedWeaponId: getEquippedWeaponId(),
      equippedArmorId: getEquippedArmorId()
    };
  }

  private emitStats() {
    window.dispatchEvent(new CustomEvent('stats-changed', { detail: this.snapshot() }));
  }

  effectiveCooldown(): number {
    return this.baseCooldownMs / (1 + this.derived.hastePct);
  }

  private setupInput() {
    const kb = this.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      W: kb.addKey('W'),
      A: kb.addKey('A'),
      S: kb.addKey('S'),
      D: kb.addKey('D')
    };
  }

  private createAnims() {
    const dirs: Facing[] = ['down', 'up', 'left', 'right'];
    dirs.forEach((dir) => {
      const key = `walk-${dir}`;
      if (this.scene.anims.exists(key)) return;
      this.scene.anims.create({
        key,
        frames: [0, 1, 2, 3].map((f) => ({ key: `player-${dir}-${f}` })),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  update(time: number, delta: number) {
    if (this.dead) {
      this.setVelocity(0, 0);
      return;
    }
    // regen per 5 detik
    this.regenAccum += delta;
    if (this.regenAccum >= 5000) {
      this.regenAccum = 0;
      this.hp = Math.min(this.derived.maxHp, this.hp + this.derived.hpRegen);
      this.mp = Math.min(this.derived.maxMp, this.mp + this.derived.mpRegen);
      this.emitStats();
    }

    // input: panah + WASD + joystick virtual
    let vx = VirtualInput.x;
    let vy = VirtualInput.y;

    if (vx === 0 && vy === 0) {
      const left = this.cursors.left.isDown || this.wasd.A.isDown;
      const right = this.cursors.right.isDown || this.wasd.D.isDown;
      const up = this.cursors.up.isDown || this.wasd.W.isDown;
      const down = this.cursors.down.isDown || this.wasd.S.isDown;

      if (left) vx -= 1;
      if (right) vx += 1;
      if (up) vy -= 1;
      if (down) vy += 1;

      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
    }

    this.setVelocity(vx * this.speed, vy * this.speed);

    const ax = Math.abs(vx);
    const ay = Math.abs(vy);
    if (ax === 0 && ay === 0) {
      // idle
    } else if (ax >= ay) {
      this.facing = vx < 0 ? 'left' : 'right';
    } else {
      this.facing = vy < 0 ? 'up' : 'down';
    }

    if (vx === 0 && vy === 0) {
      this.anims.stop();
      this.setTexture(`player-${this.facing}-0`);
    } else {
      this.anims.play(`walk-${this.facing}`, true);
    }
  }

  canAttack(now: number): boolean {
    if (this.dead) return false;
    return now - this.lastAttackAt >= this.effectiveCooldown();
  }

  markAttacked(now: number) {
    this.lastAttackAt = now;
  }

  /** damage sudah termasuk crit + variance, mitigasi armor monster dilakukan di MapScene */
  rollDamage(): { dmg: number; crit: boolean } {
    let base: number;
    if (this.jobId === 'warrior') base = this.derived.pAtk;
    else if (this.jobId === 'mage') base = this.derived.mAtk;
    else base = this.derived.rAtk;
    const variance = Phaser.Math.Between(-2, 3);
    let dmg = Math.max(1, base + variance);
    const crit = rollCrit(this.derived.critRate);
    if (crit) dmg = Math.round(dmg * this.derived.critDmg);
    return { dmg, crit };
  }

  healFromLifesteal(dmgDealt: number) {
    if (this.derived.lifesteal > 0) {
      this.hp = Math.min(this.derived.maxHp, this.hp + dmgDealt * this.derived.lifesteal);
    }
  }

  facingVector(): { x: number; y: number } {
    if (this.facing === 'left') return { x: -1, y: 0 };
    if (this.facing === 'right') return { x: 1, y: 0 };
    if (this.facing === 'up') return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  }
}
