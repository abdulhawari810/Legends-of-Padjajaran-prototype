# Tugas: Buat Dokumentasi Pembelajaran Mandiri untuk MMORPG Legends of Padjajaran (LoP)

Saya ingin mempelajari seluruh kode yang digunakan dalam proyek game MMORPG **Legends of Padjajaran (LoP)** yang berada di folder root proyek `mmorpg`.

Tujuan utama saya adalah agar saya mampu mengembangkan game ini secara mandiri tanpa bergantung pada AI untuk menulis atau memperbaiki kode. Saya ingin memahami cara kerja setiap bagian program, alasan kode tersebut dibuat, hubungan antarsistem, serta cara memodifikasi implementasinya dengan benar.

## 1. Profil dan tujuan pembelajaran saya

Saya sudah memahami dasar-dasar JavaScript dan sintaks JSX, tetapi pemahaman saya tentang TypeScript masih terbatas.

Oleh karena itu:

- Jangan mengulang seluruh materi JavaScript dasar dari awal, kecuali jika diperlukan untuk menjelaskan konsep TypeScript atau kode proyek.
- Fokuskan pembelajaran pada TypeScript, arsitektur proyek, API Phaser yang benar-benar digunakan, logika game, dan UI.
- Gunakan bahasa Indonesia yang mudah dipahami oleh pemula TypeScript.
- Pertahankan istilah teknis dalam bahasa Inggris, kemudian jelaskan artinya dalam bahasa Indonesia.
- Jangan mengasumsikan bahwa saya sudah memahami konsep pemrograman tingkat lanjut.
- Jelaskan bukan hanya cara menggunakan kode, tetapi juga alasan kode tersebut bekerja dan konsekuensi jika diubah.

## 2. Audit seluruh proyek sebelum membuat materi

Sebelum menulis dokumentasi, periksa struktur folder dan file dalam proyek `mmorpg` secara menyeluruh, termasuk subfolder yang relevan.

Identifikasi:

- Teknologi, framework, library, dan versi yang benar-benar digunakan.
- Konfigurasi TypeScript dan build tools.
- Entry point aplikasi dan alur inisialisasi game.
- Struktur scene Phaser dan sistem navigasi antarscene.
- Sistem player, movement, physics, collision, monster AI, combat, inventory, item, quest, EXP, level, dan fitur RPG lainnya yang memang sudah tersedia.
- Struktur UI, komponen React jika digunakan, styling, state management, serta hubungan UI dengan Phaser.
- Sistem penyimpanan data, backend, networking, atau database jika memang ada.
- Hubungan import dan export antarfile serta ketergantungan antarmodul.
- File konfigurasi, utility, helper, constants, types, interfaces, dan komponen bersama.
- Sistem lain yang ditemukan selama audit, meskipun tidak tercantum dalam daftar ini.

Jangan berasumsi bahwa semua fitur di atas sudah ada. Dokumentasikan berdasarkan implementasi nyata yang ditemukan.

Buat peta arsitektur proyek yang menjelaskan alur kerja aplikasi dari awal dijalankan sampai sistem game beroperasi. Jelaskan bagaimana data dan pemanggilan fungsi mengalir di antara file-file penting.

Jika ada file yang tidak dapat dibaca, belum selesai, atau memiliki implementasi yang tidak jelas, catat keterbatasannya. Jangan mengarang fungsi atau perilaku yang tidak ditemukan dalam kode.

## 3. Buat folder khusus untuk materi pembelajaran

Buat folder baru bernama `materi` di root proyek `mmorpg`.

Seluruh dokumentasi pembelajaran harus berada di dalam folder tersebut. Gunakan format Markdown (`.md`) agar bisa dibaca melalui VS Code atau editor teks biasa.

Susun dokumentasi menjadi beberapa file atau subfolder berdasarkan kebutuhan. Gunakan struktur yang masuk akal dan mudah dinavigasi, misalnya:

materi/

- README.md — indeks dan panduan penggunaan materi.
- 01-typescript-dasar.md
- 02-typescript-lanjutan.md
- 03-memahami-arsitektur-game.md
- 04-phaser-dan-game-loop.md
- 05-player-dan-movement.md
- 06-physics-dan-collision.md
- 07-monster-ai-dan-combat.md
- 08-sistem-rpg.md
- 09-ui-dan-styling.md
- 10-debugging-dan-testing.md
- 11-menambah-mengubah-menghapus-fitur.md
- 12-proyek-praktik-mandiri.md
- referensi/

Struktur di atas hanya contoh. Sesuaikan nama, jumlah, dan pembagian file setelah melakukan audit. Jika satu topik terlalu luas, pecah menjadi beberapa materi. Jika suatu topik tidak relevan dengan implementasi proyek, jangan membuat penjelasan seolah-olah fitur tersebut tersedia.

Pastikan setiap file yang dibuat memiliki tujuan pembelajaran yang jelas dan terhubung dengan materi lainnya.

## 4. Materi TypeScript dari dasar sampai siap digunakan

Buat materi TypeScript secara bertahap dengan contoh yang diambil dari kode LoP.

Materi setidaknya mencakup:

- Type annotations dan type inference.
- Primitive types, array, tuple jika digunakan, dan object.
- `type` dan `interface`, termasuk perbedaan dan kapan menggunakannya.
- Function, parameter, return type, optional parameter, dan default parameter.
- Union types, literal types, narrowing, dan type guards.
- Optional properties, optional chaining, dan nullish coalescing.
- `any`, `unknown`, `void`, dan `never` sesuai konteks.
- Type assertions dan risiko penggunaannya.
- Enum jika digunakan atau relevan.
- Class, constructor, property, method, access modifiers, inheritance, dan `this`.
- Generics jika digunakan atau diperlukan.
- Import, export, module, dan hubungan antarmodul.
- Async/await, Promise, dan event-driven code jika ditemukan dalam proyek.
- Cara membaca pesan error TypeScript.
- Cara menggunakan tipe dari Phaser dan library lain.
- Cara memahami deklarasi tipe dari library tanpa harus membaca seluruh source code library.

Untuk setiap konsep, gunakan format:

1. Tujuan konsep.
2. Penjelasan sederhana.
3. Sintaks dasar.
4. Contoh kecil yang mudah dipahami.
5. Contoh nyata dari LoP beserta lokasi file dan fungsi yang relevan.
6. Penjelasan kode baris demi baris untuk bagian yang penting.
7. Kesalahan umum dan cara memperbaikinya.
8. Latihan mandiri.
9. Kriteria untuk memastikan saya benar-benar memahami konsep tersebut.

Bedakan dengan jelas antara contoh pembelajaran sederhana dan implementasi asli proyek.

## 5. Dokumentasi untuk setiap file kode proyek

Saya ingin mempelajari file-file yang benar-benar membentuk game ini, bukan hanya file yang dianggap penting oleh AI.

Buat katalog file yang menjelaskan:

- Path relatif file.
- Tujuan dan tanggung jawab file.
- Konsep TypeScript yang digunakan.
- Fungsi, class, interface, type, dan variabel penting.
- Input, output, efek samping, dan perubahan state jika relevan.
- File yang mengimpor atau menggunakan kode tersebut.
- File lain yang dipanggil atau menjadi dependensinya.
- Hubungan file tersebut dengan sistem game.
- Risiko jika file diubah atau dihapus.
- Cara menguji perubahan yang dibuat pada file tersebut.

Untuk file yang berisi logika penting, berikan penjelasan lebih mendalam mengenai alur eksekusinya.

Jangan sekadar memberikan ringkasan satu kalimat per file. Saya perlu memahami bagaimana kode tersebut bekerja.

Namun, hindari mengulang penjelasan yang sama di banyak dokumen. Gunakan tautan relatif antarfile materi agar pembelajaran tetap terorganisasi.

Jika jumlah file sangat banyak, kelompokkan dokumentasinya berdasarkan subsistem. Pastikan semua file yang relevan tercatat dalam indeks, dan jelaskan mana yang merupakan kode aplikasi, konfigurasi, aset, hasil build, atau dependency pihak ketiga.

## 6. Materi khusus pengembangan game menggunakan Phaser

Jelaskan API dan pola Phaser yang benar-benar digunakan dalam LoP, termasuk jika ditemukan:

- `Phaser.Game` dan konfigurasi game.
- `Phaser.Scene` dan siklus hidup scene.
- `preload()`, `create()`, dan `update()`.
- Game loop, delta time, dan pengaturan kecepatan gerak.
- Game objects, sprites, texture, dan animasi.
- Input keyboard, mouse, atau kontrol lainnya.
- Arcade Physics atau sistem fisika lain yang digunakan.
- Body, velocity, collider, overlap, dan collision callbacks.
- Camera, world bounds, tilemap, dan depth jika digunakan.
- Event, timer, tween, serta lifecycle cleanup.
- Pengelolaan dan pemuatan aset.
- Interaksi antara sistem React/UI dan Phaser jika keduanya digunakan.

Jelaskan hubungan antara kode TypeScript dan API Phaser. Saya ingin memahami kapan harus mengubah logika milik proyek dan kapan harus menggunakan API bawaan Phaser.

Gunakan contoh aktual dari LoP untuk menjelaskan perilaku game, termasuk alur gerakan player, monster AI, collision, dan combat apabila tersedia.

## 7. Panduan menambah, mengubah, dan menghapus fitur

Buat panduan praktis yang mengajarkan prosedur kerja mandiri.

### A. Menambah fitur baru

Jelaskan cara:

- Mengidentifikasi subsistem yang berkaitan.
- Menentukan file baru dan file lama yang perlu diubah.
- Menentukan type, interface, fungsi, class, atau komponen yang diperlukan.
- Menghubungkan fitur dengan sistem yang sudah ada.
- Memperbarui UI dan state jika diperlukan.
- Menguji fitur dan mencegah regresi.

### B. Mengubah fitur yang sudah ada

Jelaskan cara:

- Menelusuri alur kode dari pemicu sampai hasil.
- Menemukan sumber data dan sumber perubahan state.
- Mengidentifikasi dependensi yang mungkin terdampak.
- Memodifikasi bagian terkecil yang diperlukan.
- Memeriksa efek samping terhadap sistem lain.
- Memverifikasi perilaku sebelum dan sesudah perubahan.

### C. Menghapus fitur

Jelaskan cara:

- Menemukan seluruh referensi, import, event, route, dan dependensi fitur.
- Menghapus kode tanpa meninggalkan referensi yang rusak.
- Membersihkan state, timer, listener, dan resource jika relevan.
- Memastikan fitur lain tidak ikut rusak.
- Menguji dan memverifikasi penghapusan.

Berikan contoh berdasarkan struktur LoP, bukan sekadar contoh CRUD aplikasi biasa.

## 8. Materi khusus UI dan tampilan

Jelaskan bagaimana tampilan UI proyek dibangun berdasarkan teknologi yang benar-benar digunakan.

Ajarkan saya cara:

- Menemukan file yang mengatur suatu elemen UI.
- Mengubah warna, ukuran, spacing, font, layout, dan responsive behavior.
- Mengubah komponen atau halaman yang sudah tersedia.
- Membuat komponen UI baru dan menggunakannya kembali.
- Menambahkan tombol, form, modal, panel, atau menu.
- Menghubungkan UI dengan state dan logika game.
- Memahami alur data antara React dan Phaser jika keduanya digunakan.
- Memastikan perubahan UI tidak merusak gameplay.
- Memeriksa tampilan pada ukuran layar berbeda.

Jika proyek menggunakan Tailwind CSS, jelaskan utility classes dan konfigurasi yang benar-benar relevan. Jika menggunakan sistem styling lain, ikuti implementasi proyek.

Berikan latihan modifikasi UI yang tingkat kesulitannya meningkat secara bertahap.

## 9. Debugging, testing, dan perawatan kode

Saya harus mampu memperbaiki bug tanpa bergantung pada AI.

Ajarkan cara:

- Membaca error TypeScript, compiler, browser console, dan runtime.
- Menelusuri pemanggilan fungsi dan perubahan nilai.
- Menggunakan breakpoint debugger dan logging.
- Membedakan compile-time error dengan runtime bug dan kesalahan logika.
- Mengidentifikasi masalah collision, velocity, event ganda, state yang tidak konsisten, dan lifecycle jika relevan.
- Membuat pengujian sesuai tools yang tersedia dalam proyek.
- Menggunakan Git untuk membuat perubahan yang aman dan kembali ke versi sebelumnya.
- Menentukan apakah suatu masalah berasal dari TypeScript, logika game, konfigurasi, aset, atau API Phaser.

Sertakan contoh diagnosis bug dengan urutan investigasi yang sistematis. Jangan hanya memberikan kode perbaikan; jelaskan bukti yang mendukung diagnosis tersebut.

## 10. Latihan dan evaluasi kemampuan

Setiap modul harus memiliki latihan yang bisa saya kerjakan tanpa melihat jawaban terlebih dahulu.

Susun tingkat latihan:

1. Memahami dan menjelaskan kode.
2. Mengubah nilai atau perilaku sederhana.
3. Menambahkan fungsi kecil.
4. Memperbaiki bug.
5. Menambah atau memodifikasi fitur yang melibatkan beberapa file.
6. Menyelesaikan tugas mandiri tanpa petunjuk langkah demi langkah.

Untuk setiap latihan, tentukan:

- Tujuan.
- File atau subsistem yang relevan.
- Persyaratan perilaku.
- Batasan yang tidak boleh dilanggar.
- Cara menguji hasil.
- Kriteria keberhasilan yang objektif.
- Petunjuk bertahap yang bisa dibuka jika saya mengalami kesulitan.

Jangan langsung memberikan solusi lengkap sebelum latihan dikerjakan. Sediakan bagian jawaban atau pembahasan terpisah agar saya dapat menguji kemampuan sendiri.

Buat proyek praktik akhir yang meminta saya melakukan perubahan nyata pada LoP, mencakup logika game, TypeScript, dan UI sesuai fitur yang memang tersedia.

## 11. Kriteria kelulusan pembelajaran

Saya menganggap pembelajaran selesai jika saya mampu membuktikan bahwa saya dapat:

- Menjelaskan arsitektur proyek dan alur eksekusi utamanya.
- Membaca serta memahami file penting tanpa penjelasan AI.
- Menulis dan mengubah kode TypeScript dengan tipe yang sesuai.
- Menelusuri hubungan antarfile dan dependensi.
- Menambah fitur baru yang terintegrasi dengan sistem yang ada.
- Mengubah fitur tanpa merusak sistem terkait.
- Menghapus fitur beserta dependensinya dengan aman.
- Mengubah UI dan menghubungkannya dengan logika yang sesuai.
- Menemukan penyebab bug dan melakukan debugging secara sistematis.
- Menjalankan pemeriksaan dan pengujian yang tersedia.
- Menjelaskan alasan di balik perubahan kode yang saya buat.

Buat checklist kelulusan dan beberapa ujian praktik tanpa bantuan AI. Kelulusan harus didasarkan pada hasil yang dapat diuji, bukan hanya karena saya telah membaca semua materi.

## 12. Aturan pelaksanaan dan perlindungan proyek

- Jangan menimpa, menghapus, atau merombak kode game yang sudah ada hanya demi membuat dokumentasi.
- Jangan mengubah arsitektur atau melakukan refactoring pada source code sebagai bagian dari tugas ini, kecuali saya memberikan izin terpisah.
- Buat hanya folder dan file dokumentasi yang diperlukan.
- Jangan menyalin seluruh source code ke dokumentasi jika penjelasan dengan path file, cuplikan kode yang relevan, dan referensi sudah memadai.
- Jangan membuat materi generik yang tidak terhubung dengan implementasi LoP.
- Jangan menganggap seluruh kode proyek harus dihafalkan. Fokus pada pemahaman alur, tanggung jawab file, pola, dan kemampuan menelusuri kode.
- Jangan mengarang hasil pengujian. Bedakan antara pengujian yang sudah dijalankan dan pengujian yang baru direkomendasikan.
- Gunakan tautan relatif yang valid antarfile materi.
- Jika terdapat file yang terlalu kompleks, dokumentasikan secara bertahap dan jelaskan prasyarat yang perlu dipelajari lebih dahulu.

## 13. Urutan pengerjaan

Kerjakan dalam tahapan berikut:

**Tahap 1 — Audit:** periksa struktur proyek, teknologi, file, dan hubungan antarsistem.

**Tahap 2 — Rencana kurikulum:** susun urutan pembelajaran berdasarkan dependensi konsep dan tingkat kesulitan.

**Tahap 3 — Pembuatan materi:** buat folder `materi`, indeks utama, materi TypeScript, dokumentasi arsitektur, dokumentasi file, panduan modifikasi fitur, dan latihan.

**Tahap 4 — Verifikasi:** periksa apakah seluruh tautan materi valid, semua file relevan sudah tercatat, contoh kode sesuai dengan source code, dan instruksi pengujian cocok dengan konfigurasi proyek.

**Tahap 5 — Laporan:** berikan ringkasan struktur dokumentasi, daftar file yang telah didokumentasikan, cakupan yang belum selesai, dan urutan belajar yang harus saya ikuti.

Jika seluruh dokumentasi tidak bisa diselesaikan dalam satu proses, prioritaskan audit yang akurat, fondasi TypeScript, arsitektur proyek, dan indeks pembelajaran. Kemudian lanjutkan per subsistem tanpa mengorbankan kedalaman materi.

**Hasil akhir yang saya inginkan:** folder `materi` yang menjadi buku panduan belajar pribadi berdasarkan source code asli Legends of Padjajaran. Setelah menyelesaikan kurikulum dan lulus latihan praktik, saya ingin memiliki kemampuan untuk mengembangkan, mengubah, menghapus, dan memperbaiki sistem game sendiri tanpa bergantung pada AI sebagai penulis kode.
