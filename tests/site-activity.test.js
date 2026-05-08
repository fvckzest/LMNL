import test from 'node:test';
import assert from 'node:assert/strict';
import { getSiteActivityHistory } from '../api/_lib/services/site-activity.js';

function createQuery(result, calls) {
  return {
    select() {
      return this;
    },
    eq(column, value) {
      calls.push({ type: 'eq', column, value });
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data: result, error: null });
    },
    in() {
      return Promise.resolve({ data: [], error: null });
    },
  };
}

test('getSiteActivityHistory excludes draft shop products', async () => {
  const calls = [];
  const datasets = {
    events: [],
    blog_posts: [],
    merch_preorders: [
      {
        id: 'prod_open',
        item_name: 'Visible Product',
        category: 'LIMITED DROP',
        created_at: '2026-05-06T12:00:00.000Z',
        status: 'open',
      },
    ],
    tickets: [],
  };

  const supabase = {
    from(table) {
      calls.push({ type: 'from', table });
      return createQuery(datasets[table] || [], calls);
    },
  };

  const activity = await getSiteActivityHistory(6, { supabase });

  assert.equal(
    calls.some((call) => call.type === 'eq' && call.column === 'status' && call.value === 'open'),
    true
  );
  assert.equal(activity.length, 1);
  assert.equal(activity[0].id, 'product-prod_open');
  assert.equal(activity[0].type, 'SHOP');
});
