import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import './About.css';

const aboutStats = [
  { label: 'Modes', value: 'Studio / Space / System' },
  { label: 'Built For', value: 'Artists, brands, collaborators' },
  { label: 'Output', value: 'Events, identities, media, community' },
];

const ecosystemCards = [
  {
    title: 'Creative direction with range',
    copy:
      'LMNL develops visual identity, UI, release artwork, merchandise, campaigns, and production systems that move across digital and live contexts without feeling disconnected.',
  },
  {
    title: 'Events as living formats',
    copy:
      'Through SPACE and other programming, LMNL treats events as more than one-off nights. They become containers for performance, installation, experimentation, invitation, and shared memory.',
  },
  {
    title: 'A network, not just an audience',
    copy:
      'The community side of LMNL connects artists, performers, curators, and builders into a growing ecosystem where each project can lead to new collaborations, new context, and new energy.',
  },
];

const operatingLayers = [
  {
    title: 'Public platform',
    items: ['Events', 'Community', 'Website', 'Social Channels'],
  },
  {
    title: 'Experiences',
    items: ['Performances', 'Networking', 'Art Installations', 'Reactive Media'],
  },
  {
    title: 'Creative services',
    items: ['Design', 'Production', 'Branding', 'Marketing'],
  },
  {
    title: 'Commerce',
    items: ['Artifact releases', 'Ticketing integrations', 'Merch systems'],
  },
];

const pathways = [
  {
    title: 'Attend',
    copy: 'See what is live now, request access, and enter the current event layer of LMNL.',
    to: '/space',
    label: 'View Current Program',
  },
  {
    title: 'Collaborate',
    copy: 'If you are building something with weight behind it, LMNL offers synchronized creative support.',
    to: '/services',
    label: 'View Services',
  },
  {
    title: 'Join the network',
    copy: 'Explore the community index, share your work, and connect to the wider ecosystem.',
    to: '/community',
    label: 'Enter Community',
  },
];

export default function About() {
  return (
    <ContentPageShell title="ABOUT" color="#ff9300" contentClassName="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <h2 className="about-hero-title">
            LMNL is a creative platform for people building culture in public.
          </h2>
          <p className="about-hero-body">
            Part studio, part event framework, part collaborative network, LMNL brings
            together artists, performers, curators, brands, and builders through
            experiences, visuals, strategy, and shared momentum.
          </p>
        </div>
      </section>

      <section className="about-stats" aria-label="LMNL summary">
        {aboutStats.map((stat) => (
          <div key={stat.label} className="about-stat-card theme-panel">
            <p className="about-stat-label">{stat.label}</p>
            <p className="about-stat-value">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="about-section about-story">
        <div className="theme-section-heading">
          <p className="theme-section-kicker">What We Are</p>
          <h2 className="theme-section-title">A studio, a network, and a connective layer.</h2>
        </div>

        <div className="about-story-grid">
          <div className="about-story-panel theme-panel">
            <p>
              Across the site, LMNL shows up as more than a brand page. It is an operating
              environment for programming events, connecting a creative community, launching
              products, selling tickets, and supporting collaborators with design,
              production, branding, and marketing.
            </p>
            <p>
              That combination is what makes the project distinct. LMNL does not separate the
              artwork from the system around it. The identity, the gathering, the rollout, the
              audience, and the tools all matter together.
            </p>
          </div>

          <div className="about-story-aside">
            <p className="about-aside-label">Built to support</p>
            <div className="about-aside-list theme-data-list">
              <div className="theme-data-row">
                <span className="theme-data-label">Artists</span>
                <span>Releases, visuals, performances, installations</span>
              </div>
              <div className="theme-data-row">
                <span className="theme-data-label">Brands</span>
                <span>Identity, campaigns, activations, direction shifts</span>
              </div>
              <div className="theme-data-row">
                <span className="theme-data-label">Community</span>
                <span>Shared discovery, contribution, attendance, collaboration</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="theme-section-heading">
          <p className="theme-section-kicker">How It Works</p>
          <h2 className="theme-section-title">LMNL operates as an ecosystem.</h2>
          <p className="theme-section-copy">
            The website itself reflects that structure: public-facing storytelling, event and
            ticket flows, community participation, services, and storefront moments all living
            inside one connected system.
          </p>
        </div>

        <div className="about-ecosystem-grid">
          {ecosystemCards.map((card) => (
            <article key={card.title} className="about-ecosystem-card theme-panel">
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="theme-section-heading">
          <p className="theme-section-kicker">Operating Layers</p>
          <h2 className="theme-section-title">Each layer has a job.</h2>
        </div>

        <div className="about-layers-grid">
          {operatingLayers.map((layer) => (
            <div key={layer.title} className="about-layer-card theme-panel">
              <h3>{layer.title}</h3>
              <ul>
                {layer.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section about-cta-section">
        <div className="theme-section-heading">
          <p className="theme-section-kicker">Plug In</p>
          <h2 className="theme-section-title">Choose your entry point.</h2>
        </div>

        <div className="about-pathways">
          {pathways.map((pathway) => (
            <article key={pathway.title} className="about-pathway theme-panel">
              <h3>{pathway.title}</h3>
              <p>{pathway.copy}</p>
              <Link to={pathway.to} className="theme-button about-pathway-link">
                {pathway.label}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </ContentPageShell>
  );
}
