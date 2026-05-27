import { useEffect, useState } from 'react';
import { AppLink } from '../components/RouterAdapter';
import ContentPageShell, {
  ModuleStrip,
  PageEmptyState,
  PageStatus,
} from '../components/ContentPageShell';
import {
  PORTFOLIO_CAPABILITIES,
  buildPortfolioPath,
  fetchPublishedPortfolioEntries,
  filterPortfolioProjects,
  getCapabilityLabel,
} from '../lib/portfolio';

function getActiveCapability(searchParams) {
  const fallbackCapability = PORTFOLIO_CAPABILITIES[0]?.id || 'all';
  const requestedCapability = searchParams.get('capability') || fallbackCapability;
  const isKnown = PORTFOLIO_CAPABILITIES.some((item) => item.id === requestedCapability);
  return isKnown ? requestedCapability : fallbackCapability;
}

function getBrowserSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function normalizeSearchParams(searchParams) {
  if (typeof searchParams?.get === 'function') {
    return searchParams;
  }

  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });
  return params;
}

function PortfolioCard({ project }) {
  const capabilityItems = project.capabilities.filter(Boolean);
  const outputItems = project.outputs.map((output) => ({
    label: output,
  }));
  const mediaContent = project.coverImage ? (
    project.coverImage.type === 'image' ? (
      <img
        src={project.coverImage.url}
        alt={project.coverImage.alt || `${project.title} documentation`}
        className="portfolio-card__image"
        loading="lazy"
      />
    ) : (
      <div className="portfolio-card__media-fallback">
        <span>{project.coverImage.type.toUpperCase()}</span>
        <span>{project.coverImage.caption || 'Documentation attached'}</span>
      </div>
    )
  ) : null;

  return (
    <article className="portfolio-card theme-accent-panel">
      {project.coverImage ? (
        <div className="portfolio-card__media">
          {project.websiteUrl ? (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="portfolio-card__media-link"
              aria-label={`Open ${project.title} website`}
            >
              {mediaContent}
            </a>
          ) : (
            mediaContent
          )}
        </div>
      ) : null}

      <div className="portfolio-card__topline">
        <span>{project.year}</span>
        <span>{project.format}</span>
      </div>

      <div className="portfolio-card__body">
        <div className="portfolio-card__header">
          <h3 className="page-panel-title">{project.title}</h3>
        </div>

        {capabilityItems.length > 0 ? (
          <div className="theme-chip-grid">
            {capabilityItems.map((capability) => (
              <span key={capability} className="theme-chip">
                {getCapabilityLabel(capability)}
              </span>
            ))}
          </div>
        ) : null}

        {outputItems.length > 0 ? (
          <ModuleStrip
            items={outputItems}
            className="portfolio-card__outputs"
          />
        ) : null}

        {project.result ? (
          <p className="portfolio-card__result">{project.result}</p>
        ) : null}
      </div>
    </article>
  );
}

export default function Portfolio({ searchParams: providedSearchParams } = {}) {
  const [activeSearchParams, setActiveSearchParams] = useState(() => (
    providedSearchParams ? normalizeSearchParams(providedSearchParams) : getBrowserSearchParams()
  ));
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeCapability = getActiveCapability(activeSearchParams);
  const sortedCapabilities = [...PORTFOLIO_CAPABILITIES]
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
  const allCapability = sortedCapabilities.find((capability) => capability.id === 'all');
  const categoryCapabilities = sortedCapabilities.filter((capability) => capability.id !== 'all');
  const filteredProjects = filterPortfolioProjects(projects, {
    capabilityId: activeCapability,
  });

  useEffect(() => {
    function handlePopState() {
      setActiveSearchParams(getBrowserSearchParams());
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPortfolio() {
      try {
        const data = await fetchPublishedPortfolioEntries();
        if (isMounted) {
          setProjects(data || []);
        }
      } catch (error) {
        console.error('Failed to load portfolio entries:', error);
        if (isMounted) {
          setProjects([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPortfolio();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCapabilitySelect = (capabilityId) => {
    const nextPath = buildPortfolioPath({ capabilityId });
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState(null, '', nextPath);
    setActiveSearchParams(getBrowserSearchParams());
  };

  return (
    <ContentPageShell
      title="PORTFOLIO"
      color="#7b52d6"
      introTitle="PORTFOLIO"
      introCopy="EXPLORE OUR PREVIOUS WORK"
      contentClassName="portfolio-page page-stack"
    >
      <section className="portfolio-capabilities">
        <div className="portfolio-capabilities__layout">
          {allCapability ? (
            <div className="portfolio-capabilities__top-row">
              <button
                type="button"
                className={`portfolio-capability-card portfolio-capability-card--all ${allCapability.id === activeCapability ? 'is-current' : ''}`}
                aria-pressed={allCapability.id === activeCapability}
                aria-current={allCapability.id === activeCapability ? 'true' : undefined}
                onClick={() => handleCapabilitySelect(allCapability.id)}
              >
                <strong>{allCapability.label}</strong>
              </button>
            </div>
          ) : null}

          <div className="portfolio-capabilities__grid">
            {categoryCapabilities.map((capability) => {
              const isActive = capability.id === activeCapability;
              return (
                <button
                  type="button"
                  key={capability.id}
                  className={`portfolio-capability-card ${isActive ? 'is-current' : ''}`}
                  aria-pressed={isActive}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleCapabilitySelect(capability.id)}
                >
                  <strong>{capability.label}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {loading ? (
        <PageStatus>LOADING PORTFOLIO...</PageStatus>
      ) : filteredProjects.length > 0 ? (
        <section className="portfolio-index">
          <div className="page-grid page-grid--two">
            {filteredProjects.map((project) => (
              <PortfolioCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      ) : (
        <PageEmptyState>NO PORTFOLIO ENTRIES FOUND.</PageEmptyState>
      )}

      <section className="portfolio-actions">
        <div className="portfolio-actions__grid">
          <AppLink to="/services#inquiry-form-section" className="theme-button">
            Return to Services
          </AppLink>

          <AppLink to="/contact" className="theme-button">
            Open Contact
          </AppLink>
        </div>
      </section>
    </ContentPageShell>
  );
}
