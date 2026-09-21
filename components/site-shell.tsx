"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound, ArrowUpRight } from "lucide-react";
import { Logo } from "./brand";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
const links = [
  ["Vehicles", "/vehicles/m1e"],
  ["Charging", "/charging"],
  ["Dyntree Drive", "/drive"],
  ["Software", "/software"],
  ["Subscriptions", "/subscriptions"],
  ["Dealers", "/dealers"],
  ["Company", "/company"],
  ["Support", "/support"],
];
export function Header() {
  const path = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`site-header ${path === "/" ? "header-home" : ""}`}>
        <Logo />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, url]) => (
            <Link
              aria-current={path === url ? "page" : undefined}
              key={url}
              href={url}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            href="/account"
            aria-label="My Dyntree account"
            className="account-icon"
          >
            <UserRound size={19} />
          </Link>
          <Button asChild className="header-configure">
            <Link href="/configure/m1e">
              Configure <ArrowUpRight size={15} />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className="mobile-menu"
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="mobile-nav">
              <SheetTitle>Explore Dyntree</SheetTitle>
              {links.map(([label, url]) => (
                <SheetClose asChild key={url}>
                  <Link href={url}>
                    {label}
                    <ArrowUpRight size={18} />
                  </Link>
                </SheetClose>
              ))}
              <SheetClose asChild>
                <Link href="/account">My Dyntree</Link>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  const path = usePathname();
  if (path.startsWith("/configure")) return null;
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo />
          <p>Technology that grows.</p>
        </div>
        <div className="footer-links">
          {links.map(([label, url]) => (
            <Link key={url} href={url}>
              {label}
            </Link>
          ))}
        </div>
        <div className="footer-social">
          <span>FOLLOW OUR DEVELOPMENT</span>
          <p>YouTube · Instagram · X</p>
          <small>Social channels coming soon.</small>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Dyntree Automotive</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/reservation-agreement">Reservation Agreement</Link>
        </div>
        <span>United States · English</span>
      </div>
      <p className="footer-disclaimer">
        Development prototypes. Estimated specifications and pricing are subject
        to change. Target range is not EPA certified. Taxes, title,
        registration, destination, and other applicable fees are additional.
        Vehicles are not yet being delivered.
      </p>
    </footer>
  );
}
