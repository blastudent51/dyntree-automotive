import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Code2, Layers, ShieldCheck, Smartphone, Zap, GitBranch } from 'lucide-react';
import type { Catalog } from '@/lib/types';
import { vehicleSpecs } from '@/lib/vehicle-specs';
import { SectionHeading, Eyebrow, Cta } from './marketing';
import { LiviDemo, SensorDiagram, PhoneKeyDemo } from './technology';
import { driveNotice, PrototypeNote } from './brand';
export function ChargingPage({ catalog }: { catalog: Catalog }) {
  const specs = vehicleSpecs(catalog);
  return (
    <main id="main">
      <section className="information-hero">
        <Image
          src={
            catalog.images.find((x) => x.angle === 'charging')?.url ||
            '/cars/m1e/hero/front-3q.webp'
          }
          alt="Dyntree M1E development prototype at a concept charging station"
          fill
          priority
          sizes="100vw"
        />
        <div>
          <Eyebrow>CHARGING, CONSIDERED</Eyebrow>
          <h1>
            A pause.
            <br />
            Not a limitation.
          </h1>
          <p>At home or on the road. Built around the rhythm of your day.</p>
        </div>
        <PrototypeNote />
      </section>
      <section className="performance-bar charging-metrics">
        <div>
          <span className="micro">M1E CHARGING TARGETS</span>
          <p>
            Energy for
            <br />
            what comes next.
          </p>
        </div>
        {[
          [String(specs.dcKW), 'kW', 'Maximum DC target'],
          [String(specs.fastChargeMinutes), 'min', '10–80% target¹'],
          [String(specs.acKW), 'kW', 'AC charging target'],
          [String(specs.batteryGross), 'kWh', 'Gross battery concept'],
        ].map(([n, u, l]) => (
          <div key={l}>
            <strong>
              {n}
              <small>{u}</small>
            </strong>
            <span>{l}</span>
          </div>
        ))}
      </section>
      <section className="section">
        <SectionHeading
          eyebrow="A FLEXIBLE FOUNDATION"
          title="Plug in to possibility."
          copy={`A ${specs.voltage}V electrical architecture with a ${specs.connector} connector. Designed for everyday home charging and convenient fast charging when you travel.`}
        />
        <div className="feature-columns">
          <div>
            <Zap />
            <h3>Charge where you live.</h3>
            <p>
              Up to {String(specs.acKW)} kW AC charging is the target. Your home electrical supply,
              installation and charging equipment determine actual charging capability.
            </p>
          </div>
          <div>
            <Layers />
            <h3>Spend less time waiting.</h3>
            <p>
              Target 10–80% charging is approximately {String(specs.fastChargeMinutes)} minutes
              under ideal conditions. Battery temperature, state of charge, charger output and
              conditioning all matter.
            </p>
          </div>
          <div>
            <Smartphone />
            <h3>Stay informed.</h3>
            <p>
              The LIVI for Dyntree concept puts charging limits, energy use and state of charge
              within reach. These are software integration targets, not production guarantees.
            </p>
          </div>
        </div>
        <p className="fine-print">
          ¹ All figures are development targets. Network access has not been announced; connector
          compatibility does not guarantee access to a particular charging network.
        </p>
      </section>
      <section className="section">
        <LiviDemo />
      </section>
    </main>
  );
}
export function DrivePage() {
  return (
    <main id="main" className="page-content drive-page">
      <SectionHeading
        eyebrow="DYNTREE DRIVE"
        title="Support for the drive. Responsibility stays with you."
        copy="A supervised Level 2 driver-assistance concept, designed to help with selected driving tasks while you remain attentive and in control."
      />
      <div className="drive-notice">
        <ShieldCheck size={22} />
        <p>{driveNotice}</p>
      </div>
      <SensorDiagram />
      <section className="section-inset">
        <SectionHeading eyebrow="DEVELOPMENT FEATURE TARGETS" title="Assistance, with awareness." />
        <div className="drive-feature-grid">
          {[
            'Adaptive cruise control',
            'Lane centering',
            'Automatic emergency braking',
            'Lane departure prevention',
            'Blind-spot intervention',
            'Traffic jam assistance',
            'Lane change assistance',
            'Highway navigation assistance',
            'Automatic parking',
            'Rear cross-traffic braking',
            '360-degree camera',
            'Driver monitoring',
          ].map((x, i) => (
            <div key={x}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h3>{x}</h3>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Feature descriptions are development intentions, subject to validation, operating
          conditions, final equipment and approvals. No Level 3, Level 4, Level 5, robotaxi or
          autonomous-driving capability is claimed.
        </p>
      </section>
      <section className="section-inset">
        <SectionHeading
          eyebrow="AWARENESS ON SCREEN"
          title="Information, without distraction."
          copy="An illustrative interface study. This website does not run a driving system and cannot control a vehicle."
        />
        <LiviDemo />
      </section>
    </main>
  );
}
export function SoftwarePage({ livi = false }: { livi?: boolean }) {
  return (
    <main id="main" className="page-content software-page">
      <div className="software-hero">
        <div>
          <Eyebrow>{livi ? 'LIVI FOR DYNTREE' : 'DYNTREE SOFTWARE'}</Eyebrow>
          <h1>
            {livi ? (
              <>
                Open roots.
                <br />A distinct experience.
              </>
            ) : (
              <>
                One foundation.
                <br />
                Many possibilities.
              </>
            )}
          </h1>
          <p>
            {livi
              ? 'The open-source LIVI project is the upstream foundation. Dyntree’s work is the planned vehicle-specific integration, controls and visual identity.'
              : 'Vehicle interfaces, an API ecosystem and thoughtful updates. Technology designed to branch into what comes next.'}
          </p>
          <Link
            href="https://github.com/f-io/LIVI"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Explore the upstream LIVI project <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="software-emblem">
          <GitBranch size={120} strokeWidth={0.7} />
          <span>TECHNOLOGY THAT GROWS.</span>
        </div>
      </div>
      <LiviDemo />
      <p className="fine-print">
        Interactive Dyntree screen concepts. This website does not embed or distribute LIVI
        software. CarPlay and Android Auto are integration targets, subject to compatible hardware,
        licensing and required certifications. LIVI is independently developed and available under
        its upstream license; no partnership is implied.
      </p>
      <section className="section-inset">
        <SectionHeading
          eyebrow="BUILT TO CONNECT"
          title="The right information. In the right place."
        />
        <div className="feature-columns">
          <div>
            <Layers />
            <h3>Multi-display thinking.</h3>
            <p>
              A 14-inch landscape center display and 10.25-inch driver cluster. Navigation, media,
              phone, climate, vehicle settings and energy monitoring are planned around the driver.
            </p>
          </div>
          <div>
            <Code2 />
            <h3>Vehicle API concept.</h3>
            <p>
              Future documented interfaces for authorized software: simulated vehicle state, energy
              insights, charging and driver profiles. Access scopes and a sandbox environment would
              separate experiments from production controls.
            </p>
          </div>
          <div>
            <ShieldCheck />
            <h3>Privacy and security.</h3>
            <p>
              The intended architecture favors data minimization, permissioned access, secure
              updates and clear controls. Security testing and production policies remain part of
              development.
            </p>
          </div>
        </div>
      </section>
      <section className="devkit-section">
        <div>
          <Eyebrow>THE DYNTREE DEVKIT · FUTURE TOOLS</Eyebrow>
          <h2>Room to experiment.</h2>
          <p>
            A reference platform for software and UI development, based on a Raspberry Pi 5 with 8
            GB RAM.
          </p>
          <p>
            Explore simulated gauges, a charging simulator, vehicle data, the API concept, LIVI
            integration and a Dyntree Drive visualization. Developer mode is intended for controlled
            software experimentation.
          </p>
          <strong>
            This consumer development board is not the final production automotive computer.
          </strong>
        </div>
        <div className="devkit-list">
          {[
            'LIVI integration',
            'Simulated gauges',
            'Vehicle API sandbox',
            'Charging simulator',
            'Driver-assistance visualization',
            'UI development tools',
          ].map((x, i) => (
            <div key={x}>
              <span>0{i + 1}</span>
              {x}
            </div>
          ))}
        </div>
      </section>
      <section className="section-inset">
        <div className="feature-columns">
          <div>
            <h3>Updates, thoughtfully.</h3>
            <p>
              Over-the-air software updates are planned with clear release notes and a safe
              installation state. Production support periods and update policies will be announced
              before vehicle ordering.
            </p>
          </div>
          <div>
            <h3>Open technology.</h3>
            <p>
              Applicable upstream licenses, attribution and source-distribution obligations will be
              preserved. LIVI for Dyntree describes a proposed integration, not a claim of upstream
              authorship.
            </p>
          </div>
          <div>
            <h3>Dyntree Key.</h3>
            <PhoneKeyDemo />
          </div>
        </div>
      </section>
    </main>
  );
}
export function CompanyPage({ override }: { override?: { title?: string; body?: string } }) {
  return (
    <main id="main" className="page-content company-page">
      <div className="company-heading">
        <Eyebrow>DYNAMIC + TREE</Eyebrow>
        <h1>{override?.title || 'Technology that grows.'}</h1>
        <p>
          {override?.body ||
            'A common foundation. A growing set of possibilities. Dyntree begins with engineering, software, vehicle integration and an original vision for electric mobility.'}
        </p>
      </div>
      <div className="brand-principles">
        <div>
          <span>01</span>
          <h2>Rooted in purpose.</h2>
          <p>
            Start with the customer experience. Shape the software, electrical architecture, battery
            pack engineering and vehicle integration around it.
          </p>
        </div>
        <div>
          <span>02</span>
          <h2>Built with expertise.</h2>
          <p>
            Design and integrate at Dyntree. Plan to source airbags, brakes, steering, HVAC, seats,
            glass, lighting, electronics and battery cells from established suppliers.
          </p>
        </div>
        <div>
          <span>03</span>
          <h2>Designed to branch.</h2>
          <p>
            Develop a shared technology foundation that can grow into new vehicles, platforms, APIs
            and customer experiences.
          </p>
        </div>
      </div>
      <section className="section-inset">
        <SectionHeading eyebrow="A FAMILY OF POSSIBILITIES" title="It starts with M1E." />
        <div className="family-grid">
          {[
            ['M', 'Mini', 'Compact and smaller vehicles'],
            ['C', 'Cross', 'Crossover vehicles'],
            ['FS', 'Full-size', 'Larger vehicle platforms'],
            ['H', 'Hyper', 'Performance vehicles'],
          ].map(([code, name, copy]) => (
            <div key={code}>
              <span>{code}</span>
              <h3>{name}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Future vehicle families are a naming framework. M1E is the only current development model.
          M identifies the compact family, 1 the first model class, and E the electric powertrain.
        </p>
      </section>
      <section className="section-inset">
        <SectionHeading eyebrow="THE ROAD AHEAD" title="Grow deliberately." />
        <div className="company-roadmap">
          {[
            [
              'First foundation',
              'Design, software and integration',
              'M1E development prototype and reservation experience.',
            ],
            [
              'Initial production ambition',
              '2,500–5,000 cars / year',
              'Contract manufacturing is a possible first path. Suppliers, facilities and production agreements have not been announced.',
            ],
            [
              'Longer-term ambition',
              '25,000+ cars / year',
              'Scale with demand and validated manufacturing capability, with an eventual dedicated Dyntree factory.',
            ],
          ].map(([stage, title, copy]) => (
            <div key={stage}>
              <small>{stage}</small>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <p className="fine-print">
          These are planning ambitions, not completed manufacturing capabilities or guaranteed
          production volumes.
        </p>
      </section>
      <section className="section-inset">
        <div className="feature-columns">
          <div>
            <h3>Dyntree online.</h3>
            <p>
              The intended main sales channel is Dyntree.com: discovery, configuration, reservations
              and future final ordering. This prototype website does not establish ownership of that
              domain.
            </p>
          </div>
          <div>
            <h3>Dyntree Studios.</h3>
            <p>
              Future spaces for test drives, configuration help, deliveries and support. Home
              delivery is the initial planning model. No locations are currently announced.
            </p>
          </div>
          <div>
            <h3>Service that reaches you.</h3>
            <p>
              Planned Dyntree Service Centers, Mobile Service and Certified Repair Partners would
              support the ownership experience. Availability and coverage remain to be confirmed.
            </p>
          </div>
        </div>
      </section>
      <Cta href="/configure/m1e">Start with your M1E</Cta>
    </main>
  );
}
export function LegalPage({
  kind,
  settings,
}: {
  kind: 'privacy' | 'terms' | 'reservation-agreement';
  settings: Catalog['settings'];
}) {
  const title =
    kind === 'privacy'
      ? 'Privacy policy'
      : kind === 'terms'
        ? 'Website terms'
        : 'Reservation agreement';
  const sections =
    kind === 'privacy'
      ? [
          [
            'Information you provide',
            'When account registration and reservations are enabled, Dyntree uses your name, verified email, phone, addresses, saved configurations and reservation details to provide the requested account and reservation services.',
          ],
          [
            'Payment information',
            'Stripe processes card payments. This application does not collect or store raw card numbers. Transaction identifiers, amounts and payment or refund status are retained for account history and reconciliation.',
          ],
          [
            'Service providers',
            'The application supports Clerk for identity, PostgreSQL for account and reservation storage, Stripe for payments and Resend for transactional emails. Providers are used only when configured. Their processing is governed by their terms and privacy policies.',
          ],
          [
            'Cookies and preferences',
            'Authentication uses session cookies. This build does not include advertising trackers or marketing analytics. Configuration share links contain vehicle choices, not customer identity or delivery information.',
          ],
          [
            'Access and changes',
            'You can update profile and delivery information in My Dyntree. Account data requests can be handled through the support process when Dyntree opens customer operations. Necessary payment and reservation records may need to be retained for recordkeeping.',
          ],
          [
            'Operational status',
            'This is a development-stage automotive company and website. Customer-service contact details, retention schedules and applicable jurisdiction details must be completed before public customer operations.',
          ],
        ]
      : kind === 'terms'
        ? [
            [
              'Development information',
              'The M1E is a development prototype. Images, software interfaces, colors, availability, equipment, production details, performance targets and prices may change before production. No image is a photograph of a delivered production Dyntree vehicle.',
            ],
            [
              'No production or approval claims',
              'No EPA-certified range, NHTSA crash rating, completed manufacturing capability, regulatory approval or guaranteed delivery date is claimed. Vehicles are not yet being delivered.',
            ],
            [
              'Driver assistance',
              'Dyntree Drive requires an attentive driver and does not make the vehicle autonomous. The initial target is supervised Level 2 assistance. Feature descriptions and visualizations are concepts, not operating vehicle-control software.',
            ],
            [
              'Account responsibility',
              'Use accurate information and keep account access secure. Administrative access is restricted. Do not attempt to access another customer’s records or interfere with site operations.',
            ],
            [
              'Open-source and third-party marks',
              'LIVI is an independent upstream open-source project. Dyntree’s proposed work is integration and customization. Apple CarPlay, Android Auto and other third-party marks belong to their respective owners. Their mention does not imply a partnership or final certification.',
            ],
            [
              'Future vehicle purchase',
              'A final vehicle transaction will require separate purchase terms and confirmed vehicle details. Applicable taxes, title, registration, destination and fees are additional.',
            ],
          ]
        : [
            ['A reservation, not a purchase', settings.language],
            [
              'Reservation deposit',
              `The amount due is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(settings.amountCents / 100)}. The reservation is ${settings.refundable ? 'refundable under the policy recorded at checkout' : 'subject to the nonrefundable policy shown at checkout'}. This deposit is separate from future vehicle purchase and delivery charges.`,
            ],
            [
              'Configuration and prices',
              'Your selections and the estimate displayed at reservation are stored as a historical snapshot. Production configurations, final pricing, performance targets and available equipment may change. Final pricing may differ. Taxes, title, registration, destination, and other applicable fees are additional.',
            ],
            [
              'Production and delivery',
              `${settings.productionWindow}. A reservation does not guarantee a production slot, allocation priority or delivery date. Vehicles are not yet being delivered. Home delivery and pickup at active Dyntree dealer locations may be selected where offered; final destination, pickup and delivery charges will be confirmed before final vehicle purchase.`,
            ],
            [
              'Cancellation and refunds',
              'Eligible reservations may be cancelled through your account before final ordering. An administrator processes the applicable refund separately to the original payment method. Your payment provider controls the time required for funds to appear. Cancellation is not itself proof that a refund has completed.',
            ],
            [
              'Final ordering',
              'If Dyntree proceeds to production and can offer your vehicle, you may receive an invitation to review final specifications, equipment, price, payment, warranty and delivery terms. A separate vehicle purchase agreement is required.',
            ],
            [
              'Agreement version',
              `Current version: ${settings.agreementVersion}. Your accepted version and the reservation settings at checkout are recorded with your reservation.`,
            ],
          ];
  return (
    <main id="main" className="page-content legal-page">
      <Eyebrow>DYNTREE AUTOMOTIVE</Eyebrow>
      <h1>{title}</h1>
      <p className="legal-date">Development-stage terms · Updated September 19, 2026</p>
      {sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <Link className="text-link" href="/support">
        Visit Support <ArrowUpRight size={16} />
      </Link>
    </main>
  );
}
