import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/[...route].js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('api router resolves catch-all route segments', async () => {
  const req = {
    method: 'GET',
    url: '/api/create-checkout',
    query: { route: ['create-checkout'] },
    body: {},
    headers: {},
  };
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'METHOD_NOT_ALLOWED');
});

test('api router falls back to pathname parsing', async () => {
  const req = {
    method: 'GET',
    url: '/api/does-not-exist',
    query: {},
    body: {},
    headers: {},
  };
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
