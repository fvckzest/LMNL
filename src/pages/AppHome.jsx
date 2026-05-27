import { AppNavigate } from '../components/RouterAdapter';
import {
  buildCommunityDashboardPath,
  COMMUNITY_ONBOARDING_PATH,
} from '../lib/communityProfile';

export default function AppHome({ profile }) {
  if (!profile?.profile_slug) {
    return <AppNavigate to={COMMUNITY_ONBOARDING_PATH} replace />;
  }

  return <AppNavigate to={buildCommunityDashboardPath(profile.profile_slug)} replace />;
}
