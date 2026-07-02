import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getResendClient } from '../clients.js';
import { buildTicketHolderBroadcastEmail } from '../email-templates.js';
import { getEventById } from '../repositories/events.js';
import { listTicketHolderEmailRecipientsByEvent } from '../repositories/tickets.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function getPrimaryFrom() {
  return process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';
}

export async function sendTicketHolderEmail(payload, deps = {}) {
  const eventId = normalizeText(payload?.eventId);
  const subject = normalizeText(payload?.subject);
  const content = normalizeText(payload?.content);
  const plainTextOnly = Boolean(payload?.plainTextOnly);

  if (!eventId) {
    throw new AppError('Select an event before sending.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  if (!subject) {
    throw new AppError('Email subject is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  if (!content) {
    throw new AppError('Email content is required.', {
      code: 'INVALID_INPUT',
      status: 400,
      expose: true,
    });
  }

  const loadEvent = deps.getEventById || getEventById;
  const resend = deps.resendClient || getResendClient();
  const event = await loadEvent(eventId);

  if (!event) {
    throw new AppError('Event not found.', {
      code: 'NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  let recipients;
  if (deps.listTicketHolderEmailRecipientsByEvent) {
    recipients = await deps.listTicketHolderEmailRecipientsByEvent(event);
  } else if (deps.listTicketHolderEmailRecipientsByEventId) {
    recipients = await deps.listTicketHolderEmailRecipientsByEventId(eventId);
  } else {
    recipients = await listTicketHolderEmailRecipientsByEvent(event);
  }
  if (recipients.length === 0) {
    throw new AppError('No ticket holder emails were found for this event.', {
      code: 'NO_RECIPIENTS',
      status: 400,
      expose: true,
    });
  }

  const { siteUrl } = getBaseConfig();
  const email = buildTicketHolderBroadcastEmail({
    eventName: event.name,
    subject,
    content,
    logoUrl: `${siteUrl.replace(/\/$/, '')}/lmnl-logo-black.png`,
  });
  const from = deps.from || getPrimaryFrom();
  const replyTo = deps.replyTo || 'hi@lmnl.art';
  const results = await Promise.allSettled(
    recipients.map((recipient) => resend.emails.send({
      from,
      to: recipient.email,
      replyTo,
      subject: email.subject,
      html: plainTextOnly ? undefined : email.html,
      text: email.text,
    })),
  );

  const failed = results
    .map((result, index) => ({ result, recipient: recipients[index] }))
    .filter(({ result }) => result.status === 'rejected' || result.value?.error);

  if (failed.length > 0) {
    console.error('[ticket-holder-email] send failures', failed.map(({ recipient, result }) => ({
      email: recipient.email,
      reason: result.reason || result.value?.error,
    })));
  }

  return {
    eventId,
    eventName: event.name,
    requestedCount: recipients.length,
    sentCount: recipients.length - failed.length,
    failedCount: failed.length,
    plainTextOnly,
  };
}
