import { createCheckoutForRequest, createCheckoutForRequestRecord } from './checkout.js';
import { getResendClient } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { AppError } from '../errors.js';
import { approveRequest, approveRequestWithOrderId, getRequestById } from '../repositories/requests.js';
import { buildApprovalEmail } from '../email-templates.js';

async function sendWithFallback(resend, payload, fallbackHtml, primaryFrom) {
  try {
    const response = await resend.emails.send(payload);
    if (response.error && primaryFrom !== 'onboarding@resend.dev') {
      const retry = await resend.emails.send({
        ...payload,
        from: 'onboarding@resend.dev',
      });

      if (!retry.error) {
        return retry.data;
      }
    }

    if (!response.error) {
      return response.data;
    }
  } catch (error) {
    console.error('[approval-email] formatted send failed, retrying minimal payload', error);
  }

  const minimalPayload = {
    ...payload,
    html: fallbackHtml,
    text: undefined,
    from: primaryFrom === 'onboarding@resend.dev' ? primaryFrom : 'onboarding@resend.dev',
  };

  try {
    const fallback = await resend.emails.send(minimalPayload);
    if (fallback.error) {
      throw new AppError(`Email failed: ${fallback.error.message}`, {
        code: 'EMAIL_SEND_FAILED',
        status: 502,
        expose: true,
      });
    }
    return fallback.data;
  } catch (error) {
    throw new AppError(error?.message || 'Email failed.', {
      code: 'EMAIL_SEND_FAILED',
      status: 502,
      expose: true,
    });
  }
}

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

  return sendWithFallback(
    resend,
    payload,
    `<p>Your invite to ${eventName} is approved. Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>`,
    primaryFrom
  );
}

export async function approveRequestAndSendCheckout(requestId, deps = {}) {
  const loadRequest = deps.getRequestById || getRequestById;
  const markApproved = deps.approveRequest || approveRequest;
  const markApprovedWithOrderId = deps.approveRequestWithOrderId || approveRequestWithOrderId;
  const buildCheckout = deps.createCheckoutForRequestRecord || createCheckoutForRequestRecord;
  const buildCheckoutForApprovedRequest = deps.createCheckoutForRequest || createCheckoutForRequest;
  const deliverApprovalEmail = deps.sendApprovalEmail || sendApprovalEmail;

  const request = await loadRequest(requestId);
  if (!request) {
    throw new AppError('Request not found.', {
      code: 'REQUEST_NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  const alreadyApproved = request.status === 'approved' || request.status === 'fulfilled';

  const checkout = alreadyApproved
    ? await buildCheckoutForApprovedRequest(request.id, {}, deps)
    : await buildCheckout(request, {}, { ...deps, persistOrderId: false });

  const updatedRequest = alreadyApproved
    ? request
    : await (checkout.orderId
      ? markApprovedWithOrderId(requestId, checkout.orderId)
      : markApproved(requestId));

  let warning = null;

  try {
    await deliverApprovalEmail(updatedRequest.customer_email, updatedRequest.event_name, checkout.checkoutUrl);
  } catch (error) {
    console.error('[approval-email] failed after invite approval', error);
    warning = 'Invite approved, but the approval email could not be sent. The checkout link was still created.';
  }

  return {
    checkoutUrl: checkout.checkoutUrl,
    status: updatedRequest.status,
    orderId: checkout.orderId || updatedRequest.square_order_id || null,
    emailSent: !warning,
    warning,
    request: updatedRequest,
  };
}
