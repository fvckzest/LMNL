const DEFAULT_PHASE = 'foundation';

const DEFAULT_ENV =
  typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env
    : {};

export const SOCIAL_SYSTEM_PRIMITIVES = Object.freeze([
  'user',
  'profile',
  'event',
  'attendance',
  'collectible',
  'collectible_instance',
  'link',
  'access_rule',
  'access_grant',
  'reward',
  'profile_state',
  'contribution',
]);

export const SOCIAL_SYSTEM_PHASES = Object.freeze([
  { id: 'foundation', label: 'Phase 0: Foundations and Product Framing' },
  { id: 'identity', label: 'Phase 1: Identity Layer' },
  { id: 'attendance', label: 'Phase 2: Attendance Proof' },
  { id: 'collections', label: 'Phase 3: Collection Layer' },
  { id: 'links', label: 'Phase 4: Links and Mutuals' },
  { id: 'access', label: 'Phase 5: Access and Unlocks' },
  { id: 'rewards', label: 'Phase 6: Rewards, Points, Badges, and Titles' },
  { id: 'economy', label: 'Phase 7: Internal Currency and Advanced Economy' },
  { id: 'provenance', label: 'Phase 8: Optional Crypto / NFT Provenance' },
]);

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

export function getSocialSystemConfig(env = DEFAULT_ENV) {
  const phase = env.VITE_SOCIAL_SYSTEM_PHASE || DEFAULT_PHASE;

  return {
    enabled: parseBooleanFlag(env.VITE_SOCIAL_SYSTEM_ENABLED, false),
    exposePreviewRoutes: parseBooleanFlag(env.VITE_SOCIAL_SYSTEM_PREVIEW_ROUTES, false),
    phase,
    currentPhase:
      SOCIAL_SYSTEM_PHASES.find((entry) => entry.id === phase) ||
      SOCIAL_SYSTEM_PHASES[0],
  };
}

export function isSocialSystemEnabled(config = getSocialSystemConfig()) {
  return config.enabled === true;
}

export function shouldExposeSocialPreviewRoutes(config = getSocialSystemConfig()) {
  return isSocialSystemEnabled(config) && config.exposePreviewRoutes === true;
}

function getRoleBucket(role) {
  return role === 'performer' ? 'performer' : 'artist';
}

function ensureMember(recordMap, name, role) {
  if (!recordMap[name]) {
    recordMap[name] = {
      name,
      role,
      events: new Set(),
      links: new Set(),
    };
  }

  return recordMap[name];
}

export function buildCommunityDirectoryBridge(snapshot = {}) {
  const credits = Array.isArray(snapshot.credits) ? snapshot.credits : [];
  const events = Array.isArray(snapshot.events) ? snapshot.events : [];
  const records = {};

  events.forEach((event) => {
    const eventName = event?.name || 'LMNL';

    ['performers', 'artists'].forEach((field) => {
      const role = field === 'performers' ? 'performer' : 'artist';
      const rawList = event?.metadata?.[field];

      if (!rawList) return;

      rawList.split(',').forEach((entry) => {
        const name = entry.trim();
        if (!name) return;

        const member = ensureMember(records, name, role);
        member.events.add(eventName);
      });
    });
  });

  credits.forEach((credit) => {
    const name = credit?.name?.trim();
    if (!name) return;

    const role = getRoleBucket(credit.role);
    const member = ensureMember(records, name, role);

    if (credit.event_name) {
      member.events.add(credit.event_name);
    }

    if (credit.link) {
      member.links.add(credit.link);
    }
  });

  const members = Object.values(records).map((member) => ({
    name: member.name,
    role: member.role,
    event: Array.from(member.events).join(', ') || 'LMNL',
    events: Array.from(member.events),
    link: Array.from(member.links)[0] || null,
    links: Array.from(member.links),
  }));

  return {
    members,
    totalUnique: members.length,
    performers: members.filter((member) => member.role === 'performer'),
    artists: members.filter((member) => member.role === 'artist'),
  };
}
