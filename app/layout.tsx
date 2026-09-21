import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/sonner';
import { Header, Footer } from '@/components/site-shell';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {
    default: 'Dyntree Automotive | Technology that grows.',
    template: '%s | Dyntree Automotive',
  },
  description:
    'Discover the Dyntree M1E, an original all-electric 2+2 coupe development prototype. Explore four trims, configure your M1E and follow its development.',
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <>
      <Header />
      {children}
      <Footer />
      <Toaster theme="dark" position="bottom-right" richColors />
    </>
  );
  return (
    <html lang="en" className="dark">
      <body>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
