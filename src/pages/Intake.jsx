import { useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import { hasSupabaseCredentials, supabase } from '../lib/supabase';
import './Intake.css';

const initialFormData = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  current_website: '',
  social_links: '',
  business_location: '',
  service_area: '',
  website_goal: '',
  primary_action: '',
  target_audience: '',
  desired_feeling: '',
  requested_pages: [],
  existing_assets: [],
  style_references: '',
  disliked_references: '',
  needed_features: [],
  timeline: '',
  budget_range: '',
  decision_makers: '',
  additional_notes: '',
};

const requestedPageOptions = [
  'Home',
  'About',
  'Services',
  'Portfolio',
  'Shop',
  'Events',
  'Blog',
  'Contact',
  'Landing page',
  'Other',
];

const existingAssetOptions = [
  'Logo',
  'Brand colors',
  'Fonts',
  'Photography',
  'Video',
  'Written copy',
  'Product info',
  'Testimonials',
  'None yet',
];

const neededFeatureOptions = [
  'Contact form',
  'Booking',
  'Payments',
  'Newsletter signup',
  'Portfolio',
  'Blog',
  'Events calendar',
  'Member login',
  'Analytics',
  'SEO setup',
];

function TextField({ id, label, required = false, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <div className="theme-field">
      <label className="theme-field-label" htmlFor={id}>
        {label}{required ? ' *' : ''}
      </label>
      <input
        id={id}
        type={type}
        className="theme-input"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function TextAreaField({ id, label, required = false, value, onChange, placeholder = '', rows = 4, disabled = false }) {
  return (
    <div className="theme-field is-full">
      <label className="theme-field-label" htmlFor={id}>
        {label}{required ? ' *' : ''}
      </label>
      <textarea
        id={id}
        className="theme-input"
        required={required}
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function CheckboxGroup({ label, name, options, values, onChange, disabled = false }) {
  function toggleValue(option) {
    const nextValues = values.includes(option)
      ? values.filter((value) => value !== option)
      : [...values, option];
    onChange(nextValues);
  }

  return (
    <fieldset className="intake-checkbox-group is-full">
      <legend className="theme-field-label">{label}</legend>
      <div className="intake-checkbox-grid">
        {options.map((option) => (
          <label key={option} className="intake-checkbox-option">
            <input
              type="checkbox"
              name={name}
              checked={values.includes(option)}
              onChange={() => toggleValue(option)}
              disabled={disabled}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function IntakeSection({ title, children }) {
  return (
    <section className="intake-section">
      <div className="intake-section__header">
        <h2 className="intake-section__title">{title}</h2>
      </div>
      <div className="intake-section__grid">
        {children}
      </div>
    </section>
  );
}

export default function Intake() {
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isSubmitting = status === 'loading';

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!hasSupabaseCredentials || !supabase.from) {
      setStatus('error');
      setErrorMessage('Supabase is not configured for this environment.');
      return;
    }

    const payload = {
      ...formData,
      source: 'website_intake',
      status: 'new',
    };

    try {
      const { error } = await supabase
        .from('website_intake_submissions')
        .insert(payload);

      if (error) {
        throw error;
      }

      setStatus('success');
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error submitting website intake:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Submission failed. Please try again.');
    }
  }

  function handleReset() {
    setStatus('idle');
    setErrorMessage('');
  }

  return (
    <ContentPageShell
      title="INTAKE"
      color="#7b52d6"
      introTitle="website intake"
      introCopy="tell us what you need, what exists, and what the site needs to do."
      contentClassName="intake-layout page-stack"
    >
      <section className="intake-overview theme-surface theme-surface--panel">
        <p className="theme-body-copy">
          Share the practical details, the taste references, and the decisions already in motion.
          Clear inputs help us shape a site that knows what job it has.
        </p>
      </section>

      <section className="intake-form-shell">
        <div className="intake-form-shell__header">
          <p className="theme-body-copy">The required fields are marked with an asterisk.</p>
        </div>

        {status === 'success' ? (
          <div className="intake-success theme-message-stack">
            <h2 className="theme-title-md">INTAKE RECEIVED.</h2>
            <p className="theme-body-copy">
              Thanks. We have the brief and will review the shape of the project next.
            </p>
            <button type="button" className="theme-button intake-submit-button" onClick={handleReset}>
              SEND ANOTHER INTAKE
            </button>
          </div>
        ) : (
          <form className="intake-form theme-form" onSubmit={handleSubmit}>
            <IntakeSection title="business basics">
              <TextField
                id="business-name"
                label="Business name"
                required
                value={formData.business_name}
                onChange={(value) => updateField('business_name', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="contact-name"
                label="Contact name"
                required
                value={formData.contact_name}
                onChange={(value) => updateField('contact_name', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="email"
                label="Email"
                required
                type="email"
                value={formData.email}
                onChange={(value) => updateField('email', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="phone"
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(value) => updateField('phone', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="current-website"
                label="Current website"
                type="url"
                placeholder="https://"
                value={formData.current_website}
                onChange={(value) => updateField('current_website', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="business-location"
                label="Business location"
                value={formData.business_location}
                onChange={(value) => updateField('business_location', value)}
                disabled={isSubmitting}
              />
              <TextAreaField
                id="social-links"
                label="Social links"
                value={formData.social_links}
                onChange={(value) => updateField('social_links', value)}
                placeholder="Instagram, TikTok, LinkedIn, etc."
                disabled={isSubmitting}
              />
            </IntakeSection>

            <IntakeSection title="website goals">
              <TextAreaField
                id="website-goal"
                label="Website goal"
                required
                value={formData.website_goal}
                onChange={(value) => updateField('website_goal', value)}
                placeholder="What should this website make possible?"
                disabled={isSubmitting}
              />
              <TextField
                id="primary-action"
                label="Primary action"
                required
                value={formData.primary_action}
                onChange={(value) => updateField('primary_action', value)}
                placeholder="Book, buy, inquire, join, visit, etc."
                disabled={isSubmitting}
              />
              <TextAreaField
                id="target-audience"
                label="Target audience"
                value={formData.target_audience}
                onChange={(value) => updateField('target_audience', value)}
                placeholder="Who needs to understand and trust this quickly?"
                disabled={isSubmitting}
              />
              <TextAreaField
                id="desired-feeling"
                label="Desired feeling"
                value={formData.desired_feeling}
                onChange={(value) => updateField('desired_feeling', value)}
                placeholder="What should the site feel like?"
                disabled={isSubmitting}
              />
            </IntakeSection>

            <IntakeSection title="pages + content">
              <CheckboxGroup
                label="Requested pages"
                name="requested_pages"
                options={requestedPageOptions}
                values={formData.requested_pages}
                onChange={(value) => updateField('requested_pages', value)}
                disabled={isSubmitting}
              />
              <CheckboxGroup
                label="Existing assets"
                name="existing_assets"
                options={existingAssetOptions}
                values={formData.existing_assets}
                onChange={(value) => updateField('existing_assets', value)}
                disabled={isSubmitting}
              />
            </IntakeSection>

            <IntakeSection title="style + references">
              <TextAreaField
                id="style-references"
                label="Style references"
                value={formData.style_references}
                onChange={(value) => updateField('style_references', value)}
                placeholder="Sites, brands, colors, moods, words, images, or links you like."
                disabled={isSubmitting}
              />
            </IntakeSection>

            <IntakeSection title="features + logistics">
              <CheckboxGroup
                label="Needed features"
                name="needed_features"
                options={neededFeatureOptions}
                values={formData.needed_features}
                onChange={(value) => updateField('needed_features', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="timeline"
                label="Timeline"
                value={formData.timeline}
                onChange={(value) => updateField('timeline', value)}
                disabled={isSubmitting}
              />
              <TextField
                id="budget-range"
                label="Budget range"
                value={formData.budget_range}
                onChange={(value) => updateField('budget_range', value)}
                disabled={isSubmitting}
              />
              <TextAreaField
                id="decision-makers"
                label="Decision makers"
                value={formData.decision_makers}
                onChange={(value) => updateField('decision_makers', value)}
                placeholder="Who needs to review or approve the site?"
                disabled={isSubmitting}
              />
              <TextAreaField
                id="additional-notes"
                label="Additional notes"
                value={formData.additional_notes}
                onChange={(value) => updateField('additional_notes', value)}
                placeholder="Anything else we should know."
                disabled={isSubmitting}
              />
            </IntakeSection>

            {status === 'error' ? (
              <p className="page-form-error intake-form-error">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              className="theme-button intake-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'TRANSMITTING...' : 'SUBMIT INTAKE'}
            </button>
          </form>
        )}
      </section>
    </ContentPageShell>
  );
}
