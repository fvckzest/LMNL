function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailShell({
  accentColor = '#004ffa',
  logoUrl = 'https://lmnl.art/lmnl-logo-black.png',
  eyebrow,
  title,
  intro,
  details = [],
  buttonLabel,
  buttonUrl,
  note,
  footer,
}) {
  const fontFamily = 'Gantari, Arial, sans-serif';
  const headerRectWidth = 18;
  const headerTitleSize = 56;

  const renderedDetails = details
    .filter((detail) => detail?.label && detail?.value)
    .map((detail) => `
      <tr>
        <td style="width: 166px; padding: 0 18px 12px 0; font: 700 11px/1.4 ${fontFamily}; letter-spacing: 0.24em; text-transform: uppercase; color: #6f6f6f; vertical-align: middle; text-align: center; white-space: nowrap;">
          ${escapeHtml(detail.label)}
        </td>
        <td style="padding: 0 0 12px; font: 15px/1.5 ${fontFamily}; color: #111111; vertical-align: middle; text-align: left;">
          ${escapeHtml(detail.value)}
        </td>
      </tr>
    `)
    .join('');

  const buttonBlock = buttonLabel && buttonUrl
    ? `
      <tr>
        <td style="padding: 0 28px 24px; text-align: center;">
          <a
            href="${escapeHtml(buttonUrl)}"
            style="display: inline-block; min-width: 220px; padding: 16px 24px; background: #000000; color: #ffffff; text-decoration: none; font: 700 12px/1 ${fontFamily}; letter-spacing: 0.22em; text-transform: uppercase; text-align: center;"
          >
            ${escapeHtml(buttonLabel)}
          </a>
        </td>
      </tr>
    `
    : '';

  const noteBlock = note
    ? `
      <tr>
        <td style="padding: 0 28px 24px; font: 14px/1.7 ${fontFamily}; color: #202020;">
          ${note}
        </td>
      </tr>
    `
    : '';

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; border-collapse: collapse; background: #ffffff; border: 2px solid #000000;">
            <tr>
              <td style="padding: 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 24px 28px 18px; background: #ffffff;">
                      <div style="margin: 0 0 20px; text-align: center;">
                        <img
                          src="${logoUrl}"
                          alt="LMNL"
                          width="96"
                          style="display: block; width: 96px; height: auto; border: 0; margin: 0 auto;"
                        />
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 18px;">
                        <tr>
                          <td style="width: ${headerRectWidth}px; height: ${headerTitleSize}px; background: ${escapeHtml(accentColor)}; font-size: 0; line-height: 0;">&nbsp;</td>
                          <td style="padding-left: ${headerRectWidth}px; vertical-align: middle;">
                            <div style="font-family: ${fontFamily}; font-size: ${headerTitleSize}px; line-height: ${headerTitleSize}px; font-weight: 500; text-transform: uppercase; color: #111111; white-space: nowrap;">
                              ${escapeHtml(title)}
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="font: 16px/1.7 ${fontFamily}; color: #202020;">
                        ${intro}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 28px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  ${renderedDetails}
                </table>
              </td>
            </tr>
            ${buttonBlock}
            ${noteBlock}
            <tr>
              <td style="padding: 18px 28px 28px; font: 12px/1.7 ${fontFamily}; color: #616161;">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return {
    html: `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Gantari:wght@400;500;700&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 24px 12px; background: #ffffff;">
        ${content}
      </body>
    </html>
  `,
    previewHtml: `
      <div style="padding: 24px 12px; background: #ffffff;">
        ${content}
      </div>
    `,
  };
}

export function buildApprovalEmail({ eventName, checkoutUrl, logoUrl }) {
  const safeEventName = eventName || 'your event';
  const subject = `APPROVED: ${safeEventName}`;
  const rendered = renderEmailShell({
    accentColor: '#004ffa',
    logoUrl,
    eyebrow: 'LMNL Access',
    title: 'Approved',
    intro: `Your spot for <strong>${escapeHtml(safeEventName)}</strong> is ready. Complete payment using the link below to lock in access.`,
    details: [
      { label: 'Event', value: safeEventName },
      { label: 'Status', value: 'Approved for checkout' },
    ],
    buttonLabel: 'Complete Payment',
    buttonUrl: checkoutUrl,
    note: checkoutUrl
      ? `If the button does not open, use this link:<br /><a href="${escapeHtml(checkoutUrl)}" style="color: #004ffa; word-break: break-all;">${escapeHtml(checkoutUrl)}</a>`
      : '',
    footer: 'Questions or timing issues? Reply to this email and we will help.',
  });
  const text = [
    'APPROVED',
    `Event: ${safeEventName}`,
    checkoutUrl ? `Pay here: ${checkoutUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html: rendered.html, previewHtml: rendered.previewHtml, text };
}

export function buildTicketEmail({ eventName, ticketUrl, customerName, logoUrl }) {
  const safeEventName = eventName || 'LMNL Event';
  const safeCustomerName = customerName || 'Guest';
  const subject = `${safeEventName} TICKET`;
  const rendered = renderEmailShell({
    accentColor: '#004ffa',
    logoUrl,
    eyebrow: 'LMNL Ticket',
    title: 'Your Ticket',
    intro: `You are confirmed for <strong>${escapeHtml(safeEventName)}</strong>. Your ticket is live now and ready whenever you need it.`,
    details: [
      { label: 'Guest', value: safeCustomerName },
      { label: 'Event', value: safeEventName },
      { label: 'Access', value: 'Issued' },
    ],
    buttonLabel: 'View Ticket',
    buttonUrl: ticketUrl,
    note: ticketUrl
      ? `You can also open your ticket directly here:<br /><a href="${escapeHtml(ticketUrl)}" style="color: #004ffa; word-break: break-all;">${escapeHtml(ticketUrl)}</a>`
      : '',
    footer: 'Keep this email handy on the day of the event in case you need to reopen your ticket quickly.',
  });
  const text = [
    'YOUR TICKET',
    `Guest: ${safeCustomerName}`,
    `Event: ${safeEventName}`,
    ticketUrl ? `View it here: ${ticketUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html: rendered.html, previewHtml: rendered.previewHtml, text };
}

export function buildInquiryNotificationEmail({ name, email, notes, selectedServices, logoUrl }) {
  const subject = `NEW INQUIRY: ${name}`;
  const servicesList = selectedServices && selectedServices.length > 0 
    ? selectedServices.join(', ') 
    : 'General';

  const rendered = renderEmailShell({
    accentColor: '#90e937', // Match contact page theme color
    logoUrl,
    title: 'New Inquiry',
    intro: `A new inquiry has been received through the LMNL contact form.`,
    details: [
      { label: 'Name', value: name },
      { label: 'Email', value: email },
      { label: 'Services', value: servicesList },
    ],
    note: notes ? `<strong>Message:</strong><br /><p style="white-space: pre-wrap;">${escapeHtml(notes)}</p>` : '',
    footer: 'This inquiry has also been logged in the LMNL Admin dashboard.',
  });

  const text = [
    'NEW INQUIRY',
    `Name: ${name}`,
    `Email: ${email}`,
    `Services: ${servicesList}`,
    notes ? `Message:\n${notes}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html: rendered.html, text };
}

export function buildArtistInterestNotificationEmail({ name, email, project_name, practice, links, notes, logoUrl }) {
  const subject = `ARTIST INTEREST: ${name}`;
  
  const rendered = renderEmailShell({
    accentColor: '#90e937',
    logoUrl,
    title: 'Artist Interest',
    intro: `A new artist has submitted an interest form.`,
    details: [
      { label: 'Artist', value: name },
      { label: 'Email', value: email },
      { label: 'Practice', value: practice },
      { label: 'Project', value: project_name || 'N/A' },
      { label: 'Links', value: links || 'N/A' },
    ],
    note: notes ? `<strong>Message:</strong><br /><p style="white-space: pre-wrap;">${escapeHtml(notes)}</p>` : '',
    footer: 'This interest has also been logged in the LMNL Admin dashboard.',
  });

  const text = [
    'ARTIST INTEREST',
    `Artist: ${name}`,
    `Email: ${email}`,
    `Practice: ${practice}`,
    `Project: ${project_name}`,
    `Links: ${links}`,
    notes ? `Message:\n${notes}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html: rendered.html, text };
}
