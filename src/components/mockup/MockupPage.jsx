import { Link } from 'react-router-dom';
import ContentPageShell from '../ContentPageShell';
import './MockupPage.css';

function SectionHeading({ id, title, copy }) {
  return (
    <div className="mockup-section-heading">
      <h2 id={id}>{title}</h2>
      {copy ? <p className="mockup-section-heading__copy">{copy}</p> : null}
    </div>
  );
}

function CtaLink({ href, children }) {
  if (href.startsWith('mailto:')) {
    return <a href={href} className="theme-button">{children}</a>;
  }

  return <Link to={href} className="theme-button">{children}</Link>;
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
      <div className="mockup-comparison-row__details">
        <h3 className="mockup-comparison-row__heading">{content.heading}</h3>
        <ExplanationPanel label={label} content={content} />
      </div>
    </div>
  );
}

export default function MockupPage({ project }) {
  return (
    <ContentPageShell
      title="MOCKUPS"
      color="#ff9300"
      introTitle={project.businessName.toUpperCase()}
      introCopy="EARLY VISUAL CONCEPT"
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
            title="the concept in view"
          />
          <div className="mockup-comparison">
            <ComparisonRow image={project.images.current} label="current" content={project.currentExperience} />
            <ComparisonRow image={project.images.proposed} label="proposed" content={project.proposedDirection} />
          </div>
        </section>

        <section className="mockup-changes-section" aria-labelledby="mockup-changes-title">
          <SectionHeading id="mockup-changes-title" title="the important differences" />
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
          <section className="mockup-disclaimer" aria-labelledby="mockup-disclaimer-title">
            <div className="mockup-disclaimer__content">
              <h2 id="mockup-disclaimer-title">{project.disclaimer.heading}</h2>
              {project.disclaimer.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        </div>

        <div className="mockup-labeled-section">
          <section className="mockup-cta" aria-labelledby="mockup-cta-title">
            <div className="mockup-cta__heading">
              <h2 id="mockup-cta-title">{project.cta.heading}</h2>
            </div>
            <div className="mockup-cta__body">
              <p>{project.cta.copy}</p>
              <div className="mockup-cta__actions">
                {project.cta.replyPrompt ? (
                  <p className="mockup-cta__reply-prompt">
                    {project.cta.replyPrompt}<br />
                    <span>or</span>
                  </p>
                ) : null}
                <CtaLink href={project.cta.href}>{project.cta.label}</CtaLink>
                {project.fullMockupLink ? (
                  <a href={project.fullMockupLink} className="mockup-text-link">open full mockup <span aria-hidden="true">↗</span></a>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </ContentPageShell>
  );
}
