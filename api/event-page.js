import { AppError, asAppError } from './_lib/errors.js';
import { getBaseConfig } from './_lib/env.js';
import { buildPublicEventSeoPage } from './_lib/services/event-seo-page.js';

async function loadShellHtml() {
  const { siteUrl } = getBaseConfig();
  const assetOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : siteUrl;
  const response = await fetch(`${assetOrigin.replace(/\/$/, '')}/index.html`);

  if (!response.ok) {
    throw new AppError('Event page shell is unavailable.', {
      code: 'EVENT_PAGE_SHELL_UNAVAILABLE',
      status: 502,
      expose: true,
    });
  }

  return response.text();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed.');
  }

  try {
    const { siteUrl } = getBaseConfig();
    const html = await buildPublicEventSeoPage(req.query?.slug, {
      loadShellHtml,
      siteUrl,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=0, must-revalidate');
    return res.status(200).send(html);
  } catch (error) {
    const appError = asAppError(error);
    console.error('[event-page]', appError);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(appError.status).send(appError.expose ? appError.message : 'Event page unavailable.');
  }
}
