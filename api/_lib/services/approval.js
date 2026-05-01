import { getResendClient } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { approveRequest, getRequestById } from '../repositories/requests.js';

async function sendApprovalEmail(to, eventName, checkoutUrl) {
  const resend = getResendClient();
  const primaryFrom = process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <tickets@lmnl.art>'
    : 'onboarding@resend.dev';

  const payload = {
    from: primaryFrom,
    to,
    subject: `Approved: Your Invite to ${eventName}`,
    html: `<p>Your invite to ${eventName} is approved. Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>`,
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

  const { siteUrl } = getBaseConfig();
  const checkoutUrl = `${siteUrl}/checkout/request/${requestId}`;
  await sendApprovalEmail(request.customer_email, request.event_name, checkoutUrl);
  const updatedRequest = await approveRequest(requestId);

  return {
    checkoutUrl,
    status: updatedRequest.status,
    orderId: updatedRequest.square_order_id || null,
  };
}
