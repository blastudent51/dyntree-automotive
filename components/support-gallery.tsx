'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowUpRight, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Catalog, VehicleAsset } from '@/lib/types';
import { supportCategories, supportArticles } from '@/lib/support-content';
export function SupportPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All topics');
  const articles = supportArticles.filter(
    (x) =>
      (category === 'All topics' || x.category === category) &&
      `${x.question} ${x.answer}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main id="main" className="page-content support-page">
      <div className="support-heading">
        <p className="eyebrow">WE&apos;RE HERE FOR THE JOURNEY</p>
        <h1>How can we help?</h1>
        <div className="support-search">
          <Search size={21} />
          <Input
            aria-label="Search Dyntree support"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reservations, charging, software…"
          />
        </div>
      </div>
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="support-categories">
          {supportCategories.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="support-results">
        <div>
          <h2>
            {query
              ? 'Search results'
              : category === 'All topics'
                ? 'A few things to know.'
                : category}
          </h2>
          <span>{articles.length} articles</span>
        </div>
        <Accordion type="single" collapsible>
          {articles.map((x) => (
            <AccordionItem key={x.question} value={x.question}>
              <AccordionTrigger>
                <span>
                  <small>{x.category}</small>
                  {x.question}
                </span>
              </AccordionTrigger>
              <AccordionContent>{x.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {!articles.length && (
          <div className="empty-state">
            <h3>No results for that search.</h3>
            <p>Try “reservation”, “phone key” or “charging”.</p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setCategory('All topics');
              }}
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
      <div className="support-account">
        <h2>Your reservation, in one place.</h2>
        <p>
          View payment history, follow status updates and manage your saved configurations in My
          Dyntree.
        </p>
        <Button asChild variant="outline">
          <Link href="/account">
            Go to My Dyntree <ArrowUpRight size={16} />
          </Link>
        </Button>
      </div>
    </main>
  );
}
const filters = [
  ['all', 'All views'],
  ['exterior', 'Exterior'],
  ['interior', 'Interior'],
  ['technology', 'Technology'],
  ['details', 'Details'],
  ['night', 'Night'],
  ['driving', 'Driving'],
  ['colors', 'Colors'],
];
export function GalleryPage({ catalog }: { catalog: Catalog }) {
  const [filter, setFilter] = useState('all');
  const [trim, setTrim] = useState('all');
  const [selected, setSelected] = useState<VehicleAsset | null>(null);
  const [zoom, setZoom] = useState(false);
  const list = catalog.images.filter(
    (x) =>
      (filter === 'all' ||
        (filter === 'colors' && x.angle === 'front-3q') ||
        filter === x.category) &&
      (trim === 'all' || x.trim === trim),
  );
  const index = selected ? list.findIndex((x) => x.url === selected.url) : -1;
  function move(n: number) {
    setSelected(list[(index + n + list.length) % list.length]);
    setZoom(false);
  }
  return (
    <main id="main" className="page-content gallery-page">
      <div className="gallery-heading">
        <div>
          <p className="eyebrow">M1E / THE PROTOTYPE COLLECTION</p>
          <h1>
            Every angle.
            <br />
            One vision.
          </h1>
        </div>
        <p>
          Explore the M1E in detail, from the signature in the lights to the space around you.
          Original development prototype imagery. Production design and specifications may change.
        </p>
      </div>
      <div className="gallery-filters">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {filters.map(([id, t]) => (
              <TabsTrigger key={id} value={id}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <select
          className="text-input"
          aria-label="Filter gallery by trim"
          value={trim}
          onChange={(e) => setTrim(e.target.value)}
        >
          <option value="all">All trims</option>
          {catalog.trims.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="gallery-grid">
        {list.map((asset, i) => (
          <button
            key={asset.url}
            className={`gallery-item ${i % 7 === 0 ? 'gallery-wide' : ''}`}
            onClick={() => {
              setSelected(asset);
              setZoom(false);
            }}
            aria-label={`Open ${asset.alt}`}
          >
            <Image
              src={asset.url}
              alt={asset.alt}
              fill
              sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 50vw"
            />
            <span>
              {asset.angle.replaceAll('-', ' ')} <Expand size={14} />
            </span>
          </button>
        ))}
      </div>
      {!list.length && (
        <div className="empty-state">
          <p>No images match these filters yet.</p>
          <Button
            onClick={() => {
              setFilter('all');
              setTrim('all');
            }}
          >
            Show all images
          </Button>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent
          className="vehicle-lightbox"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') move(-1);
            if (e.key === 'ArrowRight') move(1);
          }}
        >
          <DialogTitle>{selected?.alt}</DialogTitle>
          <DialogDescription>
            Prototype imagery shown. Use arrow keys to browse, or select the image to zoom.
          </DialogDescription>
          {selected && (
            <button
              className="lightbox-image"
              onClick={() => setZoom(!zoom)}
              aria-label={zoom ? 'Zoom out' : 'Zoom in'}
            >
              <Image
                src={selected.url}
                alt={selected.alt}
                fill
                sizes="95vw"
                style={{ transform: zoom ? 'scale(1.6)' : 'none' }}
              />
            </button>
          )}
          <div className="lightbox-controls">
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(-1)}
              aria-label="Previous image"
            >
              <ChevronLeft />
            </Button>
            <span>
              {index + 1} / {list.length}
            </span>
            <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Next image">
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
