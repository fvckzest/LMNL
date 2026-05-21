function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailShell({
  accentColor = '#000000',
  logoUrl = 'https://lmnl.art/lmnl-logo-black.png',
  title,
  intro,
  details = [],
  buttonLabel,
  buttonUrl,
  note,
  footer,
}) {
  const titleFontFamily = 'Gantari, Arial, sans-serif';
  const monoFontFamily = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
  const headerRectWidth = 10;
  const headerTitleSize = 54;

  const renderedDetails = details
    .filter((detail) => detail?.label && detail?.value)
    .map((detail) => `
      <tr>
        <td style="width: 170px; padding: 14px 18px 14px 0; border-top: 1px solid #d9d9d9; font: 700 12px/1.4 ${monoFontFamily}; letter-spacing: 0.22em; text-transform: uppercase; color: #6f6f6f; vertical-align: top; text-align: left; white-space: nowrap;">
          ${escapeHtml(detail.label)}
        </td>
        <td style="padding: 14px 0; border-top: 1px solid #d9d9d9; font: 400 16px/1.7 ${monoFontFamily}; color: #111111; vertical-align: top; text-align: left;">
          ${escapeHtml(detail.value)}
        </td>
      </tr>
    `)
    .join('');

  const buttonBlock = buttonLabel && buttonUrl
    ? `
      <tr>
        <td align="center" bgcolor="#ffffff" style="padding: 0 28px 24px; text-align: center; background-color: #ffffff;">
          <a
            href="${escapeHtml(buttonUrl)}"
            style="display: inline-block; min-width: 220px; padding: 16px 24px; background: #ffffff; background-color: #ffffff; color: #111111; text-decoration: none; border: 2px solid #111111; font: 700 12px/1 ${monoFontFamily}; letter-spacing: 0.22em; text-transform: uppercase; text-align: center;"
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
        <td style="padding: 0 28px 24px; font: 400 14px/1.8 ${monoFontFamily}; color: #202020;">
          ${note}
        </td>
      </tr>
    `
    : '';

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse: collapse; background-color: #ffffff;">
      <tr>
        <td align="center" bgcolor="#ffffff" style="background-color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width: 760px; border-collapse: collapse; background: #ffffff; background-color: #ffffff; border: 2px solid #000000;">
            <tr>
              <td bgcolor="#ffffff" style="padding: 0; background-color: #ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse: collapse; background-color: #ffffff;">
                  <tr>
                    <td bgcolor="#ffffff" style="padding: 28px 28px 22px 0; background: #ffffff; background-color: #ffffff;">
                      <div style="margin: 0 0 18px; padding-left: 28px; font: 700 11px/1.2 ${monoFontFamily}; letter-spacing: 0.24em; text-transform: uppercase; color: #666666;">
                        Local Preview
                      </div>
                      <div style="margin: 0 0 22px 28px; text-align: left;">
                        <img
                          src="${logoUrl}"
                          alt="LMNL"
                          width="96"
                          style="display: block; width: 96px; height: auto; border: 0; margin: 0; background-color: #ffffff; color: #111111;"
                        />
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 22px;">
                        <tr>
                          <td style="width: ${headerRectWidth + 28}px; height: ${headerTitleSize}px; background: ${escapeHtml(accentColor)}; font-size: 0; line-height: 0;">&nbsp;</td>
                          <td style="padding-left: ${headerRectWidth}px; vertical-align: middle; white-space: nowrap;">
                            <div style="font-family: ${titleFontFamily}; font-size: ${headerTitleSize}px; line-height: ${headerTitleSize}px; font-weight: 500; letter-spacing: -0.04em; text-transform: uppercase; color: #111111; white-space: nowrap;">
                              ${escapeHtml(title)}
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="padding-left: 28px; font: 400 18px/1.7 ${monoFontFamily}; color: #111111;">
                        ${intro}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="padding: 10px 28px 8px; background-color: #ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse: collapse; background-color: #ffffff;">
                  ${renderedDetails}
                </table>
              </td>
            </tr>
            ${buttonBlock}
            ${noteBlock}
            <tr>
              <td bgcolor="#ffffff" style="padding: 18px 28px 28px; background-color: #ffffff; border-top: 1px solid #d9d9d9; font: 400 12px/1.8 ${monoFontFamily}; letter-spacing: 0.06em; text-transform: uppercase; color: #616161;">
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
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(title)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Gantari:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

          :root {
            color-scheme: light;
            supported-color-schemes: light;
          }
        </style>
      </head>
      <body bgcolor="#ffffff" style="margin: 0; padding: 24px 12px; background: #ffffff; background-color: #ffffff; color: #111111;">
        ${content}
      </body>
    </html>
  `,
    previewHtml: `
      <div style="padding: 24px 12px; background: #ffffff; background-color: #ffffff; color: #111111;">
        ${content}
      </div>
    `,
  };
}

export function buildApprovalEmail({ eventName, checkoutUrl, logoUrl }) {
  const safeEventName = eventName || 'your event';
  const subject = `APPROVED: ${safeEventName}`;
  const rendered = renderEmailShell({
    accentColor: '#000000',
    logoUrl,
    title: 'Approved',
    intro: `Your spot for <strong>${escapeHtml(safeEventName)}</strong> is ready. Complete payment using the link below to lock in access.`,
    details: [
      { label: 'Event', value: safeEventName },
      { label: 'Status', value: 'Approved for checkout' },
    ],
    buttonLabel: 'Complete Payment',
    buttonUrl: checkoutUrl,
    note: checkoutUrl
      ? `If the button does not open, use this link:<br /><a href="${escapeHtml(checkoutUrl)}" style="color: #111111; text-decoration: underline; word-break: break-all;">${escapeHtml(checkoutUrl)}</a>`
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
    accentColor: '#000000',
    logoUrl,
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
      ? `You can also open your ticket directly here:<br /><a href="${escapeHtml(ticketUrl)}" style="color: #111111; text-decoration: underline; word-break: break-all;">${escapeHtml(ticketUrl)}</a>`
      : '',
    footer: 'If you experience any issues at all please email 4evr@lmnl.art so I can help fix things that may go awry.',
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
    accentColor: '#90e937',
    logoUrl,
    title: 'New Inquiry',
    intro: 'A new inquiry has been received through the LMNL contact form.',
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
    intro: 'A new artist has submitted an interest form.',
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
    `Project: ${project_name || 'N/A'}`,
    `Links: ${links || 'N/A'}`,
    notes ? `Message:\n${notes}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html: rendered.html, text };
}
