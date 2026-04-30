export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'APP_ERROR';
    this.status = options.status || 500;
    this.details = options.details;
    this.expose = options.expose ?? this.status < 500;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

export function asAppError(error, fallbackMessage = 'Unexpected server error') {
  if (isAppError(error)) {
    return error;
  }

  return new AppError(error?.message || fallbackMessage, {
    code: 'INTERNAL_ERROR',
    status: 500,
    details: error,
    expose: false,
  });
}
