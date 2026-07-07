import { useState } from 'react';
import ContentPageShell from '../components/ContentPageShell';
import SystemPanel from '../components/SystemPanel';
import { apiPost } from '../lib/api';
import './FeedTheHorse.css';

const paymentLinks = {
  cashapp: 'https://cash.app/$lmnlart',
  venmo: 'https://venmo.com/lmnlart',
};

const donationAmounts = [
  { label: '$10', value: 10 },
  { label: '$20', value: 20 },
  { label: '$50', value: 50 },
  { label: '$100', value: 100 },
];

export default function FeedTheHorse() {
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [activeAmount, setActiveAmount] = useState(null);

  async function handleDonationCheckout(amount) {
    setCheckoutStatus('loading');
    setActiveAmount(amount);
    const checkoutWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const result = await apiPost('/api/create-donation-checkout', { amount });
      if (checkoutWindow) {
        checkoutWindow.location.href = result.checkoutUrl;
      } else {
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error creating donation checkout:', error);
      if (checkoutWindow) {
        checkoutWindow.close();
      }
      setCheckoutStatus('error');
      setActiveAmount(null);
    }
  }

  return (
    <ContentPageShell
      title="FEED THE HORSE"
      color="#000000"
      introTitle="FEED THE HORSE"
      contentClassName="feed-the-horse-page page-stack"
    >
      <div className="feed-the-horse-layout">
        <section className="feed-the-horse-copy" aria-labelledby="feed-the-horse-heading">
          <p id="feed-the-horse-heading" className="page-copy">
            We are developing LMNL as a bootstrapped, community-powered creative platform. Support keeps the work independent and helps cover the ordinary, necessary parts of building culture: space, equipment, infrastructure, production, and the systems that let people gather around something real. Please consider donating to help us continue our mission.
          </p>
        </section>

        <SystemPanel className="feed-the-horse-donation-panel">
          <div className="feed-the-horse-panel">
            <div className="feed-the-horse-wallets" aria-label="Payment apps">
              <form
                className="feed-the-horse-wallet-form"
                action={paymentLinks.cashapp}
                method="get"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button type="submit" className="theme-button feed-the-horse-wallet">
                  Cash App
                </button>
              </form>
              <form
                className="feed-the-horse-wallet-form"
                action={paymentLinks.venmo}
                method="get"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button type="submit" className="theme-button feed-the-horse-wallet">
                  Venmo
                </button>
              </form>
            </div>

            <div className="feed-the-horse-divider" aria-hidden="true">
              <span>or</span>
            </div>

            <div className="feed-the-horse-amounts" aria-label="Square donation amounts">
              {donationAmounts.map((amount) => (
                <button
                  key={amount.label}
                  type="button"
                  className="feed-the-horse-amount"
                  onClick={() => handleDonationCheckout(amount.value)}
                  disabled={checkoutStatus === 'loading'}
                >
                  {checkoutStatus === 'loading' && activeAmount === amount.value ? 'Opening' : amount.label}
                </button>
              ))}
            </div>

            {checkoutStatus === 'error' ? (
              <p className="feed-the-horse-error">
                Unable to open Square checkout right now. Please try again.
              </p>
            ) : null}
          </div>
        </SystemPanel>
      </div>
    </ContentPageShell>
  );
}
