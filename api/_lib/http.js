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

export async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
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

export function extractPublicMessage(result, fallback = 'Request failed') {
  if (!result) return fallback;
  if (typeof result === 'string') return result;
  if (result.error?.message) return result.error.message;
  if (result.message) return result.message;
  return fallback;
}

export { AppError, isAppError };
