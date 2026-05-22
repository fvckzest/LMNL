import { AppError } from '../errors.js';
import {
  getTicketWithEventById,
  getTicketWithEventByQrPayload,
  markTicketAsUsed,
} from '../repositories/tickets.js';
import { recordTicketAttendanceVerification } from './attendance.js';
import { getWalletPassConfig } from './passkit-customization.js';

function isLocalHostname(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function buildAdminCheckInUrl(token, options = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return '';
  }

  const siteUrl = options.siteUrl || 'https://lmnl.art';
  const url = new URL(siteUrl);
  const host = url.hostname.replace(/^www\./i, '');
  const adminOrigin = isLocalHostname(host) || host.startsWith('admin.')
    ? url.origin
    : `${url.protocol}//admin.${url.host}`;

  return new URL(`/check-in/${encodeURIComponent(normalizedToken)}`, adminOrigin).toString();
}

export async function getTicketView(ticketId, deps = {}) {
  const loadTicket = deps.getTicketWithEventById || getTicketWithEventById;
  const result = await loadTicket(ticketId);
  const wallet = getWalletPassConfig(result.event);

  return {
    ...result,
    wallet: {
      displayDate: wallet.displayDate || '',
      locationValue: wallet.locationValue || '',
      entryLabel: wallet.entranceValueLabel || '',
      entryValue: wallet.entranceCoordinatesValue || '',
    },
  };
}

export async function getCheckInTicketView(token, deps = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Check-in token is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadTicketByQrPayload = deps.getTicketWithEventByQrPayload || getTicketWithEventByQrPayload;
  const { ticket, event } = await loadTicketByQrPayload(normalizedToken);

  return {
    status: ticket.is_used ? 'already_used' : 'valid',
    ticket,
    event,
  };
}

export async function confirmCheckInTicket(token, deps = {}) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Check-in token is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadTicketByQrPayload = deps.getTicketWithEventByQrPayload || getTicketWithEventByQrPayload;
  const updateTicketUsage = deps.markTicketAsUsed || markTicketAsUsed;
  const recordAttendance = deps.recordTicketAttendanceVerification || recordTicketAttendanceVerification;
  const { ticket, event } = await loadTicketByQrPayload(normalizedToken);

  if (ticket.is_used) {
    let attendanceResult = null;

    try {
      attendanceResult = await recordAttendance({
        ticket,
        event,
        verifiedByAdminUserId: deps.verifiedByAdminUserId || null,
      });
    } catch (error) {
      console.error('[attendance] failed to capture already-used ticket verification', error);
    }

    return {
      status: 'already_used',
      ticket,
      event,
      attendance: attendanceResult,
    };
  }

  const updatedTicket = await updateTicketUsage(ticket.id);
  let attendanceResult = null;

  try {
    attendanceResult = await recordAttendance({
      ticket: updatedTicket,
      event,
      verifiedByAdminUserId: deps.verifiedByAdminUserId || null,
    });
  } catch (error) {
    console.error('[attendance] failed to capture ticket verification', error);
  }

  return {
    status: 'checked_in',
    ticket: updatedTicket,
    event,
    attendance: attendanceResult,
  };
}
