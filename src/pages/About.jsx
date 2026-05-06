import { Link } from 'react-router-dom';
import ContentPageShell, { ModuleStrip, PageStat, PageStatGrid, SectionRail } from '../components/ContentPageShell';

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

      <SectionRail
        label="WHAT WE ARE"
        title="A studio, a network, and a connective layer."
        className="about-section"
      >
        <div className="page-grid page-grid--two">
          <div className="page-detail-pane page-detail-pane--accent">
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
          <div className="page-panel">
            <p className="page-block-label">Built to support</p>
            <ModuleStrip
              items={[
                { label: 'Artists', copy: 'Releases, visuals, performances, installations' },
                { label: 'Brands', copy: 'Identity, campaigns, activations, direction shifts' },
                { label: 'Community', copy: 'Shared discovery, contribution, attendance, collaboration' },
              ]}
            />
          </div>
        </div>
      </SectionRail>

      <SectionRail
        label="HOW IT WORKS"
        title="LMNL operates as an ecosystem."
        copy="The website itself reflects that structure: public-facing storytelling, event and ticket flows, community participation, services, and storefront moments all living inside one connected system."
        className="about-section"
      >
        <div className="page-grid page-grid--three">
          {ecosystemCards.map((card) => (
            <article key={card.title} className="page-detail-pane">
              <h3 className="page-panel-title">{card.title}</h3>
              <p className="page-copy">{card.copy}</p>
            </article>
          ))}
        </div>
      </SectionRail>

      <SectionRail
        label="OPERATING LAYERS"
        title="Each layer has a job."
        className="about-section"
      >
        <div className="page-grid page-grid--four">
          {operatingLayers.map((layer) => (
            <div key={layer.title} className="page-panel">
              <p className="page-block-label">{layer.title}</p>
              <ModuleStrip items={layer.items.map((item) => ({ label: item }))} />
            </div>
          ))}
        </div>
      </SectionRail>

      <SectionRail
        label="PLUG IN"
        title="Choose your entry point."
        className="about-section"
      >
        <div className="page-grid page-grid--three">
          {pathways.map((pathway) => (
            <article key={pathway.title} className="page-detail-pane">
              <h3 className="page-panel-title">{pathway.title}</h3>
              <p className="page-copy">{pathway.copy}</p>
              <Link to={pathway.to} className="theme-button">
                {pathway.label}
              </Link>
            </article>
          ))}
        </div>
      </SectionRail>
    </ContentPageShell>
  );
}
