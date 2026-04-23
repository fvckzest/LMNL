import HeaderBar from '../components/HeaderBar';
import Footer from '../components/Footer';

export default function GenericPage({ title, color, children }) {
  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: color }} />
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="generic-page-body">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
