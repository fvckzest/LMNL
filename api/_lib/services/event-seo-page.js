import { getPublicEventPage } from './public-event-page.js';

const DEFAULT_SITE_URL = 'https://lmnl.art';
const DEFAULT_EVENT_DESCRIPTION = 'See current event details and ticket availability from LMNL.';
const DEFAULT_EVENT_IMAGE = '/seo/events-seo.png';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMetaTag(html, attribute, value) {
  const pattern = new RegExp(`<meta[^>]+${escapeRegExp(attribute)}[^>]*>`);
  return html.replace(pattern, `<meta ${attribute} content="${escapeHtml(value)}" />`);
}

function replaceLinkTag(html, rel, href) {
  const pattern = new RegExp(`<link[^>]+rel="${escapeRegExp(rel)}"[^>]*>`);
  return html.replace(pattern, `<link rel="${rel}" href="${escapeHtml(href)}" />`);
}

function toAbsoluteUrl(value, siteUrl) {
  const normalized = readString(value);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${siteUrl}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function getEventPreviewImage(event, slug) {
  const artworkUrl = readString(event.artworkUrl);
  if (artworkUrl) return artworkUrl;
  if (slug === 'shareholder-meeting') return '/seo/shareholder-meeting.png';
  if (slug === 'space') return '/seo/space-seo.png';
  return DEFAULT_EVENT_IMAGE;
}

function getEventDescription(event, slug) {
  const description = readString(event.description);
  if (description) return description;
  if (slug === 'shareholder-meeting') {
    return 'Join the LMNL network at Mad Hat Tea in Tacoma on October 3, 2026, for connection, networking, and strategic cultural deployment.';
  }
  if (slug === 'space') {
    return 'See event details and ticket availability for Space by LMNL.';
  }
  return DEFAULT_EVENT_DESCRIPTION;
}

export async function buildPublicEventSeoPage(slug, deps = {}) {
  const loadPublicEvent = deps.getPublicEventPage
    || ((eventSlug) => getPublicEventPage(eventSlug, { includeInventory: false }));
  const loadShellHtml = deps.loadShellHtml;

  if (typeof loadShellHtml !== 'function') {
    throw new Error('Event SEO shell loader is required.');
  }

  const [{ event }, shellHtml] = await Promise.all([
    loadPublicEvent(slug),
    loadShellHtml(),
  ]);
  const siteUrl = readString(deps.siteUrl).replace(/\/$/, '') || DEFAULT_SITE_URL;
  const eventSlug = readString(event.slug) || readString(slug);
  const title = readString(event.name) || 'LMNL Event';
  const description = getEventDescription(event, eventSlug);
  const imageUrl = toAbsoluteUrl(getEventPreviewImage(event, eventSlug), siteUrl);
  const canonicalUrl = `${siteUrl}/events/${encodeURIComponent(eventSlug)}`;

  let html = shellHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMetaTag(html, 'name="title"', title);
  html = replaceMetaTag(html, 'name="description"', description);
  html = replaceMetaTag(html, 'property="og:url"', canonicalUrl);
  html = replaceMetaTag(html, 'property="og:title"', title);
  html = replaceMetaTag(html, 'property="og:description"', description);
  html = replaceMetaTag(html, 'property="og:image"', imageUrl);
  html = replaceMetaTag(html, 'property="twitter:url"', canonicalUrl);
  html = replaceMetaTag(html, 'property="twitter:title"', title);
  html = replaceMetaTag(html, 'property="twitter:description"', description);
  html = replaceMetaTag(html, 'property="twitter:image"', imageUrl);
  html = replaceLinkTag(html, 'canonical', canonicalUrl);

  return html;
}
