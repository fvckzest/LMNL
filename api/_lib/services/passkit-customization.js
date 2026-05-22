const DEFAULT_WALLET_COLORS = {
  backgroundColor: 'rgb(255, 255, 255)',
  foregroundColor: 'rgb(0, 0, 0)',
  labelColor: 'rgb(100, 100, 100)',
};

const DEFAULT_WALLET_TIME_ZONE = 'America/Los_Angeles';
const RANGE_SEPARATOR = '/';
const COORDINATE_DECIMALS = 6;

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readColor(value, fallback) {
  const normalized = readString(value);
  return normalized || fallback;
}

function readCoordinate(value, min, max) {
  const normalized = readString(value);
  if (!normalized) {
    return null;
  }

  const coordinate = Number(normalized);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }

  return coordinate;
}

function formatCoordinate(value) {
  return value.toFixed(COORDINATE_DECIMALS).replace(/\.?0+$/, '');
}

function formatAddress(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return readString(value);
  }

  if (typeof value !== 'object') {
    return '';
  }

  return [
    readString(value.addressLine1),
    readString(value.addressLine2),
    [
      readString(value.locality),
      readString(value.administrativeDistrictLevel1),
      readString(value.postalCode),
    ].filter(Boolean).join(', '),
    readString(value.country),
  ].filter(Boolean).join('\n');
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
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  }).replace(/\//g, '.');
}

function formatDateString(value) {
  const normalized = readString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return '';
  }

  const [year, month, day] = normalized.split('-');
  return `${Number(month)}.${Number(day)}.${year.slice(-2)}`;
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
  const stripImageUrl = readString(metadata.wallet_strip_image_url);
  const notes = readString(metadata.wallet_notes);
  const eventLink = readString(metadata.event_link);
  const latitude = readCoordinate(metadata.wallet_latitude, -90, 90);
  const longitude = readCoordinate(metadata.wallet_longitude, -180, 180);
  const hasValidCoordinates = latitude !== null && longitude !== null;
  const mapsLabel = readString(metadata.wallet_maps_label) || `${event?.name || 'Event'} Entrance`;
  const relevantText = readString(metadata.wallet_relevant_text);
  const locationAddress = formatAddress(event?.address);
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
    locationValue: readString(metadata.wallet_location_override) || readString(event?.location_name),
    entranceCoordinatesLabel: hasValidCoordinates ? 'ENTRY' : '',
    entranceCoordinatesValue: hasValidCoordinates
      ? `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`
      : locationAddress,
    entranceValueLabel: hasValidCoordinates
      ? 'ENTRY'
      : (locationAddress ? 'ADDRESS' : ''),
    entranceMapsUrl: hasValidCoordinates
      ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(mapsLabel)}`
      : '',
    passLocations: hasValidCoordinates
      ? [{
          latitude,
          longitude,
          ...(relevantText ? { relevantText } : {}),
        }]
      : [],
    notes,
    eventLink,
    timeZone,
    relevantDates,
    singleRelevantDate,
    expirationDate: expirationDate || relevantDates[relevantDates.length - 1]?.endDate || '',
    displayDate: relevantDates.length ? getDisplayDateRange(relevantDates) : formatDateString(event?.event_date),
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

  if (wallet.entranceMapsUrl) {
    pass.backFields.push({
      key: 'entranceMap',
      label: 'ENTRY MAP',
      value: wallet.entranceMapsUrl,
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

  if (wallet.passLocations.length) {
    pass.setLocations(...wallet.passLocations);
  }

  if (wallet.relevantDates.length) {
    pass.setRelevantDates(wallet.relevantDates);
  } else if (wallet.singleRelevantDate) {
    pass.setRelevantDates([{ relevantDate: wallet.singleRelevantDate }]);
  }

  if (wallet.expirationDate) {
    pass.setExpirationDate(new Date(wallet.expirationDate));
  }
}
