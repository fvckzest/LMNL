export default function SpacePriceCard({
  price,
  eventStatus,
  isPrivate,
  eventId,
  onInvite,
  onPurchase,
  onDonate,
}) {
  const isLoaded = price !== undefined;
  const formattedPrice = isLoaded ? (price / 100).toFixed(2) : '---';

  return (
    <div className="space-price-container">
      <p className="space-price-label">admission</p>
      <div className="space-price-content">
        <div className="space-price-value">
          <span className="currency-symbol">$</span>
          {formattedPrice}
        </div>
        <div className="space-price-status">
          <span className="pulse-dot active" />
          LIVE FROM SQUARE
        </div>

        <div className="space-price-actions">
          {eventStatus === 'sold_out' ? (
            <button className="space-button sold-out" disabled>
              sold out
            </button>
          ) : (
            <button className="space-button" onClick={isPrivate ? onInvite : onPurchase} disabled={!eventId}>
              {isPrivate ? 'request invite' : 'purchase'}
            </button>
          )}
          <button className="space-button" onClick={onDonate}>
            feed the horse
          </button>
        </div>
      </div>
    </div>
  );
}
