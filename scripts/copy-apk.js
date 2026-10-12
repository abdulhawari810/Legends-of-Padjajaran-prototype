// Salin APK debug ke folder Downloads. Lintas shell (CMD/Bash/PowerShell).
// Pakai: npm run mv:apk [nama-file.apk] [dir-tujuan]
// Env override: APK_DEST=/path/ke/dir
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TERMUX_DOWNLOAD = '/data/data/com.termux/files/home/storage/shared/Download';
const src = join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const name = process.argv[2] ?? 'legends_of_padjajaran.apk';
const destDir =
  process.argv[3] ?? process.env.APK_DEST ?? (existsSync(TERMUX_DOWNLOAD) ? TERMUX_DOWNLOAD : join(homedir(), 'Downloads'));
const dest = join(destDir, name);

if (!existsSync(src)) {
  console.error(`APK tidak ketemu: ${src}\nBuild dulu: cd android && ./gradlew assembleDebug`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`OK: ${dest}`);
