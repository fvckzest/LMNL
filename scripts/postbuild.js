import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

// These are the routes defined in App.jsx
const routes = [
  { path: 'events', title: 'LMNL | EVENTS', image: '/seo/events-seo.png' },
  { path: 'services', title: 'LMNL | SERVICES', image: '/seo/services-seo.png' },
  { path: 'community', title: 'LMNL | COMMUNITY', image: '/seo/community-seo.png' },
  { path: 'shop', title: 'LMNL | SHOP', image: '/seo/shop-seo.png' },
  { path: 'about', title: 'LMNL | ABOUT', image: '/seo/about-seo.png' },
  { path: 'blog', title: 'LMNL | BLOG', image: '/seo/blog-seo.png' },
  { path: 'contact', title: 'LMNL | CONTACT', image: '/seo/contact-seo.png' },
  { path: 'prsm', title: 'LMNL | PRSM', image: '/seo/prsm-seo.png' },
  { path: 'space', title: 'LMNL | SPACE', image: '/seo/space-seo.png' },
  { path: '*', title: 'LMNL | SPACE', image: '/seo/space-seo.png' },
];

async function generateSeoPages() {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('index.html not found in dist. Make sure to run this after vite build.');
    return;
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  for (const route of routes) {
    const routeDir = path.join(distDir, route.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }

    // Replace the meta tags for the specific route
    let modifiedHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
      .replace(/<meta name="title" content=".*?" \/>/, `<meta name="title" content="${route.title}" />`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${route.title}" />`)
      .replace(/<meta property="twitter:title" content=".*?" \/>/, `<meta property="twitter:title" content="${route.title}" />`)
      .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="https://www.lmnl.art${route.image}" />`)
      .replace(/<meta property="twitter:image" content=".*?" \/>/, `<meta property="twitter:image" content="https://www.lmnl.art${route.image}" />`);

    fs.writeFileSync(path.join(routeDir, 'index.html'), modifiedHtml);
    console.log(`Generated SEO HTML for /${route.path}`);
  }
}

generateSeoPages();
