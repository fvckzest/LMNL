export const SITE_HISTORY_ACTIVITY_EVENT = 'lmnl:site-history-activity';
const LOCAL_SITE_HISTORY_LIMIT = 20;
const localSiteHistoryActivity = [];

function formatSiteHistoryStamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  }).toUpperCase();
}

export function createHorseFeedSiteHistoryItem(activity) {
  const date = activity.createdAt || new Date().toISOString();

  return {
    id: `site-${activity.id}`,
    type: 'SPACE',
    title: 'SPACE',
    date,
    href: '/space',
    accent: '#004ffa',
    meta: 'Horse fed',
    stamp: formatSiteHistoryStamp(date),
    timeAgo: 'now',
    isUpcoming: false,
  };
}

export function publishSiteHistoryActivity(item) {
  localSiteHistoryActivity.unshift(item);
  const seenIds = new Set();

  for (let index = localSiteHistoryActivity.length - 1; index >= 0; index -= 1) {
    const activity = localSiteHistoryActivity[index];
    if (!activity?.id || seenIds.has(activity.id)) {
      localSiteHistoryActivity.splice(index, 1);
      continue;
    }
    seenIds.add(activity.id);
  }

  localSiteHistoryActivity
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .splice(LOCAL_SITE_HISTORY_LIMIT);

  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(SITE_HISTORY_ACTIVITY_EVENT, {
    detail: item,
  }));
}

export function getLocalSiteHistoryActivity(limit = LOCAL_SITE_HISTORY_LIMIT) {
  return localSiteHistoryActivity.slice(0, limit);
}

export function subscribeSiteHistoryActivity(handler) {
  if (typeof window === 'undefined') return () => {};

  const handleActivity = (event) => {
    if (event.detail?.id) {
      handler(event.detail);
    }
  };

  window.addEventListener(SITE_HISTORY_ACTIVITY_EVENT, handleActivity);
  return () => window.removeEventListener(SITE_HISTORY_ACTIVITY_EVENT, handleActivity);
}
