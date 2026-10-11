# QA Checklist (playtest manual ±20 menit)

Jalankan `npm.cmd run dev`, cek satu per satu:

## Combat
- [ ] Warrior tebas depan kena, belakang tidak
- [ ] Mage/archer auto-target + homing, membelakangi = gagal
- [ ] 3 skill tiap job keluar (Q/1/2/3), MP turun, cooldown jalan
- [ ] Monster kejar dalam aggro, pulang + EVADE saat lepas (>400px / idle)
- [ ] Monster nempel = mukul (tidak mendorong), boss AoE merah bisa dihindari
- [ ] Mati = overlay + penalti 5% gold + respawn heal zone

## Progresi
- [ ] Quest chain berurutan (tutorial → elite → golem → troll), klaim ke Tetua
- [ ] Shop beli/jual, tempa +1..+5 naikkan stat
- [ ] Bounty 3 map selesai + reset besok (ganti tanggal HP untuk tes)
- [ ] Achievement unlock + gold masuk, statistik benar di panel karakter
- [ ] Ganti job tidak reset level; refresh lanjut dari save; Reset Save bersih
- [ ] Export → Reset → Import → progres kembali

## Map & UI
- [ ] Portal Greenfield ⇄ Dark ⇄ Cave bolak-balik tanpa dobel reward
- [ ] Heal zone isi HP/MP, Y-sort benar (depan/belakang pohon & rumah)
- [ ] Panel tengah bisa scroll (HP), HUD kompak, minimap jalan
- [ ] Desktop: tombol sentuh hilang; HP: semua tombol pas
- [ ] Rotasi HP portrait = overlay putar (mode sentuh saja)

## Rilis
- [ ] `npm run test` hijau, `tsc` lolos, `vite build` jadi
- [ ] `npm run build:apk` sukses, icon + splash video benar di HP
