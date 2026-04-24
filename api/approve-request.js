import { SquareClient, SquareEnvironment } from 'square';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

console.log('--- BACKEND LOADED ---');

export default async function handler(req, res) {
  const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
  const squareToken = isProd ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) : process.env.SQUARE_ACCESS_TOKEN;
  
  try {
    // 1. Validate Environment
    const missingVars = [];
    if (!squareToken) missingVars.push('SQUARE_ACCESS_TOKEN');
    if (!process.env.RESEND_API_KEY) missingVars.push('RESEND_API_KEY');
    if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
      return res.status(500).json({ 
        error: `Missing environment variables: ${missingVars.join(', ')}. Please check your Vercel Dashboard.`
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { requestId, customerEmail, customerName, eventName } = req.body;
    console.log(`Processing ${eventName} for ${customerEmail}`);

    // 2. Initialize Clients
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    const squareClient = new SquareClient({
      token: squareToken,
      environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    console.log('--- Approval Request Started ---');

    // 3. Get Square Locations
    console.log('Fetching Square locations...');
    const locationsResponse = await squareClient.locations.list();
    const locations = locationsResponse.locations;
    
    if (!locations || locations.length === 0) {
      throw new Error('No locations found in your Square account. Please create one in the Square Dashboard.');
    }
    
    const locationId = locations[0].id;
    console.log(`Using Location ID: ${locationId}`);

    // 4. Fetch Event Data from Supabase
    console.log(`Fetching data for event: ${eventName}...`);
    let priceCents = 100; // Default $1.00 fallback
    let squareVariationId = null;
    
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('price, square_variation_id')
        .eq('name', eventName)
        .single();
      
      if (eventData) {
        priceCents = eventData.price || 100;
        squareVariationId = eventData.square_variation_id;
        console.log(`Found event price: ${priceCents} cents, Variation ID: ${squareVariationId || 'None'}`);
      } else {
        console.log(`Event ${eventName} not found in 'events' table, using fallback.`);
      }
    } catch (e) {
      console.error('Error fetching event data:', e);
    }

    // 5. Create Square Link
    console.log('Creating Square payment link...');
    
    let checkoutOptions = {
      idempotencyKey: crypto.randomUUID(),
      locationId: locationId
    };

    if (squareVariationId) {
      // Use Catalog Item for Stock Tracking
      checkoutOptions.order = {
        locationId: locationId,
        lineItems: [
          {
            quantity: '1',
            catalogObjectId: squareVariationId
          }
        ]
      };
      console.log('Using catalog variation for stock tracking.');
    } else {
      // Use QuickPay (One-off item, no stock tracking)
      checkoutOptions.quickPay = {
        name: `${eventName} - Access Ticket`,
        priceMoney: {
          amount: BigInt(priceCents), 
          currency: 'USD'
        },
        locationId: locationId
      };
      console.log('Using QuickPay fallback.');
    }

    const paymentLinkResponse = await squareClient.checkout.paymentLinks.create(checkoutOptions);
    const checkoutUrl = paymentLinkResponse.paymentLink.url;
    console.log(`Square link created: ${checkoutUrl}`);

    // 6. Send Email
    console.log('Sending email via Resend...');
    const fromEmail = process.env.RESEND_API_KEY?.startsWith('re_') ? 'LMNL <tickets@lmnl.art>' : 'onboarding@resend.dev';
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Approved: Your Invite to ${eventName}`,
      html: `<p>Your invite to ${eventName} is approved. Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>`
    });

    if (emailError) {
      console.error('Resend Error:', emailError);
      if (emailError.message?.includes('domain') || emailError.name === 'validation_error') {
        console.log('Retrying with onboarding@resend.dev...');
        const retry = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: customerEmail,
          subject: `Approved: Your Invite to ${eventName}`,
          html: `<p>Your invite to ${eventName} is approved. Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>`
        });
        if (retry.error) throw new Error(`Email failed: ${retry.error.message}`);
      } else {
        throw new Error(`Email failed: ${emailError.message}`);
      }
    }

    // 7. Update Supabase
    console.log('Updating Supabase status...');
    const { error: sbError } = await supabase
      .from('requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (sbError) throw sbError;
    console.log('Supabase updated.');

    return res.status(200).json({ success: true, url: checkoutUrl });
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}
