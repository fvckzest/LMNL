import Circle from './Circle';
import {
  imgEllipse16, imgEllipse17, imgEllipse18, imgEllipse19,
  imgEllipse20, imgEllipse21, imgEllipse22, imgEllipse23
} from '../utils/constants';

const footerCircleImages = [
  imgEllipse16, imgEllipse17, imgEllipse18, imgEllipse19,
  imgEllipse20, imgEllipse21, imgEllipse22, imgEllipse23
];

const footerCircleLinks = [
  '/community', // 16
  '/shop',      // 17
  '/about',     // 18
  '/blog',      // 19
  '/contact',   // 20
  '/prsm',      // 21
  '/events',    // 22
  '/services'   // 23
];

export default function Footer() {
  return (
    <div className="footer-container">
      <div style={{ width: 41, height: 41 }}>
        <Circle images={footerCircleImages} links={footerCircleLinks} className="footer-circle" />
      </div>
      <p className="footer-text">© 2026 LMNL LLC, ALL RIGHTS RESERVED</p>
    </div>
  );
}
