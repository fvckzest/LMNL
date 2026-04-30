import { PKPass } from 'passkit-generator';
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { getApplePassConfig } from './env.js';

/**
 * Generates an Apple Wallet .pkpass buffer for a given ticket and event.
 * Returns null if required certificates are not configured.
 */
export async function generatePassBuffer(ticket, eventData) {
  const {
    passTypeIdentifier,
    teamIdentifier,
    certificateBase64: base64Cert,
    certificatePassword,
  } = getApplePassConfig();

  // If certs aren't configured yet, we can't generate the pass
  if (!passTypeIdentifier || !teamIdentifier || !base64Cert) {
    console.warn('[Apple Wallet] Missing required environment variables for pass generation.');
    return null;
  }

  try {
    // Load Pass Template & Certificates
    const templatePath = path.join(process.cwd(), 'api/_lib/LMNL.pass');
    const wwdrPath = path.join(process.cwd(), 'api/_lib/certs/wwdr.pem');
    
    if (!fs.existsSync(wwdrPath)) {
      console.error('[Apple Wallet] WWDR certificate not found at', wwdrPath);
      return null;
    }
    
    const wwdr = fs.readFileSync(wwdrPath);
    
    // Parse certificates using node-forge
    const p12Der = Buffer.from(base64Cert, 'base64').toString('binary');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, certificatePassword);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })?.[forge.pki.oids.certBag] || [];
    const cert = certBags[0]?.cert;
    if (!cert) {
      throw new Error('Could not extract signer certificate from .p12 certificate.');
    }
    const signerCert = forge.pki.certificateToPem(cert);
    
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag }) || {};
    const keyBag = p12.getBags({ bagType: forge.pki.oids.keyBag }) || {};
    const shroudedKeyBags = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    const regularKeyBags = keyBag[forge.pki.oids.keyBag] || [];
    const privateKey = (shroudedKeyBags[0] || regularKeyBags[0])?.key;
    
    if (!privateKey) {
      throw new Error('Could not extract private key from .p12 certificate.');
    }
    const signerKey = forge.pki.privateKeyToPem(privateKey);

    // Format date string nicely
    let dateVal = 'TBA';
    if (eventData?.event_date) {
      dateVal = new Date(eventData.event_date + 'T00:00:00').toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '.');
    }

    // Create Pass using v3 API
    const pass = await PKPass.from(
      {
        model: templatePath,
        certificates: {
          wwdr,
          signerCert,
          signerKey
        }
      },
      {
        passTypeIdentifier,
        teamIdentifier,
        serialNumber: ticket.id
      }
    );

    // Push dynamic fields programmatically
    pass.primaryFields.push({ 
      key: 'event', 
      label: 'EVENT', 
      value: eventData?.name || 'LMNL Event' 
    });
    
    pass.secondaryFields.push(
      { key: 'date', label: 'DATE', value: dateVal },
      { key: 'time', label: 'TIME', value: eventData?.event_time || 'TBA' }
    );
    
    pass.auxiliaryFields.push(
      { key: 'location', label: 'LOCATION', value: eventData?.location_name || 'TBA' },
      { key: 'guest', label: 'GUEST', value: ticket.customer_name }
    );

    pass.barcodes = [{
      message: ticket.qr_code_payload,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1'
    }];

    // Generate Buffer
    return await pass.getAsBuffer();

  } catch (error) {
    console.error('[Apple Wallet] Error generating pass buffer:', error);
    return null;
  }
}
