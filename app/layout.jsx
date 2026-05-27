import '../src/styles/theme.css';
import '../src/index.css';
import '../src/components/ContentPageShell.css';
import '../src/components/TerminalShell.css';
import '../src/styles/community-app.css';
import '../src/pages/Events.css';
import '../src/pages/Blog.css';
import '../src/pages/Community.css';
import '../src/pages/ArtistInterest.css';
import '../src/pages/Contact.css';
import '../src/pages/Services.css';
import '../src/pages/Space.css';
import '../src/pages/Intake.css';
import '../src/pages/Success.css';
import '../src/pages/Shop.css';
import '../src/pages/Ticket.css';
import '../src/pages/Portfolio.css';
import '../src/pages/AppOnboarding.css';
import '../src/pages/UserDashboard.css';
import '../src/pages/Login.css';
import '../src/pages/Admin.css';
import '../src/pages/CheckIn.css';
import '../src/pages/EmailLab.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DEFAULT_SEO, SITE_URL, buildSiteJsonLd } from './_seo/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'LMNL',
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/pwa-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon-48x48.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }) {
  const siteJsonLd = buildSiteJsonLd();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd),
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
