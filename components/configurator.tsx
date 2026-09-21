"use client";
import { SubscriptionInfo } from "./subscription-info";
import { apiResult } from "@/lib/client-api";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  Check,
  Share2,
  Bookmark,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Catalog, Configuration, CatalogOption } from "@/lib/types";
import {
  configurationQuery,
  compatible,
  defaultConfiguration,
  money,
  priceConfiguration,
} from "@/lib/configuration";
import { VehicleViewer } from "./vehicle-viewer";
const steps = [
  "Trim",
  "Paint",
  "Wheels",
  "Interior",
  "Packages",
  "Accessories",
  "Summary",
  "Reservation",
];
export function Configurator({
  catalog,
  initial,
}: {
  catalog: Catalog;
  initial: Configuration;
}) {
  const [config, setConfig] = useState(initial);
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState("front-3q");
  const [saved, setSaved] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const quote = priceConfiguration(catalog, config);
  const trim = catalog.trims.find((x) => x.slug === config.trim)!;
  function update(c: Configuration) {
    setConfig(c);
    setSaved("");
    window.history.replaceState(
      null,
      "",
      `/configure/m1e?${configurationQuery(c)}`,
    );
  }
  function selectOption(key: "paint" | "wheels" | "interior", slug: string) {
    const c = { ...config, [key]: slug };
    if (
      key === "wheels" &&
      c.packages.includes("dynamic") &&
      slug !== "dynamic19"
    ) {
      c.packages = c.packages.filter((x) => x !== "dynamic");
      toast.info(
        "Dynamic Package was removed because it includes 19-inch Dynamic wheels.",
      );
    }
    update(c);
    setAngle(
      key === "interior"
        ? "interior"
        : key === "wheels"
          ? "wheels"
          : "front-3q",
    );
  }
  async function share() {
    const url = new URL(
      `/configure/m1e?${configurationQuery(config)}`,
      window.location.origin,
    ).href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Configuration link copied.");
    } catch {
      setShareUrl(url);
    }
  }
  const [shareUrl, setShareUrl] = useState("");
  function save() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/configurations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configuration: config,
            name: `M1E ${trim.name}`,
          }),
        });
        if (response.status === 401) {
          setLoginOpen(true);
          return;
        }
        const result = await apiResult(response);
        if (!response.ok)
          throw Error(result.error || "Could not save this configuration.");
        setSaved(result.code);
        toast.success(`Saved to My Garage · ${result.code}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save configuration.",
        );
      }
    });
  }
  function optionPrice(o: CatalogOption) {
    return o.includedTrims.includes(config.trim) || o.priceCents === 0
      ? "Included"
      : `+${money(o.priceCents)}`;
  }
  const group =
    step === 1
      ? "paints"
      : step === 2
        ? "wheels"
        : step === 3
          ? "interiors"
          : step === 4
            ? "packages"
            : "accessories";
  function go(s: number) {
    setStep(s);
    if (s === 3) setAngle("interior");
    else if (s === 2) setAngle("wheels");
    else if (s < 3) setAngle("front-3q");
  }
  return (
    <main id="main" className="configurator">
      <div className="config-topbar">
        <Link href="/vehicles/m1e">
          <ChevronLeft size={14} /> M1E
        </Link>
        <span>MAKE IT YOURS.</span>
        <div>
          <Button variant="ghost" size="sm" onClick={share}>
            <Share2 size={15} />
            <span>Share</span>
          </Button>
          <Button variant="ghost" size="sm" disabled={isPending} onClick={save}>
            {isPending ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Bookmark size={15} />
            )}
            <span>{saved ? "Saved" : "Save build"}</span>
          </Button>
        </div>
      </div>
      <div className="config-main">
        <VehicleViewer
          images={catalog.images}
          config={config}
          angle={angle}
          onAngle={setAngle}
        />
        <aside className="config-controls">
          <div className="config-control-heading">
            <p className="eyebrow">YOUR DYNTREE M1E</p>
            <h1>
              {trim.name}
              <span>{trim.symbol}</span>
            </h1>
            <div className="config-specs">
              <span>
                <strong>~{trim.power}</strong>hp target
              </span>
              <span>
                <strong>~{trim.acceleration}s</strong>0–60 target
              </span>
              <span>
                <strong>{trim.range}</strong>mi target
              </span>
            </div>
          </div>
          <nav className="step-nav" aria-label="Configuration steps">
            {steps.map((label, i) => (
              <button
                key={label}
                aria-current={step === i ? "step" : undefined}
                className={step === i ? "active" : ""}
                onClick={() => go(i)}
              >
                {String(i + 1).padStart(2, "0")}
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="config-options">
            <div className="config-step-title">
              <h2>
                {step === 0
                  ? "Choose your expression."
                  : step === 1
                    ? "Find your color."
                    : step === 2
                      ? "Set it in motion."
                      : step === 3
                        ? "Make yourself at home."
                        : step === 4
                          ? "A little more you."
                          : step === 5
                            ? "Ready for everyday."
                            : step === 6
                              ? "Your M1E, considered."
                              : "The beginning of your journey."}
              </h2>
              <span>{step + 1} / 8</span>
            </div>
            {step === 0 ? (
              <div className="trim-options">
                {catalog.trims.map((t) => (
                  <button
                    key={t.slug}
                    className={`option-card ${config.trim === t.slug ? "selected" : ""}`}
                    onClick={() => {
                      update({
                        ...defaultConfiguration(catalog, t.slug),
                        ...(config.purchasePreference
                          ? { purchasePreference: config.purchasePreference }
                          : {}),
                      });
                      setAngle("front-3q");
                    }}
                    aria-pressed={config.trim === t.slug}
                  >
                    <div>
                      <span className="option-symbol">{t.symbol}</span>
                      <strong>{t.name}</strong>
                      <span>{money(t.priceCents)}</span>
                    </div>
                    <p>
                      {t.drivetrain} · ~{t.power} hp · ~{t.acceleration}s 0–60
                    </p>
                    <small>{t.description}</small>
                    {config.trim === t.slug && (
                      <Check className="option-check" size={16} />
                    )}
                  </button>
                ))}
                <Link className="config-compare" href="/vehicles/m1e/compare">
                  Compare all four trims <ArrowUpRight size={14} />
                </Link>
              </div>
            ) : step === 1 || step === 3 ? (
              <>
                <div className="swatch-grid">
                  {catalog[group]
                    .filter((x) => compatible(x, config.trim))
                    .map((o) => (
                      <button
                        className={`swatch ${config[step === 1 ? "paint" : "interior"] === o.slug ? "selected" : ""}`}
                        aria-label={o.name}
                        aria-pressed={
                          config[step === 1 ? "paint" : "interior"] === o.slug
                        }
                        key={o.slug}
                        onClick={() =>
                          selectOption(
                            step === 1 ? "paint" : "interior",
                            o.slug,
                          )
                        }
                        style={{
                          background: `linear-gradient(140deg,${o.hex},${o.hex} 45%,#ffffff48)`,
                        }}
                      >
                        {config[step === 1 ? "paint" : "interior"] ===
                          o.slug && (
                          <Check
                            size={18}
                            style={{
                              color: ["branch-white", "cloud"].includes(o.slug)
                                ? "#152126"
                                : "#fff",
                            }}
                          />
                        )}
                      </button>
                    ))}
                </div>
                {(() => {
                  const selected = catalog[group].find(
                    (x) => x.slug === config[step === 1 ? "paint" : "interior"],
                  )!;
                  return (
                    <div className="selected-finish">
                      <h3>{selected.name}</h3>
                      <span>{optionPrice(selected)}</span>
                      <p>{selected.description}</p>
                    </div>
                  );
                })()}
                <p className="config-hint">
                  <Info size={15} /> Actual materials and colors may differ from
                  screen previews.
                </p>
              </>
            ) : step === 2 ? (
              <div>
                {catalog.wheels
                  .filter((x) => compatible(x, config.trim))
                  .map((o) => (
                    <button
                      className={`option-card ${config.wheels === o.slug ? "selected" : ""}`}
                      key={o.slug}
                      onClick={() => selectOption("wheels", o.slug)}
                      aria-pressed={config.wheels === o.slug}
                    >
                      <div>
                        <strong>{o.name}</strong>
                        <span>{optionPrice(o)}</span>
                      </div>
                      <p>{o.description}</p>
                      {config.wheels === o.slug && (
                        <Check className="option-check" size={16} />
                      )}
                    </button>
                  ))}
              </div>
            ) : step === 4 || step === 5 ? (
              <div>
                {catalog[group]
                  .filter((x) => compatible(x, config.trim))
                  .map((o) => {
                    const key = step === 4 ? "packages" : "accessories";
                    const included = o.includedTrims.includes(config.trim);
                    const checked = config[key].includes(o.slug) || included;
                    return (
                      <label
                        className={`option-card package-option ${checked ? "selected" : ""}`}
                        key={o.slug}
                      >
                        <div>
                          <strong>{o.name}</strong>
                          <Checkbox
                            checked={checked}
                            disabled={included}
                            onCheckedChange={(on) => {
                              const next = {
                                ...config,
                                [key]: on
                                  ? [...config[key], o.slug]
                                  : config[key].filter((x) => x !== o.slug),
                              };
                              if (
                                key === "packages" &&
                                o.slug === "dynamic" &&
                                on
                              )
                                next.wheels = "dynamic19";
                              update(next);
                            }}
                          />
                        </div>
                        <span>{optionPrice(o)}</span>
                        <p>{o.description}</p>
                        {o.features && (
                          <ul>
                            {o.features.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </label>
                    );
                  })}
              </div>
            ) : (
              <div className="config-summary">
                <div className="summary-model">
                  <span>{trim.symbol}</span>
                  <div>
                    <h3>M1E {trim.name}</h3>
                    <p>
                      {trim.drivetrain} ·{" "}
                      {
                        catalog.paints.find((x) => x.slug === config.paint)
                          ?.name
                      }
                    </p>
                  </div>
                </div>
                <dl>
                  {quote.lines.map((line, i) => (
                    <div key={i}>
                      <dt>{line.label}</dt>
                      <dd>
                        {line.priceCents === 0
                          ? "Included"
                          : money(line.priceCents)}
                      </dd>
                    </div>
                  ))}
                  <div className="summary-total">
                    <dt>Estimated vehicle price</dt>
                    <dd>{money(quote.totalCents)}</dd>
                  </div>
                </dl>
                <p className="fine-print">
                  Final pricing may differ. Taxes, title, registration,
                  destination, and other applicable fees are additional.
                </p>
                <SubscriptionInfo />
                {saved && (
                  <div className="saved-code">
                    Saved configuration <strong>{saved}</strong>
                  </div>
                )}
                {step === 6 ? (
                  <Button
                    className="save-summary"
                    variant="outline"
                    onClick={save}
                    disabled={isPending}
                  >
                    <Bookmark size={15} />
                    Save to My Garage
                  </Button>
                ) : (
                  <div className="reservation-intro">
                    <div>
                      <strong>{money(catalog.settings.amountCents)}</strong>
                      <span>
                        {catalog.settings.refundable
                          ? "Refundable reservation"
                          : "Reservation deposit"}
                      </span>
                    </div>
                    <p>{catalog.settings.language}</p>
                    <p>
                      Home delivery and pickup at active Dyntree dealers may be
                      selected during reservation. Final destination, pickup,
                      and delivery charges will be confirmed before final
                      vehicle purchase.
                    </p>
                    <p className="fine-print">
                      {catalog.settings.productionWindow}. Vehicles are not yet
                      being delivered.
                    </p>
                    <Button
                      asChild
                      className="cta"
                      disabled={!catalog.settings.available}
                    >
                      <Link href={`/reserve?${configurationQuery(config)}`}>
                        Continue to reservation <ArrowRight size={17} />
                      </Link>
                    </Button>
                    <Link href="/dealers" className="text-link">
                      View active Dyntree dealers
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="config-step-bottom">
            {step > 0 && (
              <button onClick={() => go(step - 1)}>
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            {step < 7 && (
              <Button onClick={() => go(step + 1)}>
                Continue <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </aside>
      </div>
      <div className="config-pricebar">
        <div>
          <span>Estimated vehicle price</span>
          <strong>{money(quote.totalCents)}</strong>
          <small>Excludes taxes & fees</small>
          <button
            type="button"
            className="payment-plan-link"
            onClick={() => go(6)}
          >
            Explore monthly subscriptions
          </button>
        </div>
        <div className="pricebar-reservation">
          <span>
            {money(catalog.settings.amountCents)}{" "}
            {catalog.settings.refundable ? "refundable " : ""}
            reservation
          </span>
          <Button className="cta" onClick={() => go(7)}>
            Reserve your M1E <ArrowUpRight size={16} />
          </Button>
        </div>
      </div>
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogTitle>A home for your M1E.</DialogTitle>
          <DialogDescription>
            Sign in or create your Dyntree account to save this configuration to
            My Garage.
          </DialogDescription>
          <Button asChild>
            <Link
              href={`/account?returnTo=${encodeURIComponent("/configure/m1e?" + configurationQuery(config))}`}
            >
              Continue to account <ArrowUpRight size={16} />
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!shareUrl} onOpenChange={() => setShareUrl("")}>
        <DialogContent>
          <DialogTitle>Share your M1E</DialogTitle>
          <DialogDescription>
            Copy this link to open the same configuration.
          </DialogDescription>
          <input
            aria-label="Configuration share URL"
            value={shareUrl}
            readOnly
            onFocus={(e) => e.target.select()}
            className="text-input"
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
