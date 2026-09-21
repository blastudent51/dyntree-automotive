import type { Configuration, VehicleAsset } from './types';
export function resolveVehicleImage(
  images: VehicleAsset[],
  config: Configuration,
  angle = 'front-3q',
) {
  const cabin = ['interior', 'dashboard', 'seats', 'rear-seats', 'console'].includes(angle);
  let candidates = images.filter(
    (x) =>
      x.active &&
      x.angle === angle &&
      (cabin ? x.category === 'interior' : x.category !== 'interior'),
  );
  if (!candidates.length)
    candidates = images.filter((x) => x.active && x.angle === (cabin ? 'interior' : 'front-3q'));
  const score = (x: VehicleAsset) =>
    x.priority +
    (x.trim === config.trim ? 50 : 0) +
    (x.paint === config.paint ? 90 : 0) +
    (x.wheel === config.wheels ? 35 : 0) +
    (x.interior === config.interior ? 120 : 0);
  const match = [...candidates].sort(
    (a, b) => score(b) - score(a) || a.url.localeCompare(b.url),
  )[0];
  const exact =
    !!match &&
    (!match.trim || match.trim === config.trim) &&
    (!match.paint || match.paint === config.paint) &&
    (!match.wheel || match.wheel === config.wheels) &&
    (!match.interior || match.interior === config.interior) &&
    match.angle === angle;
  return {
    image: match || {
      url: '/cars/m1e/hero/front-3q.webp',
      alt: 'Dyntree M1E Graphite development prototype',
      angle: 'front-3q',
    },
    exact,
    fallbackLabel: exact
      ? ''
      : 'Closest available prototype view shown. Some selected finishes or equipment may differ.',
  };
}
