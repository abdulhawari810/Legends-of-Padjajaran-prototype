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
import { loadJobSave, saveJobSave, saveMeta, loadMeta } from '../data/save';
import { getItem } from '../data/items';
import {
  canDecrement,
  canIncrement,
  hasStagedChange,
  stagedUsed
} from '../data/attrRules';
import { getQuickItem } from '../data/quickslots';
import { SKILLS } from '../data/skills';
import { skillCd } from '../data/skillLevel';
import { sfxPotion } from '../audio';
import { isBehindHud, worldText } from '../text';
import { addSkillUse } from '../data/stats';
import { checkSkills } from '../data/achievements';

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
  freePoints: number;
  spent: Primary;
  pending: Primary;
  /** Buff makanan aktif (untuk UI bar buff + panel Equipment). */
  activeBuffs?: Array<{ id: string; icon: string; name: string; value: number; left: number }>;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  jobId: JobId = 'warrior';
  /** Job permanen: setelah setJob pertama di konstruktor, kunci class. */
  jobLocked = false;
  facing: Facing = 'down';
  speed = 170;

  level = 1;
  exp = 0;
  expNext = expForLevel(1);
  primary: Primary = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
  /** Batch V: poin atribut bebas dari level-up (alokasi manual). */
  freePoints = 0;
  /** Jejak alokasi TERSIMPAN per stat (untuk decrease). */
  spent: Primary = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
  /** Staging SEBELUM Apply (tidak tersimpan, hilang saat ganti job). */
  pending: Primary = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
  derived!: Derived;
  hp = 1;
  mp = 1;

  attackRange = 70;
  baseCooldownMs = 380;
  isRanged = false;
  projectileTexture = 'proj-arrow';
  dead = false;
  potionCooldownMs = 5000;
  private nameText!: Phaser.GameObjects.Text;
  private lastTitle = '';
  private lastAttackAt = 0;
  private lastPotionAt = -9999;
  private lastSkillAt: Record<JobId, [number, number, number]> = {
    warrior: [-99999, -99999, -99999],
    mage: [-99999, -99999, -99999],
    archer: [-99999, -99999, -99999]
  };
  /** Batch N: buff habis waktu (ms scene.time). */
  shieldUntil = 0;
  swiftUntil = 0;
  /** Buff makanan: flat atk/armor + sisa waktu (ms scene.time). */
  buffAtk = 0;
  buffAtkUntil = 0;
  buffDef = 0;
  buffDefUntil = 0;
  private regenAccum = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-down-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    // BA-1: sprite 64x64 (dulu 32x48) -> body tengah-bawah.
    // Artwork chibi banyak padding transparan -> skala 1.4x agar proporsional.
    this.setSize(26, 26);
    this.setOffset(19, 34);
    this.setScale(1.4);

    this.createAnims();
    this.setupInput();
    // Batch C: mulai dari job terakhir, bukan selalu warrior
    // (kalau selalu warrior, meta.currentJob ketimpa sebelum MapScene restore)
    let initialJob: JobId = 'warrior';
    try {
      const meta = loadMeta();
      if (meta.currentJob === 'warrior' || meta.currentJob === 'mage' || meta.currentJob === 'archer') {
        initialJob = meta.currentJob;
      }
    } catch {
      // abaikan save korup
    }
    this.setJob(initialJob);
    // kunci class: karakter ini tidak bisa ganti job selamanya
    this.jobLocked = true;

    this.nameText = worldText(scene, x, y - 60, '', {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.45)',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5);

    window.addEventListener('select-job', this.onSelectJob);
    window.addEventListener('use-quick', this.onUseQuick);
    window.addEventListener('equipment-changed', this.onEquipmentChanged);
    window.addEventListener('allocate-attr', this.onAllocateAttr);
  }

  private onSelectJob = ((e: CustomEvent<JobId>) => {
    // Job PERMANEN: setelah karakter dibangun, job tidak bisa diganti lagi.
    //.src/main.ts mengirim select-job 1x saat init (untuk icon skill/UI),
    // semua percobaan berikutnya diabaikan.
    if (this.jobLocked) return;
    this.setJob(e.detail);
  }) as EventListener;

  private onUseQuick = ((e: CustomEvent<number>) => {
    const idx = (e.detail ?? 0) as 0 | 1 | 2;
    this.useQuickItem(getQuickItem(idx));
  }) as EventListener;

  private onEquipmentChanged = (() => {
    this.recalc(false);
    this.emitStats();
    this.saveCurrentJob();
  }) as EventListener;

  private onAllocateAttr = ((e: CustomEvent<string | { stat: string; delta: number }>) => {
    const d = e.detail;
    const stat = (typeof d === 'string' ? d : d.stat) as keyof Primary;
    const delta = (typeof d === 'string' ? 1 : d.delta) as 1 | -1;
    this.stageAttr(stat, delta);
  }) as EventListener;

  destroy(fromScene?: boolean): void {
    // scene di-restart tiap pindah portal: lepas listener agar tidak ganda
    window.removeEventListener('select-job', this.onSelectJob);
    window.removeEventListener('use-quick', this.onUseQuick);
    window.removeEventListener('equipment-changed', this.onEquipmentChanged);
    window.removeEventListener('allocate-attr', this.onAllocateAttr);
    try {
      this.nameText?.destroy();
    } catch {
      // abaikan
    }
    super.destroy(fromScene);
  }

  /**
   * Pakai item dari quick-slot. `itemId` null = slot kosong.
   * Mengembalikan false bila tidak bisa dipakai (HP/MP penuh, buff masih aktif,
   * mati, cooldown global potion belum habis).
   */
  useQuickItem(itemId: string | null): boolean {
    if (this.dead) return false;
    const def = itemId ? getItem(itemId) : undefined;
    if (!def || def.type !== 'consumable') return false;

    const now = this.scene.time.now;
    const isPotion = def.quick === 'hp' || def.quick === 'mp';

    // ---- SEMUA validasi dulu, baru ada mutasi ----
    // Kalau validasi AFTER mutasi, item dengan 2 efek bisa mengubah HP tapi
    // lalu return false (item hilang tanpa efek) atau sebaliknya.
    if (!def.heal && !def.mana && !def.buffAtk && !def.buffDef) return false;
    // cooldown global hanya untuk potion (HP/MP), bukan makanan
    if (isPotion && now - this.lastPotionAt < this.potionCooldownMs) return false;
    if (def.heal && this.hp >= this.derived.maxHp) return false;
    if (def.mana && this.mp >= this.derived.maxMp) return false;
    // buff serupa masih aktif -> jangan ditumpuk
    if (def.buffAtk && this.buffAtkUntil > now) return false;
    if (def.buffDef && this.buffDefUntil > now) return false;

    // ---- terapkan ----
    if (def.heal) {
      // Batch T: potion 40% max HP (min 50) agar relevan di level tinggi
      const heal = Math.max(50, Math.round(this.derived.maxHp * 0.4));
      this.hp = Math.min(this.derived.maxHp, this.hp + heal);
    }
    if (def.mana) {
      const mana = Math.max(40, Math.round(this.derived.maxMp * 0.4));
      this.mp = Math.min(this.derived.maxMp, this.mp + mana);
    }
    if (def.buffAtk) {
      this.buffAtk = def.buffAtk;
      this.buffAtkUntil = now + (def.durMs ?? 30000);
    }
    if (def.buffDef) {
      this.buffDef = def.buffDef;
      this.buffDefUntil = now + (def.durMs ?? 30000);
    }
    if (def.buffAtk || def.buffDef) this.recalc(false);
    if (isPotion) this.lastPotionAt = now;

    this.emitStats();
    sfxPotion();
    window.dispatchEvent(new CustomEvent('quick-item-used', { detail: { id: def.id, kind: def.quick ?? 'hp' } }));
    if (isPotion) window.dispatchEvent(new CustomEvent('potion-used', { detail: this.potionCooldownMs }));
    if (def.buffAtk || def.buffDef) window.dispatchEvent(new CustomEvent('buff-used', { detail: def.id }));
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

  /** Heal zone: HP + MP sekaligus, 1 emit. */
  healZone(hpAmt: number, mpAmt: number) {
    if (this.dead) return;
    this.hp = Math.min(this.derived.maxHp, this.hp + hpAmt);
    this.mp = Math.min(this.derived.maxMp, this.mp + mpAmt);
    this.emitStats();
  }

  /** Damage monster fisik ke player dengan mitigasi WoW. */
  takeDamage(raw: number): { actual: number; dodged: boolean; blocked: boolean; died: boolean } {
    if (this.dead) return { actual: 0, dodged: false, blocked: false, died: true };
    if (Math.random() < this.derived.dodge) {
      return { actual: 0, dodged: true, blocked: false, died: false };
    }
    let blocked = false;
    // Batch N: Bulwark (shield) = damage -40% + selalu block
    const now = this.scene.time.now;
    if (now < this.shieldUntil) {
      blocked = true;
      raw = Math.round(raw * 0.6);
    } else if (this.derived.blockChance > 0 && Math.random() < this.derived.blockChance) {
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
    // Job permanen: hanya boleh dipanggil sekali (konstruktor) atau oleh
    // MapScene saat restore dari save dengan nilai yang sama.
    if (this.jobLocked && jobId !== this.jobId) return;
    const prev = this.jobId as JobId | undefined;
    // simpan job lama sebelum pindah (kecuali init pertama belum ada derived)
    if (prev && prev !== jobId && this.derived) {
      this.saveCurrentJob();
    }
    this.jobId = jobId;
    const job = JOBS.find((j) => j.id === jobId);
    if (!job) return;
    const saved = loadJobSave(jobId);
    if (saved && saved.level >= 1 && saved.level <= 20 && saved.primary) {
      this.level = saved.level;
      this.exp = Math.max(0, saved.exp);
      this.expNext = expForLevel(this.level);
      this.primary = { ...saved.primary };
      this.freePoints = Math.max(0, saved.freePoints ?? 0);
      const sp = saved.spent;
      this.spent = {
        str: Math.max(0, sp?.str ?? 0),
        dex: Math.max(0, sp?.dex ?? 0),
        int: Math.max(0, sp?.int ?? 0),
        foc: Math.max(0, sp?.foc ?? 0),
        con: Math.max(0, sp?.con ?? 0)
      };
      this.pending = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
      // restore equip, fallback ke starter bila tidak valid
      const w = saved.weaponId ?? starterWeaponFor(jobId);
      const a = saved.armorId ?? starterArmorFor(jobId);
      equipWeapon(w, jobId, this.level);
      const ra = equipItem(a, jobId, this.level);
      if (!ra.ok) equipItem(starterArmorFor(jobId), jobId, 1);
      this.recalc(true);
      // restore hp/mp bila valid, kalau tidak full
      if (saved.hp > 0 && saved.hp <= this.derived.maxHp) this.hp = Math.round(saved.hp);
      if (saved.mp > 0 && saved.mp <= this.derived.maxMp) this.mp = Math.round(saved.mp);
    } else {
      this.level = 1;
      this.exp = 0;
      this.expNext = expForLevel(1);
      this.primary = { ...job.basePrimary };
      this.freePoints = 0;
      this.spent = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
      this.pending = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };
      // auto-pasang starter job agar core equip selalu valid
      equipWeapon(starterWeaponFor(jobId), jobId, 1);
      equipItem(starterArmorFor(jobId), jobId, 1);
      this.recalc(true);
    }
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
    // persist job + meta setelah pindah
    try {
      const meta = loadMeta();
      if (meta.currentJob !== jobId) {
        meta.currentJob = jobId;
        saveMeta(meta);
      }
    } catch {
      // abaikan
    }
    this.saveCurrentJob();
    // sinkron UI cooldown ke job baru (per-job per-slot, tidak ikut job lama)
    try {
      const now = this.scene?.time?.now ?? 0;
      const defs = SKILLS[jobId] ?? [];
      const left = [0, 1, 2].map((i) => this.skillCooldownLeft(now, skillCd(jobId, i, defs[i]?.cooldownMs ?? 0), i));
      window.dispatchEvent(new CustomEvent('skill-cooldown-sync', { detail: left }));
    } catch {
      // abaikan
    }
  }

  /** Simpan state job saat ini (level/exp/primary/equip/hp/mp). */
  saveCurrentJob() {
    try {
      saveJobSave(this.jobId, {
        level: this.level,
        exp: this.exp,
        primary: { ...this.primary },
        weaponId: getEquippedWeaponId(),
        armorId: getEquippedArmorId(),
        hp: Math.round(this.hp),
        mp: Math.round(this.mp),
        freePoints: this.freePoints,
        spent: { ...this.spent }
      });
    } catch {
      // abaikan quota error
    }
  }

  /**
   * Stage +1/-1 (preview, belum simpan).
   *
   * Aturan: -1 HANYA boleh membatalkan poin yang sedang di-stage pada sesi ini
   * (`pending[stat] > 0`). Poin yang sudah di-commit lewat "Terapkan" bersifat
   * PERMANEN — satu-satunya cara mundur adalah `resetAllAttributes()` (20G).
   * Kalau ini tidak dijaga, `spent` yang sudah jadi bisa dikurangi dari UI
   * sehingga "Terapkan" kehilangan artinya.
   */
  stageAttr(stat: keyof Primary, delta: 1 | -1): boolean {
    if (this.dead) return false;
    if (!(stat in this.primary)) return false;
    if (delta > 0) {
      if (!canIncrement(this.freePoints, this.pending)) return false;
      this.pending[stat] += 1;
    } else {
      // hanya staging sesi ini yang bisa dibatalkan (poin committed = permanen)
      if (!canDecrement(this.pending, stat)) return false;
      this.pending[stat] -= 1;
    }
    this.emitStats();
    return true;
  }

  /** Net staging (0 = tidak ada perubahan). */
  stagedNet(): number {
    return stagedUsed(this.pending);
  }

  /** Apply: simpan semua staging. */
  applyStaged(): boolean {
    if (this.dead || !this.hasStagedChange()) return false;
    const keys = Object.keys(this.pending) as Array<keyof Primary>;
    const net = keys.reduce((a, k) => a + this.pending[k], 0);
    keys.forEach((k) => {
      this.primary[k] = Math.max(0, this.primary[k] + this.pending[k]);
      this.spent[k] = Math.max(0, this.spent[k] + this.pending[k]);
      this.pending[k] = 0;
    });
    this.freePoints = Math.max(0, this.freePoints - net);
    this.recalc(false);
    this.emitStats();
    this.saveCurrentJob();
    return true;
  }

  private hasStagedChange(): boolean {
    return hasStagedChange(this.pending);
  }

  /** Batalkan staging (tanpa biaya). */
  clearStaged(): boolean {
    if (!this.hasStagedChange()) return false;
    (Object.keys(this.pending) as Array<keyof Primary>).forEach((k) => {
      this.pending[k] = 0;
    });
    this.emitStats();
    return true;
  }

  /** Reset: kembalikan SEMUA poin tersimpan + buang staging. Return jumlah poin. */
  resetAllAttributes(): number {
    if (this.dead) return 0;
    let total = 0;
    (Object.keys(this.primary) as Array<keyof Primary>).forEach((k) => {
      total += this.spent[k];
      this.primary[k] = Math.max(0, this.primary[k] - this.spent[k]);
      this.spent[k] = 0;
      this.pending[k] = 0;
    });
    if (total <= 0) return 0;
    this.freePoints += total;
    this.recalc(false);
    this.emitStats();
    this.saveCurrentJob();
    return total;
  }

  private recalc(fullRestore = false) {
    const job = JOBS.find((j) => j.id === this.jobId)!;
    const d = calcDerivedWithGear(
      this.primary,
      gearBonusFor(getEquippedWeaponId(), getEquippedArmorId())
    );
    // buff makanan (flat, sementara) ditumpuk di atas derived.
    // TIDAK disimpan ke save: hilang saat reload / pindah map.
    if (this.buffAtkUntil > 0) {
      // berlaku ke semua jenis atk supaya makanan tetap berguna untuk 3 job
      d.pAtk += this.buffAtk;
      d.rAtk += this.buffAtk;
      d.mAtk += this.buffAtk;
    }
    if (this.buffDefUntil > 0) {
      d.armor += this.buffDef;
      d.magicRes += this.buffDef;
    }
    this.derived = d;
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
    while (this.exp >= this.expNext && this.level < 20) {
      this.exp -= this.expNext;
      this.level += 1;
      this.expNext = expForLevel(this.level);
      // Batch V: growth otomatis diganti 5 poin bebas (alokasi manual)
      this.freePoints += 5;
      this.recalc(true);
      leveled = true;
    }
    this.emitStats();
    this.saveCurrentJob();
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
      equippedArmorId: getEquippedArmorId(),
      freePoints: this.freePoints,
      spent: { ...this.spent },
      pending: { ...this.pending },
      activeBuffs: this.activeBuffList()
    };
  }

  /** Daftar buff makanan aktif + sisa detiknya (untuk UI). */
  activeBuffList(): Array<{ id: string; icon: string; name: string; value: number; left: number }> {
    const now = this.scene.time.now;
    const out: Array<{ id: string; icon: string; name: string; value: number; left: number }> = [];
    if (this.buffAtk > 0 && this.buffAtkUntil > now) {
      const def = getItem('roast-meat');
      out.push({
        id: 'roast-meat',
        icon: def?.icon ?? '🍖',
        name: def?.name ?? 'Roast Meat',
        value: this.buffAtk,
        left: Math.ceil((this.buffAtkUntil - now) / 1000)
      });
    }
    if (this.buffDef > 0 && this.buffDefUntil > now) {
      const def = getItem('herbal-tonic');
      out.push({
        id: 'herbal-tonic',
        icon: def?.icon ?? '🍵',
        name: def?.name ?? 'Herbal Tonic',
        value: this.buffDef,
        left: Math.ceil((this.buffDefUntil - now) / 1000)
      });
    }
    return out;
  }

  private emitStats() {
    window.dispatchEvent(new CustomEvent('stats-changed', { detail: this.snapshot() }));
  }

  effectiveCooldown(): number {
    const base = this.baseCooldownMs / (1 + this.derived.hastePct);
    // Batch N: Swift = serang 30% lebih cepat
    try {
      if (this.scene.time.now < this.swiftUntil) return base * 0.7;
    } catch {
      // abaikan
    }
    return base;
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
    // Y-sort dari kaki (sprite 64x64 @1.4x): yang kakinya lebih bawah tampil di depan
    this.setDepth(10 + ((this.y + 40) * 0.01));
    // label nama + level mengikuti (sembunyi saat ketutup HUD)
    const title = `${this.jobId.toUpperCase()} Lv.${this.level}`;
    if (title !== this.lastTitle) {
      this.lastTitle = title;
      this.nameText.setText(title);
    }
    this.nameText.setPosition(this.x, this.y - 60);
    this.nameText.setDepth(this.depth + 0.06);
    this.nameText.setVisible(!isBehindHud(this.scene, this.x, this.y - 44));
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

    // buff makanan kedaluwarsa -> recalc derived (flat atk/armor dilepas)
    const nowMs = this.scene.time.now;
    const buffExpired =
      (this.buffAtk > 0 && this.buffAtkUntil <= nowMs) ||
      (this.buffDef > 0 && this.buffDefUntil <= nowMs);
    if (buffExpired) {
      this.buffAtk = 0;
      this.buffAtkUntil = 0;
      this.buffDef = 0;
      this.buffDefUntil = 0;
      this.recalc(false);
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

    // Batch N: Swift = gerak +15%
    const timeNow = this.scene.time.now;
    const sp = this.speed * (timeNow < this.swiftUntil ? 1.15 : 1);
    this.setVelocity(vx * sp, vy * sp);

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

  canSkill(now: number, cooldownMs: number, slot = 0): boolean {
    if (this.dead) return false;
    return now - (this.lastSkillAt[this.jobId]?.[slot] ?? -99999) >= cooldownMs;
  }

  markSkilled(now: number, slot = 0) {
    const arr = this.lastSkillAt[this.jobId];
    if (arr) arr[slot] = now;
    addSkillUse();
    checkSkills();
  }

  skillCooldownLeft(now: number, cooldownMs: number, slot = 0): number {
    return Math.max(0, cooldownMs - (now - (this.lastSkillAt[this.jobId]?.[slot] ?? -99999)));
  }

  /** Konsumsi MP bila cukup. Return false bila MP kurang (tidak jadi skill). */
  tryConsumeMp(cost: number): boolean {
    if (this.dead) return false;
    if (this.mp < cost) return false;
    this.mp = Math.max(0, this.mp - cost);
    this.emitStats();
    return true;
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
