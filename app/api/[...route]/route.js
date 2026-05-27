import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import apiHandler from '../../../api/[...route].js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function appendQueryValue(query, key, value) {
  if (query[key] === undefined) {
    query[key] = value;
    return;
  }

  query[key] = Array.isArray(query[key])
    ? [...query[key], value]
    : [query[key], value];
}

function buildQuery(request, params = {}) {
  const query = {};
  const url = new URL(request.url);

  url.searchParams.forEach((value, key) => {
    appendQueryValue(query, key, value);
  });

  query.route = Array.isArray(params.route) ? params.route : [];
  return query;
}

function buildHeaders(request) {
  const headers = {};

  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return headers;
}

async function buildRequest(request, params = {}) {
  const hasRequestBody = !['GET', 'HEAD'].includes(request.method);
  const bodyBuffer = hasRequestBody
    ? Buffer.from(await request.arrayBuffer())
    : Buffer.alloc(0);
  const nodeRequest = Readable.from(bodyBuffer);
  const routePath = Array.isArray(params.route) ? params.route.join('/') : '';
  const url = new URL(request.url);

  nodeRequest.method = request.method;
  nodeRequest.url = `/api/${routePath}${url.search}`;
  nodeRequest.query = buildQuery(request, params);
  nodeRequest.headers = buildHeaders(request);
  nodeRequest.rawBody = bodyBuffer.toString('utf8');
  nodeRequest.socket = {
    remoteAddress: nodeRequest.headers['x-forwarded-for']?.split(',')[0]?.trim() || '',
  };

  return nodeRequest;
}

function createResponse() {
  const headers = new Headers();

  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      headers.set(name, String(value));
      return this;
    },
    getHeader(name) {
      return headers.get(name);
    },
    json(payload) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
      }
      this.body = JSON.stringify(payload);
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    end(payload = '') {
      this.body = payload;
      return this;
    },
    toResponse() {
      return new Response(this.body ?? null, {
        status: this.statusCode,
        headers,
      });
    },
  };
}

async function handle(request, { params } = {}) {
  const resolvedParams = await params;
  const req = await buildRequest(request, resolvedParams);
  const res = createResponse();

  await apiHandler(req, res);

  return res.toResponse();
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
