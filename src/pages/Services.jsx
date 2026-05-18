import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { useTheme } from '../components/ThemeProvider';
import Turnstile from '../components/Turnstile';
import { apiGet, apiPost, getTurnstileSiteKey } from '../lib/api';
import { buildPortfolioPath } from '../lib/portfolio';
import { PRIMARY_SERVICES, SERVICE_PRINCIPLES } from '../lib/serviceCatalog';
import './Services.css';

const DEFAULT_PRODUCT_ROWS = [
  {
    capability: '',
    product: '',
    scope: '',
  },

].map((item, index) => ({ ...item, id: `${item.capability}-${index}`, is_active: true }));

function ServicesSidebar({ selectedCount, productCount }) {
  return (
    <>
      <SystemPanel title="MODULE OVERVIEW">
        <div className="services-sidebar-metrics">
          <div><span>PRIMARY CAPABILITIES</span><span>4</span></div>
          <div><span>SELECTED</span><span>{String(selectedCount).padStart(2, '0')}</span></div>
          <div><span>PRODUCT LINES</span><span>{productCount}</span></div>
          <div><span>ACTIVE</span><span>4</span></div>
        </div>
      </SystemPanel>

      <SystemPanel title="CORE PRINCIPLES">
        <div className="services-principles">
          {SERVICE_PRINCIPLES.map((item) => (
            <div key={item} className="services-principles__item">
              <span>{item}</span>
              <span>+</span>
            </div>
          ))}
        </div>
      </SystemPanel>

      <SystemPanel title="INQUIRE">
        <div className="services-sidebar-card">
          <p>Start a conversation about your project.</p>
          <a href="#inquiry-form-section">SUBMIT INQUIRY →</a>
        </div>
      </SystemPanel>
    </>
  );
}

export default function Services() {
  const { theme } = useTheme();
  const [selectedDetails, setSelectedDetails] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productRows, setProductRows] = useState(DEFAULT_PRODUCT_ROWS);
  const [activeServiceId, setActiveServiceId] = useState(PRIMARY_SERVICES[0].id);
  const [expandedDetailLabel, setExpandedDetailLabel] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle');
  const [requestError, setRequestError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchServiceProducts() {
      try {
        const data = await apiGet('/api/service-products');
        if (!isMounted) return;
        setProductRows((data || []).filter((item) => item.is_active !== false));
      } catch (error) {
        console.error('Error fetching service products:', error);
        if (isMounted) {
          setProductRows(DEFAULT_PRODUCT_ROWS);
        }
      }
    }

    fetchServiceProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeService =
    PRIMARY_SERVICES.find((service) => service.id === activeServiceId) ?? PRIMARY_SERVICES[0];
  const sortedServices = [...PRIMARY_SERVICES].sort((a, b) => Number(a.index) - Number(b.index));
  const activeServiceOfferings = productRows.filter((row) =>
    String(row.capability || '').trim().toLowerCase() === activeService.title.toLowerCase()
  );
  const selectedCount = selectedDetails.length + selectedProducts.length;
  const selectedInquiryItems = [
    ...selectedDetails.map((detailId) => {
      const [serviceId, detailLabel] = detailId.split('::');
      const matchedService = PRIMARY_SERVICES.find((service) => service.id === serviceId);
      const matchedDetail = matchedService?.details.find((detail) => detail.label === detailLabel);
      return matchedService && matchedDetail
        ? `${matchedService.title} / ${matchedDetail.label}`
        : detailLabel;
    }),
    ...selectedProducts.map((productId) => {
      const matchedProduct = productRows.find((row) => row.id === productId);
      if (!matchedProduct) return null;
      return matchedProduct.capability
        ? `${matchedProduct.capability} / ${matchedProduct.product}`
        : matchedProduct.product;
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

  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
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
      setSelectedProducts([]);
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
      rightSidebar={<ServicesSidebar selectedCount={selectedCount} productCount={productRows.length} />}
      contentClassName="services-layout page-stack"
    >
      <section className="services-capabilities">
        <div className="services-capabilities__layout">
          <div className="services-capabilities__top-row">
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
                  setSelectedProducts([]);
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
