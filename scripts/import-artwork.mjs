import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const source = process.argv[2];
if (!source) throw new Error('Provide the artwork folder containing manifest.json.');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const slug = (s) => (s ? s.toLowerCase().replaceAll(' ', '-') : null);
const angles = {
  'front three-quarter': 'front-3q',
  'rear three-quarter': 'rear-3q',
  cockpit: 'interior',
  'wheel detail': 'wheels',
  'side profile': 'side',
  'elevated front three-quarter': 'elevated',
  'headlight detail': 'headlight',
  'dashboard detail': 'dashboard',
  'front seats': 'seats',
  'rear seats': 'rear-seats',
  'console detail': 'console',
  'taillight detail': 'taillight',
  'rear-left charging port detail': 'charging-port',
  'front three-quarter at night': 'night',
  'front three-quarter driving': 'road',
  'rear three-quarter charging station': 'charging',
};
const wheels = {
  '19 Aero': 'aero19',
  '19 Dynamic': 'dynamic19',
  '20 Performance': 'performance20',
};
const mapped = [];
for (const asset of manifest.assets.filter((a) => a.status !== 'superseded')) {
  const angle = angles[asset.angle] || asset.angle;
  const interior = ['interior', 'cabin'].includes(asset.category);
  const trim = slug(asset.trim);
  const paint = slug(asset.color);
  const wheel = wheels[asset.wheel] || null;
  let relative;
  if (asset.category === 'hero') relative = 'hero/front-3q.webp';
  else if (interior) relative = `interior/${slug(asset.interior)}/${angle}.webp`;
  else if (asset.category === 'wheel') relative = `details/wheels/${wheel}.webp`;
  else if (['detail', 'charging'].includes(asset.category)) relative = `details/${angle}.webp`;
  else if (asset.category === 'scene') relative = `hero/${angle}.webp`;
  else relative = `${trim}/${paint}/${wheel}/${angle}.webp`;
  const destination = path.join('public/cars/m1e', relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(path.join(source, asset.file)).webp({ quality: 86 }).toFile(destination);
  const category = interior
    ? 'interior'
    : asset.category === 'wheel' || asset.category === 'detail' || angle === 'charging-port'
      ? 'details'
      : angle === 'night'
        ? 'night'
        : angle === 'road'
          ? 'driving'
          : angle === 'charging'
            ? 'charging'
            : 'exterior';
  const entry = {
    url: '/cars/m1e/' + relative,
    alt: `Dyntree M1E ${asset.trim || ''} ${interior ? asset.interior : asset.color || ''} prototype — ${asset.angle}`,
    trim:
      interior && asset.interior !== 'Multiply Sport'
        ? null
        : asset.category === 'wheel'
          ? null
          : trim,
    paint: interior || asset.category === 'wheel' ? null : paint,
    wheel: interior ? null : wheel,
    interior: interior ? slug(asset.interior) : null,
    angle,
    category,
    priority: 1,
    active: true,
  };
  mapped.push(entry);
}
await writeFile('lib/generated-assets.json', JSON.stringify(mapped, null, 2) + '\n');
await mkdir('docs/assets', { recursive: true });
await writeFile('docs/assets/generation-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await copyFile(path.join(source, 'generation-brief.md'), 'docs/assets/generation-brief.md');
console.log(`Imported ${mapped.length} optimized original prototype images.`);
