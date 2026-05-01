import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GenericPage from './GenericPage';
import { apiGet, apiPost } from '../lib/api';
import './ShopCheckout.css';

function formatPrice(amount) {
  return `$${(Number(amount || 0) / 100).toFixed(2)}`;
}

function initialFormState() {
  return {
    fullName: '',
    email: '',
    phone: '',
  };
}

async function fetchCheckoutData({ checkoutMode, preorderId, requestId, eventId }) {
  if (checkoutMode === 'request') {
    return apiGet(`/api/request-checkout?requestId=${requestId}`);
  }

  if (checkoutMode === 'event') {
    return apiGet(`/api/event-checkout?eventId=${eventId}`);
  }

  return apiGet(`/api/preorder-checkout?preorderId=${preorderId}`);
}

export default function ShopCheckout() {
  const { preorderId, requestId, eventId } = useParams();
  const [checkout, setCheckout] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const checkoutMode = requestId ? 'request' : (eventId ? 'event' : 'preorder');

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchCheckoutData({ checkoutMode, preorderId, requestId, eventId });
        if (!active) return;

        setCheckout(data);
        setForm(
          checkoutMode === 'request'
            ? {
              fullName: data.request?.customerName || '',
              email: data.request?.customerEmail || '',
              phone: '',
            }
            : initialFormState()
        );
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load checkout.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCheckout();

    return () => {
      active = false;
    };
  }, [checkoutMode, preorderId, requestId, eventId]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleContinue(event) {
    event.preventDefault();
    if (!checkout) return;

    setSubmitting(true);
    setError('');

    try {
      const endpoint = checkoutMode === 'request'
        ? '/api/create-request-checkout'
        : (checkoutMode === 'event' ? '/api/create-event-checkout' : '/api/create-checkout');

      const result = await apiPost(endpoint, {
        ...(checkoutMode === 'request'
          ? { requestId }
          : (checkoutMode === 'event' ? { eventId } : { preorderId })),
        buyer: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
        },
      });

      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err.message || 'Unable to start secure checkout.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <GenericPage title="CHECKOUT" color="#ff0000">
        <div className="checkout-loading">PREPARING SECURE CHECKOUT...</div>
      </GenericPage>
    );
  }

  if (!checkout) {
    return (
      <GenericPage title="CHECKOUT" color="#ff0000">
        <div className="checkout-error-panel theme-panel">
          <p>{error || 'Checkout is unavailable.'}</p>
          <Link to="/shop" className="checkout-back-link theme-button">RETURN TO SHOP</Link>
        </div>
      </GenericPage>
    );
  }

  const title = checkoutMode === 'event' || checkoutMode === 'request'
    ? 'TICKET CHECKOUT'
    : 'SECURE CHECKOUT';
  const description = checkoutMode === 'preorder'
    ? 'You’ll finish payment on Square’s hosted checkout page, where Square-managed coupon codes are available.'
    : 'You’ll finish payment on Square’s hosted checkout page and return here after your order is confirmed.';

  return (
    <GenericPage title="CHECKOUT" color="#ff0000">
      <div className="checkout-grid">
        <section className="checkout-product-card theme-panel">
          {checkout.imageUrl ? (
            <img src={checkout.imageUrl} alt={checkout.itemName} className="checkout-product-image" />
          ) : (
            <div className="checkout-product-image placeholder" />
          )}
          <div className="checkout-product-meta">
            <span className="checkout-category">{checkout.category || checkout.checkoutCategory}</span>
            <p className="checkout-description">{checkout.description || 'Limited LMNL release.'}</p>
          </div>
          <div className="checkout-summary-row">
            <span>TOTAL</span>
            <strong>{formatPrice(checkout.price)}</strong>
          </div>
        </section>

        <section className="checkout-form-card theme-panel">
          <form className="checkout-form theme-form" onSubmit={handleContinue}>
            <div className="checkout-section">
              <p className="checkout-section-label">{title}</p>
              <p className="checkout-payment-trust">{description}</p>
            </div>

            <div className="checkout-section">
              <label className="theme-field">
                FULL NAME
                <input className="theme-input" name="fullName" value={form.fullName} onChange={updateField} required={checkoutMode !== 'preorder'} />
              </label>
              <label className="theme-field">
                EMAIL
                <input className="theme-input" name="email" type="email" value={form.email} onChange={updateField} required={checkoutMode !== 'preorder'} />
              </label>
              <label className="theme-field">
                PHONE
                <input className="theme-input" name="phone" value={form.phone} onChange={updateField} />
              </label>
            </div>

            {(error) && <p className="checkout-error">{error}</p>}

            <button type="submit" className="checkout-submit theme-button" disabled={submitting}>
              {submitting ? 'OPENING SQUARE...' : 'CONTINUE TO SQUARE'}
            </button>
          </form>
        </section>
      </div>
    </GenericPage>
  );
}
