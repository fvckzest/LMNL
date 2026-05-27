/* eslint-disable react-refresh/only-export-components */

export const metadata = {
  title: 'LMNL Next.js Migration Scaffold',
  description: 'Temporary non-production shell for the LMNL Next.js migration.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
