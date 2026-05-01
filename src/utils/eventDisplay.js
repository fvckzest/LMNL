function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function formatEventDate(value, fallback = 'TBA') {
  const normalized = readString(value);
  if (!normalized) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    return `${Number(month)}.${Number(day)}.${year.slice(-2)}`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  }).replace(/\//g, '.');
}

export function formatEventTime(value, fallback = 'TBA') {
  const normalized = readString(value);
  if (!normalized) {
    return fallback;
  }

  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!timeMatch) {
    return normalized;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return normalized;
  }

  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
