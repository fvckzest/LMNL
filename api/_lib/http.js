import { AppError, asAppError, isAppError } from './errors.js';

export function allowMethods(req, methods) {
  if (!methods.includes(req.method)) {
    throw new AppError('Method not allowed', {
      code: 'METHOD_NOT_ALLOWED',
      status: 405,
      expose: true,
      details: { allowed: methods },
    });
  }
}

export async function readRawBody(req) {
  if (typeof req.rawBody === 'string') {
    return req.rawBody;
  }

  if (typeof req.body === 'string') {
    req.rawBody = req.body;
    return req.rawBody;
  }

  if (req.body && Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString('utf8');
    return req.rawBody;
  }

  if (req.body && typeof req.body === 'object') {
    req.rawBody = JSON.stringify(req.body);
    return req.rawBody;
  }

  if (typeof req.on === 'function') {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', resolve);
      req.on('error', reject);
    });

    req.rawBody = Buffer.concat(chunks).toString('utf8');
    return req.rawBody;
  }

  req.rawBody = '';
  return req.rawBody;
}

export async function parseJsonBody(req) {
  if (req.parsedBody && typeof req.parsedBody === 'object') {
    return req.parsedBody;
  }

  if (req.body && typeof req.body === 'object') {
    req.parsedBody = req.body;
    req.rawBody = req.rawBody || JSON.stringify(req.body);
    return req.parsedBody;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.rawBody = req.rawBody || req.body;
      req.parsedBody = JSON.parse(req.body);
      return req.parsedBody;
    } catch (error) {
      throw new AppError('Invalid JSON body.', {
        code: 'INVALID_JSON',
        status: 400,
        details: error,
        expose: true,
      });
    }
  }

  if (req.body && Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8');
    req.rawBody = req.rawBody || text;
    if (!text.trim()) {
      req.parsedBody = {};
      return req.parsedBody;
    }

    try {
      req.parsedBody = JSON.parse(text);
      return req.parsedBody;
    } catch (error) {
      throw new AppError('Invalid JSON body.', {
        code: 'INVALID_JSON',
        status: 400,
        details: error,
        expose: true,
      });
    }
  }

  if (typeof req.on === 'function') {
    const text = await readRawBody(req);
    if (!text.trim()) {
      req.parsedBody = {};
      return req.parsedBody;
    }

    try {
      req.parsedBody = JSON.parse(text);
      return req.parsedBody;
    } catch (error) {
      throw new AppError('Invalid JSON body.', {
        code: 'INVALID_JSON',
        status: 400,
        details: error,
        expose: true,
      });
    }
  }

  return {};
}

export function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

export function sendError(res, error, context = 'request') {
  const appError = asAppError(error);
  console.error(`[${context}]`, appError);

  return sendJson(res, appError.status, {
    success: false,
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : 'Internal Server Error',
    },
  });
}

export function withHandler(handler, options = {}) {
  const context = options.context || 'api';

  return async function wrappedHandler(req, res) {
    try {
      return await handler(req, res);
    } catch (error) {
      return sendError(res, error, context);
    }
  };
}

export function requireValue(value, message, details) {
  if (value === undefined || value === null || value === '') {
    throw new AppError(message, {
      code: 'INVALID_INPUT',
      status: 400,
      details,
      expose: true,
    });
  }

  return value;
}

export async function verifyTurnstileToken(token, remoteip) {
  const { getTurnstileConfig } = await import('./env.js');
  const { secretKey } = getTurnstileConfig();

  const formData = new URLSearchParams();
  formData.set('secret', secretKey);
  formData.set('response', token);
  if (remoteip) {
    formData.set('remoteip', remoteip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!payload?.success) {
    throw new AppError('Security check failed. Please try again.', {
      code: 'TURNSTILE_FAILED',
      status: 400,
      details: payload,
      expose: true,
    });
  }

  return payload;
}

export function extractPublicMessage(result, fallback = 'Request failed') {
  if (!result) return fallback;
  if (typeof result === 'string') return result;
  if (result.error?.message) return result.error.message;
  if (result.message) return result.message;
  return fallback;
}

export { AppError, isAppError };
