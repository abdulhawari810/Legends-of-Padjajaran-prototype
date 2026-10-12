const sharp = require('sharp');
const fs = require('fs');
const FA = 'C:/laragon/www/side_project/free_assets';
async function dim(p) {
  try {
    const st = fs.statSync(FA + '/' + p);
    if (st.isDirectory()) return console.log(p, '(dir)');
    const m = await sharp(FA + '/' + p).metadata();
    console.log(p, m.width + 'x' + m.height, Math.round(st.size / 1024) + 'KB');
  } catch (e) { console.log('SKIP', p); }
}
(async () => {
  await dim('object-assets/enemy_full/Skeleton/Idle.png');
  await dim('object-assets/enemy_full/Skeleton/Walk.png');
  await dim('object-assets/enemy_full_slime/Green_Slime/PNG/Idle.png');
})().catch((e) => { console.error(e.message); process.exit(1); });
