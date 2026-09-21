"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { PurchasePlanner } from "./purchase-planner";
import {
  defaultConfiguration,
  configurationQuery,
  priceConfiguration,
} from "@/lib/configuration";
import { defaultPurchasePreference } from "@/lib/purchase-planning";
import { resolveVehicleImage } from "@/lib/image-resolver";
import type { Catalog, Configuration } from "@/lib/types";
export function FinancingExplorer({ catalog }: { catalog: Catalog }) {
  const [config, setConfig] = useState<Configuration>(() => ({
    ...defaultConfiguration(catalog),
    purchasePreference: defaultPurchasePreference(
      "finance",
      catalog.purchaseSettings,
    ),
  }));
  const price = priceConfiguration(catalog, config).totalCents;
  const asset = resolveVehicleImage(catalog.images, config).image;
  return (
    <main id="main" className="page-content financing-page">
      <div className="section-heading">
        <p className="eyebrow">DYNTREE / OWNERSHIP</p>
        <h1>
          Your M1E.
          <br />
          Your way forward.
        </h1>
        <p>
          Explore what cash, financing or leasing could look like. Build a plan
          now, and choose your final path when vehicle ordering becomes
          available.
        </p>
      </div>
      <div className="financing-layout">
        <div className="financing-vehicle">
          <div className="financing-image">
            <Image
              src={asset.url}
              alt={asset.alt}
              fill
              sizes="(max-width: 900px) 100vw, 55vw"
              priority
            />
          </div>
          <p className="fine-print">
            Prototype vehicle shown. Production design, pricing and
            specifications may change.
          </p>
          <label className="financing-trim">
            Choose a trim
            <select
              value={config.trim}
              onChange={(e) =>
                setConfig({
                  ...defaultConfiguration(catalog, e.target.value),
                  purchasePreference: config.purchasePreference,
                })
              }
            >
              {catalog.trims.map((t) => (
                <option key={t.slug} value={t.slug}>
                  M1E {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="financing-paths">
            <article>
              <span>01 / CASH</span>
              <h2>Make it yours.</h2>
              <p>
                Plan for a full vehicle payment at final purchase, with no
                monthly loan or lease payments.
              </p>
            </article>
            <article>
              <span>02 / FINANCE</span>
              <h2>Build toward ownership.</h2>
              <p>
                Explore monthly payments and total interest across different
                terms and assumed rates.
              </p>
            </article>
            <article>
              <span>03 / LEASE</span>
              <h2>Plan around your drive.</h2>
              <p>
                Compare illustrative terms and mileage allowances, including the
                assumed amount due at signing.
              </p>
            </article>
          </div>
        </div>
        <div>
          <PurchasePlanner
            priceCents={price}
            value={config.purchasePreference}
            onChange={(purchasePreference) =>
              setConfig({ ...config, purchasePreference })
            }
            settings={catalog.purchaseSettings}
            depositCents={catalog.settings.amountCents}
          />
          <Button asChild className="cta financing-cta">
            <Link href={`/configure/m1e?${configurationQuery(config)}`}>
              Configure with this preference <ArrowUpRight size={17} />
            </Link>
          </Button>
        </div>
      </div>
      <section className="financing-faq">
        <h2>A clear path from here.</h2>
        {[
          [
            "Can I apply for financing or a lease today?",
            "Not yet. This is a planning tool. Dyntree has not connected a lender or leasing partner. No credit application, approval, signed contract or financing commitment is created.",
          ],
          [
            "What do I pay when I reserve?",
            `Only the reservation deposit shown at checkout. Monthly payments and planned down payments are not collected. A reservation is not a vehicle purchase or lease agreement.`,
          ],
          [
            "Will my preference be saved?",
            "Yes. Save your configuration to My Garage or complete a reservation to retain your preference. Reservation estimates are recorded with their original assumptions; later catalog changes do not rewrite them.",
          ],
          [
            "Are taxes, trade-ins and incentives included?",
            "No. Taxes, title, registration, destination, insurance, trade-in values, incentives and other applicable fees are not included. These can materially change a final payment.",
          ],
          [
            "What should I know about the lease estimate?",
            "Residual values, money factors, acquisition and return fees are illustrative assumptions, not partner terms. The estimate assumes a scheduled return; excess mileage, wear and early termination can add costs. A purchase option is not currently offered.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
        <p className="fine-print">
          Learn about borrowing costs from the{" "}
          <a
            href="https://www.consumerfinance.gov/consumer-tools/auto-loans/answers/key-terms/"
            target="_blank"
            rel="noreferrer"
          >
            Consumer Financial Protection Bureau
          </a>{" "}
          and lease termination from the{" "}
          <a
            href="https://www.federalreserve.gov/pubs/leasing/resource/different/early.htm"
            target="_blank"
            rel="noreferrer"
          >
            Federal Reserve consumer guide
          </a>
          .
        </p>
      </section>
    </main>
  );
}
