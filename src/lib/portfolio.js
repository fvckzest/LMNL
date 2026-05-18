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

export const PORTFOLIO_CAPABILITIES = [
  {
    id: 'all',
    label: 'ALL MODULES',
    accent: PORTFOLIO_CAPABILITY_ACCENTS.all,
    description: 'A cross-capability view of how LMNL combines strategy, design, media, and digital delivery into one project system.',
    output: 'CROSS-CAPABILITY / CASE INDEX',
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

export const PORTFOLIO_PROJECTS = [];

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

export function filterPortfolioProjects({ capabilityId = 'all', focusSlug = '' } = {}) {
  return PORTFOLIO_PROJECTS.filter((project) => {
    const matchesCapability =
      capabilityId === 'all' || project.capabilities.includes(capabilityId);
    const matchesFocus =
      !focusSlug ||
      project.focusAreas.some((focusArea) => getFocusSlug(focusArea) === focusSlug);

    return matchesCapability && matchesFocus;
  });
}

export function getCapabilityFocusAreas(capabilityId = 'all') {
  const capability = getCapabilityMeta(capabilityId);
  return capability?.offerings || [];
}
