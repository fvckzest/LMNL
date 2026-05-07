import { Link } from 'react-router-dom';
import ContentPageShell, { ModuleStrip, PageStat, PageStatGrid } from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';

const aboutStats = [
  { label: 'Core Focus', value: 'Systems, Community, Creative' },
  { label: 'Built For', value: 'Artists, Brands, Collaborators' },
  { label: 'Output', value: 'Events, Services, Connections' },
];

const ecosystemCards = [
  {
    title: 'Creative services with range',
    copy:
      'LMNL develops visual identity, UI, release artwork, merchandise, campaigns, and production systems that move across digital and live contexts cohesively.',
  },
  {
    title: 'Events as living formats',
    copy:
      'Through our event programming, LMNL treats connection as more than one-off nights. They become containers for thematic exploration, shared space, and real connection.',
  },
  {
    title: 'A network, not an audience',
    copy:
      'The LMNL community connects artists, performers, curators, and builders into a network where each project can lead to new connections, contexts, and energy.',
  },
];

const operatingLayers = [
  {
    title: 'Public',
    items: ['Events', 'Community', 'Website', 'Social Channels'],
  },
  {
    title: 'Experiences',
    items: ['Performances', 'Networking', 'Art Installations', 'Reactive Media'],
  },
  {
    title: 'Services',
    items: ['Design', 'Production', 'Branding', 'Marketing'],
  },
  {
    title: 'Commerce',
    items: ['Artifacts', 'Ticketing', 'Processing', 'Fulfilment'],
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
    <ContentPageShell
      title="ABOUT"
      color="#ff9300"
      introTitle="ABOUT"
      introCopy="MISSION BRIEF, OPERATING LAYERS, AND ENTRY POINTS"
      contentClassName="about-page page-stack"
    >
      <PageStatGrid aria-label="LMNL summary">
        {aboutStats.map((stat) => (
          <PageStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </PageStatGrid>

      <div className="theme-stack">
        <SystemPanel title="Cultural Operating System">
          <div className="theme-copy">
            <p>
              As an independent creative platform, LMNL builds and supports systems, events, and communities across music, digital and physical spaces.
              LMNL operates across three core modes — community-driven events, creative and branding services, and integrated systems for launches and products. Each layer connects to the same infrastructure: the website, the ticketing flow, the community index, and the creative capabilities offered by LMNL as a studio and collaborator.
            </p>
          </div>
        </SystemPanel>
        <SystemPanel title="Built to support">
          <div className="page-panel">
            <ModuleStrip
              items={[
                { label: 'Artists', copy: 'Releases, visuals, performances, installations' },
                { label: 'Brands', copy: 'Identity, campaigns, activations, direction shifts' },
                { label: 'Community', copy: 'Shared discovery, contribution, attendance, collaboration' },
              ]}
            />
          </div>
        </SystemPanel>
      </div>

      <SystemPanel title="How We Work">
        <div className="theme-panel-stack">
          <div className="theme-panel-header">
            <h2 className="page-panel-title">LMNL is an ecosystem.</h2>
            <p className="page-copy">
              Connectivity is the core essence of LMNL.
            </p>
          </div>

          <div className="page-grid page-grid--three">
            {ecosystemCards.map((card) => (
              <article key={card.title} className="page-panel">
                <h3 className="page-section-title">{card.title}</h3>
                <p className="page-copy">{card.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </SystemPanel>

      <SystemPanel title="OPERATING LAYERS">
        <div className="theme-panel-stack">
          <div className="theme-panel-header">
            <h2 className="page-panel-title">Each layer has a job.</h2>
            <p className="page-copy">
              LMNL moves between public-facing programming, creative services, experience
              design, and commerce without separating them into disconnected channels.
            </p>
          </div>

          <div className="page-grid page-grid--four">
            {operatingLayers.map((layer) => (
              <div>
                <p className="theme-copy">{layer.title}</p>
                <div key={layer.title} className="page-panel">
                  <ModuleStrip items={layer.items.map((item) => ({ label: item }))} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SystemPanel>

      <SystemPanel title="ENTRY POINTS">
        <div className="theme-panel-stack">
          <div className="theme-panel-header">
            <h2 className="page-panel-title">Choose your entry point.</h2>
            <p className="page-copy">
              Navigate into the current program, the collaboration stack, or the wider network.
            </p>
          </div>

          <div className="page-grid page-grid--three">
            {pathways.map((pathway) => (
              <article key={pathway.title} className="page-panel">
                <h3 className="page-panel-title">{pathway.title}</h3>
                <p className="page-copy">{pathway.copy}</p>
                <Link to={pathway.to} className="theme-button theme-button-about">
                  {pathway.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </SystemPanel>
    </ContentPageShell>
  );
}
