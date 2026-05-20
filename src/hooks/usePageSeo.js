import { useEffect } from 'react';
import { matchPath } from 'react-router-dom';

export const SITE_URL = 'https://lmnl.art';
export const ADMIN_SITE_URL = 'https://admin.lmnl.art';
export const DEFAULT_SEO_IMAGE = '/seo/home-seo.png';
export const DEFAULT_SEO_TITLE = 'LMNL';
export const DEFAULT_SEO_DESCRIPTION = 'LMNL is a Tacoma, Washington art and culture platform producing events, creative services, media, design systems, and community experiences.';

function toAbsoluteUrl(value, baseUrl = SITE_URL) {
  if (!value) {
    return baseUrl;
  }

  if (/^https?:\/\//.test(value)) {
    return value;
  }

  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

function setOrCreateTag(tagName, selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement(tagName);
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      element.removeAttribute(key);
      return;
    }

    element.setAttribute(key, value);
  });
}

function buildSeoPayload(metadata = {}) {
  const baseUrl = metadata.baseUrl || SITE_URL;
  const title = metadata.title || DEFAULT_SEO_TITLE;
  const description = metadata.description || DEFAULT_SEO_DESCRIPTION;
  const canonicalUrl = toAbsoluteUrl(metadata.canonicalPath || metadata.path || window.location.pathname, baseUrl);
  const imageUrl = toAbsoluteUrl(metadata.image || DEFAULT_SEO_IMAGE, SITE_URL);
  const robots = metadata.robots || 'index, follow';

  return {
    title,
    description,
    canonicalUrl,
    imageUrl,
    robots,
  };
}

export function applyPageSeo(metadata = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const seo = buildSeoPayload(metadata);
  document.title = seo.title;

  setOrCreateTag('meta', 'meta[name="title"]', { name: 'title', content: seo.title });
  setOrCreateTag('meta', 'meta[name="description"]', { name: 'description', content: seo.description });
  setOrCreateTag('meta', 'meta[name="robots"]', { name: 'robots', content: seo.robots });

  setOrCreateTag('meta', 'meta[property="og:type"]', { property: 'og:type', content: 'website' });
  setOrCreateTag('meta', 'meta[property="og:site_name"]', { property: 'og:site_name', content: 'LMNL' });
  setOrCreateTag('meta', 'meta[property="og:url"]', { property: 'og:url', content: seo.canonicalUrl });
  setOrCreateTag('meta', 'meta[property="og:title"]', { property: 'og:title', content: seo.title });
  setOrCreateTag('meta', 'meta[property="og:description"]', { property: 'og:description', content: seo.description });
  setOrCreateTag('meta', 'meta[property="og:image"]', { property: 'og:image', content: seo.imageUrl });

  setOrCreateTag('meta', 'meta[property="twitter:card"]', { property: 'twitter:card', content: 'summary_large_image' });
  setOrCreateTag('meta', 'meta[property="twitter:url"]', { property: 'twitter:url', content: seo.canonicalUrl });
  setOrCreateTag('meta', 'meta[property="twitter:title"]', { property: 'twitter:title', content: seo.title });
  setOrCreateTag('meta', 'meta[property="twitter:description"]', { property: 'twitter:description', content: seo.description });
  setOrCreateTag('meta', 'meta[property="twitter:image"]', { property: 'twitter:image', content: seo.imageUrl });

  setOrCreateTag('link', 'link[rel="canonical"]', { rel: 'canonical', href: seo.canonicalUrl });
}

export function usePageSeo(metadata = {}) {
  const baseUrl = metadata.baseUrl;
  const {
    canonicalPath,
    description,
    image,
    path,
    robots,
    title,
  } = metadata;

  useEffect(() => {
    applyPageSeo({
      canonicalPath,
      description,
      image,
      path,
      baseUrl,
      robots,
      title,
    });
  }, [baseUrl, canonicalPath, description, image, path, robots, title]);
}

const routeSeo = [
  {
    pattern: '/',
    metadata: {
      title: DEFAULT_SEO_TITLE,
      description: DEFAULT_SEO_DESCRIPTION,
      image: '/seo/home-seo.png',
    },
  },
  {
    pattern: '/events',
    metadata: {
      title: 'LMNL | EVENTS',
      description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
      image: '/seo/events-seo.png',
    },
  },
  {
    pattern: '/space',
    metadata: {
      title: 'LMNL | SPACE',
      description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
      image: '/seo/space-seo.png',
    },
  },
  {
    pattern: '/about',
    metadata: {
      title: 'LMNL | ABOUT',
      description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
      image: '/seo/about-seo.png',
    },
  },
  {
    pattern: '/services',
    metadata: {
      title: 'LMNL | SERVICES',
      description: 'See LMNL creative services, consulting, production, and digital systems work.',
      image: '/seo/services-seo.png',
    },
  },
  {
    pattern: '/portfolio',
    metadata: {
      title: 'LMNL | PORTFOLIO',
      description: 'View selected LMNL creative work, visual experiments, and client projects.',
      image: '/seo/services-seo.png',
    },
  },
  {
    pattern: '/community',
    metadata: {
      title: 'LMNL | COMMUNITY',
      description: 'Join the LMNL community network and stay connected to future drops and events.',
      image: '/seo/community-seo.png',
    },
  },
  {
    pattern: '/community/share',
    metadata: {
      title: 'LMNL | COMMUNITY SHARE',
      description: 'Share your work with the LMNL community.',
      image: '/seo/community-seo.png',
    },
  },
  {
    pattern: '/share-your-work',
    metadata: {
      title: 'LMNL | COMMUNITY SHARE',
      description: 'Share your work with the LMNL community.',
      image: '/seo/community-seo.png',
      canonicalPath: '/community/share',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/shop',
    metadata: {
      title: 'LMNL | SHOP',
      description: 'Browse LMNL products, editions, and artifacts.',
      image: '/seo/shop-seo.png',
    },
  },
  {
    pattern: '/blog',
    metadata: {
      title: 'LMNL | BLOG',
      description: 'Read LMNL updates, essays, announcements, and stories.',
      image: '/seo/blog-seo.png',
    },
  },
  {
    pattern: '/blog/:slug',
    metadata: {
      title: 'LMNL | BLOG',
      description: 'Read LMNL updates, essays, announcements, and stories.',
      image: '/seo/blog-seo.png',
    },
  },
  {
    pattern: '/contact',
    metadata: {
      title: 'LMNL | CONTACT',
      description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
      image: '/seo/contact-seo.png',
    },
  },
  {
    pattern: '/prsm',
    metadata: {
      title: 'LMNL | PRSM',
      description: 'Explore PRSM by LMNL.',
      image: '/seo/prsm-seo.png',
    },
  },
  {
    pattern: '/ticket/:ticketId',
    metadata: {
      title: 'LMNL | TICKET',
      description: 'Secure LMNL event ticket access.',
      image: '/seo/events-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/success',
    metadata: {
      title: 'LMNL | ORDER CONFIRMATION',
      description: 'Order confirmation and ticket delivery status.',
      image: '/seo/events-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/login',
    metadata: {
      title: 'LMNL | ADMIN LOGIN',
      description: 'Secure admin access for LMNL operations and publishing tools.',
      image: '/seo/home-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/home',
    metadata: {
      title: DEFAULT_SEO_TITLE,
      description: DEFAULT_SEO_DESCRIPTION,
      image: '/seo/home-seo.png',
      canonicalPath: '/',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/app',
    metadata: {
      title: 'LMNL | APP',
      description: 'Access the LMNL community app and member tools.',
      image: '/seo/community-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/app/login',
    metadata: {
      title: 'LMNL | APP LOGIN',
      description: 'Sign in to the LMNL community app.',
      image: '/seo/community-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/app/onboarding',
    metadata: {
      title: 'LMNL | APP ONBOARDING',
      description: 'Set up your LMNL community profile.',
      image: '/seo/community-seo.png',
      robots: 'noindex, nofollow',
    },
  },
  {
    pattern: '/auth/callback',
    metadata: {
      title: 'LMNL | AUTH',
      description: 'Authentication callback for LMNL account access.',
      image: '/seo/home-seo.png',
      robots: 'noindex, nofollow',
    },
  },
];

export function getRouteSeo(pathname, hostname = '') {
  const isAdminHost = hostname.startsWith('admin.');

  if (isAdminHost) {
    if (pathname === '/' || pathname === '/login') {
      return {
        title: pathname === '/login' ? 'LMNL | ADMIN LOGIN' : 'LMNL | ADMIN',
        description: 'Private LMNL admin interface.',
        image: '/seo/home-seo.png',
        path: pathname,
        baseUrl: ADMIN_SITE_URL,
        robots: 'noindex, nofollow',
      };
    }

    if (matchPath({ path: '/check-in/:token', end: true }, pathname)) {
      return {
        title: 'LMNL | CHECK-IN',
        description: 'Private LMNL check-in interface.',
        image: '/seo/events-seo.png',
        path: pathname,
        baseUrl: ADMIN_SITE_URL,
        robots: 'noindex, nofollow',
      };
    }
  }

  const match = routeSeo.find((entry) => matchPath({ path: entry.pattern, end: true }, pathname));

  if (match) {
    return {
      ...match.metadata,
      path: pathname,
    };
  }

  if (pathname.startsWith('/community/u/')) {
    return {
      title: 'LMNL | COMMUNITY PROFILE',
      description: 'View a member profile in the LMNL community.',
      image: '/seo/community-seo.png',
      path: pathname,
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    image: DEFAULT_SEO_IMAGE,
    path: pathname,
  };
}

export function buildTextDescription(value, fallback = DEFAULT_SEO_DESCRIPTION, maxLength = 160) {
  if (!value) {
    return fallback;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
