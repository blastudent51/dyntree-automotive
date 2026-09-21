'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Expand, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Configuration, VehicleAsset } from '@/lib/types';
import { resolveVehicleImage } from '@/lib/image-resolver';
import { PrototypeNote } from './brand';
export const viewAngles = [
  ['front-3q', 'Front ¾'],
  ['rear-3q', 'Rear ¾'],
  ['side', 'Side'],
  ['interior', 'Interior'],
  ['dashboard', 'Dashboard'],
  ['seats', 'Seats'],
  ['wheels', 'Wheels'],
];
export function VehicleViewer({
  images,
  config,
  angle,
  onAngle,
}: {
  images: VehicleAsset[];
  config: Configuration;
  angle: string;
  onAngle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const startDistance = useRef(0);
  const startZoom = useRef(1);
  const touchStart = useRef(0);
  const resolved = resolveVehicleImage(images, config, angle);
  function next(dir: number) {
    onAngle(
      viewAngles[
        (viewAngles.findIndex((x) => x[0] === angle) + dir + viewAngles.length) % viewAngles.length
      ][0],
    );
    setZoom(1);
  }
  return (
    <>
      <div className="config-stage">
        <div className="config-stage-meta">
          <span>DYNTREE M1E / {config.trim.toUpperCase()}</span>
          <span>DEVELOPMENT PROTOTYPE</span>
        </div>
        <div
          className="config-car"
          onTouchStart={(e) => {
            touchStart.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (Math.abs(e.changedTouches[0].clientX - touchStart.current) > 60)
              next(e.changedTouches[0].clientX > touchStart.current ? -1 : 1);
          }}
        >
          <Image
            key={resolved.image.url}
            src={resolved.image.url}
            alt={resolved.image.alt}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 70vw"
          />
          <Button
            size="icon"
            variant="ghost"
            className="expand-image"
            aria-label="Open full-screen vehicle view"
            onClick={() => {
              setOpen(true);
              setZoom(1);
            }}
          >
            <Expand size={18} />
          </Button>
        </div>
        <div className="view-selector" aria-label="Vehicle view">
          {viewAngles.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={angle === id}
              className={angle === id ? 'selected' : ''}
              onClick={() => onAngle(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="view-notes">
          <PrototypeNote />
          {resolved.fallbackLabel && <p>{resolved.fallbackLabel}</p>}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="vehicle-lightbox"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') next(1);
            if (e.key === 'ArrowLeft') next(-1);
            if (e.key === '+' || e.key === '=') setZoom(Math.min(3, zoom + 0.25));
            if (e.key === '-') setZoom(Math.max(1, zoom - 0.25));
          }}
        >
          <DialogTitle>
            M1E {config.trim} · {viewAngles.find((x) => x[0] === angle)?.[1]}
          </DialogTitle>
          <DialogDescription>
            Prototype view. Arrow keys change angles. Pinch or use the zoom controls to enlarge.
          </DialogDescription>
          <div
            className="lightbox-image"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                startDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
                startZoom.current = zoom;
              } else touchStart.current = e.clientX;
            }}
            onPointerMove={(e) => {
              if (!pointers.current.has(e.pointerId)) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                setZoom(
                  Math.max(
                    1,
                    Math.min(
                      3,
                      (startZoom.current * Math.hypot(a.x - b.x, a.y - b.y)) /
                        startDistance.current,
                    ),
                  ),
                );
              }
            }}
            onPointerUp={(e) => {
              if (
                pointers.current.size === 1 &&
                zoom === 1 &&
                Math.abs(e.clientX - touchStart.current) > 65
              )
                next(e.clientX > touchStart.current ? -1 : 1);
              pointers.current.delete(e.pointerId);
            }}
            onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          >
            <Image
              src={resolved.image.url}
              alt={resolved.image.alt}
              fill
              sizes="95vw"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
          <div className="lightbox-controls">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous angle"
              onClick={() => next(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            >
              <Minus />
            </Button>
            <span>{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <Plus />
            </Button>
            <Button variant="outline" size="icon" aria-label="Next angle" onClick={() => next(1)}>
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
