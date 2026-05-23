import { useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { useTheme } from '../components/ThemeProvider';
import Turnstile from '../components/Turnstile';
import { apiPost, getTurnstileSiteKey } from '../lib/api';
import { buildPortfolioPath } from '../lib/portfolio';
import { PRIMARY_SERVICES } from '../lib/serviceCatalog';
import './Services.css';

export default function Services() {
  const { theme } = useTheme();
  const [selectedDetails, setSelectedDetails] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState(PRIMARY_SERVICES[0].id);
  const [expandedDetailLabel, setExpandedDetailLabel] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle');
  const [requestError, setRequestError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const activeService =
    PRIMARY_SERVICES.find((service) => service.id === activeServiceId) ?? PRIMARY_SERVICES[0];
  const sortedServices = [...PRIMARY_SERVICES].sort((a, b) => Number(a.index) - Number(b.index));
  const selectedInquiryItems = [
    ...selectedDetails.map((detailId) => {
      const [serviceId, detailLabel] = detailId.split('::');
      const matchedService = PRIMARY_SERVICES.find((service) => service.id === serviceId);
      const matchedDetail = matchedService?.details.find((detail) => detail.label === detailLabel);
      return matchedService && matchedDetail
        ? `${matchedService.title} / ${matchedDetail.label}`
        : detailLabel;
    }),
  ].filter(Boolean);

  const showService = (serviceId) => {
    setActiveServiceId(serviceId);
    setExpandedDetailLabel('');
  };

  const toggleDetail = (detailLabel) => {
    setExpandedDetailLabel((current) => (current === detailLabel ? '' : detailLabel));
  };

  const toggleDetailSelection = (serviceId, detailLabel) => {
    const selectionId = `${serviceId}::${detailLabel}`;
    setSelectedDetails((prev) =>
      prev.includes(selectionId)
        ? prev.filter((item) => item !== selectionId)
        : [...prev, selectionId]
    );
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setRequestStatus('loading');
    setRequestError('');

    try {
      await apiPost('/api/service-inquiries', {
        action: 'create',
        name: formData.name,
        email: formData.email,
        notes: formData.notes,
        selectedServices: selectedInquiryItems,
        turnstileToken,
      });
      setInquirySent(true);
      setRequestStatus('idle');
      setFormData({ name: '', email: '', notes: '' });
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setRequestStatus('error');
      setRequestError(error.message || 'Transmission failed. Please try again.');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    }
  };

  return (
    <ContentPageShell
      title="SERVICES"
      color="#7b52d6"
      introTitle="SERVICES"
      introCopy="INTEGRATED TOOLING AND CREATIVE INFRASTRUCTURE."
      contentClassName="services-layout page-stack"
    >
      <section className="services-capabilities">
        <div className="services-capabilities__layout">
          <div className="services-capabilities__top-row">
            <section className="services-overview-panel theme-surface theme-surface--panel">
              <div className="services-overview theme-surface-body">
                <p>
                  LMNL builds across design, media, and digital execution.
                  Browse our offerings below or head to the portfolio to see the work in action.
                </p>
                <Link to={buildPortfolioPath()} className="theme-button services-overview__button">
                  PORTFOLIO
                </Link>
              </div>
            </section>
            <div className="services-capabilities__grid">
              {sortedServices.map((service) => {
                const isActive = activeService.id === service.id;
                return (
                  <button
                    type="button"
                    key={service.id}
                    className={`services-capability-card ${isActive ? 'is-current' : ''}`}
                    aria-pressed={isActive}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => showService(service.id)}
                  >
                    <strong>{service.title}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <SystemPanel title="SELECTED CAPABILITY" className="services-capability-detail-panel">
            <div className="services-capability-detail">
              <div className="services-capability-detail__header">
                <strong>{activeService.title}</strong>
              </div>
              <p>{activeService.description}</p>
              <div className="services-capability-detail__meta">
                <strong>OUTPUT</strong>
                <strong>{activeService.output}</strong>
              </div>
              <div className="services-capability-detail__list">
                {activeService.details.map((detail) => {
                  const isExpanded = expandedDetailLabel === detail.label;
                  const detailSelectionId = `${activeService.id}::${detail.label}`;
                  const isSelected = selectedDetails.includes(detailSelectionId);
                  return (
                    <div
                      key={detail.label}
                      className={`services-capability-detail__item ${isExpanded ? 'is-expanded' : ''}`}
                    >
                      <button
                        type="button"
                        className="services-capability-detail__trigger"
                        aria-expanded={isExpanded}
                        onClick={() => toggleDetail(detail.label)}
                      >
                        <span>{detail.label}</span>
                        <span>{isExpanded ? '−' : '+'}</span>
                      </button>
                      {isExpanded ? (
                        <div className="services-capability-detail__body">
                          <div className="services-capability-detail__footer">
                            <span className="services-capability-detail__price">
                              STARTING AT {detail.startingPrice}
                            </span>
                            <button
                              type="button"
                              className={`theme-button services-capability-detail__add ${isSelected ? 'is-active' : ''}`}
                              aria-pressed={isSelected}
                              onClick={() => toggleDetailSelection(activeService.id, detail.label)}
                            >
                              {isSelected ? 'ADDED' : 'ADD'}
                            </button>
                          </div>
                          <Link
                            to={buildPortfolioPath({
                              capabilityId: activeService.id,
                              focusLabel: detail.label,
                            })}
                            className="services-capability-detail__portfolio-link"
                          >
                            {detail.portfolioLabel || 'VIEW RELATED WORK'}
                          </Link>
                          <p className="services-capability-detail__copy">{detail.copy}</p>
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

      <section className="services-inquiry" id="inquiry-form-section">
        <SystemPanel title="SUBMIT INQUIRY">
          {inquirySent ? (
            <div className="services-inquiry__success theme-message-stack">
              <h3 className="theme-title-md">TRANSMISSION RECEIVED.</h3>
              <p className="theme-body-copy">We will reach out soon.</p>
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setInquirySent(false);
                  setSelectedDetails([]);
                }}
              >
                NEW INQUIRY
              </button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="services-inquiry__form theme-form">
              {selectedInquiryItems.length > 0 ? (
                <div className="services-inquiry__selection">
                  <span className="services-inquiry__selection-label">INQUIRY SELECTION</span>
                  <div className="services-inquiry__selection-list">
                    {selectedInquiryItems.map((item) => (
                      <span key={item} className="services-inquiry__selection-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="services-inquiry__grid theme-form-grid">
                <input
                  type="text"
                  placeholder="NAME / ENTITY"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="theme-input"
                />
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="theme-input"
                />
              </div>
              <textarea
                placeholder="PROJECT BRIEF / DIRECTIONAL GOALS"
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="theme-input services-inquiry__textarea"
              />

              <Turnstile
                siteKey={getTurnstileSiteKey()}
                onTokenChange={setTurnstileToken}
                resetSignal={turnstileResetSignal}
                theme={theme}
              />

              {!turnstileToken ? (
                <p className="services-inquiry__error">
                  Complete the security check above to enable submission.
                </p>
              ) : null}

              {requestStatus === 'error' ? (
                <p className="services-inquiry__error">{requestError}</p>
              ) : null}

              <button
                type="submit"
                className="theme-button"
                disabled={requestStatus === 'loading' || !turnstileToken}
              >
                {requestStatus === 'loading' ? 'TRANSMITTING...' : 'SUBMIT INQUIRY'}
              </button>
            </form>
          )}
        </SystemPanel>
      </section>
    </ContentPageShell>
  );
}
