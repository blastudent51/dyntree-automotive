import { describe, it, expect } from 'vitest';
import { seedCatalog } from '../lib/seed-catalog';
import {
  defaultConfiguration,
  priceConfiguration,
  validateConfiguration,
  configurationFromQuery,
  configurationQuery,
} from '../lib/configuration';
import { resolveVehicleImage } from '../lib/image-resolver';
import images from '../lib/generated-assets.json';
import { safeReturnTo } from '../lib/paths';
import { renderEmail } from '../lib/email';
const catalog = { ...seedCatalog, images };
describe('M1E configuration and pricing', () => {
  it('prices the four standard builds correctly', () => {
    expect(
      catalog.trims.map(
        (t) => priceConfiguration(catalog, defaultConfiguration(catalog, t.slug)).totalCents,
      ),
    ).toEqual([5299000, 5699000, 5999000, 6599000]);
  });
  it('adds paint, interior and packages in integer cents', () => {
    const c = {
      ...defaultConfiguration(catalog),
      paint: 'volt-blue',
      interior: 'cloud',
      packages: ['comfort'],
    };
    expect(priceConfiguration(catalog, c).totalCents).toBe(5674000);
  });
  it('does not charge twice for Dynamic Package wheels', () => {
    const c = { ...defaultConfiguration(catalog), wheels: 'dynamic19', packages: ['dynamic'] };
    expect(priceConfiguration(catalog, c).totalCents).toBe(5649000);
    expect(
      priceConfiguration(catalog, c).lines.find((l) => l.category === 'Wheels')?.priceCents,
    ).toBe(0);
  });
  it('does not charge top-trim included technology and comfort equipment', () => {
    const c = { ...defaultConfiguration(catalog, 'multiply'), packages: ['technology', 'comfort'] };
    expect(priceConfiguration(catalog, c).totalCents).toBe(6599000);
  });
  it('rejects invalid combinations, duplicate options and tampered prices', () => {
    expect(() =>
      validateConfiguration(catalog, {
        ...defaultConfiguration(catalog),
        interior: 'multiply-sport',
      }),
    ).toThrow();
    expect(() =>
      validateConfiguration(catalog, { ...defaultConfiguration(catalog), wheels: 'performance20' }),
    ).toThrow();
    expect(() =>
      validateConfiguration(catalog, {
        ...defaultConfiguration(catalog),
        packages: ['comfort', 'comfort'],
      }),
    ).toThrow();
    expect(() =>
      validateConfiguration(catalog, { ...defaultConfiguration(catalog), priceCents: 1 }),
    ).toThrow();
    expect(() =>
      validateConfiguration(catalog, { ...defaultConfiguration(catalog), packages: ['dynamic'] }),
    ).toThrow();
  });
  it('uses catalog prices after an administrator changes them', () => {
    const c = structuredClone(catalog);
    c.paints.find((p) => p.slug === 'volt-blue')!.priceCents = 130000;
    expect(
      priceConfiguration(c, { ...defaultConfiguration(c), paint: 'volt-blue' }).totalCents,
    ).toBe(5429000);
  });
  it('round-trips every selection through a shareable URL', () => {
    const c = {
      ...defaultConfiguration(catalog, 'multiply'),
      paint: 'forest-metallic',
      interior: 'multiply-sport',
      packages: ['technology'],
      accessories: ['cargo-liner'],
    };
    expect(configurationFromQuery(catalog, new URLSearchParams(configurationQuery(c)))).toEqual(c);
  });
  it('safely normalizes invalid URL options', () => {
    expect(
      configurationFromQuery(catalog, new URLSearchParams('trim=unknown&paint=wrong')),
    ).toEqual(defaultConfiguration(catalog));
  });
  it('selects compatible defaults when an administrator deactivates previous defaults', () => {
    const changed = structuredClone(catalog);
    changed.paints.find((p) => p.slug === 'graphite')!.active = false;
    changed.wheels.find((w) => w.slug === 'aero19')!.active = false;
    changed.interiors.find((i) => i.slug === 'graphite')!.active = false;
    const config = defaultConfiguration(changed);
    expect(config.paint).not.toBe('graphite');
    expect(config.wheels).toBe('dynamic19');
    expect(config.interior).not.toBe('graphite');
    expect(() => priceConfiguration(changed, config)).not.toThrow();
  });
});
describe('original asset resolution', () => {
  it('has an original image for each paint', () => {
    for (const p of catalog.paints) {
      const resolved = resolveVehicleImage(images, {
        ...defaultConfiguration(catalog),
        paint: p.slug,
      });
      expect(resolved.image.url).toBeTruthy();
      expect(resolved.exact).toBe(true);
    }
  });
  it('selects every trim and wheel reference', () => {
    for (const t of catalog.trims) {
      expect(resolveVehicleImage(images, defaultConfiguration(catalog, t.slug)).exact).toBe(true);
    }
    for (const w of catalog.wheels) {
      const trim = w.compatibleTrims[0];
      expect(
        resolveVehicleImage(
          images,
          { ...defaultConfiguration(catalog, trim), wheels: w.slug },
          'wheels',
        ).image.url,
      ).toContain(w.slug);
    }
  });
  it('selects all four interior themes', () => {
    for (const i of catalog.interiors) {
      const trim = i.compatibleTrims[0];
      expect(
        resolveVehicleImage(
          images,
          { ...defaultConfiguration(catalog, trim), interior: i.slug },
          'interior',
        ).image.url,
      ).toContain(`/interior/${i.slug}/`);
    }
  });
  it('discloses approximate combinations and never returns an inactive image', () => {
    const c = { ...defaultConfiguration(catalog, 'multiply'), paint: 'copper-leaf' };
    expect(resolveVehicleImage(images, c).fallbackLabel).not.toBe('');
    const disabled = images.map((i) => ({ ...i, active: i.paint !== 'copper-leaf' }));
    expect(resolveVehicleImage(disabled, c).image.url).not.toContain('copper-leaf');
  });
});
describe('secure output and navigation', () => {
  it('rejects off-site redirects', () => {
    for (const path of ['//evil.example', 'https://evil.example', '/\\evil.example'])
      expect(safeReturnTo(path)).toBe('/account');
    expect(safeReturnTo('/configure/m1e?trim=add')).toContain('/configure');
  });
  it('escapes customer-provided email content', () => {
    const result = renderEmail('welcome', { name: '<img src=x onerror=alert(1)>' });
    expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;img');
  });
});
