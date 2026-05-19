import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const siteUrl = 'https://lmnl.art';

// Static entry points for client-side routes that should survive direct hits
// on Vercel without relying on a catch-all SPA rewrite.
const routes = [
  {
    path: '',
    title: 'LMNL',
    description: 'LMNL is an art and culture platform for events, creative services, digital tools, and community experiences.',
    image: '/seo/home-seo.png',
    changefreq: 'weekly',
    priority: '1.0',
    indexable: true,
  },
  {
    path: 'login',
    title: 'LMNL | Admin Login',
    description: 'Secure admin access for LMNL operations and publishing tools.',
    image: '/seo/home-seo.png',
    changefreq: 'monthly',
    priority: '0.2',
    indexable: false,
  },
  {
    path: 'home',
    title: 'LMNL | Home',
    description: 'Explore LMNL events, services, shop releases, and community experiences.',
    image: '/seo/home-seo.png',
    changefreq: 'weekly',
    priority: '0.9',
    indexable: false,
  },
  {
    path: 'events',
    title: 'LMNL | Events',
    description: 'Browse upcoming LMNL programs, live experiences, and cultural events.',
    image: '/seo/events-seo.png',
    changefreq: 'daily',
    priority: '0.9',
    indexable: true,
  },
  {
    path: 'services',
    title: 'LMNL | Services',
    description: 'See LMNL creative services, consulting, production, and digital systems work.',
    image: '/seo/services-seo.png',
    changefreq: 'monthly',
    priority: '0.8',
    indexable: true,
  },
  {
    path: 'portfolio',
    title: 'LMNL | Portfolio',
    description: 'View selected LMNL creative work, visual experiments, and client projects.',
    image: '/seo/services-seo.png',
    changefreq: 'monthly',
    priority: '0.7',
    indexable: true,
  },
  {
    path: 'community',
    title: 'LMNL | Community',
    description: 'Join the LMNL community network and stay connected to future drops and events.',
    image: '/seo/community-seo.png',
    changefreq: 'weekly',
    priority: '0.8',
    indexable: true,
  },
  {
    path: 'community/share',
    title: 'LMNL | Community Share',
    description: 'Share your work with the LMNL community.',
    image: '/seo/community-seo.png',
    changefreq: 'monthly',
    priority: '0.5',
    indexable: true,
  },
  {
    path: 'share-your-work',
    title: 'LMNL | Community Share',
    description: 'Share your work with the LMNL community.',
    image: '/seo/community-seo.png',
    changefreq: 'monthly',
    priority: '0.5',
    indexable: false,
    canonicalPath: '/community/share',
  },
  {
    path: 'app',
    title: 'LMNL | App',
    description: 'Access the LMNL community app and member tools.',
    image: '/seo/community-seo.png',
    changefreq: 'weekly',
    priority: '0.4',
    indexable: false,
  },
  {
    path: 'app/login',
    title: 'LMNL | App Login',
    description: 'Sign in to the LMNL community app.',
    image: '/seo/community-seo.png',
    changefreq: 'monthly',
    priority: '0.3',
    indexable: false,
  },
  {
    path: 'app/onboarding',
    title: 'LMNL | App Onboarding',
    description: 'Set up your LMNL community profile.',
    image: '/seo/community-seo.png',
    changefreq: 'monthly',
    priority: '0.2',
    indexable: false,
  },
  {
    path: 'auth/callback',
    title: 'LMNL | Auth',
    description: 'Authentication callback for LMNL account access.',
    image: '/seo/home-seo.png',
    changefreq: 'yearly',
    priority: '0.1',
    indexable: false,
  },
  {
    path: 'shop',
    title: 'LMNL | Shop',
    description: 'Browse LMNL products, editions, and artifacts.',
    image: '/seo/shop-seo.png',
    changefreq: 'weekly',
    priority: '0.8',
    indexable: true,
  },
  {
    path: 'about',
    title: 'LMNL | About',
    description: 'Learn about LMNL and the vision behind its art, events, and creative systems.',
    image: '/seo/about-seo.png',
    changefreq: 'monthly',
    priority: '0.7',
    indexable: true,
  },
  {
    path: 'blog',
    title: 'LMNL | Blog',
    description: 'Read LMNL updates, essays, announcements, and stories.',
    image: '/seo/blog-seo.png',
    changefreq: 'weekly',
    priority: '0.7',
    indexable: true,
  },
  {
    path: 'contact',
    title: 'LMNL | Contact',
    description: 'Get in touch with LMNL for collaborations, services, and general inquiries.',
    image: '/seo/contact-seo.png',
    changefreq: 'monthly',
    priority: '0.7',
    indexable: true,
  },
  {
    path: 'prsm',
    title: 'LMNL | PRSM',
    description: 'Explore PRSM by LMNL.',
    image: '/seo/prsm-seo.png',
    changefreq: 'monthly',
    priority: '0.6',
    indexable: true,
  },
  {
    path: 'space',
    title: 'LMNL | Space',
    description: 'Discover LMNL Space, upcoming gatherings, and creative activations.',
    image: '/seo/space-seo.png',
    changefreq: 'weekly',
    priority: '0.8',
    indexable: true,
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMetaTag(html, tagStart, replacement) {
  const pattern = new RegExp(`<meta[^>]+${escapeRegExp(tagStart)}[^>]*>`);
  return html.replace(pattern, replacement);
}

function replaceLinkTag(html, relValue, replacement) {
  const pattern = new RegExp(`<link[^>]+rel="${escapeRegExp(relValue)}"[^>]*>`);
  return html.replace(pattern, replacement);
}

async function generateSeoPages() {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('index.html not found in dist. Make sure to run this after vite build.');
    return;
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const sitemapEntries = [];

  for (const route of routes) {
    const routePath = route.path ? `/${route.path}` : '/';
    const routeUrl = `${siteUrl}${routePath}`;
    const canonicalUrl = route.canonicalPath ? `${siteUrl}${route.canonicalPath}` : routeUrl;
    const routeDir = path.join(distDir, route.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }

    // Replace the meta tags for the specific route
    let modifiedHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "${siteUrl}/#organization",
          "name": "LMNL",
          "url": "${siteUrl}/",
          "logo": "${siteUrl}/lmnl-logo-black.png",
          "email": "hi@lmnl.art",
          "sameAs": [
            "https://instagram.com/lmnlart",
            "https://x.com/lmnlart",
            "https://discord.gg/hYYfTtyJzK"
          ]
        },
        {
          "@type": "WebPage",
          "@id": "${canonicalUrl}#webpage",
          "url": "${canonicalUrl}",
          "name": "${route.title}",
          "description": "${route.description}",
          "isPartOf": {
            "@id": "${siteUrl}/#website"
          }
        },
        {
          "@type": "WebSite",
          "@id": "${siteUrl}/#website",
          "url": "${siteUrl}/",
          "name": "LMNL",
          "publisher": {
            "@id": "${siteUrl}/#organization"
          }
        }
      ]
    }
  </script>`);

    modifiedHtml = replaceMetaTag(modifiedHtml, 'name="title"', `<meta name="title" content="${route.title}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'name="description"', `<meta name="description" content="${route.description}" />`);
    modifiedHtml = replaceMetaTag(
      modifiedHtml,
      'name="robots"',
      `<meta name="robots" content="${route.indexable ? 'index, follow' : 'noindex, nofollow'}" />`,
    );
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="og:url"', `<meta property="og:url" content="${canonicalUrl}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="og:title"', `<meta property="og:title" content="${route.title}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="og:description"', `<meta property="og:description" content="${route.description}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="og:image"', `<meta property="og:image" content="${siteUrl}${route.image}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="twitter:url"', `<meta property="twitter:url" content="${canonicalUrl}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="twitter:title"', `<meta property="twitter:title" content="${route.title}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="twitter:description"', `<meta property="twitter:description" content="${route.description}" />`);
    modifiedHtml = replaceMetaTag(modifiedHtml, 'property="twitter:image"', `<meta property="twitter:image" content="${siteUrl}${route.image}" />`);
    modifiedHtml = replaceLinkTag(modifiedHtml, 'canonical', `<link rel="canonical" href="${canonicalUrl}" />`);

    fs.writeFileSync(path.join(routeDir, 'index.html'), modifiedHtml);
    if (route.indexable) {
      sitemapEntries.push(`  <url>
    <loc>${routeUrl}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
    }
    console.log(`Generated SEO HTML for ${routePath}`);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  console.log('Generated sitemap.xml');
}

generateSeoPages();
