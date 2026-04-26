import { SquareClient, SquareEnvironment } from 'square';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { generatePassBuffer } from './_lib/generate-pass-helper.js';

// Module-level lock to prevent simultaneous race conditions
const processingOrderIds = new Set();

/**
 * Square Webhook Handler — Listens for `order.updated` events.
 * When a payment completes, this creates a ticket record and dispatches
 * a branded confirmation email with a web ticket link.
 */
export default async function handler(req, res) {
  console.log('[Webhook] Request received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- 1. Signature Verification ---
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const signature = req.headers['x-square-hmacsha256-signature'];
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL || `https://lmnl.art/api/square-webhook`;

  if (signatureKey && signature) {
    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', signatureKey)
      .update(notificationUrl + body)
      .digest('base64');

    if (hmac !== signature) {
      console.error('Webhook signature verification failed.');
      return res.status(403).json({ error: 'Invalid signature' });
    }
  } else {
    console.warn('Webhook signature key not configured — skipping verification.');
  }

  // --- 2. Parse the event ---
  const { type, data } = req.body;
  console.log('[Webhook] Incoming event type:', type);

  if (type !== 'order.updated') {
    console.log(`[Webhook] Ignored: Unhandled event type: ${type}`);
    return res.status(200).json({ ignored: true, reason: `Unhandled event type: ${type}` });
  }

  const squareOrderId = data?.object?.order_updated?.order_id || data?.id || req.body?.data?.id;
  if (!squareOrderId) {
    console.log(`[Webhook] Ignored: No order ID found in payload`);
    return res.status(200).json({ ignored: true, reason: 'No order ID found in payload' });
  }

  if (processingOrderIds.has(squareOrderId)) {
    console.log(`[Webhook] Already processing order ${squareOrderId}. Skipping.`);
    return res.status(200).json({ success: true, processing: true });
  }
  
  processingOrderIds.add(squareOrderId);

  try {
    // --- 3. Initialize clients ---
    const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
    const squareToken = isProd
      ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN)
      : process.env.SQUARE_ACCESS_TOKEN;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const squareClient = new SquareClient({
      token: squareToken,
      environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    // --- 4. Idempotency check ---
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('square_order_id', squareOrderId)
      .maybeSingle();

    if (existingTicket) {
      console.log(`[Webhook] Ticket already exists for order ${squareOrderId}. Skipping.`);
      return res.status(200).json({ success: true, duplicate: true });
    }

    // --- 5. Fetch full order details from Square ---
    console.log(`[Webhook] Fetching full order details for: ${squareOrderId}`);
    const orderResponse = await squareClient.orders.get({
      orderId: squareOrderId
    });
    const fullOrder = orderResponse.order;
    
    const requestId = fullOrder.metadata?.requestId;

    // --- 5.5 Atomic Database Lock (Compare & Swap) ---
    let lockAcquired = false;
    
    if (requestId) {
      console.log(`[Webhook] Attempting atomic lock for request: ${requestId}`);
      const { data: lockedReq } = await supabase
        .from('requests')
        .update({ status: 'fulfilled' })
        .eq('id', requestId)
        .eq('status', 'approved')
        .select()
        .maybeSingle();

      if (lockedReq) {
        lockAcquired = true;
        console.log(`[Webhook] Atomic lock acquired for request: ${requestId}`);
      }
    }

    if (!lockAcquired) {
      console.log(`[Webhook] Attempting atomic lock via order ID fallback: ${squareOrderId}`);
      const { data: lockedReq } = await supabase
        .from('requests')
        .update({ status: 'fulfilled' })
        .eq('square_order_id', squareOrderId)
        .eq('status', 'approved')
        .select()
        .maybeSingle();

      if (lockedReq) {
        lockAcquired = true;
        console.log(`[Webhook] Atomic lock acquired via order ID: ${squareOrderId}`);
      }
    }

    if (!lockAcquired) {
      console.log(`[Webhook] Atomic lock FAILED. Order ${squareOrderId} is already fulfilled or invalid.`);
      return res.status(200).json({ success: true, reason: 'Order already fulfilled or processed.' });
    }

    console.log('[Webhook] Full Order Keys:', Object.keys(fullOrder));

    // Process completed orders, or open orders that have been paid (tenders exist)
    const isPaid = fullOrder.tenders && fullOrder.tenders.length > 0;
    if (fullOrder.state !== 'COMPLETED' && !(fullOrder.state === 'OPEN' && isPaid)) {
      console.log(`[Webhook] Ignored: Order state is ${fullOrder.state} and isPaid=${isPaid}, skipping.`);
      return res.status(200).json({ ignored: true, reason: `Order state is ${fullOrder.state} and isPaid=${isPaid}, skipping.` });
    }

    // Extract customer info
    let customerName = 'Guest';
    let customerEmail = '';

    // Try to get customer details from the order
    if (fullOrder.fulfillments?.length > 0) {
      const recipient = fullOrder.fulfillments[0].pickupDetails?.recipient ||
                        fullOrder.fulfillments[0].shipmentDetails?.recipient ||
                        fullOrder.fulfillments[0].digitalDetails?.recipient || {};
      customerName = recipient.displayName || customerName;
      customerEmail = recipient.emailAddress || customerEmail;
    }

    // Fallback 1: try customer ID on order or tenders, then look up
    if (!customerEmail) {
      const customerId = fullOrder.customerId || (fullOrder.tenders?.length > 0 ? fullOrder.tenders[0].customerId : null);
      if (customerId) {
        try {
          const customerResponse = await squareClient.customers.get({ customerId });
          const customer = customerResponse.customer;
          customerName = `${customer.givenName || ''} ${customer.familyName || ''}`.trim() || customerName;
          customerEmail = customer.emailAddress || '';
        } catch (e) {
          console.warn(`Could not fetch customer ${customerId}:`, e.message);
        }
      }
    }

    // --- 6. Match line items to LMNL events ---
    const lineItems = fullOrder.lineItems || [];
    const catalogObjectIds = lineItems
      .map(li => li.catalogObjectId)
      .filter(Boolean);

    // Find matching event(s)
    let eventData = null;
    if (catalogObjectIds.length > 0) {
      const { data: matchedEvent } = await supabase
        .from('events')
        .select('*')
        .in('square_variation_id', catalogObjectIds)
        .maybeSingle();

      eventData = matchedEvent;
    }

    // Fallback 2: Query 'requests' table via explicit metadata.requestId or square_order_id
    if (!customerEmail) {
      const requestId = fullOrder.metadata?.requestId;
      if (requestId) {
        console.log(`[Webhook] Email still empty. Querying requests by metadata requestId: ${requestId}`);
        const { data: fallbackReq } = await supabase
          .from('requests')
          .select('customer_email, customer_name')
          .eq('id', requestId)
          .maybeSingle();

        if (fallbackReq) {
          customerEmail = fallbackReq.customer_email;
          customerName = fallbackReq.customer_name || customerName;
          console.log('[Webhook] Database customer email resolved via metadata requestId:', customerEmail);
        }
      }

      if (!customerEmail) {
        console.log(`[Webhook] Email still empty. Querying requests strictly by square_order_id: ${squareOrderId}`);
        const { data: fallbackReq } = await supabase
          .from('requests')
          .select('customer_email, customer_name')
          .eq('square_order_id', squareOrderId)
          .maybeSingle();

        if (fallbackReq) {
          customerEmail = fallbackReq.customer_email;
          customerName = fallbackReq.customer_name || customerName;
          console.log('[Webhook] Database customer email resolved via square_order_id:', customerEmail);
        } else {
          console.warn(`[Webhook] No matching request found via metadata requestId or square_order_id.`);
        }
      }
    }

    console.log('[Webhook] Resolved Customer:', { customerName, customerEmail });

    if (!eventData) {
      console.warn(`[Webhook] No LMNL event found for catalog IDs: ${catalogObjectIds.join(', ')}`);
      // Still create a ticket but without event linkage
    }

    // --- 7. Generate high-entropy QR payload ---
    const qrPayload = `LMNL-${crypto.randomUUID()}`;

    // --- 8. Insert ticket record ---
    const { data: ticket, error: insertError } = await supabase
      .from('tickets')
      .insert({
        event_id: eventData?.id || null,
        square_order_id: squareOrderId,
        customer_name: customerName,
        customer_email: customerEmail,
        qr_code_payload: qrPayload,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Webhook] Failed to insert ticket:', insertError);
      throw insertError;
    }

    console.log(`[Webhook] Ticket created: ${ticket.id} for ${customerEmail}`);

    // --- 9. Send confirmation email ---
    if (customerEmail) {
      const siteUrl = process.env.SITE_URL || 'https://lmnl.art';
      const ticketUrl = `${siteUrl}/ticket/${ticket.id}`;
      const eventName = eventData?.name || 'LMNL Event';
      const eventDate = eventData?.event_date || '';
      const eventTime = eventData?.event_time || '';
      const eventLocation = eventData?.location_name || '';

      const fromEmail = process.env.RESEND_API_KEY?.startsWith('re_')
        ? 'LMNL <tickets@lmnl.art>'
        : 'onboarding@resend.dev';

      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 0;">
          <div style="padding: 40px 30px; text-align: center; border-bottom: 2px solid #222;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 500; letter-spacing: 0.3em;">LMNL</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #999; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px;">TICKET CONFIRMED</p>
            <h2 style="margin: 0 0 30px; font-size: 24px; font-weight: 500;">${eventName}</h2>
            ${eventDate ? `<p style="color: #ccc; margin: 5px 0;"><strong>DATE:</strong> ${eventDate}${eventTime ? ` at ${eventTime}` : ''}</p>` : ''}
            ${eventLocation ? `<p style="color: #ccc; margin: 5px 0;"><strong>LOCATION:</strong> ${eventLocation}</p>` : ''}
            <p style="color: #ccc; margin: 5px 0;"><strong>GUEST:</strong> ${customerName}</p>
            <div style="margin: 40px 0; text-align: center;">
              <a href="${ticketUrl}" style="display: inline-block; background: #fff; color: #000; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.1em;">VIEW YOUR TICKET</a>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">
              Show the QR code at the door for entry. 
              <br/>Your ticket link: <a href="${ticketUrl}" style="color: #999;">${ticketUrl}</a>
            </p>
          </div>
          <div style="padding: 20px 30px; border-top: 1px solid #222; text-align: center;">
            <p style="color: #444; font-size: 10px; letter-spacing: 0.15em; margin: 0;">© LMNL — ART & EXPERIENCE</p>
          </div>
        </div>
      `;

      try {
        console.log('[Webhook] Attempting to send email via Resend...');
        
        let passBuffer = null;
        try {
          passBuffer = await generatePassBuffer(ticket, eventData);
        } catch (passErr) {
          console.error('[Webhook] Failed to generate Apple Wallet pass for email:', passErr);
        }

        const emailOptions = {
          from: fromEmail,
          to: customerEmail,
          subject: `Your Ticket: ${eventName}`,
          html: emailHtml
        };

        if (passBuffer) {
          emailOptions.attachments = [
            {
              filename: `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ticket.pkpass`,
              content: passBuffer
            }
          ];
          console.log('[Webhook] Attaching Apple Wallet pass to email.');
        }

        console.log('[Webhook] Email options:', { from: fromEmail, to: customerEmail, subject: `Your Ticket: ${eventName}`, hasAttachment: !!passBuffer });
        
        const { data: emailData, error: emailError } = await resend.emails.send(emailOptions);

        if (emailError) {
          console.error('[Webhook] Resend Error returned:', emailError);
        } else {
          console.log(`[Webhook] Resend success response:`, emailData);
          console.log(`[Webhook] Confirmation email sent to ${customerEmail}`);
        }
      } catch (emailErr) {
        console.error('[Webhook] Email dispatch error:', emailErr);
        // Don't throw — ticket is already created, email failure is non-fatal
      }
    } else {
      console.warn('[Webhook] No customer email found, skipping email dispatch.');
    }

    return res.status(200).json({ success: true, ticketId: ticket.id });

  } catch (error) {
    console.error('[Webhook] CRITICAL ERROR:', error);
    processingOrderIds.delete(squareOrderId);
    return res.status(500).json({ error: error.message });
  }
}
