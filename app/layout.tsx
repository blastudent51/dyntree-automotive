import type { Metadata } from 'next';
import Script from 'next/script';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

        {/* Dyntree Live Chat — NextivaCX */}
        <Script
          id="nextivacx-code-snippet"
          src="https://d3po7etsbw5eiv.cloudfront.net/Simplify360Chat.js?key=NmFhY2U2ZjJmY2RjMDM3MGRkNzlmYjk0fGQ5MDA1NjIyNGFmZQ=="
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
