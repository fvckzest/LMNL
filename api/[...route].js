import crypto from 'crypto';
import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson, AppError, verifyTurnstileToken } from './_lib/http.js';
import { requireAdminUser } from './_lib/auth.js';
import { requireCommunityUser } from './_lib/auth-community.js';
import { getAdminSupabase, getSquareClient } from './_lib/clients.js';
import handleDiscordInteractions from './discord-interactions.js';
import { createCheckoutForEvent, createCheckoutForPreorder, createCheckoutForRequest } from './_lib/services/checkout.js';
import { getCheckoutSuccessView, getCheckoutSuccessViewByTicketId } from './_lib/services/checkout-success.js';
import { getVariationInventory } from './_lib/services/inventory.js';
import { generateTicketPass } from './_lib/services/passkit.js';
import { createPaymentForPreorder, getPreorderCheckoutView } from './_lib/services/preorder-checkout.js';
import { createPaymentForRequest, getRequestCheckoutView } from './_lib/services/request-checkout.js';
import { createPaymentForEvent, getEventCheckoutView } from './_lib/services/event-checkout.js';
import {
  buildArtistInterestDiscordEmbed,
  buildInquiryDiscordEmbed,
  sendDiscordIntakeNotification,
} from './_lib/services/discord.js';
import {
  attachAttendanceSourceToUser,
  claimAttendanceSourceForUser,
  createManualAttendanceSource,
  getAdminAttendanceQueue,
} from './_lib/services/attendance.js';
import { getCommunityDashboard } from './_lib/services/community-dashboard.js';
import { confirmCheckInTicket, getCheckInTicketView, getTicketView } from './_lib/services/tickets.js';
import { processSquareOrderUpdate, reconcileApprovedRequestTicket } from './_lib/services/webhook-fulfillment.js';
import { getAdminCatalogView } from './_lib/services/catalog.js';
import { getSiteActivityHistory } from './_lib/services/site-activity.js';
import { getSpaceTicketActivity } from './_lib/services/space-activity.js';
import {
  countApprovedRequestsByEventName,
  createAccessRequest,
  deleteRequestById,
  listRequests,
  updateRequestStatus,
} from './_lib/repositories/requests.js';
import { approveRequestAndSendCheckout } from './_lib/services/approval.js';
import { deletePreorderById, listPreorders, updatePreorderStatus, upsertPreorder } from './_lib/repositories/preorders.js';
import { deleteEventById, listEvents, listPublicEvents, updateEventMetadata, updateEventStatus, upsertEvent } from './_lib/repositories/events.js';
import { listTickets } from './_lib/repositories/tickets.js';
import { sendInquiryNotification, sendArtistInterestNotification } from './_lib/services/inquiries.js';
import { getAdminAuthorizationConfig, getSupabaseConfig } from './_lib/env.js';
import {
  deleteCommunityCreditById,
  deleteServiceProductById,
  deleteMailingListEntryById,
  listArtistInterest,
  listBlogPostsAdmin,
  listCommunityCredits,
  listMailingListEntries,
  listServiceProducts,
  listServiceInquiries,
  saveCommunityCredit,
  saveMailingListEntry,
  saveServiceProduct,
  syncCommunityCreditsFromEvents,
} from './_lib/repositories/admin-content.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function throwMissingArtistInterestTable(error) {
  if (error?.code === 'PGRST205' && error?.message?.includes('artist_interest')) {
    throw new AppError('Artist interest form is not set up yet. Create the `artist_interest` table in Supabase and try again.', {
      code: 'ARTIST_INTEREST_TABLE_MISSING',
      status: 503,
      details: error,
      expose: true,
    });
  }

  throw error;
}

function getRouteKey(req) {
  const route = req.query?.route;
  if (Array.isArray(route)) {
    return route.join('/');
  }
  if (route) {
    return route;
  }

  const pathname = new URL(req.url, 'http://localhost').pathname;
  return pathname.replace(/^\/api\/?/, '');
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function settleNotificationTasks(tasks, timeoutMs = 5000) {
  const results = await Promise.allSettled(
    tasks.map(({ label, task }) => withTimeout(Promise.resolve().then(task), timeoutMs, label)),
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[api] ${tasks[index].label} failed:`, result.reason);
    }
  });
}

async function handleCheckInventory(req, res) {
  allowMethods(req, ['GET']);
  const variationId = requireValue(req.query?.variationId, 'Variation ID is required');
  const data = await getVariationInventory(variationId);
  return sendJson(res, 200, { success: true, data });
}

async function handleConfirmTicket(req, res) {
  allowMethods(req, ['GET', 'POST']);

  const body = req.method === 'POST' ? await parseJsonBody(req) : {};
  const requestId = req.query?.requestId || body.requestId || '';
  const ticketId = req.query?.ticketId || body.ticketId || '';

  if (!requestId && !ticketId) {
    requireValue('', 'requestId or ticketId is required.');
  }

  if (ticketId && !requestId) {
    const data = await getCheckoutSuccessViewByTicketId(ticketId);
    return sendJson(res, 200, { success: true, data });
  }

  const fulfillment = await reconcileApprovedRequestTicket(requestId);
  const summary = await getCheckoutSuccessView(requestId);

  return sendJson(res, 200, {
    success: true,
    data: {
      fulfillment,
      ...summary,
    },
  });
}

async function handleCreateCheckout(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const preorderId = requireValue(body.preorderId, 'preorderId is required.');
  const data = await createCheckoutForPreorder(preorderId, {
    buyer: body.buyer || {},
  });
  return sendJson(res, 200, { success: true, data });
}

async function handleCreateEventCheckout(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const eventId = requireValue(body.eventId, 'eventId is required.');
  const data = await createCheckoutForEvent(eventId, {
    buyer: body.buyer || {},
  });
  return sendJson(res, 200, { success: true, data });
}

async function handleCreateRequestCheckout(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const requestId = requireValue(body.requestId, 'requestId is required.');
  const data = await createCheckoutForRequest(requestId, {
    buyer: body.buyer || {},
  });
  return sendJson(res, 200, { success: true, data });
}

async function handleGetPreorderCheckout(req, res) {
  allowMethods(req, ['GET']);
  const preorderId = requireValue(req.query?.preorderId, 'preorderId is required.');
  const data = await getPreorderCheckoutView(preorderId);
  return sendJson(res, 200, { success: true, data });
}

async function handlePayPreorder(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const preorderId = requireValue(body.preorderId, 'preorderId is required.');
  const sourceId = requireValue(body.sourceId, 'sourceId is required.');

  const data = await createPaymentForPreorder(preorderId, {
    sourceId,
    verificationToken: body.verificationToken,
    buyer: body.buyer || {},
    billingAddress: body.billingAddress || {},
    shippingAddress: body.shippingAddress || {},
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleGetRequestCheckout(req, res) {
  allowMethods(req, ['GET']);
  const requestId = requireValue(req.query?.requestId, 'requestId is required.');
  const data = await getRequestCheckoutView(requestId);
  return sendJson(res, 200, { success: true, data });
}

async function handleGetEventCheckout(req, res) {
  allowMethods(req, ['GET']);
  const eventId = requireValue(req.query?.eventId, 'eventId is required.');
  const data = await getEventCheckoutView(eventId);
  return sendJson(res, 200, { success: true, data });
}

async function handleEventStats(req, res) {
  allowMethods(req, ['GET']);
  const eventName = requireValue(req.query?.eventName, 'eventName is required.');
  const approvedCount = await countApprovedRequestsByEventName(eventName);

  return sendJson(res, 200, {
    success: true,
    data: {
      eventName,
      approvedCount,
    },
  });
}

async function handleSiteActivity(req, res) {
  allowMethods(req, ['GET']);
  const rawLimit = Number(req.query?.limit);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 6;
  const data = await getSiteActivityHistory(limit);
  return sendJson(res, 200, { success: true, data });
}

async function handleSpaceActivity(req, res) {
  allowMethods(req, ['GET']);
  const rawLimit = Number(req.query?.limit);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 8;
  const data = await getSpaceTicketActivity({
    eventId: req.query?.eventId || '',
    eventName: req.query?.eventName || 'SPACE',
    limit,
  });
  return sendJson(res, 200, { success: true, data });
}

async function handlePayRequest(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const requestId = requireValue(body.requestId, 'requestId is required.');
  const sourceId = requireValue(body.sourceId, 'sourceId is required.');

  const data = await createPaymentForRequest(requestId, {
    sourceId,
    verificationToken: body.verificationToken,
    buyer: body.buyer || {},
    billingAddress: body.billingAddress || {},
  });

  return sendJson(res, 200, { success: true, data });
}

async function handlePayEvent(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const eventId = requireValue(body.eventId, 'eventId is required.');
  const sourceId = requireValue(body.sourceId, 'sourceId is required.');

  const data = await createPaymentForEvent(eventId, {
    sourceId,
    verificationToken: body.verificationToken,
    buyer: body.buyer || {},
    billingAddress: body.billingAddress || {},
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleCreateTestItem(req, res) {
  allowMethods(req, ['POST']);
  await requireAdminUser(req);

  const response = await getSquareClient().catalog.upsertCatalogObject({
    idempotencyKey: crypto.randomUUID(),
    object: {
      type: 'ITEM',
      id: '#new',
      itemData: {
        name: 'API TEST TICKET',
        description: 'Created via LMNL Admin to test connection.',
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: '#var',
            itemVariationData: {
              name: 'Regular',
              pricingType: 'FIXED_PRICING',
              priceMoney: {
                amount: 1000n,
                currency: 'USD',
              },
            },
          },
        ],
      },
    },
  });

  return sendJson(res, 200, { success: true, item: response.object });
}

async function handleEnableSquareTracking(req, res) {
  allowMethods(req, ['POST']);
  await requireAdminUser(req);

  const body = await parseJsonBody(req);
  const variationId = requireValue(body.variationId, 'Variation ID is required');
  const squareClient = getSquareClient();

  const getRes = await squareClient.catalog.get({
    objectId: variationId,
  });

  const variation = getRes.object;
  if (!variation || variation.type !== 'ITEM_VARIATION') {
    throw new Error('Invalid variation ID');
  }

  variation.itemVariationData.trackInventory = true;

  const updateRes = await squareClient.catalog.upsert({
    idempotencyKey: crypto.randomUUID(),
    object: variation,
  });

  return sendJson(res, 200, { success: true, variation: updateRes.object });
}

async function handleEvents(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    const hasAuthHeader = Boolean(req.headers.authorization);
    if (hasAuthHeader) {
      await requireAdminUser(req);
      const data = await listEvents();
      return sendJson(res, 200, { success: true, data });
    }

    const data = await listPublicEvents();
    return sendJson(res, 200, { success: true, data });
  }

  await requireAdminUser(req);

  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deleteEventById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'update-status') {
    const event = await updateEventStatus(
      requireValue(body.id, 'id is required.'),
      requireValue(body.status, 'status is required.'),
    );
    return sendJson(res, 200, { success: true, data: event });
  }

  if (body.action === 'update-metadata') {
    const event = await updateEventMetadata(
      requireValue(body.id, 'id is required.'),
      body.metadata || {},
    );
    return sendJson(res, 200, { success: true, data: event });
  }

  const event = await upsertEvent(body);
  return sendJson(res, 200, { success: true, data: event });
}

async function handleGeneratePass(req, res) {
  allowMethods(req, ['GET']);
  const ticketId = requireValue(req.query?.ticketId, 'Missing ticketId parameter');
  const result = await generateTicketPass(ticketId);

  if (result.kind === 'unavailable') {
    return sendJson(res, 503, {
      success: false,
      error: {
        code: 'PASS_UNAVAILABLE',
        message: result.reason,
      },
    });
  }

  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.setHeader('Content-Length', String(result.buffer.length));
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Transfer-Encoding', 'binary');
  return res.send(result.buffer);
}

async function handleGetTicket(req, res) {
  allowMethods(req, ['GET']);
  const ticketId = requireValue(req.query?.ticketId, 'Missing ticketId parameter');
  const data = await getTicketView(ticketId);
  return sendJson(res, 200, { success: true, data });
}

async function handleCheckInTicket(req, res) {
  allowMethods(req, ['GET', 'POST']);
  const adminUser = await requireAdminUser(req);

  const body = req.method === 'POST' ? await parseJsonBody(req) : {};
  const token = requireValue(req.query?.token || body.token, 'token is required.');
  const data = req.method === 'POST'
    ? await confirmCheckInTicket(token, { verifiedByAdminUserId: adminUser.id })
    : await getCheckInTicketView(token);

  return sendJson(res, 200, { success: true, data });
}

async function handleAppDashboard(req, res) {
  allowMethods(req, ['GET']);
  const user = await requireCommunityUser(req);
  const data = await getCommunityDashboard(user);
  return sendJson(res, 200, { success: true, data });
}

async function handleAttendanceClaim(req, res) {
  allowMethods(req, ['POST']);
  const user = await requireCommunityUser(req);
  const body = await parseJsonBody(req);
  const sourceId = requireValue(body.sourceId, 'sourceId is required.');
  const data = await claimAttendanceSourceForUser(sourceId, user);
  return sendJson(res, 200, { success: true, data });
}

async function handleAdminAttendanceAttach(req, res) {
  allowMethods(req, ['POST']);
  const adminUser = await requireAdminUser(req);
  const body = await parseJsonBody(req);

  if (body.sourceId) {
    const userId = requireValue(body.userId, 'userId is required.');
    const data = await attachAttendanceSourceToUser({
      sourceId: body.sourceId,
      userId,
      adminUserId: adminUser.id,
      participationTier: body.participationTier,
    });

    return sendJson(res, 200, { success: true, data });
  }

  const eventId = requireValue(body.eventId, 'eventId is required.');
  const data = await createManualAttendanceSource({
    eventId,
    userId: body.userId || null,
    adminUserId: adminUser.id,
    contactEmail: body.contactEmail || '',
    contactName: body.contactName || '',
    participationTier: body.participationTier || 'attendee',
    notes: body.notes || '',
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleAdminAttendanceSources(req, res) {
  allowMethods(req, ['GET']);
  await requireAdminUser(req);
  const data = await getAdminAttendanceQueue();
  return sendJson(res, 200, { success: true, data });
}

async function handleAdminTickets(req, res) {
  allowMethods(req, ['GET']);
  await requireAdminUser(req);
  const data = await listTickets();
  return sendJson(res, 200, { success: true, data });
}

async function handleAdminSession(req, res) {
  allowMethods(req, ['GET']);
  const user = await requireAdminUser(req);
  return sendJson(res, 200, {
    success: true,
    data: {
      id: user.id,
      email: user.email || null,
    },
  });
}

async function handleAdminRuntime(req, res) {
  allowMethods(req, ['GET']);

  let supabaseConfig = null;
  let supabaseConfigError = null;

  try {
    supabaseConfig = getSupabaseConfig();
  } catch (error) {
    supabaseConfigError = {
      code: error?.code || 'CONFIG_READ_FAILED',
      message: error?.message || 'Unable to read Supabase configuration.',
      details: error?.details || null,
    };
  }

  const authConfig = getAdminAuthorizationConfig();
  const runtime = {
    nodeEnv: process.env.NODE_ENV || '',
    vercelEnv: process.env.VERCEL_ENV || '',
    supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
    supabaseServiceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseAnonConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
    viteSupabaseUrlConfigured: Boolean(process.env.VITE_SUPABASE_URL),
    viteSupabaseAnonConfigured: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    adminAuthSource: authConfig.source,
    adminUserIdsConfigured: authConfig.adminUserIds.length > 0,
    adminUserEmailsConfigured: authConfig.adminUserEmails.length > 0,
    resolvedClientKey: supabaseConfig?.serviceRoleKey
      ? 'service_role'
      : (supabaseConfig?.anonKey ? 'anon' : 'missing'),
    supabaseConfigError,
  };

  let authProbe = null;

  if (supabaseConfig) {
    try {
      const { error } = await getAdminSupabase().auth.getUser('diagnostic-token');
      authProbe = {
        ok: true,
        code: error?.code || null,
        message: error?.message || null,
      };
    } catch (error) {
      authProbe = {
        ok: false,
        code: error?.code || null,
        message: error?.message || String(error),
      };
    }
  }

  return sendJson(res, 200, {
    success: true,
    data: {
      runtime,
      authProbe,
    },
  });
}

async function handlePreorders(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    await requireAdminUser(req);
    const data = await listPreorders();
    return sendJson(res, 200, { success: true, data });
  }

  await requireAdminUser(req);
  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deletePreorderById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'update-status') {
    const preorder = await updatePreorderStatus(
      requireValue(body.id, 'id is required.'),
      requireValue(body.status, 'status is required.'),
    );
    return sendJson(res, 200, { success: true, data: preorder });
  }

  const preorder = await upsertPreorder(body);
  return sendJson(res, 200, { success: true, data: preorder });
}

async function handleRequests(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    await requireAdminUser(req);
    const data = await listRequests();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);

  if (body.action === 'create') {
    const created = await createAccessRequest({
      event_name: requireValue(body.eventName, 'eventName is required.'),
      customer_name: requireValue(body.customerName, 'customerName is required.'),
      customer_email: requireValue(body.customerEmail, 'customerEmail is required.'),
    });

    return sendJson(res, 200, {
      success: true,
      data: { id: created.id, request: created },
    });
  }

  if (body.action === 'approve') {
    await requireAdminUser(req);
    const requestId = requireValue(body.requestId, 'requestId is required.');
    const data = await approveRequestAndSendCheckout(requestId);
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'delete') {
    await requireAdminUser(req);
    await deleteRequestById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'update') {
    await requireAdminUser(req);
    const request = await updateRequestStatus(
      requireValue(body.id, 'id is required.'),
      requireValue(body.status, 'status is required.'),
    );
    return sendJson(res, 200, { success: true, data: request });
  }

  throw new Error('Unsupported requests action.');
}

async function handleServiceInquiries(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    await requireAdminUser(req);
    const data = await listServiceInquiries();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);
  const supabase = getAdminSupabase();

  if (body.action === 'create') {
    await verifyTurnstileToken(
      requireValue(body.turnstileToken, 'turnstileToken is required.'),
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    );

    const { data, error } = await supabase
      .from('service_inquiries')
      .insert([{
        name: requireValue(body.name, 'name is required.'),
        email: requireValue(body.email, 'email is required.'),
        notes: body.notes || '',
        selected_services: body.selectedServices || [],
      }])
      .select()
      .single();

    if (error) throw error;

    await settleNotificationTasks([
      {
        label: 'Inquiry email notification',
        task: () => sendInquiryNotification(data),
      },
      {
        label: 'Discord inquiry notification',
        task: () => sendDiscordIntakeNotification(buildInquiryDiscordEmbed(data)),
      },
    ]);

    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'update') {
    await requireAdminUser(req);
    const { data, error } = await supabase
      .from('service_inquiries')
      .update({ status: requireValue(body.status, 'status is required.') })
      .eq('id', requireValue(body.id, 'id is required.'))
      .select()
      .single();

    if (error) throw error;
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'delete') {
    await requireAdminUser(req);
    const { error } = await supabase
      .from('service_inquiries')
      .delete()
      .eq('id', requireValue(body.id, 'id is required.'));

    if (error) throw error;
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  throw new Error('Unsupported service inquiries action.');
}

async function handleServiceProducts(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    const data = await listServiceProducts();
    return sendJson(res, 200, { success: true, data });
  }

  await requireAdminUser(req);
  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deleteServiceProductById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  const data = await saveServiceProduct({
    id: body.id || null,
    capability: requireValue(body.capability, 'capability is required.'),
    product: requireValue(body.product, 'product is required.'),
    scope: body.scope || '',
    sort_order: body.sortOrder ?? 0,
    is_active: body.isActive !== false,
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleArtistInterest(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    await requireAdminUser(req);
    const data = await listArtistInterest();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);
  const supabase = getAdminSupabase();

  if (body.action === 'create') {
    await verifyTurnstileToken(
      requireValue(body.turnstileToken, 'turnstileToken is required.'),
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    );

    const { data, error } = await supabase
      .from('artist_interest')
      .insert([{
        name: requireValue(body.name, 'name is required.'),
        email: requireValue(body.email, 'email is required.'),
        project_name: body.projectName || '',
        location: body.location || '',
        practice: requireValue(body.practice, 'practice is required.'),
        format: body.format || '',
        links: body.links || '',
        notes: body.notes || '',
      }])
      .select()
      .single();

    if (error) throwMissingArtistInterestTable(error);

    await settleNotificationTasks([
      {
        label: 'Artist interest email notification',
        task: () => sendArtistInterestNotification(data),
      },
      {
        label: 'Discord artist interest notification',
        task: () => sendDiscordIntakeNotification(buildArtistInterestDiscordEmbed(data)),
      },
    ]);

    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'update') {
    await requireAdminUser(req);
    const { data, error } = await supabase
      .from('artist_interest')
      .update({ status: requireValue(body.status, 'status is required.') })
      .eq('id', requireValue(body.id, 'id is required.'))
      .select()
      .single();

    if (error) throwMissingArtistInterestTable(error);
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'delete') {
    await requireAdminUser(req);
    const { error } = await supabase
      .from('artist_interest')
      .delete()
      .eq('id', requireValue(body.id, 'id is required.'));

    if (error) throwMissingArtistInterestTable(error);
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  throw new Error('Unsupported artist interest action.');
}

async function handleBlogPosts(req, res) {
  allowMethods(req, ['GET', 'POST']);

  if (req.method === 'GET') {
    await requireAdminUser(req);
    const data = await listBlogPostsAdmin();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);
  const supabase = getAdminSupabase();

  if (body.action === 'create') {
    await requireAdminUser(req);
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        title: requireValue(body.title, 'title is required.'),
        slug: requireValue(body.slug, 'slug is required.'),
        content: body.content || '',
        author: body.author || '',
        date: body.date || null,
        status: body.status || 'draft',
      }])
      .select()
      .single();

    if (error) {
      if (error?.code === 'PGRST205' && error?.message?.includes('blog_posts')) {
        throw new AppError('Blog posts table is not set up yet. Create the `blog_posts` table in Supabase and try again.', {
          code: 'BLOG_POSTS_TABLE_MISSING',
          status: 503,
          details: error,
          expose: true,
        });
      }
      throw error;
    }
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'update') {
    await requireAdminUser(req);
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        title: body.title,
        slug: body.slug,
        content: body.content,
        author: body.author,
        date: body.date || null,
        status: body.status,
      })
      .eq('id', requireValue(body.id, 'id is required.'))
      .select()
      .single();

    if (error) throw error;
    return sendJson(res, 200, { success: true, data });
  }

  if (body.action === 'delete') {
    await requireAdminUser(req);
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', requireValue(body.id, 'id is required.'));

    if (error) throw error;
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  throw new Error('Unsupported blog posts action.');
}

async function handleCommunityCredits(req, res) {
  allowMethods(req, ['GET', 'POST']);
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const data = await listCommunityCredits();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deleteCommunityCreditById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  if (body.action === 'sync-from-events') {
    const data = await syncCommunityCreditsFromEvents();
    return sendJson(res, 200, { success: true, data });
  }

  const data = await saveCommunityCredit({
    id: body.id || null,
    name: requireValue(body.name, 'name is required.'),
    email: body.email || '',
    role: requireValue(body.role, 'role is required.'),
    event_id: body.event_id || null,
    event_name: body.event_name || null,
    details: body.details || '',
    link: body.link || '',
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleMailingList(req, res) {
  allowMethods(req, ['GET', 'POST']);
  await requireAdminUser(req);

  if (req.method === 'GET') {
    const data = await listMailingListEntries();
    return sendJson(res, 200, { success: true, data });
  }

  const body = await parseJsonBody(req);

  if (body.action === 'delete') {
    await deleteMailingListEntryById(requireValue(body.id, 'id is required.'));
    return sendJson(res, 200, { success: true, data: { deleted: true } });
  }

  const data = await saveMailingListEntry({
    id: body.id || null,
    name: body.name || '',
    email: requireValue(body.email, 'email is required.'),
    source: body.source || 'manual',
  });

  return sendJson(res, 200, { success: true, data });
}

async function handleSquareCatalog(req, res) {
  allowMethods(req, ['GET']);
  await requireAdminUser(req);
  const catalog = await getAdminCatalogView();
  return sendJson(res, 200, {
    success: true,
    data: {
      catalog,
      count: catalog.length,
    },
  });
}

async function handleSquareWebhook(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const path = new URL(req.url, `${protocol}://${host}`).pathname;
  const requestUrl = `${protocol}://${host}${path}`;
  const result = await processSquareOrderUpdate(body, req.headers, {
    rawBody: req.rawBody,
    requestUrl,
  });
  return sendJson(res, 200, { success: true, data: result });
}

const handlers = {
  'check-inventory': handleCheckInventory,
  'confirm-ticket': handleConfirmTicket,
  'create-checkout': handleCreateCheckout,
  'create-event-checkout': handleCreateEventCheckout,
  'create-request-checkout': handleCreateRequestCheckout,
  'app-dashboard': handleAppDashboard,
  'attendance-claim': handleAttendanceClaim,
  'admin-attendance-attach': handleAdminAttendanceAttach,
  'admin-attendance-sources': handleAdminAttendanceSources,
  'admin-runtime': handleAdminRuntime,
  'event-stats': handleEventStats,
  'site-activity': handleSiteActivity,
  'space-activity': handleSpaceActivity,
  'event-checkout': handleGetEventCheckout,
  'request-checkout': handleGetRequestCheckout,
  'pay-event': handlePayEvent,
  'pay-preorder': handlePayPreorder,
  'pay-request': handlePayRequest,
  'create-test-item': handleCreateTestItem,
  'enable-square-tracking': handleEnableSquareTracking,
  events: handleEvents,
  'generate-pass': handleGeneratePass,
  'preorder-checkout': handleGetPreorderCheckout,
  'get-ticket': handleGetTicket,
  'check-in-ticket': handleCheckInTicket,
  'admin-session': handleAdminSession,
  'admin-tickets': handleAdminTickets,
  preorders: handlePreorders,
  requests: handleRequests,
  'artist-interest': handleArtistInterest,
  'blog-posts': handleBlogPosts,
  'community-credits': handleCommunityCredits,
  'mailing-list': handleMailingList,
  'service-products': handleServiceProducts,
  'service-inquiries': handleServiceInquiries,
  'square-catalog': handleSquareCatalog,
  'discord-interactions': handleDiscordInteractions,
  'square-webhook': handleSquareWebhook,
};

export default withHandler(async function handler(req, res) {
  const routeKey = getRouteKey(req);
  const routeHandler = handlers[routeKey];

  if (!routeHandler) {
    throw new AppError(`Unsupported API route: ${routeKey}`, {
      code: 'NOT_FOUND',
      status: 404,
      expose: true,
    });
  }

  return routeHandler(req, res);
}, { context: 'api-router' });
