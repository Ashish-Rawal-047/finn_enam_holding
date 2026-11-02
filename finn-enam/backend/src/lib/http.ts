/**
 * HTTP primitives shared by every route: a single error envelope, request validation,
 * and pagination.
 *
 * Error responses always look like:
 *   { "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] } }
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, 'UNPROCESSABLE', message, details);
  }
  static unavailable(message: string, details?: unknown) {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message, details);
  }
}

/** Wraps async handlers so rejections reach the error middleware. */
export const handle =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'Request validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

export const uuidParam = z.string().uuid({ message: 'Must be a valid id' });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationQuery>;

export function paginated<T>(items: T[], total: number, { page, pageSize }: Pagination) {
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export function pgErrorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === 'string' ? code : undefined;
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // Malformed JSON bodies from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  // Unique violations that slip past explicit checks (Drizzle wraps the pg error in `cause`)
  if (pgErrorCode(err) === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these values already exists' } });
    return;
  }
  // Never leak internals (connection strings, SQL) to clients.
  console.error(`[api] ${req.method} ${req.path} failed:`, (err as Error)?.message ?? err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'An unexpected error occurred' } });
}
