import { AppError } from '../errors.js';
import { getAdminSupabase } from '../clients.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isMissingSendLogError(error) {
  return error?.code === 'PGRST205'
    || error?.code === '42P01'
    || String(error?.message || '').includes('ticket_holder_email_sends');
}

function throwMissingSendLog(error) {
  if (!isMissingSendLogError(error)) {
    throw error;
  }

  throw new AppError('Ticket holder email logging is not set up yet. Run sql/ticket_holder_email_sends.sql in Supabase before sending.', {
    code: 'EMAIL_LOG_TABLE_MISSING',
    status: 503,
    details: error,
    expose: true,
  });
}

export async function listSentTicketHolderEmails({ eventId, contentHash }, deps = {}) {
  const supabase = deps.supabase || getAdminSupabase();
  const { data, error } = await supabase
    .from('ticket_holder_email_sends')
    .select('recipient_email')
    .eq('event_id', eventId)
    .eq('content_hash', contentHash)
    .eq('status', 'sent');

  if (error) {
    throwMissingSendLog(error);
  }

  return new Set((data || []).map((row) => normalizeEmail(row.recipient_email)).filter(Boolean));
}

export async function recordTicketHolderEmailSend(payload, deps = {}) {
  const supabase = deps.supabase || getAdminSupabase();
  const row = {
    event_id: payload.eventId,
    recipient_email: normalizeEmail(payload.recipientEmail),
    subject: payload.subject || '',
    content_hash: payload.contentHash,
    resend_email_id: payload.resendEmailId || null,
    status: payload.status || 'sent',
    error_message: payload.errorMessage || null,
    sent_at: payload.sentAt || (payload.status === 'sent' ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('ticket_holder_email_sends')
    .upsert(row, {
      onConflict: 'event_id,recipient_email,content_hash',
      ignoreDuplicates: false,
    });

  if (error) {
    throwMissingSendLog(error);
  }

  return true;
}
