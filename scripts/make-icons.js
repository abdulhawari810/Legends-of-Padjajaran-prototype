// Resize logo (JPG/PNG/WebP, ukuran bebas) jadi icon 1024 + splash 2732.
// Pakai: node scripts/make-icons.js <logo> [warna-bg]
//   tanpa warna-bg -> splash transparan (logo saja di tengah).
// Contoh: node scripts/make-icons.js logo.jpg "#0e0f13"
import sharp from 'sharp';

const [srcPath, bgArg] = process.argv.slice(2);
if (!srcPath) {
  console.error(
    'Pakai: node scripts/make-icons.js <logo> [warna-bg]\nContoh: node scripts/make-icons.js logo.jpg "#0e0f13"'
  );
  process.exit(1);
}

const meta = await sharp(srcPath).rotate().metadata();
console.log(`Sumber: ${meta.width}x${meta.height} (${meta.format})`);

await sharp(srcPath).rotate().resize(1024, 1024, { fit: 'cover' }).png().toFile('assets/icon.png');

const logo1200 = await sharp(srcPath)
  .rotate()
  .resize(1200, 1200, { fit: 'inside', withoutEnlargement: false })
  .png()
  .toBuffer();

if (bgArg) {
  // splash + background warna
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: bgArg }
  })
    .composite([{ input: logo1200, gravity: 'center' }])
    .png()
    .toFile('assets/splash.png');
} else {
  // splash transparan: logo saja di tengah kanvas transparan
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: logo1200, gravity: 'center' }])
    .png()
    .toFile('assets/splash.png');
}

console.log('OK: assets/icon.png (1024) + assets/splash.png (2732)' + (bgArg ? '' : ' transparan'));
