import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShellHtml } from '../api/event-page.js';
import { buildPublicEventSeoPage } from '../api/_lib/services/event-seo-page.js';

const shellHtml = `<!doctype html>
<html>
<head>
  <title>LMNL</title>
  <meta name="title" content="LMNL" />
  <meta name="description" content="Default description" />
  <link rel="canonical" href="https://lmnl.art/" />
  <meta property="og:url" content="https://lmnl.art/" />
  <meta property="og:title" content="LMNL" />
  <meta property="og:description" content="Default description" />
  <meta property="og:image" content="https://lmnl.art/seo/home-seo.png" />
  <meta property="twitter:url" content="https://lmnl.art/" />
  <meta property="twitter:title" content="LMNL" />
  <meta property="twitter:description" content="Default description" />
  <meta property="twitter:image" content="https://lmnl.art/seo/home-seo.png" />
</head>
</html>`;

test('loadShellHtml uses the public site shell instead of the protected deployment URL', async () => {
  const previousVercelUrl = process.env.VERCEL_URL;
  process.env.VERCEL_URL = 'lmnl-protected-preview.vercel.app';
  const requestedUrls = [];

  try {
    const html = await loadShellHtml({
      siteUrl: 'https://lmnl.art',
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return {
          ok: true,
          text: async () => '<!doctype html><div id="root"></div>',
        };
      },
    });

    assert.equal(html, '<!doctype html><div id="root"></div>');
    assert.deepEqual(requestedUrls, ['https://lmnl.art/index.html']);
  } finally {
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousVercelUrl;
  }
});

test('loadShellHtml rejects a successful response that is not the LMNL app shell', async () => {
  await assert.rejects(
    () => loadShellHtml({
      siteUrl: 'https://lmnl.art',
      fetchImpl: async () => ({
        ok: true,
        text: async () => '<!doctype html><title>Log in to Vercel</title>',
      }),
    }),
    (error) => error?.code === 'EVENT_PAGE_SHELL_INVALID',
  );
});

test('buildPublicEventSeoPage renders the current event title as the complete link-preview title', async () => {
  const html = await buildPublicEventSeoPage('shareholder-meeting', {
    loadShellHtml: async () => shellHtml,
    getPublicEventPage: async () => ({
      event: {
        slug: 'shareholder-meeting',
        name: 'Shareholder Assembly',
        description: 'The current event description.',
        artworkUrl: '/seo/shareholder-current.png',
      },
    }),
  });

  assert.match(html, /<title>Shareholder Assembly<\/title>/);
  assert.match(html, /<meta name="title" content="Shareholder Assembly" \/>/);
  assert.match(html, /<meta property="og:title" content="Shareholder Assembly" \/>/);
  assert.match(html, /<meta property="twitter:title" content="Shareholder Assembly" \/>/);
  assert.doesNotMatch(html, /LMNL \| Shareholder Assembly/);
  assert.match(html, /<meta property="og:description" content="The current event description\." \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/lmnl\.art\/seo\/shareholder-current\.png" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/lmnl\.art\/events\/shareholder-meeting" \/>/);
});

test('buildPublicEventSeoPage reflects an event title change without changing route code', async () => {
  let currentTitle = 'First Published Title';
  const deps = {
    loadShellHtml: async () => shellHtml,
    getPublicEventPage: async () => ({
      event: {
        slug: 'future-event',
        name: currentTitle,
        description: '',
        artworkUrl: '',
      },
    }),
  };

  const firstHtml = await buildPublicEventSeoPage('future-event', deps);
  currentTitle = 'Renamed Event';
  const renamedHtml = await buildPublicEventSeoPage('future-event', deps);

  assert.match(firstHtml, /<meta property="og:title" content="First Published Title" \/>/);
  assert.match(renamedHtml, /<meta property="og:title" content="Renamed Event" \/>/);
});

test('buildPublicEventSeoPage preserves the shareholder preview image when the event has no artwork', async () => {
  const html = await buildPublicEventSeoPage('shareholder-meeting', {
    loadShellHtml: async () => shellHtml,
    getPublicEventPage: async () => ({
      event: {
        slug: 'shareholder-meeting',
        name: 'SHAREHOLDER MEETING',
        description: '',
        artworkUrl: '',
      },
    }),
  });

  assert.match(html, /<meta property="og:image" content="https:\/\/lmnl\.art\/seo\/shareholder-meeting\.png" \/>/);
  assert.match(html, /<meta property="og:description" content="Join the LMNL network at Mad Hat Tea in Tacoma on October 3, 2026, for connection, networking, and strategic cultural deployment\." \/>/);
});

test('buildPublicEventSeoPage escapes event content before inserting it into HTML', async () => {
  const html = await buildPublicEventSeoPage('safe-event', {
    loadShellHtml: async () => shellHtml,
    getPublicEventPage: async () => ({
      event: {
        slug: 'safe-event',
        name: 'Art & <script>alert("x")</script>',
        description: 'A "quoted" & current description.',
        artworkUrl: '',
      },
    }),
  });

  assert.match(html, /<title>Art &amp; &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;<\/title>/);
  assert.match(html, /content="A &quot;quoted&quot; &amp; current description\."/);
  assert.doesNotMatch(html, /<script>alert/);
});
