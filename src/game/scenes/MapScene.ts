import Phaser from 'phaser';
import { MAP_DEF } from '../data/map';
import { MONSTERS } from '../data/monsters';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { Npc } from '../entities/Npc';
import { VirtualInput } from '../input/VirtualInput';
import { canClaim, claimReward, hasClaimable, registerKill, snapshotQuests } from '../data/questState';
import { addItem } from '../data/inventory';
import { addGold } from '../data/currency';
import { rollDrops } from '../data/drops';
import { getItem } from '../data/items';

const NPC_POS = { x: 640, y: 400 };
const INTERACT_DIST = 90;

export class MapScene extends Phaser.Scene {
  private player!: Player;
  private npc!: Npc;
  private hudPos!: Phaser.GameObjects.Text;
  private hudKill!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private monsters: Monster[] = [];
  private projectiles!: Phaser.Physics.Arcade.Group;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private killCount = 0;

  constructor() {
    super('Map');
  }

  create() {
    this.physics.world.setBounds(0, 0, MAP_DEF.widthPx, MAP_DEF.heightPx);

    this.createGround();
    this.createObstacles();
    this.projectiles = this.physics.add.group();

    // spawn monster awal
    MAP_DEF.monsterSpawns.forEach((s) => {
      const def = MONSTERS.find((m) => m.id === s.monsterId)!;
      for (let i = 0; i < s.count; i++) {
        this.spawnMonster(def.id);
      }
    });

    this.player = new Player(this, MAP_DEF.playerSpawn.x, MAP_DEF.playerSpawn.y);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(
      this.player,
      this.monsters as unknown as Phaser.GameObjects.GameObject[]
    );

    // NPC Tetua di dekat spawn
    this.npc = new Npc(this, NPC_POS.x, NPC_POS.y);
    this.physics.add.collider(this.player, this.npc);
    this.refreshNpcBubble();

    window.addEventListener('player-died', () => this.showDeath());
    document.getElementById('respawn-btn')?.addEventListener('click', () => this.respawnPlayer());
    window.addEventListener('quest-changed', () => this.refreshNpcBubble());
    window.addEventListener('claim-quest', ((e: CustomEvent<string>) => this.claimQuest(e.detail)) as EventListener);
    document.getElementById('interact-btn')?.addEventListener('click', () => this.openNpc());
    document.getElementById('npc-close')?.addEventListener('click', () =>
      document.getElementById('npc-panel')?.classList.add('hidden')
    );
    document.getElementById('npc-list')?.addEventListener('pointerdown', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-claim]');
      if (!btn) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('claim-quest', { detail: btn.dataset.claim }));
    });

    this.attackKey = this.input.keyboard!.addKey('SPACE');
    this.interactKey = this.input.keyboard!.addKey('E');

    // projectile kena monster
    this.physics.add.overlap(
      this.projectiles,
      this.monsters as unknown as Phaser.GameObjects.GameObject[],
      (proj, target) => this.onProjectileHit(proj as Phaser.Physics.Arcade.Image, target as Monster)
    );

    this.cameras.main.setBounds(0, 0, MAP_DEF.widthPx, MAP_DEF.heightPx);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.5);

    this.add
      .text(16, 16, `${MAP_DEF.name} — WASD/Panah/Joystick jalan, Spasi/Tombol serang`, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 8, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.hudPos = this.add
      .text(16, 48, '', {
        fontSize: '12px',
        color: '#9ca3af',
        backgroundColor: 'rgba(0,0,0,0.35)',
        padding: { x: 8, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.hudKill = this.add
      .text(16, 74, 'Kill: 0', {
        fontSize: '12px',
        color: '#fbbf24',
        backgroundColor: 'rgba(0,0,0,0.35)',
        padding: { x: 8, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(10);
  }

  private spawnMonster(monsterId: string) {
    const def = MONSTERS.find((m) => m.id === monsterId)!;
    const spot = MAP_DEF.monsterSpawns.find((s) => s.monsterId === monsterId)!;
    const x = Phaser.Math.Clamp(spot.x + Phaser.Math.Between(-80, 80), 48, MAP_DEF.widthPx - 48);
    const y = Phaser.Math.Clamp(spot.y + Phaser.Math.Between(-80, 80), 64, MAP_DEF.heightPx - 48);
    const m = new Monster(this, x, y, def);
    this.monsters.push(m);
    this.physics.add.collider(m, this.obstacles);
    // separasi: monster tidak numpuk + respawn tetap tabrakan dengan player
    this.physics.add.collider(m, this.monsters.filter((o) => o !== m && o.alive));
    if (this.player) {
      this.physics.add.collider(this.player, m);
    }
  }

  private showDeath() {
    document.getElementById('death-overlay')?.classList.remove('hidden');
    document.getElementById('interact-btn')?.classList.add('hidden');
  }

  private respawnPlayer() {
    document.getElementById('death-overlay')?.classList.add('hidden');
    this.player.respawn(MAP_DEF.playerSpawn.x, MAP_DEF.playerSpawn.y);
  }

  private isNearNpc(): boolean {
    if (!this.player || this.player.dead) return false;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= INTERACT_DIST;
  }

  private refreshNpcBubble() {
    const qs = snapshotQuests();
    const claimable = hasClaimable();
    const hasProgress = qs.some((q) => q.progress > 0 && !q.claimed);
    this.npc?.setClaimable(claimable, hasProgress);
  }

  private openNpc() {
    if (!this.isNearNpc()) return;
    ['char-panel', 'bag-panel', 'quest-panel'].forEach((id) => document.getElementById(id)?.classList.add('hidden'));
    const panel = document.getElementById('npc-panel')!;
    panel.classList.remove('hidden');
    this.renderNpc();
  }

  private renderNpc() {
    const list = document.getElementById('npc-list')!;
    list.innerHTML = snapshotQuests()
      .map((q) => {
        const status = q.claimed ? '✅ Selesai' : q.done ? '🎁 Siap klaim' : `⚔️ ${Math.min(q.progress, q.killCount)}/${q.killCount}`;
        const btn = q.claimed
          ? ''
          : q.done
            ? `<button class="bag-btn" data-claim="${q.id}">Klaim +${q.rewardExp} EXP${q.rewardItemId ? ' + 🎁' : ''}</button>`
            : `<small>Bunuh ${q.killTarget} (${q.progress}/${q.killCount})</small>`;
        return `<div class="quest-item"><b>${q.title}</b><p>${q.desc}</p><small>${status}</small><div>${btn}</div></div>`;
      })
      .join('');
  }

  private claimQuest(questId: string) {
    if (!this.isNearNpc()) return;
    if (!canClaim(questId)) return;
    const reward = claimReward(questId);
    if (!reward) return;
    if (reward.itemId) addItem(reward.itemId, 1);
    const leveled = this.player.addExp(reward.exp);
    const txt = this.add.text(this.npc.x, this.npc.y - 70, `+${reward.exp} EXP${reward.itemId ? ' + 🎁' : ''}`, {
      fontSize: '14px',
      color: '#4ade80',
      fontStyle: 'bold'
    });
    this.tweens.add({ targets: txt, y: this.npc.y - 90, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
    void leveled;
    this.refreshNpcBubble();
    this.renderNpc();
  }

  private tryAttack() {
    const now = this.time.now;
    if (!this.player.canAttack(now)) return;
    this.player.markAttacked(now);

    const dir = this.player.facingVector();

    if (!this.player.isRanged) {
      // Warrior: tebasan melee di depan
      const cx = this.player.x + dir.x * 40;
      const cy = this.player.y + dir.y * 40;
      const slash = this.add.image(cx, cy, 'slash').setDepth(7);
      slash.setAngle(dir.x === -1 ? 180 : dir.y === -1 ? -90 : dir.y === 1 ? 90 : 0);
      slash.setScale(0.9);
      this.tweens.add({ targets: slash, alpha: 0, scale: 1.3, duration: 160, onComplete: () => slash.destroy() });

      const { dmg, crit } = this.player.rollDamage();
      this.monsters
        .filter((m) => m.alive && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) <= this.player.attackRange + 14)
        .filter((m) => {
          // hanya yang di depan (dot product > 0.2)
          const dx = m.x - this.player.x;
          const dy = m.y - this.player.y;
          const len = Math.hypot(dx, dy) || 1;
          return (dx / len) * dir.x + (dy / len) * dir.y > 0.2;
        })
        .forEach((m) => this.damageMonster(m, dmg, crit));
    } else {
      // Mage/Archer: projectile searah facing
      const proj = this.projectiles.create(
        this.player.x + dir.x * 20,
        this.player.y + dir.y * 20,
        this.player.projectileTexture
      ) as Phaser.Physics.Arcade.Image;
      proj.setDepth(7);
      const { dmg, crit } = this.player.rollDamage();
      proj.setData('dmg', dmg);
      proj.setData('crit', crit);
      proj.setData('born', now);
      proj.setData('range', this.player.attackRange);
      const speed = this.player.jobId === 'mage' ? 320 : 440;
      proj.setVelocity(dir.x * speed, dir.y * speed);
      if (dir.x < 0) proj.setFlipX(true);
      if (dir.x === 0) proj.setAngle(dir.y < 0 ? -90 : 90);
    }
  }

  private onProjectileHit(proj: Phaser.Physics.Arcade.Image, target: Monster) {
    if (!target.alive) return;
    const dmg = (proj.getData('dmg') as number) ?? 10;
    const crit = (proj.getData('crit') as boolean) ?? false;
    proj.destroy();
    this.damageMonster(target, dmg, crit);
  }

  private damageMonster(m: Monster, dmg: number, crit = false) {
    // angka damage melayang (kuning jika crit)
    const txt = this.add.text(m.x, m.y - 36, `${crit ? 'CRIT ' : ''}-${dmg}`, {
      fontSize: crit ? '15px' : '13px',
      color: crit ? '#fbbf24' : '#ffffff',
      fontStyle: 'bold'
    });
    this.tweens.add({ targets: txt, y: m.y - 52, alpha: 0, duration: 500, onComplete: () => txt.destroy() });

    const died = m.takeDamage(dmg);
    this.player.healFromLifesteal(dmg);
    if (died) {
      this.killCount += 1;
      this.hudKill.setText(`Kill: ${this.killCount}`);
      const monsterId = m.def.id;
      const monsterExp = m.def.exp;
      window.dispatchEvent(new CustomEvent('monster-killed', { detail: monsterId }));
      registerKill(monsterId);
      // loot Batch B: gold selalu + item chance
      const loot = rollDrops(monsterId);
      if (loot.gold > 0) addGold(loot.gold);
      loot.items.forEach((d) => addItem(d.id, d.count));
      const lootParts = [`+${loot.gold}G`];
      loot.items.forEach((d) => {
        const def = getItem(d.id);
        lootParts.push(`+${def?.name ?? d.id}`);
      });
      const lootTxt = this.add.text(m.x, m.y - 52, lootParts.join(' '), {
        fontSize: '12px',
        color: '#fbbf24',
        fontStyle: 'bold'
      });
      this.tweens.add({ targets: lootTxt, y: m.y - 70, alpha: 0, duration: 900, onComplete: () => lootTxt.destroy() });
      // hapus dari list agar overlap tidak error
      this.monsters = this.monsters.filter((x) => x !== m);
      m.dieWithEffect(() => {
        // respawn 4 detik di titik area sama
        this.time.delayedCall(4000, () => this.spawnMonster(monsterId));
      });
      const leveled = this.player.addExp(monsterExp);
      if (leveled) {
        const lv = this.add.text(this.player.x, this.player.y - 44, `LEVEL UP! Lv.${this.player.level}`, {
          fontSize: '14px',
          color: '#4ade80',
          fontStyle: 'bold'
        });
        this.tweens.add({ targets: lv, y: this.player.y - 64, alpha: 0, duration: 1200, onComplete: () => lv.destroy() });
      }
    }
  }

  private createGround() {
    const g = this.add.graphics();
    const ts = MAP_DEF.tileSize;
    for (let ty = 0; ty < MAP_DEF.heightTiles; ty++) {
      for (let tx = 0; tx < MAP_DEF.widthTiles; tx++) {
        const checker = (tx + ty) % 2 === 0;
        g.fillStyle(checker ? 0x1e2b1f : 0x1a261b, 1);
        g.fillRect(tx * ts, ty * ts, ts, ts);
        g.lineStyle(1, 0x2a3d2c, 0.35);
        g.strokeRect(tx * ts, ty * ts, ts, ts);
      }
    }
    g.lineStyle(2, 0x3b82f6, 0.5);
    g.strokeCircle(MAP_DEF.playerSpawn.x, MAP_DEF.playerSpawn.y, 24);
  }

  private createObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    MAP_DEF.obstacles.forEach((o) => {
      const rect = this.add.rectangle(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, 0x374151);
      rect.setStrokeStyle(2, 0x6b7280);
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    });
  }

  update(time: number, delta: number) {
    this.player.update(time, delta);

    // input serang: tombol UI (via VirtualInput) + Spasi
    const spaceDown = Phaser.Input.Keyboard.JustDown(this.attackKey);
    if (VirtualInput.consumeAttack() || spaceDown) {
      this.tryAttack();
    }

    // interaksi NPC: E / tombol 💬 saat dekat
    const near = this.isNearNpc();
    document.getElementById('interact-btn')?.classList.toggle('hidden', !near);
    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openNpc();
    }

    // AI monster: kejar + pukul balik
    const now = this.time.now;
    this.monsters.forEach((m) => {
      if (!m.alive || this.player.dead) {
        if (m.alive) m.setVelocity(0, 0);
        return;
      }
      const inRange = m.chaseOrHold(this.player.x, this.player.y);
      if (inRange && m.canAttackMonster(now)) {
        m.markAttacked(now);
        const raw = m.rollMonsterDamage();
        const res = this.player.takeDamage(raw);
        const label = res.dodged ? 'MISS' : res.blocked ? `BLOCK -${res.actual}` : `-${res.actual}`;
        const txt = this.add.text(this.player.x, this.player.y - 40, label, {
          fontSize: '13px',
          color: res.dodged ? '#9ca3af' : '#ef4444',
          fontStyle: 'bold'
        });
        this.tweens.add({ targets: txt, y: this.player.y - 56, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
      }
    });

    // bersihkan projectile yang melewati range / keluar world
    this.projectiles.getChildren().forEach((c) => {
      const p = c as Phaser.Physics.Arcade.Image;
      const born = (p.getData('born') as number) ?? now;
      const range = (p.getData('range') as number) ?? 250;
      const travelled = Phaser.Math.Distance.Between(p.x - (p.body?.velocity.x ?? 0), p.y, p.x, p.y);
      void travelled;
      // hitung kasar via umur: range / speed
      if (now - born > (range / 300) * 1000) p.destroy();
      if (p.x < 0 || p.y < 0 || p.x > MAP_DEF.widthPx || p.y > MAP_DEF.heightPx) p.destroy();
    });

    this.monsters.forEach((m) => m.alive && m.updateBar());

    const hud = document.getElementById('hud-pos');
    const txt = `X: ${Math.round(this.player.x)} Y: ${Math.round(this.player.y)} facing: ${this.player.facing}`;
    if (hud) hud.textContent = txt;
    this.hudPos.setText(txt);
  }
}
