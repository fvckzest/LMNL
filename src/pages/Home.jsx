import { useState } from 'react';
import { Link } from 'react-router-dom';
import Circle from '../components/Circle';
import LmnlLogoBlack from '../components/LmnlLogoBlack';
import SocialLinks from '../components/SocialLinks';
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

const homePageInfo = [
  { title: 'COMMUNITY', color: '#ff5bb8' },
  { title: 'SHOP', color: '#ff0000' },
  { title: 'ABOUT', color: '#ff9300' },
  { title: 'BLOG', color: '#ffde00' },
  { title: 'CONTACT', color: '#90e937' },
  { title: 'PRSM', color: '#000000' },
  { title: 'EVENTS', color: '#004ffa' },
  { title: 'SERVICES', color: '#6222d8' }
];

export default function Home() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className="home-container">
      <div className="home-graph-key">
        {[6, 7, 0, 1, 2, 3, 4, 5].map((originalIndex) => {
          const item = homePageInfo[originalIndex];
          return (
            <Link 
              key={originalIndex} 
              to={homeCircleLinks[originalIndex]}
              className={`key-item ${hoveredIndex === originalIndex ? 'active' : ''}`}
              onMouseEnter={() => setHoveredIndex(originalIndex)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="key-color-rect" style={{ backgroundColor: item.color }} />
              <span className="key-label">{item.title}</span>
              <span className="key-code">{item.color.toUpperCase()}</span>
            </Link>
          );
        })}
      </div>

      <div className="home-hero">
        <div className="home-circle-wrapper">
          <div className="circle-flip">
            <Circle 
              images={homeCircleImages} 
              links={homeCircleLinks} 
              className="home-circle" 
              onHoverChange={setHoveredIndex}
              info={homePageInfo}
              hoveredIndex={hoveredIndex}
            />
          </div>
        </div>
        <div className="home-logo-wrapper">
          <LmnlLogoBlack className="home-logo" />
        </div>
      </div>
      
      <SocialLinks className="home-socials" />

      <Link to="/space" className="space-notification">
        <div className="space-notification-dot"></div>
        <span>1 new invite</span>
      </Link>
    </div>
  );
}
