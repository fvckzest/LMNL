import { useState } from 'react';
import GenericPage from './GenericPage';
import './Services.css';

const SERVICES_DATA = {
  design: {
    id: 'design',
    title: 'DESIGN',
    tagline: 'Crafting visuals that define your era.',
    description: 'Visual identity, UI/UX, release artwork, and merchandise. We don\'t just make it look good; we create visual systems that stick.',
    items: ['Creative Direction', 'UI/UX Design', 'Merchandise & Apparel', 'Digital Assets', 'Print & Editorial']
  },
  production: {
    id: 'production',
    title: 'PRODUCTION',
    tagline: 'Bringing ambitious concepts to life.',
    description: 'Audio engineering, video direction, content creation, and experiential set design. High-fidelity execution for digital and physical spaces.',
    items: ['Audio Engineering', 'Video & Content Production', 'Photography', 'Experiential Setups', '3D Assets']
  },
  branding: {
    id: 'branding',
    title: 'BRANDING',
    tagline: 'Building a cohesive narrative.',
    description: 'Positioning, storytelling, brand voice, and rollout strategy. We help you define who you are before you tell the world.',
    items: ['Brand Identity', 'Storytelling', 'Tone of Voice', 'Go-to-Market Strategy', 'Market Research']
  },
  marketing: {
    id: 'marketing',
    title: 'MARKETING',
    tagline: 'Amplifying your voice.',
    description: 'Campaign execution, social strategy, audience growth, and analytics. Directing traffic and attention to where it matters most.',
    items: ['Campaign Strategy', 'Social Growth', 'Paid Acquisition', 'Community Building', 'Data Analytics']
  }
};

const CURATED_PACKAGES = [
  {
    title: 'THE BIG RELEASE',
    services: ['Production', 'Marketing', 'Design'],
    description: 'Perfect for dropping an album, launching a flagship product, or executing a highly anticipated rollout.',
    features: ['Full production execution', 'Pre/Post launch marketing', 'Release visual assets']
  },
  {
    title: 'THE DIRECTIONAL PIVOT',
    services: ['Branding', 'Design'],
    description: 'Perfect for established entities undergoing major shifts or refreshing a stale identity.',
    features: ['Comprehensive rebrand', 'New design guidelines', 'Strategic positioning']
  },
  {
    title: 'THE FULL ECOSYSTEM',
    services: ['Design', 'Production', 'Branding', 'Marketing'],
    description: 'End-to-end execution. We handle everything from concept to market dominance.',
    features: ['Priority resource allocation', 'Dedicated creative lead', 'All sync benefits']
  }
];

export default function Services() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [inquirySent, setInquirySent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });

  const toggleService = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getPackageRecommendation = () => {
    if (selectedServices.length === 0) return null;
    if (selectedServices.length === 4) return {
      title: 'THE FULL ECOSYSTEM',
      discount: '15% Sync Discount Applied',
      note: 'Complete synchronized deployment.'
    };
    if (selectedServices.length === 3) return {
      title: 'THE TRIAD SYSTEM',
      discount: '10% Sync Discount Applied',
      note: 'Optimized 3-pillar workflow.'
    };
    if (selectedServices.length === 2) {
      if (selectedServices.includes('design') && selectedServices.includes('branding')) {
        return { title: 'THE PIVOT BUNDLE', discount: '5% Sync Discount', note: 'Visual identity & strategy.' };
      }
      if (selectedServices.includes('production') && selectedServices.includes('marketing')) {
        return { title: 'THE DROP BUNDLE', discount: '5% Sync Discount', note: 'Execution & amplification.' };
      }
      return { title: 'CUSTOM DUAL SYNC', discount: '5% Sync Discount', note: 'Two-pillar integration.' };
    }
    return { title: 'SINGLE MODULE', discount: 'Add more for Sync discounts', note: 'Standalone execution.' };
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send data to a server or CRM.
    setInquirySent(true);
    setFormData({ name: '', email: '', notes: '' });
  };

  const recommendation = getPackageRecommendation();

  return (
    <GenericPage title="SERVICES" color="#6222d8">
      <div className="services-layout">
        
        {/* Section 1: Capabilities */}
        <section className="services-section">
          <div className="services-intro-container">
            <p className="services-intro-text">
              LMNL offers a synchronized ecosystem of capabilities tailored for brands and artists making definitive moves. 
              Whether launching a major rollout or executing a complete directional pivot, our modules work in lockstep.
            </p>
            <p className="services-instructions-text">
              Click the cards below to select modules and build a custom bundle.
            </p>
          </div>

          <h2 className="services-section-title capabilities-title">CAPABILITIES</h2>
          
          <div className="capabilities-grid">
            {Object.values(SERVICES_DATA).map(service => (
              <div 
                key={service.id} 
                className={`capability-card ${selectedServices.includes(service.id) ? 'selected' : ''}`}
                onClick={() => toggleService(service.id)}
                id={`capability-${service.id}`}
              >
                <div className="capability-header">
                  <h3 className="capability-title">{service.title}</h3>
                  <div className="capability-toggle-indicator">
                    {selectedServices.includes(service.id) ? '[-]' : '[+]'}
                  </div>
                </div>
                <p className="capability-tagline">{service.tagline}</p>
                <p className="capability-desc">{service.description}</p>
                <ul className="capability-list">
                  {service.items.map((item, i) => (
                    <li key={i} className="capability-list-item">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Package Sync Builder (Interactive) */}
        <section className="services-section sync-builder-section">
          <div className="sync-builder-header">
            <h2 className="services-section-title sync-builder-title">
              <span>SYNC BUILDER</span>
              <span className="sync-counter">
                {recommendation && <span className="sync-discount-text">({recommendation.discount.replace(' Applied', '')})</span>}
                <span className="sync-counter-number">{selectedServices.length}/4</span>
              </span>
            </h2>

            <div className="sync-display-meter">
              {Object.values(SERVICES_DATA).map(s => (
                <div 
                  key={s.id} 
                  className={`sync-meter-node ${selectedServices.includes(s.id) ? 'active' : ''}`}
                />
              ))}
            </div>
            
            <p className="services-section-subtitle">Select capabilities above to configure your custom bundle.</p>
          </div>

          <div className="sync-builder-container">
            <div className="sync-display">
              {/* Large indicator removed per request */}
            </div>
          </div>
        </section>

        {/* Section 3: Curated Packages */}
        <section className="services-section curated-bundles-section">
          <h2 className="services-section-title curated-bundles-title">CURATED BUNDLES</h2>
          <div className="packages-grid">
            {CURATED_PACKAGES.map((pkg, i) => (
              <div key={i} className="package-card">
                <h3 className="package-title">{pkg.title}</h3>
                <p className="package-desc">{pkg.description}</p>
                <div className="package-tags">
                  {pkg.services.map((s, j) => (
                    <span key={j} className="package-tag">{s}</span>
                  ))}
                </div>
                <ul className="package-features">
                  {pkg.features.map((feat, j) => (
                    <li key={j} className="package-feat-item">{feat}</li>
                  ))}
                </ul>
                <button 
                  className="package-select-btn"
                  onClick={() => {
                    const serviceIds = pkg.services.map(s => s.toLowerCase());
                    setSelectedServices(serviceIds);
                    document.getElementById('inquiry-form-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  CONFIGURE BUNDLE
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Inquiry Form */}
        <section className="services-section inquiry-section" id="inquiry-form-section">
          <h2 className="services-section-title">INITIATE PROJECT</h2>
          {inquirySent ? (
            <div className="inquiry-success">
              <h3 className="success-title">TRANSMISSION RECEIVED.</h3>
              <p className="success-text">A creative lead will reach out within 24 hours.</p>
              <button className="reset-btn" onClick={() => setInquirySent(false)}>NEW INQUIRY</button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="inquiry-form">
              <div className="form-row">
                <input 
                  type="text" 
                  placeholder="NAME / ENTITY" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="inquiry-input"
                  id="inquiry-name"
                />
                <input 
                  type="email" 
                  placeholder="EMAIL ADDRESS" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="inquiry-input"
                  id="inquiry-email"
                />
              </div>
              <textarea 
                placeholder="PROJECT BRIEF / DIRECTIONAL GOALS" 
                required 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="inquiry-textarea"
                id="inquiry-notes"
              />
              
              {selectedServices.length > 0 && (
                <div className="form-selected-services">
                  <span className="form-selected-label">Selected Modules: </span>
                  {selectedServices.map(s => SERVICES_DATA[s].title).join(' + ')}
                </div>
              )}

              <button type="submit" className="inquiry-submit-btn">
                {selectedServices.length > 0 ? 'SUBMIT BUNDLE INQUIRY' : 'SUBMIT INQUIRY'}
              </button>
            </form>
          )}
        </section>

      </div>
    </GenericPage>
  );
}
