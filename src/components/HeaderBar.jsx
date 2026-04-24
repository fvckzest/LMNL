import { Link } from 'react-router-dom';
import LmnlLogoBlack from './LmnlLogoBlack';
import Navigation from './Navigation';
import SocialLinks from './SocialLinks';

export default function HeaderBar() {
  return (
    <div className="header-bar">
      <SocialLinks className="header-socials" />
      <Link to="/">
        <LmnlLogoBlack className="header-logo" />
      </Link>
      <Navigation />
    </div>
  );
}
