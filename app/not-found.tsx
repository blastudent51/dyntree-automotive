import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <main id="main" className="page-content">
      <p className="eyebrow">404 / A DIFFERENT DIRECTION</p>
      <h1 style={{ margin: '30px 0' }}>The road ends here.</h1>
      <p>The page you’re looking for could not be found.</p>
      <Button asChild className="mt-8">
        <Link href="/">Return to Dyntree</Link>
      </Button>
    </main>
  );
}
