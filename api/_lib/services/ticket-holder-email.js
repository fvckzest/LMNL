import crypto from 'crypto';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { getResendClient } from '../clients.js';
import { buildTicketHolderBroadcastEmail } from '../email-templates.js';
import { getEventById } from '../repositories/events.js';
import { listTicketHolderEmailRecipientsByEvent } from '../repositories/tickets.js';
import {
  listSentTicketHolderEmails,
  recordTicketHolderEmailSend,
} from '../repositories/ticket-holder-email-sends.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function getPrimaryFrom() {
  return process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildContentHash({ subject, content, plainTextOnly }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      subject,
      content,
      plainTextOnly: Boolean(plainTextOnly),
    }))
    .digest('hex');
}

function summarizeRecipients(recipients = []) {
  return recipients.reduce((summary, recipient) => {
    const sources = new Set(recipient.sources || []);
    if (sources.has('direct')) summary.directCount += 1;
    if (sources.has('linked_request')) summary.linkedRequestCount += 1;
    if (sources.has('direct') && sources.has('linked_request')) summary.overlapCount += 1;
    return summary;
  }, {
    directCount: 0,
    linkedRequestCount: 0,
    overlapCount: 0,
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSendErrorMessage(error) {
  return error?.message || error?.name || String(error || '');
}

function isRetryableSendError(error) {
  const statusCode = Number(error?.statusCode || error?.status || error?.code);
  const message = getSendErrorMessage(error).toLowerCase();
  return statusCode === 429
    || statusCode >= 500
    || message.includes('rate')
    || message.includes('timeout')
    || message.includes('temporarily')
    || message.includes('fetch');
}

async function sendEmailWithRetry(sendEmail, attempts = 4) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await sendEmail();
      if (response?.error) {
        throw response.error;
      }
      return { status: 'fulfilled', value: response };
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableSendError(error)) {
        return { status: 'rejected', reason: error };
      }
      await wait(750 * attempt);
    }
  }

  return { status: 'rejected', reason: lastError };
}

async function sendEmailsWithLimitedConcurrency(recipients, buildSend, concurrency = 3) {
  const results = new Array(recipients.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < recipients.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await sendEmailWithRetry(() => buildSend(recipients[index]));
      await wait(100);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, recipients.length) }, worker));
  return results;
}

export async function sendTicketHolderEmail(payload, deps = {}) {
  const eventId = normalizeText(payload?.eventId);
  const subject = normalizeText(payload?.subject);
  const content = normalizeText(payload?.content);
  const plainTextOnly = Boolean(payload?.plainTextOnly);
  const skipDirectRecipients = Boolean(payload?.skipDirectRecipients);

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

  const contentHash = buildContentHash({ subject, content, plainTextOnly });
  const sentEmails = deps.listSentTicketHolderEmails
    ? await deps.listSentTicketHolderEmails({ eventId, contentHash })
    : await listSentTicketHolderEmails({ eventId, contentHash });
  const skippedPreviouslySent = [];
  const skippedDirectRecovery = [];
  const recipientsToSend = recipients.filter((recipient) => {
    const email = normalizeEmail(recipient.email);
    if (sentEmails.has(email)) {
      skippedPreviouslySent.push(recipient);
      return false;
    }

    if (skipDirectRecipients && recipient.sources?.includes('direct')) {
      skippedDirectRecovery.push(recipient);
      return false;
    }

    return true;
  });
  const recipientSummary = summarizeRecipients(recipients);
  const sendSummary = summarizeRecipients(recipientsToSend);
  const recordSend = deps.recordTicketHolderEmailSend || recordTicketHolderEmailSend;

  if (skippedDirectRecovery.length > 0) {
    await Promise.all(skippedDirectRecovery.map((recipient) => recordSend({
      eventId,
      recipientEmail: recipient.email,
      subject,
      contentHash,
      resendEmailId: null,
      status: 'sent',
      errorMessage: 'Marked sent by recovery mode after the first direct-recipient send.',
    })));
  }

  if (recipientsToSend.length === 0) {
    return {
      eventId,
      eventName: event.name,
      requestedCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      skippedPreviouslySentCount: skippedPreviouslySent.length,
      skippedDirectRecoveryCount: skippedDirectRecovery.length,
      plainTextOnly,
      skipDirectRecipients,
      contentHash,
      ...recipientSummary,
      sendDirectCount: sendSummary.directCount,
      sendLinkedRequestCount: sendSummary.linkedRequestCount,
    };
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
  const results = await sendEmailsWithLimitedConcurrency(recipientsToSend, (recipient) => resend.emails.send({
      from,
      to: recipient.email,
      replyTo,
      subject: email.subject,
      html: plainTextOnly ? undefined : email.html,
      text: email.text,
    }), 3);

  const failed = results
    .map((result, index) => ({ result, recipient: recipientsToSend[index] }))
    .filter(({ result }) => result.status === 'rejected' || result.value?.error);
  const failedEmails = new Set(failed.map(({ recipient }) => normalizeEmail(recipient.email)));
  await Promise.all(results.map((result, index) => {
    const recipient = recipientsToSend[index];
    const error = result.status === 'rejected'
      ? result.reason
      : result.value?.error;

    return recordSend({
      eventId,
      recipientEmail: recipient.email,
      subject,
      contentHash,
      resendEmailId: result.status === 'fulfilled' ? result.value?.data?.id || null : null,
      status: failedEmails.has(normalizeEmail(recipient.email)) ? 'failed' : 'sent',
      errorMessage: error?.message || error?.name || '',
    });
  }));

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
    sentCount: recipientsToSend.length - failed.length,
    failedCount: failed.length,
    skippedPreviouslySentCount: skippedPreviouslySent.length,
    skippedDirectRecoveryCount: skippedDirectRecovery.length,
    plainTextOnly,
    skipDirectRecipients,
    contentHash,
    ...recipientSummary,
    sendDirectCount: sendSummary.directCount,
    sendLinkedRequestCount: sendSummary.linkedRequestCount,
  };
}
