const DEFAULT_WALLET_COLORS = {
  backgroundColor: 'rgb(255, 255, 255)',
  foregroundColor: 'rgb(0, 0, 0)',
  labelColor: 'rgb(100, 100, 100)',
};

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readColor(value, fallback) {
  const normalized = readString(value);
  return normalized || fallback;
}

export function getWalletPassConfig(event = {}) {
  const metadata = event?.metadata || {};
  const stripImageUrl = readString(metadata.wallet_strip_image_url) || readString(event?.image_url);
  const notes = readString(metadata.wallet_notes);
  const eventLink = readString(metadata.event_link);

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
