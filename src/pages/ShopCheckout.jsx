import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GenericPage from './GenericPage';
import { apiGet, apiPost } from '../lib/api';
import './ShopCheckout.css';

function loadSquareSdk(environment) {
  const existing = document.querySelector('script[data-square-sdk="true"]');
  const source = environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';

  if (existing && existing.getAttribute('src') === source && window.Square) {
    return Promise.resolve(window.Square);
  }

  if (existing) {
    existing.remove();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.dataset.squareSdk = 'true';
    script.onload = () => resolve(window.Square);
    script.onerror = () => reject(new Error('Unable to load Square checkout.'));
    document.head.appendChild(script);
  });
}

function formatPrice(amount) {
  return `$${(Number(amount || 0) / 100).toFixed(2)}`;
}

function splitName(fullName) {
  const [firstName = '', ...rest] = String(fullName || '').trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' '),
  };
}

function initialFormState() {
  return {
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    administrativeDistrictLevel1: '',
    postalCode: '',
    country: 'US',
  };
}

function buildBillingContact(form) {
  const { firstName, lastName } = splitName(form.fullName);
  return {
    givenName: firstName || undefined,
    familyName: lastName || undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    addressLines: [form.addressLine1, form.addressLine2].filter(Boolean),
    city: form.locality || undefined,
    state: form.administrativeDistrictLevel1 || undefined,
    countryCode: form.country || 'US',
    postalCode: form.postalCode || undefined,
  };
}

function buildAddress(form) {
  const { firstName, lastName } = splitName(form.fullName);
  return {
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    locality: form.locality,
    administrativeDistrictLevel1: form.administrativeDistrictLevel1,
    postalCode: form.postalCode,
    country: form.country || 'US',
    firstName,
    lastName,
  };
}

async function verifyBuyer(payments, sourceId, checkout, form) {
  if (!payments || !sourceId || !checkout) {
    return '';
  }

  const result = await payments.verifyBuyer(sourceId, {
    amount: checkout.displayPrice,
    currencyCode: checkout.square.currencyCode,
    intent: 'CHARGE',
    billingContact: buildBillingContact(form),
  });

  return result?.token || '';
}

function normalizeWalletAddress(details = {}, form = {}) {
  const shipping = details.shipping || {};
  const billing = details.billing || {};
  const base = shipping.contact || billing.contact || {};
  const address = shipping.address || billing.address || {};

  return {
    fullName: [base.givenName, base.familyName].filter(Boolean).join(' ') || form.fullName,
    email: base.email || form.email,
    phone: base.phone || form.phone,
    addressLine1: address.addressLine1 || form.addressLine1,
    addressLine2: address.addressLine2 || form.addressLine2,
    locality: address.locality || form.locality,
    administrativeDistrictLevel1: address.administrativeDistrictLevel1 || form.administrativeDistrictLevel1,
    postalCode: address.postalCode || form.postalCode,
    country: address.country || form.country || 'US',
  };
}

export default function ShopCheckout() {
  const { preorderId, requestId, eventId } = useParams();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const cardInstanceRef = useRef(null);
  const squareInstanceRef = useRef(null);
  const googlePayInstanceRef = useRef(null);
  const applePayInstanceRef = useRef(null);
  const [checkout, setCheckout] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [initializingPayment, setInitializingPayment] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const requiresShipping = checkout?.requiresShipping;
  const checkoutMode = requestId ? 'request' : (eventId ? 'event' : 'preorder');

  const onWalletPayment = useEffectEvent(async (method) => {
    const wallet = method === 'apple' ? applePayInstanceRef.current : googlePayInstanceRef.current;
    if (!wallet) return;

    setSubmitting(true);
    setError('');

    try {
      const tokenResult = await wallet.tokenize();
      if (tokenResult.status !== 'OK') {
        throw new Error('Wallet payment was not completed.');
      }

      const mergedForm = normalizeWalletAddress(tokenResult.details || null, form);
      const verificationToken = await verifyBuyer(squareInstanceRef.current, tokenResult.token, checkout, mergedForm);
      await submitPayment(tokenResult.token, mergedForm, verificationToken);
    } catch (err) {
      setError(err.message || 'Payment failed.');
      setSubmitting(false);
    }
  });


  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet(`/api/preorder-checkout?preorderId=${preorderId}`);
        if (!active) return;
        setCheckout(data);
        setForm(initialFormState());
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load checkout.');
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadRequestCheckout() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet(`/api/request-checkout?requestId=${requestId}`);
        if (!active) return;
        setCheckout(data);
        setForm(current => ({
          ...current,
          fullName: data.request?.customerName || '',
          email: data.request?.customerEmail || '',
        }));
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load checkout.');
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadEventCheckout() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet(`/api/event-checkout?eventId=${eventId}`);
        if (!active) return;
        setCheckout(data);
        setForm(initialFormState());
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load checkout.');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (checkoutMode === 'request') {
      loadRequestCheckout();
    } else if (checkoutMode === 'event') {
      loadEventCheckout();
    } else {
      loadCheckout();
    }
    return () => {
      active = false;
    };
  }, [checkoutMode, preorderId, requestId, eventId]);

  useEffect(() => {
    if (!checkout) {
      return;
    }

    if (!checkout?.square?.applicationId || !checkout?.square?.locationId) {
      setInitializingPayment(false);
      setError('Payment is temporarily unavailable. Please try again shortly.');
      return;
    }

    if (!cardRef.current) {
      return;
    }

    let active = true;

    async function initializePayments() {
      setInitializingPayment(true);
      setError('');

      try {
        const Square = await loadSquareSdk(checkout.square.environment);
        if (!active || !Square) return;

        const payments = Square.payments(checkout.square.applicationId, checkout.square.locationId);
        squareInstanceRef.current = payments;

        const card = await payments.card();
        if (!active) return;
        await card.attach('#checkout-card-slot');
        cardInstanceRef.current = card;

        const paymentRequest = payments.paymentRequest({
          countryCode: checkout.square.countryCode,
          currencyCode: checkout.square.currencyCode,
          requestBillingContact: true,
          requestShippingContact: checkout.requiresShipping,
          total: {
            amount: checkout.displayPrice,
            label: checkout.itemName,
          },
        });

        try {
          const googlePay = await payments.googlePay(paymentRequest);
          await googlePay.attach('#google-pay-button', {
            buttonColor: 'black',
            buttonBorderType: 'default_border',
            buttonRadius: 0,
            buttonSizeMode: 'fill',
            buttonType: 'long',
          });
          googlePayInstanceRef.current = googlePay;
          const googlePayButton = document.getElementById('google-pay-button');
          if (googlePayButton) {
            googlePayButton.onclick = () => onWalletPayment('google');
          }
        } catch (walletError) {
          console.warn('Google Pay unavailable', walletError);
        }

        try {
          const applePay = await payments.applePay(paymentRequest);
          await applePay.attach('#apple-pay-button');
          applePayInstanceRef.current = applePay;
          const applePayButton = document.getElementById('apple-pay-button');
          if (applePayButton) {
            applePayButton.onclick = () => onWalletPayment('apple');
          }
        } catch (walletError) {
          console.warn('Apple Pay unavailable', walletError);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to initialize payment fields.');
      } finally {
        if (active) setInitializingPayment(false);
      }
    }

    initializePayments();

    return () => {
      active = false;
      const cleanups = [
        cardInstanceRef.current?.destroy?.(),
        googlePayInstanceRef.current?.destroy?.(),
        applePayInstanceRef.current?.destroy?.(),
      ].filter(Boolean);

      Promise.allSettled(cleanups).catch(() => {});
      cardInstanceRef.current = null;
      googlePayInstanceRef.current = null;
      applePayInstanceRef.current = null;
    };
  }, [checkout]);

  const verificationDetails = useMemo(() => {
    if (!checkout) return null;
    return {
      amount: checkout.displayPrice,
      currencyCode: checkout.square.currencyCode,
      intent: 'CHARGE',
      billingContact: buildBillingContact(form),
      customerInitiated: true,
      sellerKeyedIn: false,
    };
  }, [checkout, form]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  async function submitPayment(sourceId, mergedForm = form, verificationToken = '') {
    if (!checkout) return;

    setSubmitting(true);
    setError('');

    const billingAddress = buildAddress(mergedForm);
    const shippingAddress = requiresShipping ? buildAddress(mergedForm) : {};

    try {
      const endpoint = checkoutMode === 'request'
        ? '/api/pay-request'
        : (checkoutMode === 'event' ? '/api/pay-event' : '/api/pay-preorder');
      const result = await apiPost(endpoint, {
        ...(checkoutMode === 'request'
          ? { requestId }
          : (checkoutMode === 'event' ? { eventId } : { preorderId })),
        sourceId,
        buyer: {
          fullName: mergedForm.fullName,
          email: mergedForm.email,
          phone: mergedForm.phone,
        },
        billingAddress,
        shippingAddress,
        verificationToken,
      });

      navigate(result.redirectUrl.replace(window.location.origin, ''));
    } catch (err) {
      setError(err.message || 'Payment failed.');
      setSubmitting(false);
    }
  }

  async function handleCardPayment(event) {
    event.preventDefault();
    if (!cardInstanceRef.current || !verificationDetails) return;

    setSubmitting(true);
    setError('');

    try {
      const tokenResult = await cardInstanceRef.current.tokenize(verificationDetails);
      if (tokenResult.status !== 'OK') {
        throw new Error('Card details could not be verified.');
      }

      const verificationToken = await verifyBuyer(squareInstanceRef.current, tokenResult.token, checkout, form);
      await submitPayment(tokenResult.token, form, verificationToken);
    } catch (err) {
      setError(err.message || 'Payment failed.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <GenericPage title="CHECKOUT" color="#ff0000">
        <div className="checkout-loading">PREPARING CHECKOUT...</div>
      </GenericPage>
    );
  }

  if (!checkout) {
    return (
      <GenericPage title="CHECKOUT" color="#ff0000">
        <div className="checkout-error-panel">
          <p>{error || 'Checkout is unavailable.'}</p>
          <Link to="/shop" className="checkout-back-link">RETURN TO SHOP</Link>
        </div>
      </GenericPage>
    );
  }

  return (
    <GenericPage title="CHECKOUT" color="#ff0000">
      <div className="checkout-grid">
        <section className="checkout-product-card">
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

          <section className="checkout-form-card">
            <form className="checkout-form" onSubmit={handleCardPayment}>
              <div className="checkout-section">
                <label>
                FULL NAME
                <input name="fullName" value={form.fullName} onChange={updateField} required />
              </label>
              <label>
                EMAIL
                <input name="email" type="email" value={form.email} onChange={updateField} required />
              </label>
              {requiresShipping && (
                <label>
                  PHONE
                  <input name="phone" value={form.phone} onChange={updateField} required />
                </label>
              )}
            </div>

            {requiresShipping && (
              <div className="checkout-section">
                <p className="checkout-section-label">SHIPPING</p>
                <label>
                  ADDRESS LINE 1
                  <input name="addressLine1" value={form.addressLine1} onChange={updateField} required />
                </label>
                <label>
                  ADDRESS LINE 2
                  <input name="addressLine2" value={form.addressLine2} onChange={updateField} />
                </label>
                <div className="checkout-row">
                  <label>
                    CITY
                    <input name="locality" value={form.locality} onChange={updateField} required />
                  </label>
                  <label>
                    STATE
                    <input name="administrativeDistrictLevel1" value={form.administrativeDistrictLevel1} onChange={updateField} required />
                  </label>
                </div>
                <div className="checkout-row">
                  <label>
                    ZIP
                    <input name="postalCode" value={form.postalCode} onChange={updateField} required />
                  </label>
                  <label>
                    COUNTRY
                    <input name="country" value={form.country} onChange={updateField} required />
                  </label>
                </div>
              </div>
            )}

            <div className="checkout-section">
              <p className="checkout-section-label">PAYMENT</p>
              <div ref={cardRef} id="checkout-card-slot" className="checkout-card-slot" />
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button type="submit" className="checkout-submit" disabled={initializingPayment || submitting}>
              {submitting ? 'PROCESSING...' : `PAY ${formatPrice(checkout.price)}`}
            </button>
          </form>
        </section>
      </div>
    </GenericPage>
  );
}
