import { getResendClient } from '../clients.js';
import { getBaseConfig } from '../env.js';
import { buildInquiryNotificationEmail, buildArtistInterestNotificationEmail } from '../email-templates.js';

async function sendNotification(adminEmail, emailData, replyTo) {
  const resend = getResendClient();
  const primaryFrom = process.env.RESEND_API_KEY?.startsWith('re_')
    ? 'LMNL <contact@lmnl.art>'
    : 'onboarding@resend.dev';

  try {
    const payload = {
      from: primaryFrom,
      to: adminEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo,
    };

    const response = await resend.emails.send(payload);

    if (response.error && primaryFrom !== 'onboarding@resend.dev') {
      await resend.emails.send({ ...payload, from: 'onboarding@resend.dev' });
    }

    return response.data;
  } catch (error) {
    console.error('[notification] Failed to send email:', error);
    return null;
  }
}

export async function sendInquiryNotification(inquiry) {
  const { siteUrl } = getBaseConfig();
  const email = buildInquiryNotificationEmail({
    name: inquiry.name,
    email: inquiry.email,
    notes: inquiry.notes,
    selectedServices: inquiry.selected_services,
    logoUrl: `${siteUrl.replace(/\/$/, '')}/lmnl-logo-black.png`,
  });

  return sendNotification('hi@lmnl.art', email, inquiry.email);
}

export async function sendArtistInterestNotification(interest) {
  const { siteUrl } = getBaseConfig();
  const email = buildArtistInterestNotificationEmail({
    name: interest.name,
    email: interest.email,
    project_name: interest.project_name,
    practice: interest.practice,
    links: interest.links,
    notes: interest.notes,
    logoUrl: `${siteUrl.replace(/\/$/, '')}/lmnl-logo-black.png`,
  });

  return sendNotification('hi@lmnl.art', email, interest.email);
}
