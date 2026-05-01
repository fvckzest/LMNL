const DEFAULT_WALLET_COLORS = {
  backgroundColor: 'rgb(255, 255, 255)',
  foregroundColor: 'rgb(0, 0, 0)',
  labelColor: 'rgb(100, 100, 100)',
};

const DEFAULT_WALLET_TIME_ZONE = 'America/Los_Angeles';
const RANGE_SEPARATOR = '/';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readColor(value, fallback) {
  const normalized = readString(value);
  return normalized || fallback;
}

function hasDateTimeOffset(value) {
  return /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
}

function parseShortOffset(shortOffset) {
  const match = /^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/.exec(shortOffset);
  if (!match || !match.groups?.sign) {
    return '+00:00';
  }

  const hours = match.groups.hours.padStart(2, '0');
  const minutes = (match.groups.minutes || '00').padStart(2, '0');
  return `${match.groups.sign}${hours}:${minutes}`;
}

function getTimeZoneOffset(dateTimeValue, timeZone) {
  const [datePart, timePart = '00:00'] = dateTimeValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const shortOffset = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(utcGuess).find(part => part.type === 'timeZoneName')?.value;

  return shortOffset ? parseShortOffset(shortOffset) : null;
}

function normalizeDateTimeValue(value, timeZone) {
  const normalized = readString(value);
  if (!normalized) {
    return '';
  }

  if (hasDateTimeOffset(normalized)) {
    return normalized;
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return '';
  }

  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const offset = getTimeZoneOffset(withSeconds.slice(0, 16), timeZone);
  return offset ? `${withSeconds}${offset}` : '';
}

function parseRelevantDateRanges(rawValue, timeZone) {
  const value = readString(rawValue);
  if (!value) {
    return [];
  }

  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [rawStart, rawEnd] = line.split(RANGE_SEPARATOR).map(part => part.trim());
      const startDate = normalizeDateTimeValue(rawStart, timeZone);
      const endDate = normalizeDateTimeValue(rawEnd, timeZone);

      if (!startDate || !endDate) {
        return null;
      }

      return { startDate, endDate };
    })
    .filter(Boolean);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '.');
}

function getDisplayDateRange(relevantDates) {
  const firstWindow = relevantDates[0];
  const lastWindow = relevantDates[relevantDates.length - 1];

  if (!firstWindow?.startDate || !lastWindow?.endDate) {
    return '';
  }

  const start = new Date(firstWindow.startDate);
  const end = new Date(lastWindow.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '';
  }

  const formattedStart = formatDisplayDate(start);
  const formattedEnd = formatDisplayDate(end);

  return formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;
}

export function getWalletPassConfig(event = {}) {
  const metadata = event?.metadata || {};
  const stripImageUrl = readString(metadata.wallet_strip_image_url) || readString(event?.image_url);
  const notes = readString(metadata.wallet_notes);
  const eventLink = readString(metadata.event_link);
  const timeZone = readString(metadata.wallet_time_zone) || DEFAULT_WALLET_TIME_ZONE;
  const relevantDates = parseRelevantDateRanges(metadata.wallet_relevant_dates, timeZone);
  const expirationDate = normalizeDateTimeValue(metadata.wallet_expiration_date, timeZone);
  const singleRelevantDate = normalizeDateTimeValue(
    event?.event_date && event?.event_time ? `${event.event_date}T${event.event_time}` : '',
    timeZone,
  );

  return {
    stripImageUrl,
    logoText: readString(metadata.wallet_logo_text) || event?.name || 'LMNL',
    description: readString(metadata.wallet_description) || 'LMNL Event Ticket',
    backgroundColor: readColor(metadata.wallet_background_color, DEFAULT_WALLET_COLORS.backgroundColor),
    foregroundColor: readColor(metadata.wallet_foreground_color, DEFAULT_WALLET_COLORS.foregroundColor),
    labelColor: readColor(metadata.wallet_label_color, DEFAULT_WALLET_COLORS.labelColor),
    primaryValue: readString(metadata.wallet_primary_override),
    locationValue: readString(metadata.wallet_location_override) || event?.location_name || 'TBA',
    notes,
    eventLink,
    timeZone,
    relevantDates,
    singleRelevantDate,
    expirationDate: expirationDate || relevantDates[relevantDates.length - 1]?.endDate || '',
    displayDate: relevantDates.length ? getDisplayDateRange(relevantDates) : '',
    isMultiDay: relevantDates.length > 1,
  };
}

export function buildPassOverrides(ticket, event, certificateMaterial) {
  const wallet = getWalletPassConfig(event);

  return {
    passTypeIdentifier: certificateMaterial.passTypeIdentifier,
    teamIdentifier: certificateMaterial.teamIdentifier,
    serialNumber: ticket.id,
    description: wallet.description,
    logoText: wallet.logoText,
    backgroundColor: wallet.backgroundColor,
    foregroundColor: wallet.foregroundColor,
    labelColor: wallet.labelColor,
  };
}

function isPngResponse(url, contentType) {
  if (contentType?.toLowerCase().includes('image/png')) {
    return true;
  }

  try {
    return new URL(url).pathname.toLowerCase().endsWith('.png');
  } catch {
    return false;
  }
}

export async function applyPassVisualCustomization(pass, event) {
  const wallet = getWalletPassConfig(event);

  if (wallet.notes) {
    pass.backFields.push({
      key: 'notes',
      label: 'NOTES',
      value: wallet.notes,
    });
  }

  if (wallet.eventLink) {
    pass.backFields.push({
      key: 'eventLink',
      label: 'EVENT LINK',
      value: wallet.eventLink,
    });
  }

  if (!wallet.stripImageUrl) {
    return;
  }

  try {
    const response = await fetch(wallet.stripImageUrl);
    if (!response.ok) {
      console.warn('[Apple Wallet] Failed to fetch strip image:', response.status, wallet.stripImageUrl);
      return;
    }

    const contentType = response.headers.get('content-type');
    if (!isPngResponse(wallet.stripImageUrl, contentType)) {
      console.warn('[Apple Wallet] Wallet strip image must be a PNG:', wallet.stripImageUrl);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    pass.addBuffer('strip.png', buffer);
    pass.addBuffer('strip@2x.png', buffer);
    pass.addBuffer('strip@3x.png', buffer);
  } catch (error) {
    console.warn('[Apple Wallet] Unable to apply wallet strip image:', wallet.stripImageUrl, error);
  }
}

export function applyPassTimingCustomization(pass, event) {
  const wallet = getWalletPassConfig(event);

  if (wallet.relevantDates.length) {
    pass.setRelevantDates(wallet.relevantDates);
  } else if (wallet.singleRelevantDate) {
    pass.setRelevantDates([{ relevantDate: wallet.singleRelevantDate }]);
  }

  if (wallet.expirationDate) {
    pass.setExpirationDate(new Date(wallet.expirationDate));
  }
}
