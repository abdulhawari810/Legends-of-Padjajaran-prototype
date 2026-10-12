import Phaser from "phaser";
import { MAP_DEF, getMapDef, type MapDefShape, type MapId } from "../data/map";
import { MONSTERS } from "../data/monsters";
import { Player } from "../entities/Player";
import { Monster } from "../entities/Monster";
import { Npc } from "../entities/Npc";
import { VirtualInput } from "../input/VirtualInput";
import {
  canClaim,
  claimReward,
  hasClaimable,
  registerKill,
  snapshotQuests,
} from "../data/questState";
import { addItem, getCount } from "../data/inventory";
import { addGold, getGold } from "../data/currency";
import { rollDrops } from "../data/drops";
import { getItem } from "../data/items";
import { SHOP_BUY, SHOP_SELL, buyItem, sellItem } from "../data/shop";
import { getSkill } from "../data/skills";
import { worldText } from "../text";
import { getBounties, registerKillBounty } from "../data/bounty";
import {
  ENHANCE_MAX,
  enhanceCost,
  getEnhance,
  tryEnhance,
} from "../data/enhance";
import { getEquippedArmorId, getEquippedWeaponId } from "../data/equipment";
import { getQuality } from "../data/settings";
import {
  addClaim,
  addDeath,
  addKill,
  addPlaytime,
  setMaxLevel,
  visitMap,
} from "../data/stats";
import {
  checkClaims,
  checkDeaths,
  checkEnhance,
  checkKills,
  checkLevel,
  checkRich,
  checkTravel,
} from "../data/achievements";
import {
  sfxBoom,
  sfxClick,
  sfxCoin,
  sfxHit,
  sfxLevelUp,
  sfxMonsterDie,
  sfxPlayerDie,
  sfxPlayerHurt,
  sfxQuest,
  sfxShootArrow,
  sfxShootFire,
  sfxSkill,
  sfxSwing,
} from "../audio";
import { loadMeta, loadPos, saveMeta, savePos } from "../data/save";

const INTERACT_DIST = 90;

export class MapScene extends Phaser.Scene {
  private player!: Player;
  private npc: Npc | null = null;
  private hudKill!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private monsters: Monster[] = [];
  private projectiles!: Phaser.Physics.Arcade.Group;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private skillKeyQ!: Phaser.Input.Keyboard.Key;
  private skillKey1!: Phaser.Input.Keyboard.Key;
  private skillKey2!: Phaser.Input.Keyboard.Key;
  private skillKey3!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private killCount = 0;
  private saveAccum = 0;
  private healAccum = 0;
  private miniAccum = 0;
  private mapId: MapId = "greenfield";
  private mapDef: MapDefShape = MAP_DEF;
  private spawnOverride: { x: number; y: number } | null = null;
  private portalReadyAt = 0;
  /** Batch D: timer respawn yang belum jalan (dibatalkan saat reset map). */
  private pendingRespawns: Phaser.Time.TimerEvent[] = [];
  /** Batch target-lock: monster yang diklik + cincin merah. */
  private locked: Monster | null = null;
  private lockRing: Phaser.GameObjects.Graphics | null = null;
  private hitFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dieFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private coinFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private levelFx!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Map");
  }

  init(data?: { mapId?: string; spawn?: { x: number; y: number } }) {
    this.mapDef = getMapDef(data?.mapId ?? "greenfield");
    this.mapId = this.mapDef.id;
    this.spawnOverride = data?.spawn ?? null;
    // reset state per map (scene di-restart saat pindah portal)
    this.monsters = [];
    this.pendingRespawns = [];
    this.saveAccum = 0;
    this.healAccum = 0;
    this.npc = null;
    this.portalReadyAt = 0;
    this.locked = null;
    this.lockRing = null;
  }

  create() {
    this.physics.world.setBounds(
      0,
      0,
      this.mapDef.widthPx,
      this.mapDef.heightPx
    );
    visitMap(this.mapId);
    checkTravel();
    window.dispatchEvent(new CustomEvent("target-hide"));

    this.createGround();
    this.createObstacles();
    this.createDecorations();
    this.projectiles = this.physics.add.group();
    // projectile hancur saat kena tembok/rumah/pohon/kolam
    this.physics.add.collider(this.projectiles, this.obstacles, (proj) =>
      (proj as Phaser.Physics.Arcade.Image).destroy()
    );

    // Batch G: particle sekali-ledak (tanpa asset)
    const fx = (
      tint: number,
      speedMin: number,
      speedMax: number,
      lifeMin: number,
      lifeMax: number
    ) =>
      this.add.particles(0, 0, "part-dot", {
        speed: { min: speedMin, max: speedMax },
        angle: { min: 0, max: 360 },
        lifespan: { min: lifeMin, max: lifeMax },
        scale: { start: 1, end: 0 },
        quantity: 0,
        emitting: false,
        tint,
      });
    this.hitFx = fx(0xffffff, 60, 180, 150, 300).setDepth(40);
    this.dieFx = fx(0x9ca3af, 40, 130, 250, 450).setDepth(40);
    this.coinFx = fx(0xfbbf24, 50, 150, 200, 400).setDepth(40);
    this.levelFx = fx(0x4ade80, 40, 140, 300, 600).setDepth(40);

    // spawn monster awal
    this.mapDef.monsterSpawns.forEach((s) => {
      const def = MONSTERS.find((m) => m.id === s.monsterId)!;
      for (let i = 0; i < s.count; i++) {
        this.spawnMonster(def.id);
      }
    });
    this.createPortals();

    this.player = new Player(
      this,
      this.mapDef.playerSpawn.x,
      this.mapDef.playerSpawn.y
    );
    // Batch C: restore posisi + job + killCount terakhir (posisi per map)
    try {
      const meta = loadMeta();
      this.killCount = meta.killCount ?? 0;
      if (meta.currentJob && meta.currentJob !== this.player.jobId) {
        this.player.setJob(meta.currentJob);
        window.dispatchEvent(
          new CustomEvent("select-job-sync", { detail: meta.currentJob })
        );
      }
      if (this.spawnOverride) {
        this.player.setPosition(this.spawnOverride.x, this.spawnOverride.y);
      } else {
        const pos = loadPos(this.mapId);
        if (
          pos &&
          pos.x > 32 &&
          pos.y > 32 &&
          pos.x < this.mapDef.widthPx - 32 &&
          pos.y < this.mapDef.heightPx - 32
        ) {
          this.player.setPosition(pos.x, pos.y);
        }
      }
    } catch {
      // abaikan save korup, pakai spawn default
    }
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(
      this.player,
      this.monsters as unknown as Phaser.GameObjects.GameObject[]
    );

    // NPC Tetua (hanya di map yang punya npc)
    if (this.mapDef.npc) {
      this.npc = new Npc(this, this.mapDef.npc.x, this.mapDef.npc.y);
      this.physics.add.collider(this.player, this.npc);
      worldText(
        this,
        this.mapDef.npc.x,
        this.mapDef.npc.y - 72,
        "🧙 Tetua Greenfield",
        {
          fontSize: "11px",
          color: "#f5d67b",
          fontStyle: "bold",
          backgroundColor: "rgba(0,0,0,0.45)",
          padding: { x: 4, y: 1 },
        }
      )
        .setOrigin(0.5)
        .setDepth(30);
      this.refreshNpcBubble();
    }

    this.bindGlobalListeners();

    this.attackKey = this.input.keyboard!.addKey("SPACE");
    this.skillKeyQ = this.input.keyboard!.addKey("Q");
    this.skillKey1 = this.input.keyboard!.addKey("ONE");
    this.skillKey2 = this.input.keyboard!.addKey("TWO");
    this.skillKey3 = this.input.keyboard!.addKey("THREE");
    this.interactKey = this.input.keyboard!.addKey("E");

    // tap/klik monster untuk target manual (event milik scene, auto-lepas saat restart)
    this.input.on("pointerdown", this.onWorldTap);

    // projectile vs monster didaftarkan per-monster di spawnMonster()
    // (bulk overlap dengan array basi setelah respawn/filter)

    this.cameras.main.setBounds(
      0,
      0,
      this.mapDef.widthPx,
      this.mapDef.heightPx
    );
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitWidthZoom();
    // kanvas RESIZE: zoom ulang tiap ukuran layar berubah
    this.scale.on("resize", this.onScaleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.onScaleResize);
    });

    this.hudKill = this.add
      .text(16, 48, `Kill: ${this.killCount}`, {
        fontSize: "12px",
        fontFamily: "'system-ui', sans-serif",
        color: "#fbbf24",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  private spawnMonster(monsterId: string) {
    const def = MONSTERS.find((m) => m.id === monsterId)!;
    const spot = this.mapDef.monsterSpawns.find(
      (s) => s.monsterId === monsterId
    )!;
    const x = Phaser.Math.Clamp(
      spot.x + Phaser.Math.Between(-80, 80),
      48,
      this.mapDef.widthPx - 48
    );
    const y = Phaser.Math.Clamp(
      spot.y + Phaser.Math.Between(-80, 80),
      64,
      this.mapDef.heightPx - 48
    );
    const m = new Monster(this, x, y, def, spot.level ?? 1);
    this.monsters.push(m);
    this.physics.add.collider(m, this.obstacles);
    // separasi: monster tidak numpuk + respawn tetap tabrakan dengan player
    this.physics.add.collider(
      m,
      this.monsters.filter((o) => o !== m && o.alive)
    );
    // overlap projectile per-monster (jangan pakai array sekaligus:
    // referensi array basi setelah filter/reassign sehingga respawn tak kena hit)
    this.physics.add.overlap(this.projectiles, m, (proj, target) =>
      this.onProjectileHit(
        proj as Phaser.Physics.Arcade.Image,
        target as Monster
      )
    );
    if (this.player) {
      this.physics.add.collider(this.player, m);
    }
    if (def.boss) {
      const now = this.time.now;
      m.nextAoEAt = now + 6000;
      m.nextSummonAt = now + 12000;
      const txt = worldText(this, x, y - 70, `💀 ${def.name} muncul!`, {
        fontSize: "15px",
        color: "#c084fc",
        fontStyle: "bold",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 8, y: 4 },
      })
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: txt,
        y: y - 90,
        alpha: 0,
        duration: 2000,
        onComplete: () => txt.destroy(),
      });
    }
  }

  // Listener global dilepas saat scene shutdown (scene di-restart tiap pindah portal).
  private globalCleanups: Array<() => void> = [];

  private onWin(type: string, fn: EventListener) {
    window.addEventListener(type, fn);
    this.globalCleanups.push(() => window.removeEventListener(type, fn));
  }

  private onDom(id: string, evt: string, fn: EventListener) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(evt, fn);
    this.globalCleanups.push(() => el.removeEventListener(evt, fn));
  }

  private bindGlobalListeners() {
    this.globalCleanups = [];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.globalCleanups.forEach((f) => {
        try {
          f();
        } catch {
          // abaikan
        }
      });
      this.globalCleanups = [];
    });
    this.onWin("player-died", () => this.showDeath());
    this.onDom("respawn-btn", "click", () => this.respawnPlayer());
    this.onWin("quest-changed", () => this.refreshNpcBubble());
    this.onWin("bounty-changed", () => {
      this.refreshNpcBubble();
      if (!document.getElementById("npc-panel")?.classList.contains("hidden"))
        this.renderNpc();
    });
    this.onWin("gold-changed", ((e: CustomEvent<number>) => {
      checkRich(e.detail ?? 0);
    }) as EventListener);
    this.onWin("achievement-unlocked", ((
      e: CustomEvent<{ name: string; gold: number }>
    ) => {
      const d = e.detail;
      sfxQuest();
      this.chat(`🏆 Pencapaian: ${d.name} (+${d.gold}G)`);
      const txt = worldText(
        this,
        this.player.x,
        this.player.y - 64,
        `🏆 ${d.name} +${d.gold}G`,
        {
          fontSize: "14px",
          color: "#fbbf24",
          fontStyle: "bold",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: { x: 6, y: 3 },
        }
      )
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: txt,
        y: this.player.y - 86,
        alpha: 0,
        duration: 1600,
        onComplete: () => txt.destroy(),
      });
    }) as EventListener);
    this.onWin("claim-quest", ((e: CustomEvent<string>) =>
      this.claimQuest(e.detail)) as EventListener);
    this.onWin("reset-map", () => this.resetMap());
    this.onDom("interact-btn", "click", () => this.openNpc());
    this.onDom("npc-close", "click", () =>
      document.getElementById("npc-panel")?.classList.add("hidden")
    );
    this.onDom("npc-list", "pointerdown", ((e: Event) => {
      const el = e.target as HTMLElement;
      const claimBtn = el.closest<HTMLButtonElement>("button[data-claim]");
      if (claimBtn) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("claim-quest", { detail: claimBtn.dataset.claim })
        );
        return;
      }
      const buyBtn = el.closest<HTMLButtonElement>("button[data-buy]");
      if (buyBtn && !buyBtn.disabled) {
        e.preventDefault();
        this.buyFromShop(buyBtn.dataset.buy!);
        return;
      }
      const sellBtn = el.closest<HTMLButtonElement>("button[data-sell]");
      if (sellBtn && !sellBtn.disabled) {
        e.preventDefault();
        this.sellToShop(sellBtn.dataset.sell!);
        return;
      }
      const enhBtn = el.closest<HTMLButtonElement>("button[data-enhance]");
      if (enhBtn && !enhBtn.disabled) {
        e.preventDefault();
        this.enhanceFromNpc(enhBtn.dataset.enhance as "weapon" | "armor");
      }
    }) as EventListener);
  }

  private onScaleResize = () => {
    this.fitWidthZoom();
  };

  /** Lebar pandang dunia (world px selebar layar). Makin besar = makin jauh. */
  private static readonly VIEW_WIDTH = 1200;

  /** Tinggi HUD atas (agar dunia tidak ke-render di belakangnya). */
  private topUiHeight(): number {
    try {
      let m = 0;
      ["#top-hud", "#target-frame"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) m = Math.max(m, r.bottom);
      });
      return Math.min(m, this.scale.height * 0.4);
    } catch {
      return 0;
    }
  }

  /** Kamera penuhi layar tanpa letterbox; viewport mulai di bawah HUD. */
  private fitWidthZoom() {
    const w = this.scale.width;
    const h = this.scale.height;
    if (w <= 0 || h <= 0) return;
    const top = Math.round(this.topUiHeight());
    this.cameras.main.setViewport(0, top, w, Math.max(1, h - top));
    this.cameras.main.setZoom(w / MapScene.VIEW_WIDTH);
  }

  private createPortals() {
    this.mapDef.portals.forEach((p) => {
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x22d3ee, 0.25);
      g.fillCircle(p.x, p.y, p.r);
      g.lineStyle(3, 0x22d3ee, 0.9);
      g.strokeCircle(p.x, p.y, p.r);
      const dest = getMapDef(p.to);
      worldText(this, p.x, p.y + p.r + 12, `➡ ${dest.name}`, {
        fontSize: "12px",
        color: "#67e8f9",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 6, y: 3 },
      })
        .setOrigin(0.5)
        .setDepth(2);
    });
    // siap masuk 1 detik setelah scene dibuat (hindari pantulan instan)
    this.portalReadyAt = this.time.now + 1000;
  }

  private checkPortals() {
    if (this.player.dead) return;
    if (this.time.now < this.portalReadyAt) return;
    for (const p of this.mapDef.portals) {
      if (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) <=
        p.r
      ) {
        try {
          savePos(this.player.x, this.player.y, this.mapId);
          this.player.saveCurrentJob();
        } catch {
          // abaikan
        }
        this.chat(`➡ Memasuki ${getMapDef(p.to).name}...`);
        this.scene.restart({ mapId: p.to, spawn: { ...p.spawn } });
        return;
      }
    }
  }

  /** Batch UI: umumkan ke panel chat (didengar ui/chat). */
  private chat(text: string) {
    window.dispatchEvent(
      new CustomEvent("chat", {
        detail: { from: "System", text, system: true },
      })
    );
  }

  /** Tap/klik monster = kunci target manual (tap lagi / tanah kosong = lepas). */
  private onWorldTap = (pointer: Phaser.Input.Pointer) => {
    if (pointer.rightButtonDown()) return;
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    let hit: Monster | null = null;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const r = m.displayWidth / 2 + 10;
      if (Phaser.Math.Distance.Between(wx, wy, m.x, m.y) <= r) {
        hit = m;
        break;
      }
    }
    if (hit) {
      if (this.locked === hit) this.unlockTarget();
      else this.lockTarget(hit);
    } else {
      this.unlockTarget();
    }
  };

  private lockTarget(m: Monster, silent = false) {
    this.clearLock();
    this.locked = m;
    this.lockRing = this.add.graphics().setDepth(2);
    if (!silent) sfxClick();
    window.dispatchEvent(
      new CustomEvent('target-show', {
        detail: { id: m.def.id, name: m.def.name, level: m.level, hp: m.hp, maxHp: m.maxHp, locked: true }
      })
    );
  }

  private clearLock() {
    this.locked = null;
    if (this.lockRing) {
      this.lockRing.destroy();
      this.lockRing = null;
    }
  }

  private unlockTarget() {
    this.clearLock();
    window.dispatchEvent(new CustomEvent('target-hide'));
  }

  /** Target serangan: lock manual dulu (bila valid), lalu terdekat otomatis. */
  private pickTarget(range: number, dir: { x: number; y: number }): Monster | null {
    const facingOk = (m: Monster) => {
      const dx = m.x - this.player.x;
      const dy = m.y - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      return (dx / len) * dir.x + (dy / len) * dir.y > 0.2;
    };
    if (this.locked && this.locked.alive) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.locked.x, this.locked.y);
      if (d <= range && facingOk(this.locked)) return this.locked;
    }
    let best: Monster | null = null;
    let bestDist = Infinity;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
      if (d <= range && d < bestDist && facingOk(m)) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  private showDeath() {
    document.getElementById("death-overlay")?.classList.remove("hidden");
    document.getElementById("interact-btn")?.classList.add("hidden");
    // Batch H: penalti mati 5% gold
    let loss = 0;
    try {
      const g = getGold();
      loss = Math.floor(g * 0.05);
      if (loss > 0) addGold(-loss);
      const el = document.getElementById("death-penalty");
      if (el)
        el.textContent =
          loss > 0
            ? `Penalti mati: -${loss}G (5%)`
            : "Tanpa penalti (kantung kosong).";
    } catch {
      // abaikan
    }
    addDeath();
    checkDeaths();
    this.chat(`☠️ Kamu mati${loss > 0 ? ` (-${loss}G)` : ""}. Semangat!`);
    sfxPlayerDie();
    this.cameras.main.shake(250, 0.01);
  }

  private respawnPlayer() {
    document.getElementById("death-overlay")?.classList.add("hidden");
    this.player.respawn(this.mapDef.playerSpawn.x, this.mapDef.playerSpawn.y);
    try {
      savePos(this.player.x, this.player.y, this.mapId);
      this.player.saveCurrentJob();
    } catch {
      // abaikan
    }
  }

  /** Batch D: kembalikan map ke kondisi spawn penuh tanpa restart scene.
   * Player tidak disentuh (HP/posisi tetap). Dipicu event `reset-map`. */
  private resetMap() {
    // batalkan semua respawn yang masih antre agar tidak overpopulasi
    this.pendingRespawns.forEach((t) => {
      try {
        t.remove(false);
      } catch {
        // sudah jalan/hancur
      }
    });
    this.pendingRespawns = [];
    // sapu projectile
    try {
      this.projectiles.clear(true, true);
    } catch {
      // abaikan
    }
    // hapus semua monster (tanpa loot) — splice agar referensi array stabil
    const copy = [...this.monsters];
    this.monsters.splice(0, this.monsters.length);
    if (this.locked) this.unlockTarget();
    copy.forEach((m) => {
      try {
        m.despawn();
      } catch {
        // abaikan
      }
    });
    // spawn ulang penuh sesuai def map ini
    this.mapDef.monsterSpawns.forEach((s) => {
      for (let i = 0; i < s.count; i++) {
        try {
          this.spawnMonster(s.monsterId);
        } catch {
          // abaikan satu spawn gagal
        }
      }
    });
    this.refreshNpcBubble();
    const px = this.player?.x ?? this.mapDef.playerSpawn.x;
    const py = (this.player?.y ?? this.mapDef.playerSpawn.y) - 60;
    const txt = worldText(this, px, py, "🗺️ Map di-reset ✓", {
      fontSize: "14px",
      color: "#4ade80",
      fontStyle: "bold",
      backgroundColor: "rgba(0,0,0,0.55)",
      padding: { x: 8, y: 4 }
    }).setDepth(60);
    this.tweens.add({
      targets: txt,
      y: py - 20,
      alpha: 0,
      duration: 1200,
      onComplete: () => txt.destroy()
    });
  }

  private isNearNpc(): boolean {
    if (!this.npc || !this.player || this.player.dead) return false;
    return (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.npc.x,
        this.npc.y
      ) <= INTERACT_DIST
    );
  }

  private refreshNpcBubble() {
    const qs = snapshotQuests();
    const claimable = hasClaimable();
    const hasProgress = qs.some((q) => q.progress > 0 && !q.claimed);
    this.npc?.setClaimable(claimable, hasProgress);
  }

  private openNpc() {
    if (!this.isNearNpc()) return;
    ["char-panel", "bag-panel", "quest-panel"].forEach((id) =>
      document.getElementById(id)?.classList.add("hidden")
    );
    const panel = document.getElementById("npc-panel")!;
    panel.classList.remove("hidden");
    this.renderNpc();
  }

  private renderNpc() {
    const list = document.getElementById("npc-list")!;
    const questsHtml = snapshotQuests()
      .map((q) => {
        if (!q.unlocked) {
          return `<div class="quest-item locked"><b>🔒 ${q.title}</b><p>${q.desc}</p><small>Selesaikan quest sebelumnya dulu</small></div>`;
        }
        const status = q.claimed
          ? "✅ Selesai"
          : q.done
          ? "🎁 Siap klaim"
          : `⚔️ ${Math.min(q.progress, q.killCount)}/${q.killCount}`;
        const btn = q.claimed
          ? ""
          : q.done
          ? `<button class="bag-btn" data-claim="${q.id}">Klaim +${
              q.rewardExp
            } EXP${q.rewardItemId ? " + 🎁" : ""}</button>`
          : `<small>Bunuh ${q.killTarget} (${q.progress}/${q.killCount})</small>`;
        return `<div class="quest-item"><b>${q.title}</b><p>${q.desc}</p><small>${status}</small><div>${btn}</div></div>`;
      })
      .join("");
    const buyHtml = SHOP_BUY.map((s) => {
      const def = getItem(s.id);
      return `<div class="quest-item"><b>🛒 ${def?.name ?? s.id}</b><p>${
        def?.desc ?? ""
      }</p><div><button class="bag-btn" data-buy="${s.id}">Beli ${
        s.price
      }G</button></div></div>`;
    }).join("");
    const sellHtml = SHOP_SELL.map((s) => {
      const def = getItem(s.id);
      const n = getCount(s.id);
      return `<div class="quest-item"><b>💰 Jual ${
        def?.name ?? s.id
      } (x${n})</b><div><button class="bag-btn" data-sell="${s.id}" ${
        n <= 0 ? "disabled" : ""
      }>Jual +${s.price}G</button></div></div>`;
    }).join("");
    const bounties = getBounties();
    const bountyHtml = bounties
      .map(
        (b) =>
          `<div class="quest-item ${b.done ? "done" : ""}"><b>🎯 ${
            b.name
          }</b><p>Bunuh ${b.need} ${b.target} hari ini.</p><small>${
            b.done
              ? `✅ Selesai (+${b.gold}G +${b.exp} EXP)`
              : `⚔️ ${Math.min(b.progress, b.need)}/${b.need}`
          }</small></div>`
      )
      .join("");
    const enhanceHtml = (["weapon", "armor"] as Array<"weapon" | "armor">)
      .map((slot) => {
        const lvl = getEnhance(slot);
        const equipped =
          slot === "weapon" ? getEquippedWeaponId() : getEquippedArmorId();
        const def = equipped ? getItem(equipped) : undefined;
        const label = slot === "weapon" ? "🔫 Senjata" : "🛡️ Armor";
        const cost = enhanceCost(slot);
        const btn = cost
          ? `<button class="bag-btn" data-enhance="${slot}">Tempa +${
              lvl + 1
            } (${cost.gold}G${
              cost.gel > 0 ? ` + ${cost.gel} Gel` : ""
            })</button>`
          : `<small>MAX +${ENHANCE_MAX} ✓</small>`;
        return `<div class="quest-item"><b>${label}: ${
          def?.name ?? "-"
        } +${lvl}</b><div>${btn}</div></div>`;
      })
      .join("");
    list.innerHTML =
      `<div class="char-section"><b>Quest</b></div>${questsHtml}` +
      `<div class="char-section"><b>Bounty</b></div>${bountyHtml}` +
      `<div class="char-section"><b>Tempa (max +5)</b></div>${enhanceHtml}` +
      `<div class="char-section"><b>Shop — Gold: ${getGold()}G</b></div>${buyHtml}${sellHtml}` +
      `<div><small id="shop-msg"></small></div>`;
  }

  private shopMsg(msg: string, ok: boolean) {
    const el = document.getElementById("shop-msg");
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? "#4ade80" : "#ef4444";
    }
  }

  private buyFromShop(itemId: string) {
    if (!this.isNearNpc()) return;
    const res = buyItem(itemId);
    if (res.ok) sfxCoin();
    else sfxClick();
    this.shopMsg(res.ok ? "Terbeli ✓" : res.reason ?? "Gagal beli", res.ok);
    this.renderNpc();
  }

  private sellToShop(itemId: string) {
    if (!this.isNearNpc()) return;
    const res = sellItem(itemId);
    if (res.ok) sfxCoin();
    else sfxClick();
    this.shopMsg(res.ok ? "Terjual ✓" : res.reason ?? "Gagal jual", res.ok);
    this.renderNpc();
  }

  private enhanceFromNpc(slot: "weapon" | "armor") {
    if (!this.isNearNpc()) return;
    const res = tryEnhance(slot);
    if (res.ok) {
      sfxLevelUp();
      this.levelFx.explode(this.fxN(10), this.player.x, this.player.y);
      checkEnhance();
    } else {
      sfxClick();
    }
    this.shopMsg(
      res.ok ? `Tempa +${getEnhance(slot)} ✓` : res.reason ?? "Gagal tempa",
      res.ok
    );
    this.renderNpc();
  }

  private claimQuest(questId: string) {
    if (!this.npc || !this.isNearNpc()) return;
    if (!canClaim(questId)) return;
    const reward = claimReward(questId);
    if (!reward) return;
    if (reward.itemId) addItem(reward.itemId, 1);
    sfxQuest();
    const qdef = snapshotQuests().find((q) => q.id === questId);
    this.chat(
      `📜 Quest selesai: ${qdef?.title ?? questId} (+${reward.exp} EXP)`
    );
    const leveled = this.player.addExp(reward.exp);
    addClaim();
    checkClaims();
    if (leveled) {
      setMaxLevel(this.player.level);
      checkLevel(this.player.level);
      sfxLevelUp();
      this.levelFx.explode(this.fxN(18), this.player.x, this.player.y);
      this.chat(`⬆️ Naik ke Lv.${this.player.level}!`);
    }
    // addExp sudah save job; pastikan posisi ikut tersimpan
    try {
      savePos(this.player.x, this.player.y, this.mapId);
    } catch {
      // abaikan
    }
    const txt = worldText(
      this,
      this.npc.x,
      this.npc.y - 70,
      `+${reward.exp} EXP${reward.itemId ? " + 🎁" : ""}`,
      {
        fontSize: "14px",
        color: "#4ade80",
        fontStyle: "bold",
      }
    ).setDepth(60);
    this.tweens.add({
      targets: txt,
      y: this.npc.y - 90,
      alpha: 0,
      duration: 1200,
      onComplete: () => txt.destroy(),
    });
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
      const slash = this.add
        .image(cx, cy, "slash")
        .setDepth(this.player.depth + 0.2);
      slash.setAngle(
        dir.x === -1 ? 180 : dir.y === -1 ? -90 : dir.y === 1 ? 90 : 0
      );
      slash.setScale(0.9);
      this.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 1.3,
        duration: 160,
        onComplete: () => slash.destroy(),
      });
      sfxSwing();

      const { dmg, crit } = this.player.rollDamage();
      const victims = this.monsters
        .filter(
          (m) =>
            m.alive &&
            Phaser.Math.Distance.Between(
              this.player.x,
              this.player.y,
              m.x,
              m.y
            ) <=
              this.player.attackRange + 14
        )
        .filter((m) => {
          // hanya yang di depan (dot product > 0.2)
          const dx = m.x - this.player.x;
          const dy = m.y - this.player.y;
          const len = Math.hypot(dx, dy) || 1;
          return (dx / len) * dir.x + (dy / len) * dir.y > 0.2;
        })
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
            Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
        );
      // basic attack menghubungkan panel + cincin ke korban terdekat
      if (victims.length > 0 && (!this.locked || !this.locked.alive)) {
        this.lockTarget(victims[0], true);
      }
      victims.forEach((m) => this.damageMonster(m, dmg, crit));
    } else {
      // Mage/Archer: target manual (lock) dulu, lalu otomatis terdekat di depan.
      // Syarat: harus menghadap monster (dot > 0.2), kalau membelakangi tidak bisa menyerang.
      const range = this.player.attackRange;
      const target = this.pickTarget(range, dir);
      if (!target) return;
      // basic attack menghubungkan panel + cincin (diam-diam bila belum ada lock)
      if (!this.locked || !this.locked.alive) this.lockTarget(target, true);
      const dx = target.x - this.player.x;
      const dy = target.y - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const proj = this.projectiles.create(
        this.player.x + nx * 20,
        this.player.y + ny * 20,
        this.player.projectileTexture
      ) as Phaser.Physics.Arcade.Image;
      proj.setDepth(10 + proj.y * 0.01 + 0.2);
      proj.setActive(true).setVisible(true);
      const { dmg, crit } = this.player.rollDamage();
      proj.setData("dmg", dmg);
      proj.setData("crit", crit);
      proj.setData("startX", proj.x);
      proj.setData("startY", proj.y);
      proj.setData("range", range);
      proj.setData("target", target);
      const speed = this.player.jobId === "mage" ? 320 : 440;
      proj.setData("speed", speed);
      // pastikan body ikut aktif setelah create dari group
      if (proj.body) proj.body.reset(proj.x, proj.y);
      proj.setVelocity(nx * speed, ny * speed);
      proj.setAngle((Math.atan2(ny, nx) * 180) / Math.PI);
      if (this.player.jobId === "mage") sfxShootFire();
      else sfxShootArrow();
    }
  }

  /** Batch L: skala jumlah partikel (low = setengah). */
  private fxN(n: number): number {
    if (getQuality() === "low") return Math.max(1, Math.ceil(n / 2));
    return n;
  }

  /** Batch K: AoE telegraph + summon skeleton untuk boss elite. */
  private bossPatterns(m: Monster, now: number) {
    // AoE: tiap 9 dtk bila player < 220px. Lingkaran merah 0.9 dtk, lalu boom r90.
    if (now >= m.nextAoEAt) {
      m.nextAoEAt = now + 9000;
      const dist = Phaser.Math.Distance.Between(
        m.x,
        m.y,
        this.player.x,
        this.player.y
      );
      if (dist > 220) return;
      const cx = this.player.x;
      const cy = this.player.y;
      const warn = this.add.graphics().setDepth(2);
      warn.fillStyle(0xef4444, 0.3);
      warn.fillCircle(cx, cy, 90);
      warn.lineStyle(2, 0xef4444, 0.9);
      warn.strokeCircle(cx, cy, 90);
      sfxClick();
      this.time.delayedCall(900, () => {
        warn.destroy();
        if (!m.active || !m.alive || this.player.dead) return;
        this.dieFx.explode(this.fxN(14), cx, cy);
        sfxBoom();
        if (
          Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy) <=
          90
        ) {
          const res = this.player.takeDamage(m.def.aoeDmg ?? 25);
          if (!res.dodged) {
            sfxPlayerHurt();
            this.cameras.main.shake(120, 0.005);
          }
          const label = res.dodged
            ? "MISS"
            : res.blocked
            ? `BLOCK -${res.actual}`
            : `-${res.actual}`;
          const txt = this.add
            .text(this.player.x, this.player.y - 40, label, {
              fontSize: "14px",
              color: "#fb923c",
              fontStyle: "bold",
            })
            .setDepth(60);
          this.tweens.add({
            targets: txt,
            y: this.player.y - 56,
            alpha: 0,
            duration: 600,
            onComplete: () => txt.destroy(),
          });
        }
      });
    }
    // Summon: tiap 22 dtk panggil 2 skeleton (max 12 monster hidup).
    if (now >= m.nextSummonAt) {
      m.nextSummonAt = now + 22000;
      const aliveCount = this.monsters.filter((o) => o.alive).length;
      if (aliveCount >= 12) return;
      const dist = Phaser.Math.Distance.Between(
        m.x,
        m.y,
        this.player.x,
        this.player.y
      );
      if (dist > 400) return;
      const txt = worldText(this, m.x, m.y - 70, "💀 Boss memanggil!", {
        fontSize: "13px",
        color: "#c084fc",
        fontStyle: "bold",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 6, y: 3 },
      })
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: txt,
        y: m.y - 88,
        alpha: 0,
        duration: 1200,
        onComplete: () => txt.destroy(),
      });
      sfxMonsterDie();
      for (let i = 0; i < 2; i++) {
        const sx = Phaser.Math.Clamp(
          m.x + (i === 0 ? -50 : 50),
          48,
          this.mapDef.widthPx - 48
        );
        const sy = Phaser.Math.Clamp(m.y + 40, 64, this.mapDef.heightPx - 48);
        const def = MONSTERS.find(
          (d) => d.id === (m.def.summonId ?? "skeleton")
        )!;
        const min = new Monster(this, sx, sy, def, m.level);
        this.monsters.push(min);
        this.physics.add.collider(min, this.obstacles);
        this.physics.add.collider(
          min,
          this.monsters.filter((o) => o !== min && o.alive)
        );
        this.physics.add.overlap(this.projectiles, min, (proj, target) =>
          this.onProjectileHit(
            proj as Phaser.Physics.Arcade.Image,
            target as Monster
          )
        );
        this.physics.add.collider(this.player, min);
        min.provoke(this.time.now, 8000);
        this.dieFx.explode(this.fxN(8), sx, sy);
      }
    }
  }

  private onProjectileHit(proj: Phaser.Physics.Arcade.Image, target: Monster) {
    if (!target.alive) return;
    if (!proj.active) return;
    const dmg = (proj.getData("dmg") as number) ?? 10;
    const crit = (proj.getData("crit") as boolean) ?? false;
    const aoe = (proj.getData("aoe") as number) ?? 0;
    const hx = proj.x;
    const hy = proj.y;
    proj.destroy();
    this.damageMonster(target, dmg, crit);
    // Fireball: ledakan AoE 50% ke monster lain di sekitar titik kena
    if (aoe > 0) {
      const splash = Math.max(1, Math.round(dmg * 0.5));
      this.monsters
        .filter((m) => m !== target && m.alive && !m.evading)
        .filter((m) => Phaser.Math.Distance.Between(hx, hy, m.x, m.y) <= aoe)
        .forEach((m) => this.damageMonster(m, splash, false));
    }
  }

  private skillFxText(label: string, color = "#93c5fd") {
    const txt = worldText(this, this.player.x, this.player.y - 52, label, {
      fontSize: "14px",
      color,
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: txt,
      y: this.player.y - 72,
      alpha: 0,
      duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  private trySkill(slot = 0) {
    const now = this.time.now;
    const def = getSkill(this.player.jobId, slot);
    if (!def) return;
    if (this.player.dead) return;
    if (!this.player.canSkill(now, def.cooldownMs, slot)) return;

    const dir = this.player.facingVector();
    const range = this.player.attackRange;
    // Konsumsi MP + tandai cooldown. False = MP kurang (tampilkan hint).
    const use = (): boolean => {
      if (!this.player.tryConsumeMp(def.mpCost)) {
        this.skillFxText("MP kurang!", "#93c5fd");
        return false;
      }
      this.player.markSkilled(now, slot);
      window.dispatchEvent(
        new CustomEvent("skill-used", { detail: { slot, ms: def.cooldownMs } })
      );
      return true;
    };

    if (def.id === "whirlwind") {
      // Warrior S1: AoE 360° tanpa syarat hadap
      const victims = this.monsters.filter(
        (m) =>
          m.alive &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            m.x,
            m.y
          ) <= 115
      );
      if (victims.length === 0) return;
      if (!use()) return;
      this.skillFxText("Whirlwind!", "#fbbf24");
      sfxSkill("warrior");
      this.cameras.main.shake(90, 0.003);
      const slash = this.add
        .image(this.player.x, this.player.y, "slash")
        .setDepth(this.player.depth + 0.2);
      slash.setScale(1.8);
      this.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 2.4,
        duration: 250,
        onComplete: () => slash.destroy(),
      });
      const { dmg, crit } = this.player.rollDamage();
      const skillDmg = Math.max(1, Math.round(dmg * 1.5));
      victims.forEach((m) => this.damageMonster(m, skillDmg, crit));
      return;
    }

    if (def.id === "bulwark") {
      // Warrior S2: perisai 6 dtk
      if (!use()) return;
      this.player.shieldUntil = now + 6000;
      this.skillFxText("Bulwark!", "#93c5fd");
      sfxSkill("warrior");
      this.player.setTint(0x93c5fd);
      this.time.delayedCall(6000, () => {
        if (!this.player.dead) this.player.clearTint();
      });
      this.levelFx.explode(this.fxN(10), this.player.x, this.player.y);
      return;
    }

    if (def.id === "leap-slam") {
      // Warrior S3: lompat 130px + AoE 100 (130%)
      const victims = this.monsters.filter(
        (m) =>
          m.alive &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            m.x,
            m.y
          ) <= 140
      );
      if (victims.length === 0) return;
      if (!use()) return;
      this.teleportSkill(130);
      this.skillFxText("Leap Slam!", "#fb923c");
      sfxSkill("warrior");
      this.cameras.main.shake(120, 0.005);
      const slash = this.add
        .image(this.player.x, this.player.y, "slash")
        .setDepth(this.player.depth + 0.2);
      slash.setScale(1.6);
      this.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 2.2,
        duration: 250,
        onComplete: () => slash.destroy(),
      });
      const { dmg, crit } = this.player.rollDamage();
      const skillDmg = Math.max(1, Math.round(dmg * 1.3));
      this.monsters
        .filter(
          (m) =>
            m.alive &&
            Phaser.Math.Distance.Between(
              this.player.x,
              this.player.y,
              m.x,
              m.y
            ) <= 100
        )
        .forEach((m) => this.damageMonster(m, skillDmg, crit));
      return;
    }

    if (def.id === "fireball") {
      const target = this.pickTarget(range, dir);
      if (!target) return;
      if (!use()) return;
      this.skillFxText("Fireball!", "#fb923c");
      sfxSkill("mage");
      const dx = target.x - this.player.x;
      const dy = target.y - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const proj = this.projectiles.create(
        this.player.x + nx * 20,
        this.player.y + ny * 20,
        this.player.projectileTexture
      ) as Phaser.Physics.Arcade.Image;
      proj.setDepth(10 + proj.y * 0.01 + 0.2);
      proj.setActive(true).setVisible(true);
      proj.setScale(1.8);
      const { dmg, crit } = this.player.rollDamage();
      const skillDmg = Math.max(1, Math.round(dmg * 2));
      proj.setData("dmg", skillDmg);
      proj.setData("crit", crit);
      proj.setData("startX", proj.x);
      proj.setData("startY", proj.y);
      proj.setData("range", range + 40);
      proj.setData("target", target);
      proj.setData("speed", 380);
      proj.setData("hitRadius", 36);
      proj.setData("aoe", 65);
      if (proj.body) proj.body.reset(proj.x, proj.y);
      proj.setVelocity(nx * 380, ny * 380);
      proj.setAngle((Math.atan2(ny, nx) * 180) / Math.PI);
      return;
    }

    if (def.id === "frost-nova") {
      // Mage S2: AoE 130 sekitar player (100%) + slow 4 dtk
      const victims = this.monsters.filter(
        (m) =>
          m.alive &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            m.x,
            m.y
          ) <= 130
      );
      if (victims.length === 0) return;
      if (!use()) return;
      this.skillFxText("Frost Nova!", "#67e8f9");
      sfxSkill("mage");
      const ring = this.add.graphics().setDepth(this.player.depth + 0.1);
      ring.lineStyle(4, 0x67e8f9, 0.9);
      ring.strokeCircle(this.player.x, this.player.y, 130);
      ring.fillStyle(0x67e8f9, 0.15);
      ring.fillCircle(this.player.x, this.player.y, 130);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        duration: 500,
        onComplete: () => ring.destroy(),
      });
      const { dmg, crit } = this.player.rollDamage();
      victims.forEach((m) => {
        m.slowUntil = now + 4000;
        this.damageMonster(m, dmg, crit);
      });
      return;
    }

    if (def.id === "blink") {
      // Mage S3: teleport 170px
      if (!use()) return;
      this.teleportSkill(170);
      this.skillFxText("Blink!", "#c084fc");
      sfxSkill("mage");
      return;
    }

    if (def.id === "double-shot") {
      // Archer S1: 2 panah (lock manual prioritas, lalu terdekat di depan)
      const primary = this.pickTarget(range, dir);
      if (!primary) return;
      if (!use()) return;
      this.skillFxText("Double Shot!", "#4ade80");
      sfxSkill("archer");
      const targets = [primary];
      let best2: Monster | null = null;
      let bestDist = Infinity;
      for (const m of this.monsters) {
        if (!m.alive || m === primary) continue;
        const d = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          m.x,
          m.y
        );
        if (d > range || d >= bestDist) continue;
        const dx = m.x - this.player.x;
        const dy = m.y - this.player.y;
        const len = Math.hypot(dx, dy) || 1;
        if ((dx / len) * dir.x + (dy / len) * dir.y <= 0.2) continue;
        bestDist = d;
        best2 = m;
      }
      targets.push(best2 ?? primary);
      const { dmg, crit } = this.player.rollDamage();
      targets.forEach((target, i) => {
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;
        const off = i === 0 ? -6 : 6;
        const proj = this.projectiles.create(
          this.player.x + nx * 20 - ny * off,
          this.player.y + ny * 20 + nx * off,
          this.player.projectileTexture
        ) as Phaser.Physics.Arcade.Image;
        proj.setDepth(10 + proj.y * 0.01 + 0.2);
        proj.setActive(true).setVisible(true);
        proj.setData("dmg", dmg);
        proj.setData("crit", crit);
        proj.setData("startX", proj.x);
        proj.setData("startY", proj.y);
        proj.setData("range", range);
        proj.setData("target", target);
        proj.setData("speed", 460);
        proj.setData("hitRadius", 28);
        if (proj.body) proj.body.reset(proj.x, proj.y);
        proj.setVelocity(nx * 460, ny * 460);
        proj.setAngle((Math.atan2(ny, nx) * 180) / Math.PI);
      });
      return;
    }

    if (def.id === "arrow-rain") {
      // Archer S2: hujan panah di titik target (160%, r85, jeda 0.7 dtk)
      const target = this.pickTarget(range, dir);
      if (!target) return;
      if (!use()) return;
      const tx = target.x;
      const ty = target.y;
      this.skillFxText("Arrow Rain!", "#4ade80");
      sfxSkill("archer");
      const mark = this.add.graphics().setDepth(2);
      mark.lineStyle(2, 0x4ade80, 0.9);
      mark.strokeCircle(tx, ty, 85);
      this.time.delayedCall(700, () => {
        mark.destroy();
        if (this.player.dead) return;
        this.dieFx.explode(this.fxN(12), tx, ty);
        sfxBoom();
        const { dmg, crit } = this.player.rollDamage();
        const skillDmg = Math.max(1, Math.round(dmg * 1.6));
        this.monsters
          .filter(
            (m) =>
              m.alive && Phaser.Math.Distance.Between(tx, ty, m.x, m.y) <= 85
          )
          .forEach((m) => this.damageMonster(m, skillDmg, crit));
      });
      return;
    }

    if (def.id === "swift") {
      // Archer S3: 6 dtk serang cepat + gerak cepat
      if (!use()) return;
      this.player.swiftUntil = now + 6000;
      this.skillFxText("Swift!", "#4ade80");
      sfxSkill("archer");
      this.levelFx.explode(this.fxN(10), this.player.x, this.player.y);
      return;
    }
  }

  /** Teleport searah hadap (blink / leap). */
  private teleportSkill(dist: number) {
    const dir = this.player.facingVector();
    const nx = Phaser.Math.Clamp(
      this.player.x + dir.x * dist,
      48,
      this.mapDef.widthPx - 48
    );
    const ny = Phaser.Math.Clamp(
      this.player.y + dir.y * dist,
      64,
      this.mapDef.heightPx - 48
    );
    this.dieFx.explode(this.fxN(8), this.player.x, this.player.y);
    this.player.setPosition(nx, ny);
    this.player.setVelocity(0, 0);
    this.player.setDepth(10 + (ny + 24) * 0.01);
    this.dieFx.explode(this.fxN(8), nx, ny);
  }

  private damageMonster(m: Monster, dmg: number, crit = false) {
    // evade: immune, tampilkan label, jangan provoke / damage
    if (m.evading) {
      const txt = worldText(this, m.x, m.y - 52, "EVADE", {
        fontSize: "14px",
        color: "#e5e7eb",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 6, y: 3 },
        fontStyle: "bold",
      })
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: txt,
        y: m.y - 68,
        alpha: 0,
        duration: 600,
        onComplete: () => txt.destroy(),
      });
      return;
    }
    // kena hit = langsung aggro ke player walau di luar aggroRange
    m.provoke(this.time.now);
    sfxHit();
    this.hitFx.explode(this.fxN(6), m.x, m.y - 10);
    // angka damage melayang (kuning jika crit)
    const txt = worldText(
      this,
      m.x,
      m.y - 36,
      `${crit ? "CRIT " : ""}-${dmg}`,
      {
        fontSize: crit ? "15px" : "13px",
        color: crit ? "#fbbf24" : "#ffffff",
        fontStyle: "bold",
      }
    ).setDepth(60);
    this.tweens.add({
      targets: txt,
      y: m.y - 52,
      alpha: 0,
      duration: 500,
      onComplete: () => txt.destroy(),
    });

    const died = m.takeDamage(dmg);
    this.player.healFromLifesteal(dmg);
    if (!died) {
      // panel status target ikut HP terbaru
      window.dispatchEvent(
        new CustomEvent('target-show', {
          detail: { id: m.def.id, name: m.def.name, level: m.level, hp: m.hp, maxHp: m.maxHp, locked: this.locked === m }
        })
      );
    }
    if (died) {
      this.killCount += 1;
      this.hudKill.setText(`Kill: ${this.killCount}`);
      const monsterId = m.def.id;
      const monsterExp = m.def.exp;
      const wasBoss = !!m.def.boss;
      addKill(monsterId);
      checkKills(monsterId);
      try {
        const meta = loadMeta();
        meta.killCount = this.killCount;
        meta.currentJob = this.player.jobId;
        saveMeta(meta);
      } catch {
        // abaikan
      }
      window.dispatchEvent(
        new CustomEvent("monster-killed", { detail: monsterId })
      );
      registerKill(monsterId);
      sfxMonsterDie();
      this.dieFx.explode(this.fxN(wasBoss ? 26 : 12), m.x, m.y);
      if (wasBoss) {
        this.cameras.main.shake(200, 0.008);
        this.chat(`💀 ${m.def.name} Lv.${m.level} tumbang!`);
      }
      // loot Batch B: gold selalu + item chance
      const loot = rollDrops(monsterId);
      if (loot.gold > 0) {
        addGold(loot.gold);
        sfxCoin();
        this.coinFx.explode(this.fxN(8), m.x, m.y - 40);
      }
      loot.items.forEach((d) => addItem(d.id, d.count));
      const lootParts = [`+${loot.gold}G`];
      loot.items.forEach((d) => {
        const def = getItem(d.id);
        lootParts.push(`+${def?.name ?? d.id}`);
      });
      const lootTxt = worldText(this, m.x, m.y - 52, lootParts.join(" "), {
        fontSize: "12px",
        color: "#fbbf24",
        fontStyle: "bold",
      }).setDepth(60);
      this.tweens.add({
        targets: lootTxt,
        y: m.y - 70,
        alpha: 0,
        duration: 900,
        onComplete: () => lootTxt.destroy(),
      });
      // hapus dari list tanpa ganti referensi array (agar collider/overlap stabil)
      const idx = this.monsters.indexOf(m);
      if (idx >= 0) this.monsters.splice(idx, 1);
      if (this.locked === m) this.unlockTarget();
      m.dieWithEffect(() => {
        // respawn sesuai def (boss 25 detik, biasa 4 detik)
        const respawnMs =
          MONSTERS.find((d) => d.id === monsterId)?.respawnMs ?? 4000;
        const timer = this.time.delayedCall(respawnMs, () => {
          const ti = this.pendingRespawns.indexOf(timer);
          if (ti >= 0) this.pendingRespawns.splice(ti, 1);
          this.spawnMonster(monsterId);
        });
        this.pendingRespawns.push(timer);
      });
      const leveled = this.player.addExp(monsterExp);
      if (leveled) {
        setMaxLevel(this.player.level);
        checkLevel(this.player.level);
        sfxLevelUp();
        this.chat(`⬆️ Naik ke Lv.${this.player.level}!`);
        this.levelFx.explode(this.fxN(18), this.player.x, this.player.y);
        const lv = worldText(
          this,
          this.player.x,
          this.player.y - 44,
          `LEVEL UP! Lv.${this.player.level}`,
          {
            fontSize: "14px",
            color: "#4ade80",
            fontStyle: "bold",
          }
        ).setDepth(60);
        this.tweens.add({
          targets: lv,
          y: this.player.y - 64,
          alpha: 0,
          duration: 1200,
          onComplete: () => lv.destroy(),
        });
      }
      // Batch S: bounty harian per-map (auto-klaim)
      const completedBounties = registerKillBounty(monsterId);
      completedBounties.forEach((b, bi) => {
        addGold(b.gold);
        sfxCoin();
        sfxQuest();
        this.chat(`🎯 Bounty selesai: ${b.name} (+${b.gold}G)`);
        const bl = this.player.addExp(b.exp);
        if (bl) {
          setMaxLevel(this.player.level);
          checkLevel(this.player.level);
        }
        const bt = worldText(
          this,
          m.x,
          m.y - 72 - bi * 22,
          `🎯 ${b.name} +${b.gold}G +${b.exp} EXP`,
          {
            fontSize: "14px",
            color: "#fbbf24",
            fontStyle: "bold",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: { x: 6, y: 3 },
          }
        )
          .setOrigin(0.5)
          .setDepth(60);
        this.tweens.add({
          targets: bt,
          y: m.y - 92 - bi * 22,
          alpha: 0,
          duration: 1500,
          onComplete: () => bt.destroy(),
        });
        if (bl && !leveled) {
          sfxLevelUp();
          this.levelFx.explode(this.fxN(18), this.player.x, this.player.y);
        }
      });
    }
  }

  private createGround() {
    const g = this.add.graphics().setDepth(0);
    const ts = this.mapDef.tileSize;
    const theme = this.mapDef.theme;
    const dark = theme === "dark";
    const cave = theme === "cave";
    for (let ty = 0; ty < this.mapDef.heightTiles; ty++) {
      for (let tx = 0; tx < this.mapDef.widthTiles; tx++) {
        const checker = (tx + ty) % 2 === 0;
        g.fillStyle(
          checker
            ? cave
              ? 0x241d2e
              : dark
              ? 0x161a16
              : 0x1e2b1f
            : cave
            ? 0x1d1626
            : dark
            ? 0x111511
            : 0x1a261b,
          1
        );
        g.fillRect(tx * ts, ty * ts, ts, ts);
        g.lineStyle(1, cave ? 0x3b2d4d : dark ? 0x232823 : 0x2a3d2c, 0.35);
        g.strokeRect(tx * ts, ty * ts, ts, ts);
      }
    }
    if (theme === "green") {
      // jalan tanah: horizontal + vertikal bersilangan di spawn
      g.fillStyle(0x4a3b2a, 1);
      g.fillRect(32, 464, this.mapDef.widthPx - 64, 32);
      g.fillRect(624, 32, 32, this.mapDef.heightPx - 64);
    } else if (dark) {
      // abu + tulang berserakan
      let seed = 99;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      g.fillStyle(0x3f3f46, 0.8);
      for (let i = 0; i < 60; i++) {
        g.fillCircle(
          40 + rnd() * (this.mapDef.widthPx - 80),
          40 + rnd() * (this.mapDef.heightPx - 80),
          2
        );
      }
    } else {
      // lava tengah + kristal
      g.fillStyle(0x7f1d1d, 1);
      g.fillEllipse(704, 595, 240, 150);
      g.fillStyle(0xef4444, 1);
      g.fillEllipse(704, 595, 200, 118);
      g.fillStyle(0xfbbf24, 1);
      g.fillEllipse(704, 595, 120, 66);
      let seed = 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      g.fillStyle(0x67e8f9, 0.9);
      for (let i = 0; i < 40; i++) {
        const x = 60 + rnd() * (this.mapDef.widthPx - 120);
        const y = 60 + rnd() * (this.mapDef.heightPx - 120);
        if (Math.hypot(x - 704, y - 595) < 180) continue;
        g.fillTriangle(x - 4, y + 5, x, y - 7, x + 4, y + 5);
      }
    }
    const hz = this.mapDef.healZone;
    // heal zone hijau di spawn
    g.fillStyle(0x22c55e, 0.15);
    g.fillCircle(hz.x, hz.y, hz.r);
    g.lineStyle(2, 0x22c55e, 0.7);
    g.strokeCircle(hz.x, hz.y, hz.r);
    g.lineStyle(2, 0x3b82f6, 0.5);
    g.strokeCircle(this.mapDef.playerSpawn.x, this.mapDef.playerSpawn.y, 24);
    worldText(this, hz.x, hz.y + hz.r + 12, "HEAL ZONE", {
      fontSize: "12px",
      color: "#4ade80",
    })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private createDecorations() {
    // flat (di bawah entity): tembok + kolam + bunga
    const g = this.add.graphics().setDepth(1);
    const W = this.mapDef.widthPx;
    const H = this.mapDef.heightPx;
    g.fillStyle(0x374151, 1);
    g.fillRect(0, 0, W, 32);
    g.fillRect(0, H - 32, W, 32);
    g.fillRect(0, 0, 32, H);
    g.fillRect(W - 32, 0, 32, H);
    // kolam (opsional per map)
    const p = this.mapDef.pond;
    if (p) {
      g.fillStyle(0x1d4ed8, 1);
      g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.fillStyle(0x3b82f6, 1);
      g.fillEllipse(p.x, p.y, p.rx * 1.5, p.ry * 1.4);
    }
    // rumah per-objek agar Y-sort (player depan/belakang benar)
    this.mapDef.houses.forEach((h) => {
      const hg = this.add.graphics().setDepth(10 + (h.y + h.h) * 0.01);
      hg.fillStyle(this.mapDef.theme === "dark" ? 0x57534e : 0x92400e, 1);
      hg.fillRect(h.x, h.y + 24, h.w, h.h - 24);
      hg.fillStyle(this.mapDef.theme === "dark" ? 0x1c1917 : 0x7f1d1d, 1);
      hg.fillTriangle(
        h.x - 8,
        h.y + 26,
        h.x + h.w / 2,
        h.y - 18,
        h.x + h.w + 8,
        h.y + 26
      );
      hg.fillStyle(0x1f2937, 1);
      hg.fillRect(h.x + h.w / 2 - 10, h.y + h.h - 34, 20, 34);
      hg.fillStyle(0xfbbf24, 1);
      hg.fillRect(h.x + 12, h.y + 40, 16, 14);
      hg.fillRect(h.x + h.w - 28, h.y + 40, 16, 14);
    });
    // pohon per-objek agar Y-sort (gua: stalagmit abu)
    this.mapDef.trees.forEach((t) => {
      const tg = this.add.graphics().setDepth(10 + (t.y + 13) * 0.01);
      tg.fillStyle(0x78350f, 1);
      tg.fillRect(t.x - 3, t.y - 2, 6, 14);
      if (this.mapDef.theme === "green") {
        tg.fillStyle(0x166534, 1);
        tg.fillCircle(t.x, t.y - 12, 16);
        tg.fillStyle(0x22c55e, 1);
        tg.fillCircle(t.x - 5, t.y - 16, 9);
      } else {
        tg.fillStyle(0x44403c, 1);
        tg.fillCircle(t.x, t.y - 12, 15);
        tg.lineStyle(2, 0x292524, 1);
        tg.strokeCircle(t.x, t.y - 12, 15);
      }
    });
    // bunga + rumput deterministik (tanpa collision)
    let seed = this.mapDef.theme === "dark" ? 21 : 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const avoid: Array<{ x: number; y: number; r: number }> = [
      { x: this.mapDef.playerSpawn.x, y: this.mapDef.playerSpawn.y, r: 100 },
      ...(this.mapDef.npc
        ? [{ x: this.mapDef.npc.x, y: this.mapDef.npc.y, r: 80 }]
        : []),
      ...this.mapDef.monsterSpawns.map((s) => ({ x: s.x, y: s.y, r: 90 })),
      ...(this.mapDef.pond
        ? [{ x: this.mapDef.pond.x, y: this.mapDef.pond.y, r: 120 }]
        : []),
    ];
    for (let i = 0; i < 46; i++) {
      const x = 40 + rnd() * (this.mapDef.widthPx - 80);
      const y = 40 + rnd() * (this.mapDef.heightPx - 80);
      if (avoid.some((a) => Math.hypot(x - a.x, y - a.y) < a.r)) continue;
      if (rnd() < 0.5) {
        g.fillStyle([0xfbcfe8, 0xfef08a, 0xffffff][i % 3], 1);
        g.fillCircle(x, y, 2);
      } else {
        g.fillStyle(0x2f6b33, 1);
        g.fillRect(x, y, 2, 5);
      }
    }
  }

  private createObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    this.mapDef.obstacles.forEach((o) => {
      const zone = this.add.zone(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    });
    // pohon blocking 26x26
    this.mapDef.trees.forEach((t) => {
      const zone = this.add.zone(t.x, t.y + 4, 26, 26);
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

    // input skill: tombol skill UI + Q/1/2/3 (slot 0/0/1/2)
    const queuedSlot = VirtualInput.consumeSkill();
    if (queuedSlot !== null) {
      this.trySkill(queuedSlot);
    } else if (
      Phaser.Input.Keyboard.JustDown(this.skillKeyQ) ||
      Phaser.Input.Keyboard.JustDown(this.skillKey1)
    ) {
      this.trySkill(0);
    } else if (Phaser.Input.Keyboard.JustDown(this.skillKey2)) {
      this.trySkill(1);
    } else if (Phaser.Input.Keyboard.JustDown(this.skillKey3)) {
      this.trySkill(2);
    }

    // interaksi NPC: E / tombol 💬 saat dekat
    const near = this.isNearNpc();
    document.getElementById("interact-btn")?.classList.toggle("hidden", !near);
    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openNpc();
    }

    // portal antar map
    this.checkPortals();

    // AI monster: kejar + pukul balik, pulang ke spawn bila player jauh/mati
    const now = this.time.now;
    this.monsters.forEach((m) => {
      if (!m.alive) return;
      if (this.player.dead) {
        m.returnHome();
        return;
      }
      const inRange = m.chaseOrHold(this.player.x, this.player.y, now);
      if (inRange && m.canAttackMonster(now)) {
        m.markAttacked(now);
        const raw = m.rollMonsterDamage();
        const res = this.player.takeDamage(raw);
        if (!res.dodged) {
          sfxPlayerHurt();
          this.cameras.main.shake(70, 0.0035);
        }
        const label = res.dodged
          ? "MISS"
          : res.blocked
          ? `BLOCK -${res.actual}`
          : `-${res.actual}`;
        const txt = worldText(this, this.player.x, this.player.y - 40, label, {
          fontSize: "13px",
          color: res.dodged ? "#9ca3af" : "#ef4444",
          fontStyle: "bold",
        }).setDepth(60);
        this.tweens.add({
          targets: txt,
          y: this.player.y - 56,
          alpha: 0,
          duration: 600,
          onComplete: () => txt.destroy(),
        });
      }
      // Batch K: pola boss elite (skip saat evade)
      if (m.def.boss && !m.evading) {
        this.bossPatterns(m, now);
      }
    });

    // homing: projectile mengikuti posisi target + manual hit + cleanup range
    this.projectiles.getChildren().forEach((c) => {
      const p = c as Phaser.Physics.Arcade.Image;
      if (!p.active) return;
      const target = p.getData("target") as Monster | null;
      const speed = (p.getData("speed") as number) ?? 400;
      if (target && (target as Monster).active && target.alive) {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        p.setVelocity((dx / len) * speed, (dy / len) * speed);
        p.setAngle((Math.atan2(dy, dx) * 180) / Math.PI);
      }
      p.setDepth(10 + p.y * 0.01 + 0.2);
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const hitRadius = (p.getData("hitRadius") as number) ?? 28;
        if (Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) <= hitRadius) {
          this.onProjectileHit(p, m);
          return;
        }
      }
    });

    // bersihkan projectile yang melewati range / keluar world
    this.projectiles.getChildren().forEach((c) => {
      const p = c as Phaser.Physics.Arcade.Image;
      const sx = (p.getData("startX") as number) ?? p.x;
      const sy = (p.getData("startY") as number) ?? p.y;
      const range = (p.getData("range") as number) ?? 250;
      const travelled = Phaser.Math.Distance.Between(sx, sy, p.x, p.y);
      if (travelled > range) p.destroy();
      if (
        p.x < 0 ||
        p.y < 0 ||
        p.x > this.mapDef.widthPx ||
        p.y > this.mapDef.heightPx
      )
        p.destroy();
    });

    this.monsters.forEach((m) => m.alive && m.updateBar());

    // cincin target-lock mengikuti monster
    if (this.locked && (!this.locked.alive || !this.locked.active)) {
      this.unlockTarget();
    }
    if (this.locked && this.lockRing) {
      const r = this.locked.displayWidth / 2 + 8;
      this.lockRing.clear();
      this.lockRing.lineStyle(3, 0xef4444, 0.95);
      this.lockRing.strokeCircle(this.locked.x, this.locked.y, r);
      this.lockRing.setDepth(2);
    }

    // Batch F: heal zone 8% HP + 10% MP per detik, tick 500ms
    if (!this.player.dead) {
      const inZone =
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.mapDef.healZone.x,
          this.mapDef.healZone.y
        ) <= this.mapDef.healZone.r;
      if (inZone && this.player.derived) {
        this.healAccum += delta;
        if (this.healAccum >= 500) {
          this.healAccum = 0;
          const hpGain = Math.max(
            1,
            Math.round(this.player.derived.maxHp * 0.04)
          );
          const mpGain = Math.max(
            1,
            Math.round(this.player.derived.maxMp * 0.05)
          );
          if (
            this.player.hp < this.player.derived.maxHp ||
            this.player.mp < this.player.derived.maxMp
          ) {
            this.player.healZone(hpGain, mpGain);
            this.levelFx.explode(
              this.fxN(2),
              this.player.x + Phaser.Math.Between(-12, 12),
              this.player.y
            );
          }
        }
      } else {
        this.healAccum = 0;
      }
    }

    // Batch C: autosave posisi + job tiap 5 detik
    this.saveAccum += delta;
    if (this.saveAccum >= 5000 && !this.player.dead) {
      this.saveAccum = 0;
      try {
        savePos(this.player.x, this.player.y, this.mapId);
        this.player.saveCurrentJob();
        addPlaytime(5);
      } catch {
        // abaikan
      }
    }

    // Batch L: minimap tiap 400ms
    this.miniAccum += delta;
    if (this.miniAccum >= 400) {
      this.miniAccum = 0;
      const view = this.cameras.main.worldView;
      window.dispatchEvent(
        new CustomEvent("minimap-update", {
          detail: {
            w: this.mapDef.widthPx,
            h: this.mapDef.heightPx,
            player: {
              x: Math.round(this.player.x),
              y: Math.round(this.player.y),
            },
            monsters: this.monsters
              .filter((m) => m.alive)
              .map((m) => ({
                x: Math.round(m.x),
                y: Math.round(m.y),
                boss: !!m.def.boss,
              })),
            npc: this.npc ? { x: this.npc.x, y: this.npc.y } : null,
            portals: this.mapDef.portals.map((p) => ({ x: p.x, y: p.y })),
            view: {
              x: Math.round(view.x),
              y: Math.round(view.y),
              w: Math.round(view.width),
              h: Math.round(view.height),
            },
          },
        })
      );
    }
  }
}
