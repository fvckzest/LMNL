import { useEffect } from 'react';
import HeaderBar from './HeaderBar';
import Footer from './Footer';
import './ContentPageShell.css';

export default function ContentPageShell({
  title,
  color,
  children,
  contentClassName = ''
}) {
  useEffect(() => {
    document.documentElement.style.setProperty('--page-color', color);

    return () => {
      document.documentElement.style.removeProperty('--page-color');
    };
  }, [color]);

  const contentClasses = ['content-page-shell__content', contentClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="page-container">
      <HeaderBar />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-rect" style={{ backgroundColor: color }} />
          <h1 className="page-title">{title}</h1>
        </div>

        <div className={contentClasses}>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
