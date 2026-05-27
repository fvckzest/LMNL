export default function manifest() {
  return {
    name: 'LMNL',
    short_name: 'LMNL',
    description: 'LMNL Mobile Experience',
    start_url: '/',
    theme_color: '#FFFFFF',
    background_color: '#FFFFFF',
    lang: 'en',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
