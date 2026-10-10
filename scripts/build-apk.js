// Build APK debug lintas shell (CMD/Bash/PowerShell).
// Pakai: npm run build:apk
import { spawnSync } from 'node:child_process';

const isWin = process.platform === 'win32';
// di Windows panggil cmd langsung (tanpa shell:true agar tidak ada warning DEP0190)
const cmd = isWin ? 'cmd.exe' : './gradlew';
const args = isWin ? ['/c', 'gradlew.bat assembleDebug'] : ['assembleDebug'];
const r = spawnSync(cmd, args, {
  cwd: 'android',
  stdio: 'inherit',
  shell: false
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('OK: android/app/build/outputs/apk/debug/app-debug.apk');
