import { readFile, access } from 'node:fs/promises';
const assets = JSON.parse(await readFile('lib/generated-assets.json', 'utf8'));
const seen = new Set();
for (const a of assets) {
  if (!a.url.startsWith('/') || a.url.includes('..')) throw Error(`Unsafe asset path: ${a.url}`);
  await access('public' + a.url);
  if (!a.alt || a.alt.length < 10) throw Error(`Missing description: ${a.url}`);
  if (seen.has(a.url)) throw Error(`Duplicate image metadata: ${a.url}`);
  seen.add(a.url);
}
for (const paint of [
  'branch-white',
  'graphite',
  'midnight-black',
  'volt-blue',
  'copper-leaf',
  'crimson',
  'forest-metallic',
])
  if (!assets.some((a) => a.paint === paint && a.angle === 'front-3q'))
    throw Error(`Missing paint: ${paint}`);
for (const trim of ['divide', 'subtract', 'add', 'multiply'])
  for (const angle of ['front-3q', 'rear-3q'])
    if (!assets.some((a) => a.trim === trim && a.angle === angle))
      throw Error(`Missing trim/angle: ${trim}/${angle}`);
for (const interior of ['graphite', 'cloud', 'copper', 'multiply-sport'])
  if (!assets.some((a) => a.interior === interior && a.angle === 'interior'))
    throw Error(`Missing interior: ${interior}`);
for (const wheel of ['aero19', 'dynamic19', 'performance20'])
  if (!assets.some((a) => a.wheel === wheel && a.angle === 'wheels'))
    throw Error(`Missing wheel: ${wheel}`);
if (assets.filter((a) => a.category === 'technology').length !== 9)
  throw Error('Nine screen mockups are required.');
console.log(
  `Verified ${assets.length} local assets, descriptions, paint coverage, trim angles, wheels, interiors and screen concepts.`,
);
