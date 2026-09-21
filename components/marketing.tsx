import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Zap, Radio, Command, ShieldCheck, ChevronDown } from 'lucide-react';
import type { Catalog } from '@/lib/types';
import { money, defaultConfiguration } from '@/lib/configuration';
import { resolveVehicleImage } from '@/lib/image-resolver';
import { vehicleSpecs } from '@/lib/vehicle-specs';
import { Button } from '@/components/ui/button';
import { Reveal } from './motion';
import { PrototypeNote, driveNotice, BranchMark } from './brand';
import { LiviDemo, PhoneKeyDemo, SensorDiagram } from './technology';
export function Cta({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: React.ReactNode;
  outline?: boolean;
}) {
  return (
    <Button
      asChild
      variant={outline ? 'outline' : 'default'}
      className={`cta ${outline ? 'cta-outline' : ''}`}
    >
      <Link href={href}>
        {children}
        <ArrowUpRight size={17} />
      </Link>
    </Button>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span />
      {children}
    </p>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-heading">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}
export function TrimLineup({ catalog, full = false }: { catalog: Catalog; full?: boolean }) {
  return (
    <section className="section lineup" id="trims">
      <div className="section-head-row">
        <SectionHeading eyebrow="FOUR EXPRESSIONS. ONE FOUNDATION." title="Find your equation." />
        <Link className="text-link" href="/vehicles/m1e/compare">
          Compare all trims <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="trim-grid">
        {catalog.trims.map((trim, i) => {
          const config = {
            ...defaultConfiguration(catalog, trim.slug),
            paint: i === 0 ? 'branch-white' : 'graphite',
          };
          const image = resolveVehicleImage(catalog.images, config).image;
          return (
            <Reveal key={trim.slug} delay={i * 0.07} className="trim-card">
              <div className="trim-card-top">
                <span className="trim-symbol">{trim.symbol}</span>
                <span className="micro">M1E / 0{i + 1}</span>
              </div>
              <div className="trim-image">
                <Image src={image.url} alt={image.alt} fill sizes="(max-width: 700px) 90vw, 25vw" />
              </div>
              <h3>{trim.name}</h3>
              <p>{trim.description}</p>
              <div className="trim-price">
                <small>Estimated starting MSRP</small>
                <strong>{money(trim.priceCents)}</strong>
              </div>
              <div className="trim-quick">
                <span>~{trim.power} hp</span>
                <span>~{trim.acceleration}s 0–60</span>
                <span>{trim.drivetrain.includes('AWD') ? 'AWD' : 'RWD'}</span>
              </div>
              {full && (
                <ul className="feature-list">
                  {(trim.features || []).slice(-6).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <Link className="trim-configure" href={`/configure/m1e?trim=${trim.slug}`}>
                Configure {trim.name}
                <ArrowUpRight size={18} />
              </Link>
            </Reveal>
          );
        })}
      </div>
      <p className="fine-print">
        Performance and range figures are development targets. Maximum power and quickest
        acceleration refer to Multiply; the longest range target refers to Divide and Subtract.
      </p>
    </section>
  );
}
export function HomePage({ catalog }: { catalog: Catalog }) {
  const hero = resolveVehicleImage(catalog.images, defaultConfiguration(catalog)).image;
  const specs = vehicleSpecs(catalog);
  return (
    <main id="main">
      {catalog.announcements.map((a, i) => (
        <div className="announcement-bar" key={i}>
          <strong>{a.title}</strong>
          {a.body}
        </div>
      ))}
      <section className="hero">
        <Image
          src={hero.url}
          alt="Dyntree M1E graphite electric coupe development prototype in a dark architectural studio"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <Reveal>
            <Eyebrow>INTRODUCING THE DYNTREE M1E</Eyebrow>
            <h1>
              Electric, without
              <br />
              the ordinary.
            </h1>
            <p>
              A new expression of electric.
              <br />A foundation for what comes next.
            </p>
          </Reveal>
        </div>
        <span className="hero-prototype">
          <span /> DEVELOPMENT PROTOTYPE / 01
        </span>
        <div className="hero-bottom">
          <div className="hero-buttons">
            <Cta href="/configure/m1e">Configure M1E</Cta>
            <Cta href="/vehicles/m1e" outline>
              Explore M1E
            </Cta>
          </div>
          <PrototypeNote />
          <a className="scroll-cue" href="#performance" aria-label="Explore performance">
            <ChevronDown size={23} />
          </a>
        </div>
      </section>
      <section className="performance-bar" id="performance">
        <div>
          <span className="micro">ENGINEERED FOR FEELING</span>
          <p>
            All electric.
            <br />
            Entirely Dyntree.
          </p>
        </div>
        {[
          [`~${Math.max(...catalog.trims.map((t) => t.power))}`, 'hp', 'Target peak power'],
          [
            `~${Math.min(...catalog.trims.map((t) => Number(t.acceleration)))}`,
            's',
            'Target 0–60 mph',
          ],
          [
            String(Math.max(...catalog.trims.map((t) => parseFloat(t.range)))),
            'mi',
            'Target range¹',
          ],
          [String(specs.dcKW), 'kW', 'Target DC charging'],
        ].map(([value, unit, label], i) => (
          <Reveal key={label} delay={i * 0.08}>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
            <span>{label}</span>
          </Reveal>
        ))}
      </section>
      <section className="section design-intro">
        <Reveal>
          <SectionHeading
            eyebrow="FORM WITH INTENTION"
            title="Recognizable before you read the badge."
            copy="A low roofline. Sculpted shoulders. A signature that branches into light. Every line of M1E starts with a purpose."
          />
        </Reveal>
        <Link className="text-link" href="/vehicles/m1e#design">
          Discover the design <ArrowUpRight size={16} />
        </Link>
        <div className="wide-image">
          <Image
            src={
              catalog.images.find((x) => x.angle === 'rear-3q')?.url ||
              '/cars/m1e/hero/front-3q.webp'
            }
            alt="Dyntree M1E prototype exterior design"
            fill
            sizes="100vw"
          />
          <span className="image-caption">01 / A DIFFERENT KIND OF PRESENCE</span>
        </div>
      </section>
      <section className="section interior-section">
        <div className="interior-copy">
          <Eyebrow>YOUR OWN SPACE</Eyebrow>
          <h2>
            Made for the drive.
            <br />
            And the driver.
          </h2>
          <p>
            A considered 2+2 cabin. Materials with depth. Technology that fits around you. And
            physical controls, right where your hands expect them.
          </p>
          <Cta href="/vehicles/m1e#interior" outline>
            Step inside
          </Cta>
          <div className="interior-spec">
            <span>
              <strong>2+2</strong>Coupe seating
            </span>
            <span>
              <strong>14″</strong>Center display
            </span>
            <span>
              <strong>10.25″</strong>Driver display
            </span>
          </div>
        </div>
        <div className="interior-photo">
          <Image
            src={
              catalog.images.find((x) => x.angle === 'interior')?.url ||
              '/cars/m1e/hero/front-3q.webp'
            }
            alt="Dyntree M1E interior development concept"
            fill
            sizes="(max-width: 800px) 100vw, 60vw"
          />
        </div>
      </section>
      <TrimLineup catalog={catalog} />
      <section className="section technology-section">
        <div className="technology-copy">
          <Eyebrow>CONNECTED BY DESIGN</Eyebrow>
          <h2>
            Technology that
            <br />
            feels like you.
          </h2>
          <p>
            Meet LIVI for Dyntree. An open-source foundation, integrated into a distinctly Dyntree
            experience.
          </p>
          <Link className="text-link" href="/software/livi">
            Explore LIVI <ArrowUpRight size={16} />
          </Link>
          <div className="tech-chips">
            <span>
              <Command size={16} /> Linux foundation
            </span>
            <span>
              <Radio size={16} /> Phone integration targets
            </span>
          </div>
        </div>
        <LiviDemo compact />
      </section>
      <section className="dual-stories">
        <article>
          <div className="story-top">
            <ShieldCheck />
            <span>DYNTREE DRIVE</span>
          </div>
          <h2>
            A little less effort.
            <br />
            Stay fully present.
          </h2>
          <p>Supervised assistance designed to support the way you drive.</p>
          <Link href="/drive" className="text-link">
            Explore Dyntree Drive <ArrowUpRight size={16} />
          </Link>
          <p className="fine-print">{driveNotice}</p>
        </article>
        <article>
          <div className="story-top">
            <Zap />
            <span>CHARGING</span>
          </div>
          <h2>
            Recharge.
            <br />
            Then keep going.
          </h2>
          <p>A target 10–80% charge in approximately 27–30 minutes under ideal conditions.</p>
          <Link href="/charging" className="text-link">
            Charging, considered <ArrowUpRight size={16} />
          </Link>
          <p className="fine-print">
            {String(specs.voltage)}V architecture · {String(specs.connector)} connector ·{' '}
            {String(specs.acKW)} kW AC target
          </p>
        </article>
      </section>
      <section className="closing-cta">
        <BranchMark />
        <Eyebrow>THE BEGINNING OF SOMETHING DIFFERENT</Eyebrow>
        <h2>
          Make room for
          <br />
          the extraordinary.
        </h2>
        <p>Choose your M1E. Shape what comes next.</p>
        <Cta href="/configure/m1e">Build your M1E</Cta>
        <span className="fine-print">
          {money(catalog.settings.amountCents)} {catalog.settings.refundable ? 'refundable ' : ''}
          reservation · {catalog.settings.productionWindow}
        </span>
      </section>
    </main>
  );
}
export function VehiclePage({ catalog }: { catalog: Catalog }) {
  const hero = resolveVehicleImage(catalog.images, defaultConfiguration(catalog)).image;
  const specs = vehicleSpecs(catalog);
  return (
    <main id="main">
      <div className="model-subnav">
        <strong>DYNTREE M1E</strong>
        <div>
          {[
            ['Overview', '#overview'],
            ['Design', '#design'],
            ['Interior', '#interior'],
            ['Technology', '#technology'],
            ['Specifications', '#specifications'],
          ].map(([t, h]) => (
            <a key={h} href={h}>
              {t}
            </a>
          ))}
        </div>
        <Link href="/configure/m1e">
          Configure <ArrowUpRight size={14} />
        </Link>
      </div>
      <section className="vehicle-hero" id="overview">
        <Image src={hero.url} alt="Dyntree M1E development prototype" fill priority sizes="100vw" />
        <div>
          <Eyebrow>THE ALL-ELECTRIC 2+2 COUPE</Eyebrow>
          <h1>Meet M1E.</h1>
          <p>Small footprint. Expansive possibility.</p>
        </div>
        <PrototypeNote />
      </section>
      <section className="section" id="design">
        <SectionHeading
          eyebrow="DESIGN"
          title="A line of its own."
          copy="A low nose flows into a panoramic roofline, frameless glass and broad rear shoulders. Flush handles and a restrained active spoiler keep the silhouette deliberate. Branching Y signatures connect every Dyntree."
        />
        <div className="feature-columns">
          <div>
            <h3>Flow, without excess.</h3>
            <p>
              Short overhangs and a long wheelbase create coupe proportions. A closed EV fascia and
              functional lower cooling opening support an aerodynamic concept.
            </p>
          </div>
          <div>
            <h3>Room for four.</h3>
            <p>
              Two front seats and two compact rear seats. A true 2+2 with a driver-oriented cabin
              and useful space for the everyday.
            </p>
          </div>
          <div>
            <h3>Precisely electric.</h3>
            <p>
              A {String(specs.batteryGross)} kWh gross battery concept, {String(specs.voltage)}V
              architecture and rear- or all-wheel drive create the common M1E foundation.
            </p>
          </div>
        </div>
      </section>
      <TrimLineup catalog={catalog} full />
      <section className="section" id="interior">
        <SectionHeading
          eyebrow="INTERIOR"
          title="Everything within reach."
          copy="Graphite, Cloud, Copper or Multiply Sport. Select your atmosphere, with physical climate, volume and hazard controls alongside a 14-inch landscape display."
        />
        <div className="wide-image">
          <Image
            src={
              catalog.images.find((x) => x.angle === 'interior')?.url ||
              '/cars/m1e/hero/front-3q.webp'
            }
            alt="Dyntree M1E cockpit prototype"
            fill
            sizes="100vw"
          />
        </div>
      </section>
      <section className="section" id="technology">
        <SectionHeading eyebrow="SOFTWARE & CONNECTION" title="An open foundation." />
        <LiviDemo />
        <div className="feature-columns">
          <div>
            <h3>LIVI for Dyntree</h3>
            <p>
              Our proposed vehicle integration and theme for the independently developed,
              open-source LIVI project.
            </p>
            <Link className="text-link" href="/software/livi">
              Explore LIVI <ArrowUpRight size={16} />
            </Link>
          </div>
          <div>
            <h3>Your phone. Your key.</h3>
            <p>
              Dyntree Key is designed around Bluetooth Low Energy, UWB proximity and NFC backup.
              Every vehicle is planned to include two backup NFC key cards.
            </p>
            <PhoneKeyDemo />
          </div>
          <div>
            <h3>Support, with awareness.</h3>
            <p>{driveNotice}</p>
            <Link className="text-link" href="/drive">
              Driver assistance concept <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section" id="specifications">
        <SectionHeading eyebrow="ENGINEERING TARGETS" title="The details matter." />
        <SpecTable catalog={catalog} />
        <p className="fine-print">
          Subtract is modeled as RWD. Optional AWD remains an engineering possibility and is not
          currently a selectable or priced option. Top-speed and charging figures are estimates, not
          validated production results.
        </p>
      </section>
      <section className="section">
        <SectionHeading
          eyebrow="SAFETY DEVELOPMENT"
          title="Designed around responsibility."
          copy="Airbags, brakes, steering and other safety-critical components are planned to come from established suppliers. Validation, regulatory approvals and crash testing remain development work. No government approval or crash rating is claimed."
        />
        <SensorDiagram />
        <p className="fine-print">
          Sensor positions are a conceptual packaging study, not validated production placement.
        </p>
      </section>
      <section className="gallery-cta">
        <h2>Look a little closer.</h2>
        <Cta href="/vehicles/m1e/gallery" outline>
          Explore the gallery
        </Cta>
        <Cta href="/configure/m1e">Configure M1E</Cta>
      </section>
    </main>
  );
}
export function SpecTable({ catalog }: { catalog: Catalog }) {
  const specs = vehicleSpecs(catalog);
  const rows = [
    ['Body', String(specs.body)],
    ['Seating', `${specs.seats} (2 front + 2 compact rear)`],
    [
      'Battery capacity',
      `${specs.batteryGross} kWh gross / approximately ${specs.batteryUsable} kWh usable target`,
    ],
    ['Architecture', `${specs.voltage}V`],
    ['Charging connector', String(specs.connector)],
    ['DC fast charging', `Approximately ${specs.dcKW} kW maximum target`],
    ['AC charging', `${specs.acKW} kW target`],
    ['10–80% charging', `Approximately ${specs.fastChargeMinutes} minutes under ideal conditions`],
    [
      'Center / driver displays',
      `${specs.centerDisplay}-inch landscape / ${specs.driverDisplay}-inch digital cluster`,
    ],
    ['Delivery', 'Future home delivery; no confirmed production date'],
  ];
  return (
    <dl className="spec-table">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
export function ComparePage({ catalog }: { catalog: Catalog }) {
  const rows = [
    ['Estimated MSRP', ...catalog.trims.map((t) => money(t.priceCents))],
    ['Target power', ...catalog.trims.map((t) => `~${t.power} hp`)],
    ['Drivetrain', ...catalog.trims.map((t) => t.drivetrain)],
    ['Target 0–60 mph', ...catalog.trims.map((t) => `~${t.acceleration} s`)],
    ['Target range', ...catalog.trims.map((t) => `${t.range} mi`)],
    ...['wheels', 'suspension', 'audio', 'seats', 'hud', 'performance'].map((k) => [
      k.toUpperCase(),
      ...catalog.trims.map((t) => t.specs[k]),
    ]),
    ['Displays', ...catalog.trims.map(() => '14″ center / 10.25″ cluster')],
    ['Dyntree Drive', ...catalog.trims.map(() => 'Supervised Level 2 target')],
  ];
  return (
    <main id="main" className="page-content">
      <SectionHeading
        eyebrow="M1E TRIM COMPARISON"
        title="Four ways to be yourself."
        copy="One foundation. Four considered expressions of range, refinement and performance."
      />
      <div className="comparison-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">M1E</th>
              {catalog.trims.map((t) => (
                <th key={t.slug} scope="col">
                  <span>{t.symbol}</span>
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      {c}
                    </th>
                  ) : (
                    <td key={i}>{c}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {catalog.trims.map((t) => (
                <td key={t.slug}>
                  <Link href={`/configure/m1e?trim=${t.slug}`}>
                    Configure {t.name}
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="fine-print">
        All specifications are targets. Equipment, pricing and availability may change. Driver
        assistance requires active supervision. Optional Subtract AWD is under engineering
        consideration and is not included here.
      </p>
    </main>
  );
}
