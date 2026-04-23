import { Link } from 'react-router-dom';
import LmnlLogoBlack from './LmnlLogoBlack';
import Navigation from './Navigation';

export default function HeaderBar() {
  return (
    <div className="header-bar">
      <Link to="/">
        <LmnlLogoBlack className="header-logo" />
      </Link>
      <Navigation />
    </div>
  );
}
