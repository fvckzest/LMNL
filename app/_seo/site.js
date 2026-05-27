export const SITE_URL = 'https://lmnl.art';

export const DEFAULT_SEO = {
  title: 'LMNL',
  description: 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.',
  image: '/seo/home-seo.png',
};

export const seoRoutes = [
  {
    path: '',
    title: 'LMNL',
    description: DEFAULT_SEO.description,
    image: '/seo/home-seo.png',
    changeFrequency: 'weekly',
    priority: 1.0,
    indexable: true,
  },
  {
    path: 'login',
    title: 'LMNL | ADMIN LOGIN',
    description: 'Secure admin access for LMNL operations and publishing tools.',
    image: '/seo/home-seo.png',
    changeFrequency: 'monthly',
    priority: 0.2,
    indexable: false,
  },
  {
    path: 'home',
    title: 'LMNL',
    description: DEFAULT_SEO.description,
    image: '/seo/home-seo.png',
    changeFrequency: 'weekly',
    priority: 0.9,
    indexable: false,
    canonicalPath: '/',
  },
  {
    path: 'events',
    title: 'LMNL | EVENTS',
    description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
    image: '/seo/events-seo.png',
    changeFrequency: 'daily',
    priority: 0.9,
    indexable: true,
  },
  {
    path: 'services',
    title: 'LMNL | SERVICES',
    description: 'See LMNL creative services, consulting, production, and digital systems work.',
    image: '/seo/services-seo.png',
    changeFrequency: 'monthly',
    priority: 0.8,
    indexable: true,
  },
  {
    path: 'portfolio',
    title: 'LMNL | PORTFOLIO',
    description: 'View selected LMNL creative work, visual experiments, and client projects.',
    image: '/seo/services-seo.png',
    changeFrequency: 'monthly',
    priority: 0.7,
    indexable: true,
  },
  {
    path: 'community',
    title: 'LMNL | COMMUNITY',
    description: 'Join the LMNL community network and stay connected to future drops and events.',
    image: '/seo/community-seo.png',
    changeFrequency: 'weekly',
    priority: 0.8,
    indexable: true,
  },
  {
    path: 'community/share',
    title: 'LMNL | COMMUNITY SHARE',
    description: 'Share your work with the LMNL community.',
    image: '/seo/community-seo.png',
    changeFrequency: 'monthly',
    priority: 0.5,
    indexable: true,
  },
  {
    path: 'share-your-work',
    title: 'LMNL | COMMUNITY SHARE',
    description: 'Share your work with the LMNL community.',
    image: '/seo/community-seo.png',
    changeFrequency: 'monthly',
    priority: 0.5,
    indexable: false,
    canonicalPath: '/community/share',
  },
  {
    path: 'app',
    title: 'LMNL | APP',
    description: 'Access the LMNL community app and member tools.',
    image: '/seo/community-seo.png',
    changeFrequency: 'weekly',
    priority: 0.4,
    indexable: false,
  },
  {
    path: 'app/login',
    title: 'LMNL | APP LOGIN',
    description: 'Sign in to the LMNL community app.',
    image: '/seo/community-seo.png',
    changeFrequency: 'monthly',
    priority: 0.3,
    indexable: false,
  },
  {
    path: 'app/onboarding',
    title: 'LMNL | APP ONBOARDING',
    description: 'Set up your LMNL community profile.',
    image: '/seo/community-seo.png',
    changeFrequency: 'monthly',
    priority: 0.2,
    indexable: false,
  },
  {
    path: 'auth/callback',
    title: 'LMNL | AUTH',
    description: 'Authentication callback for LMNL account access.',
    image: '/seo/home-seo.png',
    changeFrequency: 'yearly',
    priority: 0.1,
    indexable: false,
  },
  {
    path: 'shop',
    title: 'LMNL | SHOP',
    description: 'Browse LMNL products, editions, and artifacts.',
    image: '/seo/shop-seo.png',
    changeFrequency: 'weekly',
    priority: 0.8,
    indexable: true,
  },
  {
    path: 'success',
    title: 'LMNL | ORDER CONFIRMATION',
    description: 'Order confirmation and ticket delivery status.',
    image: '/seo/events-seo.png',
    changeFrequency: 'monthly',
    priority: 0.1,
    indexable: false,
  },
  {
    path: 'about',
    title: 'LMNL | ABOUT',
    description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
    image: '/seo/about-seo.png',
    changeFrequency: 'monthly',
    priority: 0.7,
    indexable: true,
  },
  {
    path: 'blog',
    title: 'LMNL | BLOG',
    description: 'Read LMNL updates, essays, announcements, and stories.',
    image: '/seo/blog-seo.png',
    changeFrequency: 'weekly',
    priority: 0.7,
    indexable: true,
  },
  {
    path: 'contact',
    title: 'LMNL | CONTACT',
    description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
    image: '/seo/contact-seo.png',
    changeFrequency: 'monthly',
    priority: 0.7,
    indexable: true,
  },
  {
    path: 'intake',
    title: 'LMNL | WEBSITE INTAKE',
    description: 'Submit a website project intake for LMNL.',
    image: '/seo/services-seo.png',
    changeFrequency: 'yearly',
    priority: 0.1,
    indexable: false,
  },
  {
    path: 'prsm',
    title: 'LMNL | PRSM',
    description: 'Explore PRSM by LMNL.',
    image: '/seo/prsm-seo.png',
    changeFrequency: 'monthly',
    priority: 0.6,
    indexable: true,
  },
  {
    path: 'events/space',
    title: 'LMNL | SPACE',
    description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
    image: '/seo/space-seo.png',
    changeFrequency: 'weekly',
    priority: 0.8,
    indexable: true,
  },
];

export const sitemapRoutes = seoRoutes.filter((route) => route.indexable);

export function toAbsoluteUrl(path = '') {
  if (!path) {
    return `${SITE_URL}/`;
  }

  return `${SITE_URL}/${path.replace(/^\/+/, '')}`;
}

export function getSeoRoute(path = '') {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  return seoRoutes.find((route) => route.path === normalizedPath) || null;
}

export function buildWebPageJsonLd(route) {
  const canonicalUrl = toAbsoluteUrl(route.canonicalPath || route.path);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: route.title,
    description: route.description,
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
  };
}

export function buildSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'LMNL',
        alternateName: [
          'LMNL Art',
          'LMNL Tacoma',
        ],
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/pwa-512x512.png`,
        image: `${SITE_URL}/pwa-512x512.png`,
        description: DEFAULT_SEO.description,
        email: 'hi@lmnl.art',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Tacoma',
          addressRegion: 'WA',
          addressCountry: 'US',
        },
        areaServed: [
          {
            '@type': 'City',
            name: 'Tacoma',
          },
          {
            '@type': 'State',
            name: 'Washington',
          },
          {
            '@type': 'Country',
            name: 'United States',
          },
        ],
        sameAs: [
          'https://instagram.com/lmnlart',
          'https://x.com/lmnlart',
          'https://discord.gg/hYYfTtyJzK',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'LMNL',
        description: 'Tacoma art, events, creative services, and community experiences by LMNL.',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
      },
    ],
  };
}
