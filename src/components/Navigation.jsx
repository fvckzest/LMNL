import { Link } from 'react-router-dom';
import {
  imgEllipse3, imgEllipse12, imgEllipse13, imgEllipse14,
  imgEllipse15, imgEllipse6, imgEllipse7, imgEllipse8
} from '../utils/constants';

export default function Navigation() {
  return (
    <div className="nav-container">
      <Link to="/events" className="nav-link nl-1">
        <img alt="Events" src={imgEllipse15} />
      </Link>
      <Link to="/services" className="nav-link nl-2">
        <img alt="Services" src={imgEllipse14} />
      </Link>
      <Link to="/community" className="nav-link nl-3">
        <img alt="Community" src={imgEllipse13} />
      </Link>
      <Link to="/shop" className="nav-link nl-4">
        <img alt="Shop" src={imgEllipse12} />
      </Link>
      <Link to="/about" className="nav-link nl-5">
        <img alt="About" src={imgEllipse3} />
      </Link>
      <Link to="/blog" className="nav-link nl-6">
        <img alt="Blog" src={imgEllipse6} />
      </Link>
      <Link to="/contact" className="nav-link nl-7">
        <img alt="Contact" src={imgEllipse7} />
      </Link>
      <Link to="/prsm" className="nav-link nl-8">
        <img alt="PRSM" src={imgEllipse8} />
      </Link>
    </div>
  );
}
