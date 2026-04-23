import { imgLmnlLogoBlack1 } from '../utils/constants';

export default function LmnlLogoBlack({ className }) {
  return (
    <div className={`logo-container ${className || ''}`}>
      <img alt="LMNL Logo" src={imgLmnlLogoBlack1} />
    </div>
  );
}
