import type { RequestHandler } from 'express';
import { result } from './shared/result.js';

// Mounted under /api/v1. Result reconciliation must never materialize expiry.
export function requestMaintenance(
  beforeRequest: () => Promise<void>,
): RequestHandler {
  return async (req, res, next) => {
    if (
      req.path === '/health' ||
      ((req.method === 'GET' || req.method === 'HEAD') &&
        /^\/(?:catalog\/categories|shopping\/request-result)\/?$/i.test(
          req.path,
        ))
    )
      return next();
    const maintenance = await result(beforeRequest);
    if (!maintenance.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json(maintenance);
      return;
    }
    next();
  };
}
