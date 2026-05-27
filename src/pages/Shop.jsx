import { useState, useEffect } from 'react';
import GenericPage from './GenericPage';
import { PageEmptyState, PageStatus } from '../components/ContentPageShell';
import { apiPost } from '../lib/api';
import { fetchOpenProducts } from '../lib/siteData';

function formatPrice(price) {
  return `$${((price || 0) / 100).toFixed(2)}`;
}

function PreorderProductCard({ product, onPurchase }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const progressPercent = product.goal_quantity > 0 ? (product.current_quantity / product.goal_quantity) * 100 : 0;

  useEffect(() => {
    if (!product.end_date) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(product.end_date).getTime();
      const distance = end - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product.end_date]);

  const handleBuy = async () => {
    setIsProcessing(true);
    await onPurchase(product);
    setIsProcessing(false);
  };

  return (
    <div className="drop-hero">
      {/* Left: Image */}
      <div className="drop-image-container">
        <div className="drop-badge">PREORDER OPEN</div>
        <img 
          src={product.image_url || "/lmnl_hoodie_mockup_1777568946142.png"} 
          alt={product.item_name} 
          decoding="async"
          className="drop-image" 
        />
      </div>

      {/* Middle: Info */}
      <div className="drop-info">
        <div className="drop-title-wrap">
          <span className="drop-category">{product.category}</span>
          <h2 className="drop-name">{product.item_name}</h2>
          <span className="drop-price">{formatPrice(product.price)}</span>
        </div>

        <p className="drop-description">{product.description}</p>
      </div>

      {/* Right: Timer, Progress & Purchase */}
      <div className="drop-actions-sidebar">
        <>
          <div className="drop-timer-wrap">
            <span className="stats-label">Time Remaining</span>
            <div className="drop-timer">
              <div className="timer-unit">
                <span className="timer-value">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="timer-label">Days</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="timer-label">Hrs</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="timer-label">Min</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="timer-label">Sec</span>
              </div>
            </div>
          </div>

          <div className="drop-progress-container">
            <div className="progress-stats">
              <span className="stats-label">Drop Progress</span>
              <span className="stats-value">{product.current_quantity} / {product.goal_quantity} UNITS</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <span className="purchase-note">Production begins once 100% is reached.</span>
          </div>
        </>

        <div className="purchase-actions">
          <button 
            className={`preorder-btn ${isProcessing ? 'loading' : ''}`} 
            onClick={handleBuy}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                GENERATING LINK...
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </>
            ) : (
              <>
                PREORDER
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
          <p className="purchase-note">Estimated shipping: 3-4 weeks after drop ends.</p>
        </div>
      </div>
    </div>
  );
}

function PersistentProductCard({ product, onPurchase }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
    setIsProcessing(true);
    await onPurchase(product);
    setIsProcessing(false);
  };

  return (
    <article className="persistent-card">
      <div className="persistent-card-image-wrap">
        <img
          src={product.image_url || "/lmnl_hoodie_mockup_1777568946142.png"}
          alt={product.item_name}
          decoding="async"
          className="persistent-card-image"
        />
      </div>

      <div className="persistent-card-body">
        <div className="persistent-card-topline">
          <span className="persistent-card-category">{product.category}</span>
          <span className="persistent-card-price">{formatPrice(product.price)}</span>
        </div>

        <h3 className="persistent-card-name">{product.item_name}</h3>
        <p className="persistent-card-description">{product.description}</p>

        <div className="persistent-card-footer">
          <div className="persistent-card-meta">
            <span>Ready to ship</span>
            <span>3-5 business days</span>
          </div>

          <button
            className={`persistent-card-btn ${isProcessing ? 'loading' : ''}`}
            onClick={handleBuy}
            disabled={isProcessing}
          >
            {isProcessing ? 'OPENING...' : 'BUY NOW'}
          </button>
        </div>
      </div>
    </article>
  );
}

function getBrowserSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function getSearchParam(searchParams, key) {
  if (typeof searchParams?.get === 'function') {
    return searchParams.get(key);
  }

  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value || null;
}

export default function Shop({ searchParams: providedSearchParams } = {}) {
  const searchParams = providedSearchParams || getBrowserSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkoutSuccess = getSearchParam(searchParams, 'checkout') === 'success';
  const preorderProducts = products.filter((product) => product.goal_quantity > 0);
  const persistentProducts = products.filter((product) => product.goal_quantity <= 0);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchOpenProducts();
        setProducts(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  async function handlePurchase(product) {
    setError(null);
    try {
      const result = await apiPost('/api/create-checkout', {
        preorderId: product.id,
      });
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      console.error('Purchase Error:', err);
      setError('Failed to start checkout. Please try again.');
    }
  }

  if (loading) {
    return (
      <GenericPage
        title="SHOP"
        color="#ff0000"
        introTitle="SHOP"
        introCopy="DROPS, PREORDERS, AND CORE PIECES"
        contentClassName="page-stack"
      >
        <div className="shop-layout">
          <PageStatus>FETCHING SHOP...</PageStatus>
        </div>
      </GenericPage>
    );
  }

  return (
    <GenericPage
      title="SHOP"
      color="#ff0000"
      introTitle="SHOP"
      introCopy="DROPS, PREORDERS, AND CORE PIECES"
      contentClassName="page-stack"
    >
      <div className="shop-layout">
        {checkoutSuccess && (
          <div className="shop-success-banner">
            PAYMENT RECEIVED. YOUR ORDER IS LOCKED IN.
          </div>
        )}
        {products.length === 0 ? (
          <PageEmptyState>NO ACTIVE PRODUCTS AT THE MOMENT. CHECK BACK SOON.</PageEmptyState>
        ) : (
          <>
            {preorderProducts.length > 0 && (
              <section className="shop-section">
                <div className="shop-section-heading theme-section-heading">
                  <span className="shop-section-kicker theme-section-kicker">Live Drops</span>
                  <h2 className="shop-section-title theme-section-title">Open Preorders</h2>
                </div>
                <div className="shop-preorder-list">
                  {preorderProducts.map((product) => (
                    <PreorderProductCard
                      key={product.id}
                      product={product}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </section>
            )}

            {persistentProducts.length > 0 && (
              <section className="shop-section shop-section-persistent">
                <div className="shop-section-heading theme-section-heading">
                  <span className="shop-section-kicker theme-section-kicker">Core Pieces</span>
                  <h2 className="shop-section-title shop-section-title-compact theme-section-title">Permanent Collection</h2>
                  <p className="shop-section-copy theme-section-copy">
                    Staple LMNL pieces that stay in rotation and ship on a standard turnaround.
                  </p>
                </div>

                <div className="persistent-grid">
                  {persistentProducts.map((product) => (
                    <PersistentProductCard
                      key={product.id}
                      product={product}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {error && <p className="page-form-error">{error}</p>}
      </div>
    </GenericPage>
  );
}
