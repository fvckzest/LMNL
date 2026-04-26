import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';
import './Events.css';

export default function Events() {
  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content events-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: '#004ffa' }} />
          <h1 className="page-title events-title">EVENTS</h1>
        </div>

        <div className="events-timeline">
          <div className="events-node">
            <a href="/space" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 className="events-space-title">[SPACE]</h2>
            </a>
          </div>


          <div className="events-divider" />

          <div className="events-node">
            <img src="/cz1.png" alt="Camp Zest" className="events-img" />
          </div>

          <div className="events-divider" />

          <div className="events-node">
            <img src="/title1.png" alt="Bloom" className="events-img" />
          </div>

          <div className="events-divider" />

          <div className="events-node">
            <img src="/genesis-logo.png" alt="Genesis" className="events-img" />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
