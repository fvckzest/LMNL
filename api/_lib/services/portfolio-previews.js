import crypto from 'crypto';
import { getAdminSupabase } from '../clients.js';
import { getPortfolioPreviewConfig } from '../env.js';
import { AppError } from '../errors.js';

const DESKTOP_VIEWPORT = {
  width: 1440,
  height: 900,
};

function normalizePreviewUrl(value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    throw new AppError('Website URL is required before generating a preview.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(rawValue);
  } catch (error) {
    throw new AppError('Website URL must be a valid http or https address.', {
      code: 'INVALID_INPUT',
      status: 400,
      details: error,
      expose: true,
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new AppError('Website URL must use http or https.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  return parsedUrl.toString();
}

async function loadChromium() {
  try {
    const playwright = await import('playwright');
    return playwright.chromium;
  } catch (error) {
    throw new AppError('Playwright is not installed on the server. Add the `playwright` package and Chromium before generating previews.', {
      code: 'PLAYWRIGHT_MISSING',
      status: 500,
      details: error,
      expose: true,
    });
  }
}

function buildPreviewStoragePath(portfolioEntryId) {
  return `portfolio-previews/${portfolioEntryId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
}

export async function generatePortfolioPreview({
  portfolioEntryId,
  websiteUrl,
  title,
}) {
  const normalizedUrl = normalizePreviewUrl(websiteUrl);
  const chromium = await loadChromium();
  const { storageBucket, navigationTimeoutMs } = getPortfolioPreviewConfig();
  const supabase = getAdminSupabase();

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: DESKTOP_VIEWPORT,
      deviceScaleFactor: 1,
    });

    page.setDefaultNavigationTimeout(navigationTimeoutMs);
    page.setDefaultTimeout(navigationTimeoutMs);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const response = await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: navigationTimeoutMs,
    });

    if (!response || !response.ok()) {
      throw new AppError('The website did not return a successful response for preview generation.', {
        code: 'PREVIEW_NAVIGATION_FAILED',
        status: 502,
        details: {
          status: response?.status(),
          url: normalizedUrl,
        },
        expose: true,
      });
    }

    await page.waitForLoadState('networkidle', {
      timeout: Math.min(navigationTimeoutMs, 15000),
    }).catch(() => null);
    await page.waitForTimeout(1500);

    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 82,
      fullPage: false,
    });

    const storagePath = buildPreviewStoragePath(portfolioEntryId);
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, screenshot, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      throw new AppError('Generated the screenshot but failed to upload it to storage.', {
        code: 'PREVIEW_UPLOAD_FAILED',
        status: 500,
        details: uploadError,
        expose: true,
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(storagePath);

    const previewUrl = publicUrlData?.publicUrl || '';

    if (!previewUrl) {
      throw new AppError('Preview image uploaded, but no public URL was returned.', {
        code: 'PREVIEW_URL_MISSING',
        status: 500,
        expose: true,
      });
    }

    return {
      websiteUrl: normalizedUrl,
      previewUrl,
      storageBucket,
      storagePath,
      altText: `${title || 'Portfolio project'} website preview`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Unable to generate a website preview for this entry right now.', {
      code: 'PREVIEW_GENERATION_FAILED',
      status: 502,
      details: error,
      expose: true,
    });
  } finally {
    await browser.close().catch(() => null);
  }
}
