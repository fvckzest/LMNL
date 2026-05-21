import { useMemo, useState } from 'react';
import LmnlLogoBlack from '../components/LmnlLogoBlack';
import { buildApprovalEmail, buildTicketEmail } from '../../shared/emailTemplates.js';
import './EmailLab.css';

const scenarios = {
  approval: {
    label: 'Approval Email',
    accent: '#000000',
    build: () => buildApprovalEmail({
      eventName: 'PRSM Listening Session',
      checkoutUrl: 'https://checkout.lmnl.art/pay/prsm-session',
    }),
  },
  ticket: {
    label: 'Ticket Email',
    accent: '#000000',
    build: () => buildTicketEmail({
      eventName: 'Genesis Opening Night',
      ticketUrl: 'https://lmnl.art/ticket/tkt_42A91',
      customerName: 'Ada Lovelace',
    }),
  },
};

function EmailLab() {
  const [selectedScenario, setSelectedScenario] = useState('approval');
  const [previewMode, setPreviewMode] = useState('light');
  const preview = useMemo(() => scenarios[selectedScenario].build(), [selectedScenario]);
  const activeScenario = scenarios[selectedScenario];

  return (
    <div className="email-lab" style={{ '--email-accent': activeScenario.accent }}>
      <aside className="email-lab__sidebar">
        <LmnlLogoBlack className="email-lab__logo" />
        <p className="email-lab__eyebrow">Local Preview</p>
        <h1>Email Lab</h1>
        <p className="email-lab__intro">
          Shape layout and copy here first. This stays local until we decide the production email should inherit it.
        </p>

        <div className="email-lab__nav">
          {Object.entries(scenarios).map(([key, scenario]) => (
            <button
              key={key}
              type="button"
              className={key === selectedScenario ? 'email-lab__nav-button is-active' : 'email-lab__nav-button'}
              onClick={() => setSelectedScenario(key)}
            >
              {scenario.label}
            </button>
          ))}
        </div>

        <div className="email-lab__meta">
          <p className="email-lab__label">Active Message</p>
          <p className="email-lab__value">{activeScenario.label}</p>
          <p className="email-lab__label">Preview Mode</p>
          <div className="email-lab__mode-toggle" role="tablist" aria-label="Preview mode">
            <button
              type="button"
              className={previewMode === 'light' ? 'email-lab__nav-button is-active' : 'email-lab__nav-button'}
              onClick={() => setPreviewMode('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={previewMode === 'dark' ? 'email-lab__nav-button is-active' : 'email-lab__nav-button'}
              onClick={() => setPreviewMode('dark')}
            >
              Gmail Dark Approx
            </button>
          </div>
          <p className="email-lab__label">Subject</p>
          <p className="email-lab__value">{preview.subject}</p>
          <p className="email-lab__label">Plain text</p>
          <pre className="email-lab__text">{preview.text}</pre>
        </div>
      </aside>

      <main className="email-lab__preview">
        <div className="email-lab__preview-header">
          <span className="email-lab__preview-dot" />
          <span className="email-lab__preview-label">
            {previewMode === 'dark' ? 'Email Preview / Gmail Dark Approx' : 'Email Preview'}
          </span>
        </div>
        <div
          className={previewMode === 'dark' ? 'email-lab__frame email-lab__frame--dark-approx' : 'email-lab__frame'}
          dangerouslySetInnerHTML={{ __html: preview.previewHtml }}
        />
      </main>
    </div>
  );
}

export default EmailLab;
