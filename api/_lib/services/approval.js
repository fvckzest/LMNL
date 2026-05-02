import { createCheckoutForRequest } from './checkout.js';
import { getResendClient } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { approveRequest, getRequestById } from '../repositories/requests.js';
import { buildApprovalEmail } from '../../../shared/emailTemplates.js';

async function sendApprovalEmail(to, eventName, checkoutUrl) {
  const resend = getResendClient();
  const { siteUrl } = getBaseConfig();
  const primaryFrom = process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';
  const email = buildApprovalEmail({
    eventName,
    checkoutUrl,
    logoUrl: `${siteUrl.replace(/\/$/, '')}/lmnl-logo-black.png`,
  });

  const payload = {
    from: primaryFrom,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  };

  const response = await resend.emails.send(payload);
  if (response.error && primaryFrom !== 'onboarding@resend.dev') {
    const fallback = await resend.emails.send({
      ...payload,
      from: 'onboarding@resend.dev',
    });
    if (fallback.error) {
      throw new AppError(`Email failed: ${fallback.error.message}`, {
        code: 'EMAIL_SEND_FAILED',
        status: 502,
        expose: true,
      });
    }
    return fallback.data;
  }

  if (response.error) {
    throw new AppError(`Email failed: ${response.error.message}`, {
      code: 'EMAIL_SEND_FAILED',
      status: 502,
      expose: true,
    });
  }

  return response.data;
}

export async function approveRequestAndSendCheckout(requestId) {
  const request = await getRequestById(requestId);
  if (!request) {
    throw new AppError('Request not found.', {
      code: 'REQUEST_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  const updatedRequest = await approveRequest(requestId);
  const { checkoutUrl, orderId } = await createCheckoutForRequest(updatedRequest.id);
  await sendApprovalEmail(updatedRequest.customer_email, updatedRequest.event_name, checkoutUrl);

  return {
    checkoutUrl,
    status: updatedRequest.status,
    orderId: orderId || updatedRequest.square_order_id || null,
  };
}
