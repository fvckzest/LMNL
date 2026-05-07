export default function LmnlLogoBlack({ className }) {
  return (
    <div className={`lmnl-wordmark ${className || ''}`} aria-label="LMNL">
      <img className="lmnl-wordmark__text" alt="LMNL" src="/lmnl-logo-black.png" />
    </div>
  );
}
