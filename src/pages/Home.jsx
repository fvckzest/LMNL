import Circle from '../components/Circle';
import LmnlLogoBlack from '../components/LmnlLogoBlack';
import {
  homeImgEllipse16, homeImgEllipse17, homeImgEllipse18, homeImgEllipse19,
  homeImgEllipse20, homeImgEllipse21, homeImgEllipse22, homeImgEllipse23
} from '../utils/constants';

const homeCircleImages = [
  homeImgEllipse16, homeImgEllipse17, homeImgEllipse18, homeImgEllipse19,
  homeImgEllipse20, homeImgEllipse21, homeImgEllipse22, homeImgEllipse23
];

const homeCircleLinks = [
  '/community', // 16
  '/shop',      // 17
  '/about',     // 18
  '/blog',      // 19
  '/contact',   // 20
  '/prsm',      // 21
  '/events',    // 22
  '/services'   // 23
];

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="home-circle-wrapper">
          <div className="circle-flip">
            <Circle images={homeCircleImages} links={homeCircleLinks} className="home-circle" />
          </div>
        </div>
        <div className="home-logo-wrapper">
          <LmnlLogoBlack className="home-logo" />
        </div>
      </div>
    </div>
  );
}
