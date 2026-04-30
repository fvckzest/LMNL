import { SquareClient, SquareEnvironment } from 'square';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { preorderId, squareItemId } = req.body;

  // Validate input
  if (!preorderId || !squareItemId) {
    return res.status(400).json({ 
      error: 'Missing required parameters: preorderId and squareItemId are required.' 
    });
  }

  const isProd = process.env.SQUARE_ENVIRONMENT === 'production';
  const squareToken = isProd 
    ? (process.env.SQUARE_PROD_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) 
    : process.env.SQUARE_ACCESS_TOKEN;

  try {
    if (!squareToken) {
      throw new Error('Square access token is missing from environment variables.');
    }

    const squareClient = new SquareClient({
      token: squareToken,
      environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    // 1. Get Location ID
    // We need a location ID to create an order. We'll use the one from env or fetch the first active location.
    let locationId = process.env.SQUARE_LOCATION_ID;
    if (!locationId) {
      const response = await squareClient.locations.list();
      const locations = response.locations || [];
      const activeLocation = locations.find(l => l.status === 'ACTIVE');
      
      if (activeLocation) {
        locationId = activeLocation.id;
      } else if (locations.length > 0) {
        locationId = locations[0].id;
      } else {
        throw new Error('No active Square locations found for this account.');
      }
    }

    console.log(`Creating Square Checkout for Preorder: ${preorderId}, Item/Var ID: ${squareItemId}, Location: ${locationId}`);

    // 2. Resolve Variation ID
    // If squareItemId is an ITEM, we need to find its first variation to create a line item.
    let variationId = squareItemId;
    try {
      const catResponse = await squareClient.catalog.object.get({ objectId: squareItemId });
      const object = catResponse.object;
      
      if (object && object.type === 'ITEM') {
        const variations = object.itemData.variations || [];
        if (variations.length > 0) {
          variationId = variations[0].id;
          console.log(`Resolved Item ${squareItemId} to Variation ${variationId}`);
        } else {
          throw new Error('This item has no variations in Square.');
        }
      }
    } catch (catErr) {
      console.warn('Could not resolve variation ID via Catalog API:', catErr.message);
      // We'll try with the provided ID anyway, Square might handle it or return a descriptive error
    }

    // 3. Create Payment Link
    // This creates a Checkout link that includes an order.
    // We attach preorderId to the referenceId so we can track it in webhooks later.
    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: locationId,
        referenceId: String(preorderId), // Link this order to our Supabase preorder record
        lineItems: [
          {
            quantity: '1',
            catalogObjectId: variationId, // This must be a CatalogVariation ID
          },
        ],
      },
      checkoutOptions: {
        // Redirect back to our shop with status information
        redirectUrl: `${process.env.SITE_URL || 'https://lmnl.art'}/shop?checkout=success&preorderId=${preorderId}`,
        askForShippingAddress: true,
        // Optional: you can add more options like allowed payment methods
      }
    });

    const paymentLink = response.paymentLink;

    if (!paymentLink || !paymentLink.url) {
      throw new Error('Square API returned a success response but no payment link URL was found.');
    }

    // Success! Return the checkout URL
    return res.status(200).json({ 
      success: true, 
      url: paymentLink.url 
    });

  } catch (error) {
    console.error('Square Checkout Error:', error);
    
    // Extract detailed error information if available from Square SDK
    const errorMessage = error.message || 'An error occurred while creating the checkout link.';
    const details = error.errors || (error.result?.errors) || [];

    return res.status(500).json({ 
      error: errorMessage,
      details: details,
      help: "Ensure the squareItemId matches a valid CatalogVariation ID in your Square Dashboard."
    });
  }
}
