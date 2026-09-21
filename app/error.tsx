'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="page-content">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1 style={{ margin: '30px 0' }}>A momentary detour.</h1>
      <p>
        We couldn’t load this part of Dyntree. Your saved account records have not been changed.
      </p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
