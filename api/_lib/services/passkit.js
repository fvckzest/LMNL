import fs from 'fs';
import path from 'path';
import { PKPass } from 'passkit-generator';
import forge from 'node-forge';
import { getApplePassConfig } from '../env.js';
import { getTicketView } from './tickets.js';
import { applyPassVisualCustomization, buildPassOverrides, getWalletPassConfig } from './passkit-customization.js';

let passAssets;

function loadPassAssets() {
  if (passAssets) {
    return passAssets;
  }

  const templatePath = path.join(process.cwd(), 'api/_lib/LMNL.pass');
  const wwdrPath = path.join(process.cwd(), 'api/_lib/certs/wwdr.pem');

  if (!fs.existsSync(wwdrPath)) {
    return null;
  }

  passAssets = {
    templatePath,
    wwdr: fs.readFileSync(wwdrPath),
  };

  return passAssets;
}

function getCertificateMaterial() {
  const config = getApplePassConfig();
  if (!config.passTypeIdentifier || !config.teamIdentifier || !config.certificateBase64) {
    return null;
  }

  const p12Der = Buffer.from(config.certificateBase64, 'base64').toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, config.certificatePassword || '');

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })?.[forge.pki.oids.certBag] || [];
  const cert = certBags[0]?.cert;
  if (!cert) {
    return null;
  }
  const signerCert = forge.pki.certificateToPem(cert);

  const shroudedKeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })?.[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  const regularKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })?.[forge.pki.oids.keyBag] || [];
  const privateKey = (shroudedKeyBags[0] || regularKeyBags[0])?.key;

  if (!privateKey) {
    return null;
  }

  return {
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    signerCert,
    signerKey: forge.pki.privateKeyToPem(privateKey),
  };
}

function formatEventDate(eventData) {
  if (!eventData?.event_date) return 'TBA';
  return new Date(`${eventData.event_date}T00:00:00`).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '.');
}

export async function generateTicketPass(ticketId) {
  const assets = loadPassAssets();
  const certificateMaterial = getCertificateMaterial();

  if (!assets || !certificateMaterial) {
    return {
      kind: 'unavailable',
      reason: 'Apple Wallet integration is pending configuration.',
    };
  }

  const { ticket, event } = await getTicketView(ticketId);
  const wallet = getWalletPassConfig(event);
  const pass = await PKPass.from(
    {
      model: assets.templatePath,
      certificates: {
        wwdr: assets.wwdr,
        signerCert: certificateMaterial.signerCert,
        signerKey: certificateMaterial.signerKey,
      },
    },
    buildPassOverrides(ticket, event, certificateMaterial)
  );

  if (wallet.primaryValue) {
    pass.primaryFields.push({
      key: 'event',
      label: 'EVENT',
      value: wallet.primaryValue,
    });
  }

  pass.secondaryFields.push(
    { key: 'date', label: 'DATE', value: formatEventDate(event) },
    { key: 'time', label: 'TIME', value: event?.event_time || 'TBA' }
  );

  pass.auxiliaryFields.push(
    { key: 'location', label: 'LOCATION', value: wallet.locationValue },
    { key: 'guest', label: 'GUEST', value: ticket.customer_name }
  );

  const barcodeMessage = ticket.qr_code_payload || ticket.id;
  pass.setBarcodes(barcodeMessage);
  await applyPassVisualCustomization(pass, event);

  return {
    kind: 'buffer',
    buffer: await pass.getAsBuffer(),
    filename: `ticket-${ticket.id}.pkpass`,
  };
}
