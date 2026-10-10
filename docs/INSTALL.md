# Instalasi & Build

> Windows: selalu pakai `npm.cmd` / `npx.cmd` (file `npm.ps1` diblokir
> ExecutionPolicy). Script npm (`build:apk`, `mv:apk`) jalan di CMD —
> jangan tulis sintaks Bash (`./x`, `$HOME`, `mv`) di `scripts` package.json,
> pakai helper `scripts/*.js` yang sudah lintas-shell.

## 1. Prasyarat

- Node 20+ (`node -v`), npm (`npm.cmd --version`)
- Web saja: cukup itu.
- Android: JDK 17 (`JAVA_HOME`), Android SDK command line tools,
  terima lisensi (`sdkmanager --licenses`), paket
  `platform-tools`, `platforms;android-36`, `build-tools;35.0.0`
  (samakan dengan `android/variables.gradle` bila Gradle protes),
  env `ANDROID_HOME`, folder `android/` sudah ada dari `cap add`.
- Desktop (nanti): Rust via rustup.

## 2. Jalan pertama kali

```bash
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd run test     # harus 19/19 hijau
npm.cmd run build    # tsc + vite → dist/
```

## 3. Android (tanpa Android Studio)

```bash
npm.cmd run build:apk  # = cap:sync + gradlew assembleDebug
npm.cmd run mv:apk     # salin APK ke ~/Downloads/legends_of_padjajaran.apk
```

- Di Git Bash: `./gradlew assembleDebug` (Unix), bukan `.\gradlew.bat`.
- `sdkmanager` versi Windows cuma ada `.bat` → dari Bash:
  `cmd //c sdkmanager.bat --licenses`, atau `yes | cmd //c sdkmanager.bat --licenses`.
- `local.properties` (`sdk.dir=C\:\\Android\\Sdk`) bila Gradle tak nemu SDK.
- Ganti logo: taruh PNG/JPG → `node scripts/make-icons.js logo.png "#0e0f13"`
  (tanpa warna = transparan) → `npx capacitor-assets generate`.
- Splash video: `android/app/src/main/res/raw/splash.mp4` (huruf kecil semua).

## 4. Desktop Tauri (belakangan)

```bash
npm.cmd run tauri dev
npm.cmd run tauri build  # installer di src-tauri/target/release/bundle
```

## 5. Masalah umum

| Gejala                                | Solusi                                         |
| ------------------------------------- | ---------------------------------------------- |
| `npm.ps1 cannot be loaded`            | pakai `npm.cmd`                                |
| `'.' is not recognized` (npm run)     | script jalan di CMD: pakai `node scripts/*.js` |
| `bash: sdkmanager: command not found` | path penuh / `cmd //c sdkmanager.bat`          |
| Lisensi SDK ditolak                   | `sdkmanager --licenses`, jawab `y` semua       |
| `SDK location not found`              | buat `android/local.properties`                |
