import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ContentPageShell, {
  ModuleStrip,
} from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import {
  PORTFOLIO_CAPABILITIES,
  PORTFOLIO_PROJECTS,
  buildPortfolioPath,
  filterPortfolioProjects,
  getCapabilityFocusAreas,
  getCapabilityLabel,
  getFocusSlug,
} from '../lib/portfolio';
import './Portfolio.css';

function getActiveCapability(searchParams) {
  const fallbackCapability = PORTFOLIO_CAPABILITIES[1]?.id || PORTFOLIO_CAPABILITIES[0]?.id || 'design';
  const requestedCapability = searchParams.get('capability') || fallbackCapability;
  const isKnown = PORTFOLIO_CAPABILITIES.some((item) => item.id === requestedCapability);
  return isKnown ? requestedCapability : fallbackCapability;
}

function PortfolioCard({ project }) {
  return (
    <article className="portfolio-card theme-accent-panel">
      <div className="portfolio-card__topline">
        <span>{project.year}</span>
        <span>{project.format}</span>
      </div>

      <div className="portfolio-card__body">
        <div className="portfolio-card__header">
          <h3 className="page-panel-title">{project.title}</h3>
          <p className="page-copy">{project.client}</p>
        </div>

        <p className="page-copy">{project.summary}</p>

        <div className="theme-chip-grid">
          {project.capabilities.map((capability) => (
            <span key={capability} className="theme-chip">
              {getCapabilityLabel(capability)}
            </span>
          ))}
        </div>

        <ModuleStrip
          items={project.outputs.map((output) => ({
            label: output,
          }))}
          className="portfolio-card__outputs"
        />

        <p className="portfolio-card__result">{project.result}</p>
      </div>
    </article>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedFocusSlug, setExpandedFocusSlug] = useState('');
  const activeCapability = getActiveCapability(searchParams);
  const activeFocusSlug = searchParams.get('focus') || '';
  const capabilityFocusAreas = getCapabilityFocusAreas(activeCapability);
  const sortedCapabilities = PORTFOLIO_CAPABILITIES
    .filter((capability) => capability.id !== 'all')
    .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
  const filteredProjects = filterPortfolioProjects({
    capabilityId: activeCapability,
    focusSlug: activeFocusSlug,
  });

  const handleCapabilitySelect = (capabilityId) => {
    navigate(buildPortfolioPath({ capabilityId }));
  };

  const handleFocusSelect = (focusArea) => {
    const focusSlug = getFocusSlug(focusArea);
    const isClearing = focusSlug === activeFocusSlug;

    setExpandedFocusSlug((current) => (current === focusSlug ? '' : focusSlug));

    navigate(
      buildPortfolioPath({
        capabilityId: activeCapability,
        focusLabel: isClearing ? '' : focusArea,
      })
    );
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
          <div className="portfolio-capabilities__top-row">
            <div className="portfolio-capabilities__grid">
              {sortedCapabilities.map((capability) => {
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

          <SystemPanel title="SELECTED MODULE" className="portfolio-capability-detail-panel">
            <div className="portfolio-capability-detail">
              <div className="portfolio-capability-detail__list">
                {capabilityFocusAreas.map((focusArea) => {
                  const focusSlug = getFocusSlug(focusArea);
                  const isExpanded = focusSlug === expandedFocusSlug;
                  const matchingProjects = filterPortfolioProjects({
                    capabilityId: activeCapability,
                    focusSlug,
                  });

                  return (
                    <div
                      key={focusArea}
                      className={`portfolio-capability-detail__item ${isExpanded ? 'is-expanded' : ''}`}
                    >
                      <button
                        type="button"
                        className="portfolio-capability-detail__trigger"
                        aria-expanded={isExpanded}
                        onClick={() => handleFocusSelect(focusArea)}
                      >
                        <span>{focusArea}</span>
                        <span>{isExpanded ? '−' : '+'}</span>
                      </button>
                      {isExpanded ? (
                        <div className="portfolio-capability-detail__body">
                          <div className="portfolio-capability-detail__footer">
                            <span className="portfolio-capability-detail__price">
                              {String(matchingProjects.length).padStart(2, '0')} MATCHING CASE MODULES
                            </span>
                            <button
                              type="button"
                              className="theme-button portfolio-capability-detail__add"
                              onClick={() => navigate(buildPortfolioPath({ capabilityId: activeCapability }))}
                            >
                              RESET
                            </button>
                          </div>
                          <p className="portfolio-capability-detail__copy">
                            {matchingProjects.map((project) => project.title).join(' / ')}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </SystemPanel>
        </div>
      </section>

      {filteredProjects.length > 0 ? (
        <section className="portfolio-index">
          <div className="page-grid page-grid--two">
            {filteredProjects.map((project) => (
              <PortfolioCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      ) : (null)
      }

      <SystemPanel title="NEXT ROUTE">
        <div className="page-grid page-grid--two">
          <div className="page-panel portfolio-panel">
            <h3 className="page-panel-title">Build a tailored scope</h3>
            <p className="page-copy">
              Move back into services to combine capabilities, pricing layers, and inquiry selection into a project brief.
            </p>
            <Link to="/services#inquiry-form-section" className="theme-button">
              Return to Services
            </Link>
          </div>

          <div className="page-panel portfolio-panel">
            <h3 className="page-panel-title">Start a conversation</h3>
            <p className="page-copy">
              If you already know the direction, the contact route can carry a more open-ended collaboration note.
            </p>
            <Link to="/contact" className="theme-button">
              Open Contact
            </Link>
          </div>
        </div>
      </SystemPanel>
    </ContentPageShell>
  );
}
