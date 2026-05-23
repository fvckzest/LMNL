import { apiGet } from './api';
import { fetchPublicRows, hasPublicDataCredentials } from './publicData';
import { createExpiringPromiseCache } from './expiringPromiseCache';
import { PRIMARY_SERVICES } from './serviceCatalog';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PORTFOLIO_CAPABILITY_ACCENTS = {
  all: '#7b52d6',
  design: '#7b52d6',
  strategy: '#7b52d6',
  media: '#7b52d6',
  digital: '#7b52d6',
};

const PORTFOLIO_CACHE_TTL_MS = 60 * 1000;
const portfolioCache = createExpiringPromiseCache({
  ttlMs: PORTFOLIO_CACHE_TTL_MS,
});

const PORTFOLIO_SELECT = [
  'id',
  'title',
  'slug',
  'year',
  'client_name',
  'project_type',
  'website_url',
  'summary',
  'result',
  'capabilities',
  'outputs',
  'focus_areas',
  'featured',
  'sort_order',
  'status',
  'created_at',
  'portfolio_media(id,media_type,asset_role,url,alt_text,caption,sort_order,is_cover,created_at)',
].join(',');

export const PORTFOLIO_CAPABILITIES = [
  {
    id: 'all',
    label: 'ALL',
    accent: PORTFOLIO_CAPABILITY_ACCENTS.all,
    description: 'A full view of LMNL portfolio entries across every capability.',
    output: 'FULL PORTFOLIO INDEX',
    offerings: PRIMARY_SERVICES.map((service) => service.title),
  },
  ...PRIMARY_SERVICES.map((service) => ({
    id: service.id,
    index: service.index,
    label: service.title,
    accent: PORTFOLIO_CAPABILITY_ACCENTS[service.id] || PORTFOLIO_CAPABILITY_ACCENTS.all,
    description: service.description,
    output: service.output,
    offerings: service.details.map((detail) => detail.label),
  })),
];

const PORTFOLIO_CAPABILITY_ALIAS_MAP = new Map(
  PORTFOLIO_CAPABILITIES.flatMap((capability) => {
    const aliases = [capability.id, capability.label];
    return aliases.map((alias) => [slugify(alias), capability.id]);
  }),
);

export function getCapabilityLabel(capabilityId) {
  return (
    PORTFOLIO_CAPABILITIES.find((item) => item.id === capabilityId)?.label ||
    String(capabilityId || '').toUpperCase()
  );
}

export function getCapabilityMeta(capabilityId) {
  return PORTFOLIO_CAPABILITIES.find((item) => item.id === capabilityId) || PORTFOLIO_CAPABILITIES[0];
}

export function getFocusSlug(focusLabel) {
  return slugify(focusLabel);
}

export function buildPortfolioPath({ capabilityId, focusLabel } = {}) {
  const params = new URLSearchParams();

  if (capabilityId && capabilityId !== 'all') {
    params.set('capability', capabilityId);
  }

  if (focusLabel) {
    params.set('focus', getFocusSlug(focusLabel));
  }

  const query = params.toString();
  return query ? `/portfolio?${query}` : '/portfolio';
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function normalizePortfolioCapabilities(values) {
  return normalizeStringList(values)
    .map((value) => PORTFOLIO_CAPABILITY_ALIAS_MAP.get(slugify(value)) || slugify(value))
    .filter(Boolean);
}

function normalizePortfolioMedia(media) {
  if (!Array.isArray(media)) {
    return [];
  }

  return [...media]
    .map((item, index) => ({
      id: item?.id || `media-${index}`,
      type: String(item?.media_type || 'image').trim().toLowerCase() || 'image',
      assetRole: String(item?.asset_role || 'gallery').trim().toLowerCase() || 'gallery',
      url: String(item?.url || '').trim(),
      alt: String(item?.alt_text || '').trim(),
      caption: String(item?.caption || '').trim(),
      sortOrder: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
      isCover: item?.is_cover === true,
      createdAt: item?.created_at || '',
    }))
    .filter((item) => item.url)
    .sort((a, b) => {
      if (a.isCover !== b.isCover) {
        return a.isCover ? -1 : 1;
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
}

export function normalizePortfolioEntry(entry) {
  const media = normalizePortfolioMedia(entry?.portfolio_media);
  const coverImage = media.find((item) => item.isCover) || media[0] || null;

  return {
    id: entry?.id || '',
    slug: entry?.slug || '',
    title: entry?.title || 'Untitled project',
    year: entry?.year ? String(entry.year) : '',
    client: entry?.client_name || '',
    format: entry?.project_type || '',
    websiteUrl: entry?.website_url || '',
    summary: entry?.summary || '',
    result: entry?.result || '',
    capabilities: normalizePortfolioCapabilities(entry?.capabilities),
    outputs: normalizeStringList(entry?.outputs),
    focusAreas: normalizeStringList(entry?.focus_areas),
    featured: entry?.featured === true,
    status: entry?.status || 'draft',
    sortOrder: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : 0,
    createdAt: entry?.created_at || '',
    media,
    coverImage,
  };
}

export function normalizePortfolioEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map(normalizePortfolioEntry)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      if (a.year !== b.year) {
        return Number(b.year || 0) - Number(a.year || 0);
      }

      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
}

export function filterPortfolioProjects(projects, { capabilityId = 'all', focusSlug = '' } = {}) {
  return projects.filter((project) => {
    const matchesCapability =
      capabilityId === 'all' || project.capabilities.includes(capabilityId);
    const matchesFocus =
      !focusSlug ||
      project.focusAreas.some((focusArea) => getFocusSlug(focusArea) === focusSlug);

    return matchesCapability && matchesFocus;
  });
}

export function getCapabilityFocusAreas(capabilityId = 'all', projects = []) {
  if (capabilityId === 'all') {
    const focusAreas = new Set();

    projects.forEach((project) => {
      project.focusAreas.forEach((focusArea) => focusAreas.add(focusArea));
    });

    return [...focusAreas];
  }

  const projectFocusAreas = new Set();

  projects
    .filter((project) => project.capabilities.includes(capabilityId))
    .forEach((project) => {
      project.focusAreas.forEach((focusArea) => projectFocusAreas.add(focusArea));
    });

  const capability = getCapabilityMeta(capabilityId);
  const configuredOfferings = Array.isArray(capability?.offerings) ? capability.offerings : [];

  return [
    ...configuredOfferings,
    ...[...projectFocusAreas].filter((focusArea) => !configuredOfferings.includes(focusArea)),
  ];
}

export async function fetchPublishedPortfolioEntries(options = {}) {
  const { forceRefresh = false } = options;

  return portfolioCache.get(
    'portfolio:published',
    async () => {
      const rawEntries = hasPublicDataCredentials
        ? await fetchPublicRows('portfolio_entries', {
          select: PORTFOLIO_SELECT,
          filters: { status: 'published' },
          order: { column: 'sort_order', ascending: true },
        })
        : await apiGet('/api/portfolio');

      return normalizePortfolioEntries(rawEntries);
    },
    { forceRefresh, fallback: [] },
  );
}
