import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../ContentPageShell';
import './MockupPage.css';

function SectionHeading({ id, index, label, title, copy }) {
  return (
    <div className="mockup-section-heading">
      <p className="mockup-section-heading__label">{index} / {label}</p>
      <h2 id={id}>{title}</h2>
      {copy ? <p className="mockup-section-heading__copy">{copy}</p> : null}
    </div>
  );
}

function ImageLightbox({ image, isOpen, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mockup-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mockup-lightbox-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mockup-lightbox__dialog">
        <div className="mockup-lightbox__header">
          <p id="mockup-lightbox-title">{image.label}</p>
          <button
            ref={closeButtonRef}
            type="button"
            className="mockup-lightbox__close"
            onClick={onClose}
          >
            close preview <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="mockup-lightbox__media">
          <img
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="mockup-lightbox__image"
          />
        </div>
      </div>
    </div>
  );
}

function ScreenshotFrame({ image }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef(null);

  const closePreview = () => {
    setIsExpanded(false);
    triggerRef.current?.focus();
  };

  return (
    <figure className="mockup-frame">
      <div className="mockup-frame__header">
        <p className="mockup-frame__label">{image.label}</p>
      </div>
      <div className="mockup-frame__surface">
        <div className="mockup-frame__preview">
          <button
            ref={triggerRef}
            type="button"
            className="mockup-frame__trigger"
            aria-label={`Expand ${image.label}`}
            onClick={() => setIsExpanded(true)}
          >
            <img
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="mockup-frame__image"
              loading={image.loading}
              decoding="async"
            />
          </button>
        </div>
      </div>
      <figcaption className="mockup-frame__caption">
        <p>{image.summary}</p>
        <button type="button" className="mockup-frame__open" onClick={() => setIsExpanded(true)}>
          open full preview <span aria-hidden="true">↗</span>
        </button>
      </figcaption>
      <ImageLightbox image={image} isOpen={isExpanded} onClose={closePreview} />
    </figure>
  );
}

function ExplanationPanel({ label, content }) {
  return (
    <article className={`mockup-explanation mockup-explanation--${label}`}>
      <div className="mockup-explanation__topline">
        <p>{label === 'current' ? 'before' : 'after'}</p>
      </div>
      <div className="mockup-explanation__body">
        <h3>{content.heading}</h3>
        <p className="mockup-explanation__copy">{content.copy}</p>
        <ul>
          {content.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </div>
    </article>
  );
}

export default function MockupPage({ project }) {
  return (
    <ContentPageShell
      title="MOCKUPS"
      color="#ff9300"
      introLabel="LMNL / WEBSITE CONCEPT"
      introTitle={project.businessName.toUpperCase()}
      introCopy="INDEPENDENT DESIGN DIRECTION / EARLY VISUAL CONCEPT"
      contentClassName="mockup-route-content"
    >
      <div className="mockup-page">
        {project.showIntroduction !== false ? (
          <section className="mockup-hero theme-surface" aria-labelledby="mockup-page-title">
            <div className="mockup-hero__main">
              <p className="mockup-kicker">{project.businessName} / WEBSITE CONCEPT</p>
              <h2 id="mockup-page-title">{project.projectTitle}</h2>
              <p className="mockup-hero__intro">{project.intro}</p>
            </div>
            <aside className="mockup-hero__aside" aria-label="Concept status">
              <p className="mockup-hero__aside-label">concept status</p>
              <p className="mockup-hero__aside-value">early direction</p>
              <p className="mockup-hero__supporting-copy">{project.supportingCopy}</p>
            </aside>
          </section>
        ) : null}

        <section className="mockup-comparison-section" aria-labelledby="mockup-comparison-title">
          <SectionHeading
            id="mockup-comparison-title"
            index="01"
            label="before + after"
            title="the concept in view"
            copy="Compare the current experience with the proposed direction. Both frames preserve the full-page context; open the full preview to inspect the details."
          />
          <div className="mockup-comparison">
            <ScreenshotFrame image={project.images.current} />
            <ScreenshotFrame image={project.images.proposed} />
          </div>
        </section>

        <section className="mockup-explanation-section" aria-labelledby="mockup-explanation-title">
          <SectionHeading
            id="mockup-explanation-title"
            index="02"
            label="reading the shift"
            title="what changes in the experience"
            copy="The redesign is less about adding decoration and more about making the restaurant’s character and practical information easier to feel, understand, and use."
          />
          <div className="mockup-explanation-grid">
            <ExplanationPanel label="current" content={project.currentExperience} />
            <ExplanationPanel label="proposed" content={project.proposedDirection} />
          </div>
        </section>

        <section className="mockup-changes-section" aria-labelledby="mockup-changes-title">
          <SectionHeading id="mockup-changes-title" index="03" label="key changes" title="the most important differences" />
          <ol className="mockup-change-list">
            {project.keyChanges.map((change, index) => (
              <li key={change.title}>
                <span className="mockup-change-list__number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{change.title}</h3>
                  <p>{change.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mockup-disclaimer theme-panel" aria-labelledby="mockup-disclaimer-title">
          <div className="mockup-disclaimer__content">
            <p className="mockup-kicker">04 / project status</p>
            <h2 id="mockup-disclaimer-title">{project.disclaimer.heading}</h2>
            {project.disclaimer.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        <section className="mockup-cta" aria-labelledby="mockup-cta-title">
          <div>
            <p className="mockup-kicker">05 / next step</p>
            <h2 id="mockup-cta-title">{project.cta.heading}</h2>
            <p>{project.cta.copy}</p>
          </div>
          <div className="mockup-cta__actions">
            <Link to={project.cta.href} className="theme-button">{project.cta.label}</Link>
            {project.fullMockupLink ? (
              <a href={project.fullMockupLink} className="mockup-text-link">open full mockup <span aria-hidden="true">↗</span></a>
            ) : null}
          </div>
        </section>
      </div>
    </ContentPageShell>
  );
}
