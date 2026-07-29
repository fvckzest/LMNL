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

function ScreenshotFrame({ image }) {
  return (
    <figure className="mockup-frame">
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        className="mockup-frame__image"
        loading={image.loading}
        decoding="async"
      />
    </figure>
  );
}

function ExplanationPanel({ label, content }) {
  return (
    <article className={`mockup-explanation mockup-explanation--${label}`}>
      <div className="mockup-explanation__body">
        <p className="mockup-explanation__copy">{content.copy}</p>
        <ul>
          {content.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </div>
    </article>
  );
}

function ComparisonRow({ image, label, content }) {
  return (
    <div className="mockup-comparison-row">
      <ScreenshotFrame image={image} />
      <h3 className="mockup-comparison-row__heading">{content.heading}</h3>
      <ExplanationPanel label={label} content={content} />
    </div>
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
          />
          <div className="mockup-comparison">
            <ComparisonRow image={project.images.current} label="current" content={project.currentExperience} />
            <ComparisonRow image={project.images.proposed} label="proposed" content={project.proposedDirection} />
          </div>
        </section>

        <section className="mockup-changes-section" aria-labelledby="mockup-changes-title">
          <SectionHeading id="mockup-changes-title" index="02" label="key changes" title="the important differences" />
          <ol className="mockup-change-list">
            {project.keyChanges.map((change, index) => (
              <li key={change.title}>
                <div className="mockup-change-list__heading">
                  <span className="mockup-change-list__number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{change.title}</h3>
                </div>
                <p>{change.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mockup-labeled-section">
          <p className="mockup-kicker">03 / project status</p>
          <section className="mockup-disclaimer theme-panel" aria-labelledby="mockup-disclaimer-title">
            <div className="mockup-disclaimer__content">
              <h2 id="mockup-disclaimer-title">{project.disclaimer.heading}</h2>
              {project.disclaimer.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        </div>

        <div className="mockup-labeled-section">
          <p className="mockup-kicker">04 / next step</p>
          <section className="mockup-cta" aria-labelledby="mockup-cta-title">
            <div>
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
      </div>
    </ContentPageShell>
  );
}
