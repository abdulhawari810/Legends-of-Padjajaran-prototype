# 05 — Fisika, Movement & Combat

> Prasyarat: [04](04-phaser.md). File kunci: `Player.ts` (904 baris),
> `Monster.ts`, `MapScene.ts` (`tryAttack`, `damageMonster`, `update`).

## 1. Arcade Physics di LoP

Aktif di `Game.ts:14-20`, gravitasi nol (top-down). Tiga operasi dipakai:

| Operasi | Arti | Contoh LoP |
|---------|------|-----------|
| `setVelocity(x, y)` | Kecepatan px/detik | `Player.update`: `setVelocity(vx*sp, vy*sp)` |
| `collider(a, b)` | Fisik saling dorong/tahan | player↔obstacle, player↔monster, monster↔obstacle |
| `overlap(a, b, fn)` | Bertemu → panggil fungsi, tanpa dorongan | projectile↔monster → `onProjectileHit` |

**Collider vs overlap** (sering tertukar!):
- Collider = dinding (tidak bisa lewat). Dipakai untuk badan vs tembok/badan.
- Overlap = sensor (bisa lewat, tapi memicu efek). Dipakai untuk proyektil
  dan portal (`checkPortals`).

**Aturan keras:** overlap didaftarkan **per-monster** saat `spawnMonster`
(`MapScene.ts:291`), bukan sekaligus se-array. Array `monsters` diisi dengan
`splice` (referensi stabil). Melanggar = monster hasil respawn tidak kena hit.

## 2. Movement player (`Player.update`, baris 756+)

```ts
let vx = VirtualInput.x;   // -1..1 dari joystick (0 bila keyboard)
let vy = VirtualInput.y;
if (vx === 0 && vy === 0) {
  const left = this.cursors.left.isDown || this.wasd.A.isDown;
  ... // WASD + panah, diagonal dinormalisasi Math.SQRT1_2
}
const sp = this.speed * (waktuSwift ? 1.15 : 1);  // buff Swift +15%
this.setVelocity(vx * sp, vy * sp);
```
- `speed` dasar dari job (`jobs.ts`: warrior 170, mage 160, archer 190)
  + `moveSpeedBonus` dari DEX.
- Normalisasi diagonal: tanpa `SQRT1_2`, jalan diagonal 41% lebih cepat
  (Pythagoras: √(1²+1²) ≈ 1.41). Coba hapus → rasakan bedanya.
- `facing` (down/up/left/right) diambil dari sumbu dominan → menentukan
  arah sprite + arah serang (`facingVector()`).
- Animasi jalan vs idle (`player-down-0`) diganti sesuai gerak.
- Mati (`dead`) → velocity 0 + `return` di awal: tidak bisa jalan/regen.

**Joystick** (`joystick.ts`): drag dalam radius 48px → `VirtualInput.set()`
dengan deadzone 0.15 (antian goyang) + clamp lingkaran.

## 3. Alur serang lengkap (wajib hafal)

```
Tombol ⚔ / Spasi
 → attack.ts: requestAttack()            (tandai antrean)
 → MapScene.update: consumeAttack()      (sekali baca, antrean kosong)
 → tryAttack() (MapScene.ts:1320):
     ├─ cek canAttack (cooldown global persistentTimers)
     ├─ melee (warrior): efek slash + cari korban dalam
     │   attackRange+14 DAN di depan (dot product > 0.2)
     └─ ranged (mage/archer): spawn projectile bervelocity
 → rollDamage() (Player): base atk job + variance + crit?
 → damageMonster(monster, dmg, crit):
     ├─ teks melayang (-dmg / CRIT kuning) + sfx
     ├─ Monster.takeDamage(): hp -= dmg → mati?
     ├─ YA: loot rollDrops→gold+item, registerKill (quest+bounty),
     │       addExp (level up?), respawn terjadwal, dieFx
     └─ TIDAK: flash putih + knockback kecil (radialFrom)
```

**Detail penting:**
- `rollDamage`: base = `pAtk`/`mAtk`/`rAtk` sesuai job + variance acak
  −2..+3 + crit (`rollCrit`) × `critDmg`. Crit tampil kuning + sfx.
- Melee hanya kena yang **di depan** (dot product arah pandang > 0.2):
  menebas ke utara tidak kena slime di selatan.
- Projectile = sprite fisika bervelocity; hidup dibatasi range/waktu, hancur
  kena tembok (`clear` saat keluar world).
- Skill (`trySkill`, slot Q/1/2/3): seperti attack + cek MP (`tryConsumeMp`)
  + cast time (bisa batal kena hit) + cooldown per-job per-slot
  (`skillLevel.ts`: damage +30%/Lv, CD −1dtk).

## 4. Monster AI (`Monster.ts`)

Status: kejar → serang → pulang (leash) → evade.

| Fungsi | Perilaku |
|--------|----------|
| `chaseOrHold(px, py, now, town)` | Dalam `aggroRange` → `moveTo` pemain. Dalam `attackRange` → berhenti + `true` (boleh pukul). |
| `returnHome()` | Player mati/jauh → jalan ke `spawnX/spawnY`. |
| Evade | Saat pulang: **immune + heal + abaikan player**, tampil `EVADE` (aturan keras 9). Damage saat evade tidak masuk. |
| `provoke(now)` | Dipukul dari jauh (panah) → kejar sampai 600px. |
| Town | Zona aman (`map.ts: town`): monster tidak kejar/masuk. |
| Boss | `nextAoEAt/nextSummonAt`: pola AoE + summon (`bossPatterns`), `respawnMs` 25 detik (biasa 4 detik). |

Tuning (`monsters.ts`): 10 monster slime→cave-troll, `moveSpeed` SELALU <
speed player (bisa kabur), aggro tiered. Contoh: slime HP 70 / atk 5 /
aggro 120 / attack 46 / cooldown 1600ms.

## 5. Damage ke player + mati/respawn

`Player.takeDamage(raw)` (`Player.ts:328`):
1. Mati? → abaikan. Dodge (`Math.random() < dodge`) → `MISS`, 0 damage.
2. Shield aktif (skill Bulwark) → −40% + selalu block. Block biasa →
   `raw × (1 − blockValue 0.3)`.
3. `mitigatePhysical(raw, armor)` → `× (1 − tenacity×0.3)`, minimal 1.
4. HP −= actual, flash merah, `emitStats` → HUD update.
5. HP ≤ 0 → `die()`: buff hangus, cooldown SENGAJA tidak direset
   (anti-exploit bunuh diri), penalti gold (lihat `showDeath`), event
   `player-died` → overlay ☠️ + tombol Respawn (`respawn()` HP penuh).

## Latihan (per § — kerjakan tanpa melihat Kunci di bawah!)

**§1 Arcade Physics:**
1. Sebut 3 operasi (`setVelocity`/`collider`/`overlap`) + contoh LoP masing-masing. Kapan pakai collider vs overlap? Uji: jawab 3 baris.

**§2 Movement:**
2. Jelaskan kenapa diagonal perlu `Math.SQRT1_2` (tanpa itu 41% lebih cepat — Pythagoras √2≈1,41). Uji: hapus sementara → rasakan → kembalikan.
3. Dari mana `speed` berasal (`jobs.ts` + `moveSpeedBonus` DEX)? Berapa speed warrior vs mage vs archer? Uji: jawab + cek file.

**§3 Alur serang:**
4. Gambar alur serang lengkap dari ingatan: tombol → antrean → `tryAttack` → `rollDamage` → `damageMonster` → loot → quest → save → event. Uji: cocokkan dengan §3.
5. Hitung TTK warrior vs slime di kertas (P.Atk ±43 vs HP 70). Uji: jawab angka.
6. Ubah `attackRange` warrior −20, rasakan: kenapa menebas jadi sulit? (Aturan: range > jarak sentuh badan.) Kembalikan! Uji: manual.

**§4 Monster AI:**
7. Sebut 5 status AI (kejar/serang/pulang/evade/provoke) + syarat tiap transisi. Apa itu EVADE (immune+heal, bukan bug)? Uji: jawab + uji lari jauh di game.

**§5 Damage ke player:**
8. Sebut 4 tahap `takeDamage` (dodge → block/shield → mitigasi → HP/die). Kenapa cooldown SENGAJA tidak direset saat mati? Uji: jawab.

**Kriteria:** bisa menggambar alur serang + menyebut 4 tahap takeDamage.

## Kunci (BUKA SETELAH mengerjakan!)

1. `setVelocity` = gerak; `collider` = dinding (tidak bisa lewat: badan vs tembok); `overlap` = sensor (bisa lewat + picu efek: proyektil, portal).
2. Tanpa normalisasi, vektor (1,1) panjangnya 1,41 → diagonal 41% lebih cepat. `×SQRT1_2` (≈0,707) mengembalikan ke 1.
3. Job: warrior 170, mage 160, archer 190 (`jobs.ts:22,32,42`) + bonus DEX (`moveSpeedBonus`). Lihat `Player.update`.
4. Lihat diagram §3. Titik yang sering lupa: `consumeAttack()` (antrean 1x) + cek `canAttack` (cooldown global) + melee cek depan (`dot > 0.2`).
5. `ceil(70/43) = 2` tebasan (+variance −2..+3 dan crit bisa mengubah ±1 hit).
6. Range < jarak sentuh = tebasan tidak pernah sampai (korban di luar jangkauan tapi badan sudah bersentuhan). Aturan keras 5.
7. Dalam `aggroRange` → kejar; dalam `attackRange` → pukul; player mati/jauh → pulang; saat pulang → evade (immune+heal+EVADE); dipukul jauh → `provoke` (kejar 600px). Zona town aman.
8. Lihat `Player.ts:328`: dodge→MISS; shield −40%/block 0,3; `mitigatePhysical`+tenacity (min 1); HP−=actual → `die()` bila ≤0. Cooldown tidak direset agar mati tidak jadi cara curang me-reset skill (anti-exploit).
