export function normalizeCommunityCreditRole(role) {
  const value = String(role || '').trim().toLowerCase();

  if (!value) return 'artist';
  if (value.startsWith('perform')) return 'performer';
  if (value.startsWith('vendor')) return 'vendor';
  if (value.includes('business')) return 'vendor';
  return 'artist';
}
