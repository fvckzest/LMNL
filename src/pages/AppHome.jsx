import { Navigate } from 'react-router-dom';
import {
  buildCommunityDashboardPath,
  COMMUNITY_ONBOARDING_PATH,
} from '../lib/communityProfile';

export default function AppHome({ profile }) {
  if (!profile?.profile_slug) {
    return <Navigate to={COMMUNITY_ONBOARDING_PATH} replace />;
  }

  return <Navigate to={buildCommunityDashboardPath(profile.profile_slug)} replace />;
}
