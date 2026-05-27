import { sitemapRoutes, toAbsoluteUrl } from './_seo/site';

export default function sitemap() {
  return sitemapRoutes.map((route) => ({
    url: toAbsoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
