# 16 — Event Cookbook (jembatan UI ↔ Phaser)

> Prasyarat: [03](03-arsitektur.md), [07](07-ui.md).
> Tujuan: tambah event baru tanpa bikin listener ganda / bocor.

## 1. Kenapa event, bukan panggil langsung?

UI (DOM) dan game (Phaser Scene) hidup di dunia berbeda. `hud.ts` tidak pernah `import` MapScene/Player — buktinya di kode. Mereka bicara lewat `window.dispatchEvent(new CustomEvent(...))`. Daftar lengkap 20+ event ada di `03 §4` (dari `stats-changed` sampai `shop-bought`).

Dua jalur:
* **UI → game:** tulis `VirtualInput` (joystick/serang, `VirtualInput.ts:8-42`) ATAU kirim `CustomEvent` (klaim quest, reset map, beli/jual).
* **Game → UI:** kirim event (`gold-changed`, `inventory-changed`, `stats-changed` + `StatsSnapshot`).

Contoh penuh (`shop.ts:41`): `buyItem` → `spendGold` + `addItem` → dispatch `shop-bought` → panel refresh. Nol kopling langsung.

## 2. Sisi penerima: `onWin` / `onDom` + `SHUTDOWN` (wajib!)

`src/game/scenes/MapScene.ts:432-455`:

```ts
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
// di bindGlobalListeners: events.once(SHUTDOWN, () => cleanups.forEach(f => f()))
```

* `MapScene` di-restart tiap pindah portal. Objek scene lama mati, tapi listener `window`/DOM TIDAK mati sendiri.
* Solusi proyek: SEMUA listener global lewat helper ini → auto-lepas saat `SHUTDOWN`. Lupa = event ganda tiap pindah map (potion terpakai 2x, reward dobel — bug #1 di `10 §3`).
* `Player.destroy()` melepas listenernya sendiri (aturan sama untuk entity).

Daftar penerima di `bindGlobalListeners` (`MapScene.ts:456-595`): `player-died`, `quest-changed`, `gold-changed`, `claim-quest`, `reset-map`, `shop-bought/sold`, `bank-*`, dll.

## 3. Resep tambah event baru (checklist)

Misal event `pet-fed`:

1. **Kirim:** `window.dispatchEvent(new CustomEvent('pet-fed', { detail: {...} }))` di pengirim. Tipe `detail` = kontrak (catat!).
2. **Terima (kalau didengar Scene):** daftarkan di `bindGlobalListeners` via `this.onWin('pet-fed', handler)` — JANGAN `addEventListener` mentah.
3. **Terima (kalau didengar UI):** `window.addEventListener('pet-fed', ...)` di `init*()` + pastikan `init*` dipanggil sekali dari `app.ts:44-57`.
4. **Assertion di UI:** terima sebagai `CustomEvent<T>` dengan cast `as EventListener` (lihat `02 §4` risikonya).
5. **Uji ganda:** pindah map 2x → aksi 1x harus berefek 1x. Kalau 3x = listener bocor.
6. **Hapus:** cari `grep -rn "pet-fed" src/ index.html` → tidak boleh sisa (lihat `09-C`).

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. Sebut 3 event UI→game + 3 event game→UI dari `03 §4` tanpa mencontek.
2. Jelaskan kenapa `onWin` menyimpan cleanup, bukan langsung lepas.
3. Rancang event `daily-claimed` di kertas (pengirim, penerima, isi `detail`, di mana didaftarkan).

**Lolos jika:** bisa menambah event baru yang tahan pindah map 3x tanpa ganda.

## Kunci (BUKA SETELAH mengerjakan!)

1. UI→game: `claim-quest`, `reset-map`, `use-quick` (atau `select-job`). Game→UI: `stats-changed`, `gold-changed`, `inventory-changed` (atau `minimap-update`, `target-show/hide`).
2. Waktu lepas = saat `SHUTDOWN` (pindah map), bukan saat daftar. Cleanup dikumpulkan di `globalCleanups` lalu dijalankan sekaligus oleh `events.once(SHUTDOWN, ...)` — kalau langsung lepas, listener mati seketika.
3. Pengirim: panel klaim harian (UI). Penerima: MapScene via `this.onWin('daily-claimed', ...)` di `bindGlobalListeners` (+ UI lain bila perlu). `detail`: `{ day: string }`. Didaftarkan di `bindGlobalListeners` agar auto-lepas saat pindah map.
