import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import GenericPage from './GenericPage';
import './Shop.css';

function ProductCard({ product, onPurchase }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const isPreorder = product.goal_quantity > 0;
  const progressPercent = isPreorder ? (product.current_quantity / product.goal_quantity) * 100 : 0;

  useEffect(() => {
    if (!product.end_date || !isPreorder) return;

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
  }, [product.end_date, isPreorder]);

  const handleBuy = async () => {
    setIsProcessing(true);
    await onPurchase(product);
    setIsProcessing(false);
  };

  return (
    <div className="drop-hero">
      {/* Left: Image */}
      <div className="drop-image-container">
        <div className="drop-badge">{isPreorder ? 'PREORDER OPEN' : 'IN STOCK'}</div>
        <img 
          src={product.image_url || "/lmnl_hoodie_mockup_1777568946142.png"} 
          alt={product.item_name} 
          className="drop-image" 
        />
      </div>

      {/* Middle: Info */}
      <div className="drop-info">
        <div className="drop-title-wrap">
          <span className="drop-category">{product.category}</span>
          <h2 className="drop-name">{product.item_name}</h2>
          <span className="drop-price">${((product.price || 0) / 100).toFixed(2)}</span>
        </div>

        <p className="drop-description">{product.description}</p>
      </div>

      {/* Right: Timer, Progress & Purchase */}
      <div className="drop-actions-sidebar">
        {isPreorder ? (
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
        ) : (
          <div className="persistent-info">
            <span className="stats-label" style={{ marginBottom: '10px' }}>Availability</span>
            <div className="persistent-status">ALWAYS LIVE</div>
            <p className="purchase-note" style={{ marginTop: '10px' }}>Ships within 3-5 business days.</p>
          </div>
        )}

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
                {isPreorder ? 'PREORDER' : 'BUY NOW'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
          {isPreorder && <p className="purchase-note">Estimated shipping: 3-4 weeks after drop ends.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('merch_preorders')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    } else if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  async function handlePurchase(product) {
    setError(null);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preorderId: product.id,
          squareItemId: product.square_item_id
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to generate checkout link');
      }
    } catch (err) {
      console.error('Purchase Error:', err);
      setError('Failed to start checkout. Please try again.');
    }
  }

  if (loading) {
    return (
      <GenericPage title="SHOP" color="#ff0000">
        <div className="shop-layout">
          <p className="loading-text">FETCHING SHOP...</p>
        </div>
      </GenericPage>
    );
  }

  return (
    <GenericPage title="SHOP" color="#ff0000">
      <div className="shop-layout">
        {products.length === 0 ? (
          <p className="loading-text" style={{ marginTop: '100px' }}>NO ACTIVE PRODUCTS AT THE MOMENT. CHECK BACK SOON.</p>
        ) : (
          products.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onPurchase={handlePurchase} 
            />
          ))
        )}
        {error && <p className="error-text" style={{ color: '#ff0000', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>{error}</p>}
      </div>
    </GenericPage>
  );
}
