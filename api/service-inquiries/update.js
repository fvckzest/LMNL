import { withHandler, allowMethods, parseJsonBody, requireValue, sendJson } from '../_lib/http.js';
import { getAdminSupabase } from '../_lib/clients.js';

export default withHandler(async function handler(req, res) {
  allowMethods(req, ['POST']);
  const body = await parseJsonBody(req);
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('service_inquiries')
    .update({ status: requireValue(body.status, 'status is required.') })
    .eq('id', requireValue(body.id, 'id is required.'))
    .select()
    .single();

  if (error) throw error;
  return sendJson(res, 200, { success: true, data });
}, { context: 'service-inquiries-update' });
