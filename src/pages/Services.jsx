import { useEffect, useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { useTheme } from '../components/ThemeProvider';
import Turnstile from '../components/Turnstile';
import { apiGet, apiPost, getTurnstileSiteKey } from '../lib/api';
import './Services.css';

const PRIMARY_SERVICES = [
  {
    id: 'design',
    index: '01',
    title: 'DESIGN',
    category: 'CREATIVE',
    description: 'Visual systems and brand identity development.',
    output: 'IDENTITY / ASSETS / GUIDELINES',
    status: 'ACTIVE',
    details: ['Digital Assets', 'UI/UX Design', 'Merchandise & Apparel', 'Creative Direction'],
  },
  {
    id: 'branding',
    index: '03',
    title: 'BRANDING',
    category: 'STRATEGY',
    description: 'Developing the core identity of your project.',
    output: 'POSITIONING / VOICE / STORY',
    status: 'ACTIVE',
    details: ['Identity', 'World Building', 'Voice & Messaging'],
  },
  {
    id: 'production',
    index: '02',
    title: 'PRODUCTION',
    category: 'PRODUCTION',
    description: 'Capturing your vision and bringing it to life.',
    output: 'MEDIA / CONTENT / CAMPAIGN ASSETS',
    status: 'ACTIVE',
    details: ['Videography', 'Photography', 'Website', 'Events'],
  },
  {
    id: 'marketing',
    index: '04',
    title: 'MARKETING',
    category: 'DISTRIBUTION',
    description: 'Approaching the world with what you make.',
    output: 'CAMPAIGN / COMMUNITY / DISTRIBUTION',
    status: 'ACTIVE',
    details: ['Strategy', 'Advertising', 'Community Building', 'Analytics'],
  },
];

const PRINCIPLES = [
  'CULTURAL INTEGRITY',
  'SYSTEMIC THINKING',
  'COMMUNITY FIRST',
  'CREATIVE EXCELLENCE',
  'LONG TERM IMPACT',
];

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
          {PRINCIPLES.map((item) => (
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
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productRows, setProductRows] = useState(DEFAULT_PRODUCT_ROWS);
  const [activeServiceId, setActiveServiceId] = useState(PRIMARY_SERVICES[0].id);
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
  const activeServiceSelected = selectedServices.includes(activeService.id);
  const selectedServiceCount = selectedServices.length;
  const bundleDiscount = selectedServiceCount <= 1
    ? 0
    : selectedServiceCount >= PRIMARY_SERVICES.length
      ? 20
      : selectedServiceCount * 5;
  const selectedCount = selectedServices.length + selectedProducts.length;
  const selectedInquiryItems = [
    ...selectedServices.map((serviceId) => {
      const matchedService = PRIMARY_SERVICES.find((service) => service.id === serviceId);
      return matchedService?.title ?? serviceId;
    }),
    ...selectedProducts
      .map((productId) => {
        const matchedProduct = productRows.find((row) => row.id === productId);
        if (!matchedProduct) return null;
        return matchedProduct.capability
          ? `${matchedProduct.capability} / ${matchedProduct.product}`
          : matchedProduct.product;
      })
      .filter(Boolean),
  ];

  const showService = (serviceId) => {
    setActiveServiceId(serviceId);
  };

  const toggleServiceSelection = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
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
      introCopy="INTEGRATED TOOLING FOR CULTURAL MOVEMENT AND CREATIVE INFRASTRUCTURE."
      rightSidebar={<ServicesSidebar selectedCount={selectedCount} productCount={productRows.length} />}
      contentClassName="services-layout page-stack"
    >
      <section className="services-capabilities">
        <div className="services-capabilities__layout">
          <div className="services-capabilities__top-row">
            <div className="services-capabilities__grid">
              {PRIMARY_SERVICES.map((service) => {
                const isSelected = selectedServices.includes(service.id);
                const isActive = activeService.id === service.id;
                return (
                  <button
                    type="button"
                    key={service.id}
                    className={`services-capability-card ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-current' : ''}`}
                    aria-pressed={isSelected}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => showService(service.id)}
                  >
                    <strong>{service.title}</strong>
                  </button>
                );
              })}
            </div>

            <div className="services-bundle-builder-strip">
              <div className="services-bundle-builder-strip__discount">
                <span>bundle discount</span>
                <strong>{bundleDiscount}%</strong>
              </div>
              <p className="services-bundle-builder-strip__copy">
                combine services for discount.
              </p>
              <div className="services-bundle-builder" aria-hidden="true">
                {PRIMARY_SERVICES.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      className={`services-bundle-builder__node ${isSelected ? 'is-active' : ''}`}
                    >
                      <span className="services-bundle-builder__node-dot" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <SystemPanel title="SELECTED CAPABILITY" className="services-capability-detail-panel">
            <div className="services-capability-detail">
              <div className="services-capability-detail__header">
                <strong>{activeService.title}</strong>
                <button
                  type="button"
                  className={`theme-button services-capability-detail__action ${activeServiceSelected ? 'is-active' : ''}`}
                  aria-pressed={activeServiceSelected}
                  onClick={() => toggleServiceSelection(activeService.id)}
                >
                  {activeServiceSelected ? 'ADDED' : 'ADD'}
                </button>
              </div>
              <p>{activeService.description}</p>
              <div className="services-capability-detail__meta">
                <strong>OUTPUT</strong>
                <strong>{activeService.output}</strong>
              </div>
              <div className="services-capability-detail__list">
                {activeService.details.map((detail) => (
                  <div key={detail} className="services-capability-detail__item">
                    <span>{detail}</span>
                    <span>+</span>
                  </div>
                ))}
              </div>
            </div>
          </SystemPanel>
        </div>
      </section>

      <section className="services-products">
        <SystemPanel title="PRODUCT TABLE">
          <div className="services-products__table">
            <div className="services-products__header">
              <span>PRODUCT</span>
              <span>SCOPE</span>
              <span aria-hidden="true" />
            </div>
            {productRows.map((row) => {
              const isSelected = selectedProducts.includes(row.id);
              return (
                <div key={row.id || `${row.capability}-${row.product}`} className="services-products__row">
                  <strong>{row.product}</strong>
                  <span>{row.scope}</span>
                  <button
                    type="button"
                    className={`theme-button services-products__action ${isSelected ? 'is-active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => toggleProductSelection(row.id)}
                  >
                    {isSelected ? 'ADDED' : 'ADD'}
                  </button>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      </section>

      <section className="services-inquiry" id="inquiry-form-section">
        <SystemPanel title="SUBMIT INQUIRY">
          {inquirySent ? (
            <div className="services-inquiry__success theme-message-stack">
              <h3 className="theme-title-md">TRANSMISSION RECEIVED.</h3>
              <p className="theme-body-copy">A creative lead will reach out within 24 hours.</p>
              <button
                type="button"
                className="theme-button"
                onClick={() => {
                  setInquirySent(false);
                  setSelectedServices([]);
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
